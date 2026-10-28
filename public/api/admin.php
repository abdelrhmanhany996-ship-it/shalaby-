<?php
/**
 * Admin helper for the Shalaby CRM (runs on the web host; replaces a Cloud Function).
 *   GET  ?ping=1                                  -> {"configured": bool}
 *   POST {"action":"reset_password","userId":"…"} -> a fresh RANDOM password for that staff member
 *   POST {"action":"create_login","userId":"…","loginId":"…","password":"…"} -> creates the sign-in account
 *   POST {"action":"delete_login","userId":"…"}  -> developer only: removes that person's sign-in account
 *        (so self sign-up can be switched off in Firebase: nobody can make an account from the browser)
 *   POST {"action":"backup_now"}                -> developer only: exports the whole database to a restore point in Cloud Storage
 *   POST {"action":"backup_status","operation":"…"} -> is that export finished?
 *   POST {"action":"list_backups"}              -> the restore points already in the bucket
 *        (the bucket is `<project>-backups`, or the one named in crm-backup.json next to the service-account file;
 *         the service account needs "Cloud Datastore Import Export Admin" and write access to the bucket)
 *
 * Why a server: changing someone else's password needs the Firebase Admin credentials,
 * which must never reach the browser. They live in a service-account file OUTSIDE public_html:
 *   <account>/domains/<site>/crm-firebase-admin.json
 * (a Google service account key with the roles "Firebase Authentication Admin" and "Cloud Datastore User").
 *
 * Who may reset whom is enforced here, from the caller's own authProfiles record:
 *   developer (admin)            -> anyone except themselves
 *   manager (general_manager)    -> anyone except developers and other managers
 *   branch manager               -> supervisors / sales staff of the SAME branch
 * The new password is shown once to the person who resets it; the employee must change it at next sign-in.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const FIREBASE_PROJECT_ID = 'shalaby-group';
const RATE_LIMIT_PER_HOUR = 30;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function fail(int $code, string $error, ?string $detail = null): void {
    http_response_code($code);
    echo json_encode(array_filter(['error' => $error, 'detail' => $detail], fn($v) => $v !== null), JSON_UNESCAPED_UNICODE);
    exit;
}

function find_file(string $name): ?string {
    foreach ([2, 3, 4, 5] as $up) {
        $p = dirname(__DIR__, $up) . '/' . $name;
        if (is_file($p)) return $p;
    }
    $home = getenv('HOME');
    return $home && is_file(rtrim($home, '/') . '/' . $name) ? rtrim($home, '/') . '/' . $name : null;
}

function service_account(): ?array {
    $path = find_file('crm-firebase-admin.json');
    if (!$path) return null;
    $sa = json_decode((string) file_get_contents($path), true);
    return is_array($sa) && !empty($sa['client_email']) && !empty($sa['private_key']) ? $sa : null;
}

function b64url(string $s): string {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function http(string $method, string $url, array $headers = [], $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    return [$status, is_array($data) ? $data : []];
}

/** OAuth access token for the service account (JWT bearer flow). */
function google_token(array $sa): ?string {
    $now = time();
    $claims = [
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/cloud-platform',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3000,
    ];
    $input = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . b64url(json_encode($claims));
    if (!openssl_sign($input, $sig, $sa['private_key'], 'sha256')) return null;
    [$status, $data] = http('POST', 'https://oauth2.googleapis.com/token', ['Content-Type: application/x-www-form-urlencoded'],
        http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $input . '.' . b64url($sig)]));
    return $status === 200 && !empty($data['access_token']) ? (string) $data['access_token'] : null;
}

function fs_url(string $path): string {
    return 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/databases/' . rawurlencode('(default)') . '/documents/' . $path;
}

/** Reads a Firestore document with the CALLER's token, so the security rules decide whether they may see it. */
function read_doc(string $path, string $idToken): ?array {
    [$status, $doc] = http('GET', fs_url($path), ['Authorization: Bearer ' . $idToken]);
    return $status === 200 && isset($doc['fields']) ? $doc['fields'] : null;
}

function f(?array $fields, string $key): ?string {
    $v = $fields[$key]['stringValue'] ?? null;
    return is_string($v) ? $v : null;
}

