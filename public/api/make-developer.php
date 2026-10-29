<?php
/**
 * Makes one account a developer (role "admin", above the owner): run once from the server's command line.
 *
 *   php api/make-developer.php --email=someone@gmail.com [--name="الاسم"] [--dry]
 *
 * The account is looked up in Firebase Authentication by e-mail; when it does not exist yet it is created with a random
 * password nobody sees (the person sets their own with «نسيت كلمة المرور؟» on the sign-in screen, which e-mails them a link).
 * Then its access record (authProfiles/{uid}) and staff record (users/{uid}) are written with role "admin" and active.
 *
 * Uses the same service account as api/admin.php and api/weekly.php (crm-firebase-admin.json, outside public_html), with the
 * roles "Firebase Authentication Admin" and "Cloud Datastore User". Command line only: it cannot be reached from the web.
 */
declare(strict_types=1);

require_once __DIR__ . '/weekly.php';

/** Firestore typed fields for a flat list of strings and booleans. */
function typed(array $values): array {
    $out = [];
    foreach ($values as $k => $v) $out[$k] = is_bool($v) ? ['booleanValue' => $v] : ['stringValue' => (string) $v];
    return $out;
}

function patch_doc(string $path, array $values, string $token, array $onlyIfMissing = []): void {
    $mask = '';
    foreach (array_keys($values) as $f) $mask .= ($mask === '' ? '?' : '&') . 'updateMask.fieldPaths=' . rawurlencode($f);
    [$status] = http('PATCH', fs_base() . '/' . $path . $mask, ['Authorization: Bearer ' . $token, 'Content-Type: application/json'], json_encode(['fields' => typed($values)]));
    if ($status !== 200) throw new RuntimeException("write $path failed ($status)");
}

function run_make_developer(array $argv): int {
    $opts = [];
    foreach (array_slice($argv, 1) as $a) if (preg_match('/^--([a-z]+)(?:=(.*))?$/', $a, $m)) $opts[$m[1]] = $m[2] ?? true;
    $email = strtolower(trim((string) ($opts['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fwrite(STDERR, "usage: php make-developer.php --email=someone@gmail.com [--name=...] [--dry]\n");
        return 1;
    }
    $path = find_file('crm-firebase-admin.json');
    $sa = $path ? json_decode((string) file_get_contents($path), true) : null;
    if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) {
        fwrite(STDERR, "service_account_missing: put crm-firebase-admin.json next to public_html (see docs/admin-setup.md)\n");
        return 2;
    }
    $token = google_token($sa);
    if (!$token) {
        fwrite(STDERR, "google_token_failed\n");
        return 3;
    }
    $auth = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
    $base = 'https://identitytoolkit.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID;
    try {
        [$status, $found] = http('POST', $base . '/accounts:lookup', $auth, json_encode(['email' => [$email]]));
        if ($status !== 200) throw new RuntimeException("lookup failed ($status)");
        $uid = $found['users'][0]['localId'] ?? null;
        $name = is_string($opts['name'] ?? null) && $opts['name'] !== '' ? $opts['name'] : (string) ($found['users'][0]['displayName'] ?? 'المطوّر');
        $created = false;
        if (!$uid) {
            if (isset($opts['dry'])) {
                echo "dry: would create $email and make it a developer\n";
                return 0;
            }
            [$status, $made] = http('POST', $base . '/accounts', $auth, json_encode(['email' => $email, 'password' => bin2hex(random_bytes(16)), 'emailVerified' => true, 'displayName' => $name]));
            if ($status !== 200 || empty($made['localId'])) throw new RuntimeException('create account failed (' . $status . ')');
            $uid = $made['localId'];
            $created = true;
        } elseif (isset($opts['dry'])) {
            echo "dry: $email exists ($uid); would make it a developer\n";
            return 0;
        }
        // The access record the security rules trust, and the staff record the app lists.
        patch_doc("authProfiles/$uid", ['uid' => $uid, 'email' => $email, 'loginId' => $email, 'name' => $name, 'userId' => $uid, 'role' => 'admin', 'active' => true], $token);
        [$s] = http('GET', fs_base() . "/users/$uid", ['Authorization: Bearer ' . $token]);
        $staff = ['id' => $uid, 'name' => $name, 'email' => $email, 'role' => 'admin', 'active' => true, 'authUid' => $uid];
        if ($s !== 200) $staff += ['phone' => '', 'createdAt' => gmdate('c')];
        patch_doc("users/$uid", $staff, $token);
        echo "developer ready: $email ($uid)\n";
        if ($created) echo "new account: open the sign-in screen, press «نسيت كلمة المرور؟» with this e-mail and choose a password from the e-mailed link.\n";
        return 0;
    } catch (Throwable $e) {
        fwrite(STDERR, 'failed: ' . $e->getMessage() . "\n");
        return 1;
    }
}

if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === __FILE__) exit(run_make_developer($argv));
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'cli_only']);
}