function uid_from_token(string $idToken): ?string {
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;
    $p = json_decode((string) base64_decode(strtr($parts[1], '-_', '+/')), true);
    $uid = is_array($p) ? (string) ($p['user_id'] ?? $p['sub'] ?? '') : '';
    return preg_match('/^[A-Za-z0-9_\-]{6,128}$/', $uid) ? $uid : null;
}

/** May this caller reset that target's password? */
function may_reset(string $callerRole, ?string $callerBranch, string $targetRole, ?string $targetBranch): bool {
    if ($callerRole === 'admin') return true;
    if ($callerRole === 'general_manager') return !in_array($targetRole, ['admin', 'general_manager'], true);
    // The general sales manager: the sales managers and salespeople, never the owner, developer or a peer.
    if ($callerRole === 'regional_manager') return in_array($targetRole, ['branch_manager', 'sales_agent', 'team_leader', 'supervisor'], true);
    if ($callerRole === 'branch_manager') {
        return in_array($targetRole, ['supervisor', 'team_leader', 'sales_agent'], true) && $callerBranch && $callerBranch === $targetBranch;
    }
    return false;
}

function random_password(int $len = 10): string {
    $out = '';
    for ($i = 0; $i < $len; $i++) $out .= PASSWORD_ALPHABET[random_int(0, strlen(PASSWORD_ALPHABET) - 1)];
    return $out;
}

function rate_limit(string $uid): void {
    $file = sys_get_temp_dir() . '/crm-admin-' . md5($uid) . '.json';
    $now = time();
    $hits = is_file($file) ? array_values(array_filter(json_decode((string) file_get_contents($file), true) ?: [], fn($t) => $t > $now - 3600)) : [];
    if (count($hits) >= RATE_LIMIT_PER_HOUR) fail(429, 'rate_limited');
    $hits[] = $now;
    file_put_contents($file, json_encode($hits), LOCK_EX);
}

$sa = service_account();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['configured' => $sa !== null]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'method_not_allowed');

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) fail(401, 'unauthorized');
$idToken = $m[1];
$callerUid = uid_from_token($idToken);
if ($callerUid === null) fail(401, 'unauthorized', 'bad_token');
$caller = read_doc('authProfiles/' . rawurlencode($callerUid), $idToken);
if (!$caller || ($caller['active']['booleanValue'] ?? false) !== true) fail(401, 'unauthorized', 'profile_inactive_or_missing');
$callerRole = f($caller, 'role') ?? '';
$callerBranch = f($caller, 'branchId');

if ($sa === null) fail(503, 'not_configured');

$in = json_decode((string) file_get_contents('php://input'), true);
$action = is_array($in) ? (string) ($in['action'] ?? '') : '';
const BACKUP_ACTIONS = ['backup_now', 'backup_status', 'list_backups'];
if (!in_array($action, ['reset_password', 'create_login', 'delete_login', ...BACKUP_ACTIONS], true)) fail(400, 'bad_action');

/** The bucket restore points are written to. */
function backup_bucket(): string {
    $path = find_file('crm-backup.json');
    $cfg = $path ? json_decode((string) file_get_contents($path), true) : null;
    $name = is_array($cfg) ? (string) ($cfg['bucket'] ?? '') : '';
    return preg_match('/^[a-z0-9][a-z0-9._-]{2,62}$/', $name) ? $name : FIREBASE_PROJECT_ID . '-backups';
}

if (in_array($action, BACKUP_ACTIONS, true)) {
    if ($callerRole !== 'admin') fail(403, 'forbidden');
    rate_limit($callerUid);
    $token = google_token($sa);
    if ($token === null) fail(502, 'admin_auth_failed');
    $auth = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
    $bucket = backup_bucket();
    $db = 'projects/' . FIREBASE_PROJECT_ID . '/databases/' . rawurlencode('(default)');

    if ($action === 'backup_now') {
        $prefix = 'manual-' . gmdate('Y-m-d-His');
        [$st, $res] = http('POST', 'https://firestore.googleapis.com/v1/' . $db . ':exportDocuments', $auth, json_encode(['outputUriPrefix' => 'gs://' . $bucket . '/' . $prefix]));
        if ($st !== 200 || empty($res['name'])) {
            $msg = (string) ($res['error']['message'] ?? '');
            fail($st === 403 ? 403 : ($st === 404 ? 404 : 502), $st === 403 ? 'no_permission' : ($st === 404 ? 'bucket_missing' : 'export_failed'), 'firestore_' . $st . ': ' . mb_substr($msg, 0, 160));
        }
        echo json_encode(['operation' => (string) $res['name'], 'point' => $prefix, 'bucket' => $bucket]);
        exit;
    }
    if ($action === 'backup_status') {
        $op = (string) ($in['operation'] ?? '');
        if (!preg_match('#^projects/[A-Za-z0-9_-]+/databases/\(default\)/operations/[A-Za-z0-9_.-]+$#', $op)) fail(400, 'bad_operation');
        [$st, $res] = http('GET', 'https://firestore.googleapis.com/v1/' . $op, $auth);
        if ($st !== 200) fail(502, 'status_failed', 'firestore_' . $st);
        echo json_encode([
            'done' => ($res['done'] ?? false) === true,
            'error' => isset($res['error']) ? mb_substr((string) ($res['error']['message'] ?? 'failed'), 0, 200) : null,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // list_backups: the restore points (folders) in the bucket, newest first.
    [$st, $res] = http('GET', 'https://storage.googleapis.com/storage/v1/b/' . rawurlencode($bucket) . '/o?prefix=manual-&delimiter=/', $auth);
    if ($st === 404) fail(404, 'bucket_missing');
    if ($st !== 200) fail($st === 403 ? 403 : 502, $st === 403 ? 'no_permission' : 'list_failed', 'storage_' . $st);
    $points = array_values(array_filter(array_map(fn($p) => rtrim((string) $p, '/'), $res['prefixes'] ?? []), fn($p) => preg_match('/^manual-\d{4}-\d{2}-\d{2}-\d{6}$/', $p)));
    rsort($points);
    echo json_encode(['bucket' => $bucket, 'points' => array_slice($points, 0, 20)]);
    exit;
}
$userId = (string) ($in['userId'] ?? '');
if (!preg_match('/^[A-Za-z0-9_\-]{1,128}$/', $userId)) fail(400, 'bad_user');
rate_limit($callerUid);

if ($action === 'delete_login') {
    if ($callerRole !== 'admin') fail(403, 'forbidden');
    $userDoc = read_doc('users/' . rawurlencode($userId), $idToken);
    if (!$userDoc) fail(404, 'user_not_found');
    $targetUid = f($userDoc, 'authUid');
    if (!$targetUid) { echo json_encode(['deleted' => false, 'reason' => 'no_login']); exit; }
    if ($targetUid === $callerUid) fail(403, 'forbidden', 'cannot delete your own account');
    $token = google_token($sa);
    if ($token === null) fail(502, 'admin_auth_failed');
    [$st, $res] = http('POST', 'https://identitytoolkit.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/accounts:delete', ['Authorization: Bearer ' . $token, 'Content-Type: application/json'], json_encode(['localId' => $targetUid]));
    $gone = $st === 200 || str_contains((string) ($res['error']['message'] ?? ''), 'USER_NOT_FOUND');
    if (!$gone) fail(502, 'delete_failed', 'identitytoolkit_' . $st);
    echo json_encode(['deleted' => true, 'uid' => $targetUid]);
    exit;
}

if ($action === 'create_login') {
    // The staff record was written by the caller under the security rules, so its role and branch are already
    // limited to what the caller may grant; the same check is repeated here before an account is made.
    $userDoc = read_doc('users/' . rawurlencode($userId), $idToken);
    if (!$userDoc) fail(404, 'user_not_found');
    if (f($userDoc, 'authUid')) fail(409, 'already_has_login');
    $role = f($userDoc, 'role') ?? '';
    $branch = f($userDoc, 'branchId');
    if (!may_reset($callerRole, $callerBranch, $role, $branch)) fail(403, 'forbidden');
    $loginId = strtolower(trim((string) ($in['loginId'] ?? '')));
    $password = (string) ($in['password'] ?? '');
    if (!preg_match('/^(\d{8,15}|[a-z][a-z0-9._-]{2,30})$/', $loginId)) fail(400, 'bad_login_id');
    if (strlen($password) < 8 || strlen($password) > 128) fail(400, 'weak_password');
    $email = $loginId . '@staff.shalaby.local';

    $token = google_token($sa);
    if ($token === null) fail(502, 'admin_auth_failed');
    [$st, $res] = http(
        'POST',
        'https://identitytoolkit.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/accounts',
        ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
        json_encode(['email' => $email, 'password' => $password, 'displayName' => f($userDoc, 'name') ?? ''])
    );
    if ($st !== 200 || empty($res['localId'])) {
        $msg = (string) ($res['error']['message'] ?? '');
        fail(str_contains($msg, 'EMAIL_EXISTS') ? 409 : 502, str_contains($msg, 'EMAIL_EXISTS') ? 'login_taken' : 'create_failed', 'identitytoolkit_' . $st . ': ' . mb_substr($msg, 0, 120));
    }
    $uid = (string) $res['localId'];
    $supervised = [];
    foreach (($userDoc['supervisedBranchIds']['arrayValue']['values'] ?? []) as $v) {
        if (isset($v['stringValue'])) $supervised[] = ['stringValue' => (string) $v['stringValue']];
    }
    $profile = [
        'uid' => ['stringValue' => $uid],
        'email' => ['stringValue' => $email],
        'loginId' => ['stringValue' => $loginId],
        'name' => ['stringValue' => f($userDoc, 'name') ?? ''],
        'userId' => ['stringValue' => $userId],
        'role' => ['stringValue' => $role],
        'active' => ['booleanValue' => true],
    ];
    if ($branch) $profile['branchId'] = ['stringValue' => $branch];
    if ($supervised) $profile['supervisedBranchIds'] = ['arrayValue' => ['values' => $supervised]];
    [$sp] = http('PATCH', fs_url('authProfiles/' . rawurlencode($uid)), ['Authorization: Bearer ' . $token, 'Content-Type: application/json'], json_encode(['fields' => $profile]));
    [$su] = http(
        'PATCH',
        fs_url('users/' . rawurlencode($userId)) . '?updateMask.fieldPaths=authUid',
        ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
        json_encode(['fields' => ['authUid' => ['stringValue' => $uid]]])
    );
    if ($sp !== 200) fail(502, 'profile_write_failed');
    echo json_encode(['uid' => $uid, 'linked' => $su === 200]);
    exit;
}

$userDoc = read_doc('users/' . rawurlencode($userId), $idToken);
$targetUid = f($userDoc, 'authUid');
if (!$userDoc) fail(404, 'user_not_found');
if (!$targetUid) fail(404, 'no_login', 'this person has no sign-in account yet');
if ($targetUid === $callerUid) fail(403, 'forbidden', 'use change-password for your own account');
$target = read_doc('authProfiles/' . rawurlencode($targetUid), $idToken);
if (!$target) fail(403, 'forbidden', 'cannot read target profile');
if (!may_reset($callerRole, $callerBranch, f($target, 'role') ?? '', f($target, 'branchId'))) fail(403, 'forbidden');

$token = google_token($sa);
if ($token === null) fail(502, 'admin_auth_failed');
$password = random_password();
[$st, $res] = http(
    'POST',
    'https://identitytoolkit.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/accounts:update',
    ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    json_encode(['localId' => $targetUid, 'password' => $password, 'validSince' => (string) time()])
);
if ($st !== 200) fail(502, 'password_update_failed', 'identitytoolkit_' . $st . ': ' . mb_substr((string) ($res['error']['message'] ?? ''), 0, 120));

// Force a new password at the next sign-in (bypasses the rules with the admin token).
[$st2] = http(
    'PATCH',
    fs_url('authProfiles/' . rawurlencode($targetUid)) . '?updateMask.fieldPaths=mustChangePassword',
    ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    json_encode(['fields' => ['mustChangePassword' => ['booleanValue' => true]]])
);

echo json_encode([
    'password' => $password,
    'loginId' => f($target, 'loginId') ?? f($userDoc, 'phone'),
    'mustChange' => $st2 === 200,
], JSON_UNESCAPED_UNICODE);
