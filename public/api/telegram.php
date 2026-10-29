<?php
/**
 * Telegram groups inside the CRM: a bot added to each group copies its messages here, and the app shows them as a chat.
 *
 *   POST (from Telegram, header X-Telegram-Bot-Api-Secret-Token)   -> stores the group message (the bot's webhook)
 *   GET  ?ping=1                                                  -> {"configured": bool, "storage": bool}
 *   POST {"action":"status"}                       (owner/developer) -> bot name, webhook state, the chats the bot is in
 *   POST {"action":"setup","token":"123:abc"}      (owner/developer) -> saves the bot token on the server and connects the webhook
 *   POST {"action":"chats"}                        (managers)        -> the chats the bot has seen, to link one to a group
 *   POST {"action":"messages","groupId":"…","after":0}  (staff)      -> messages of the group's chat newer than `after`
 *   POST {"action":"send","groupId":"…","text":"…"}     (staff)      -> sends the text to the group through the bot
 *   POST {"action":"file","groupId":"…","fileId":"…"}   (staff)      -> a photo or file from the chat (proxied; the bot token stays here)
 *
 * Every app call carries the user's Firebase ID token. The group is read from Firestore WITH that token, so the security rules
 * decide whether this person may see it; the chat id comes from the group record, never from the browser.
 * The bot token is stored outside public_html (crm-telegram-secrets.php) and never sent to the browser.
 * Messages are kept in crm-telegram.sqlite next to it.
 *
 * Telegram only gives a bot the group's messages when its privacy mode is off (BotFather: /setprivacy -> Disable) or it is a
 * group admin. Messages sent from the app appear in Telegram from the bot, headed by the employee's name.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const FIREBASE_PROJECT_ID = 'shalaby-crm-eg';
const MAX_TEXT = 3500;
const PAGE = 300;

function fail(int $code, string $error): void {
    http_response_code($code);
    echo json_encode(['error' => $error]);
    exit;
}

/** The site folder (the parent of public_html): files there are not reachable from the web. */
function private_dir(): string {
    return dirname(__DIR__, 2);
}
function secrets_path(): string {
    return private_dir() . '/crm-telegram-secrets.php';
}
function bot_token(): ?string {
    $p = secrets_path();
    if (!is_file($p)) return null;
    $cfg = @include $p;
    $t = is_array($cfg) ? (string) ($cfg['bot_token'] ?? '') : '';
    return preg_match('/^\d{5,15}:[A-Za-z0-9_-]{30,60}$/', $t) ? $t : null;
}
/** The webhook secret is derived from the token, so there is nothing else to configure. */
function webhook_secret(string $token): string {
    return substr(hash_hmac('sha256', 'shalaby-telegram-webhook', $token), 0, 48);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . private_dir() . '/crm-telegram.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL, message_id INTEGER NOT NULL, rev INTEGER NOT NULL,
        date INTEGER NOT NULL, from_id TEXT, from_name TEXT, from_username TEXT, is_bot INTEGER DEFAULT 0,
        kind TEXT NOT NULL, text TEXT, file_id TEXT, file_name TEXT, reply_to INTEGER, edited INTEGER DEFAULT 0, sent_by TEXT,
        UNIQUE(chat_id, message_id))');
    $pdo->exec('CREATE INDEX IF NOT EXISTS messages_rev ON messages(chat_id, rev)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS chats (chat_id TEXT PRIMARY KEY, title TEXT, type TEXT, last_at INTEGER, last_text TEXT, member INTEGER DEFAULT 1)');
    return $pdo;
}
function next_rev(): int {
    return (int) db()->query('SELECT IFNULL(MAX(rev), 0) + 1 FROM messages')->fetchColumn();
}

function tg(string $token, string $method, array $params = []): array {
    $ch = curl_init("https://api.telegram.org/bot{$token}/{$method}");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($data) ? $data : ['ok' => false];
}

// ---------- the webhook (Telegram -> here) ----------

function person_name(?array $u, ?array $chat = null): string {
    if ($u) return trim(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? '')) ?: (string) ($u['username'] ?? 'عضو');
    return (string) ($chat['title'] ?? 'الجروب');
}

function store_message(array $m, bool $edited): void {
    $chat = $m['chat'] ?? null;
    if (!is_array($chat) || !in_array($chat['type'] ?? '', ['group', 'supergroup', 'channel'], true)) return;
    $chatId = (string) $chat['id'];
    $kind = 'text';
    $text = (string) ($m['text'] ?? $m['caption'] ?? '');
    $fileId = null;
    $fileName = null;
    if (!empty($m['photo'])) {
        $kind = 'photo';
        $fileId = (string) end($m['photo'])['file_id'];
    } elseif (!empty($m['document'])) {
        $kind = 'document';
        $fileId = (string) $m['document']['file_id'];
        $fileName = (string) ($m['document']['file_name'] ?? 'ملف');
    } elseif (!empty($m['voice']) || !empty($m['audio'])) {
        $kind = 'voice';
        $fileId = (string) (($m['voice'] ?? $m['audio'])['file_id']);
    } elseif (!empty($m['video'])) {
        $kind = 'video';
        $fileName = 'فيديو';
    } elseif (!empty($m['sticker'])) {
        $kind = 'sticker';
        $text = (string) ($m['sticker']['emoji'] ?? '🙂');
    } elseif (!empty($m['location'])) {
        $kind = 'location';
        $text = $m['location']['latitude'] . ',' . $m['location']['longitude'];
    } elseif (!empty($m['new_chat_members']) || !empty($m['left_chat_member']) || !empty($m['new_chat_title'])) {
        $kind = 'service';
        $text = !empty($m['new_chat_members']) ? 'انضم: ' . implode('، ', array_map('person_name', $m['new_chat_members']))
            : (!empty($m['left_chat_member']) ? 'خرج: ' . person_name($m['left_chat_member']) : 'اسم الجروب بقى: ' . $m['new_chat_title']);
    } elseif ($text === '') {
        return;
    }
    $from = $m['from'] ?? null;
    $pdo = db();
    $pdo->beginTransaction();
    $rev = next_rev();
    if ($edited) {
        $st = $pdo->prepare('UPDATE messages SET text = ?, edited = 1, rev = ? WHERE chat_id = ? AND message_id = ?');
        $st->execute([mb_substr($text, 0, 4096), $rev, $chatId, (int) $m['message_id']]);
    } else {
        $st = $pdo->prepare('INSERT OR IGNORE INTO messages (chat_id, message_id, rev, date, from_id, from_name, from_username, is_bot, kind, text, file_id, file_name, reply_to)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([$chatId, (int) $m['message_id'], $rev, (int) ($m['date'] ?? time()), $from ? (string) $from['id'] : null, person_name($from, $chat),
            $from['username'] ?? null, !empty($from['is_bot']) ? 1 : 0, $kind, mb_substr($text, 0, 4096), $fileId, $fileName, $m['reply_to_message']['message_id'] ?? null]);
    }
    $up = $pdo->prepare('INSERT INTO chats (chat_id, title, type, last_at, last_text, member) VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title, type = excluded.type, last_at = excluded.last_at, last_text = excluded.last_text, member = 1');
    $up->execute([$chatId, (string) ($chat['title'] ?? ''), (string) $chat['type'], (int) ($m['date'] ?? time()), mb_substr($text, 0, 120)]);
    $pdo->commit();
}

$token = bot_token();
$hook = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? null;
if ($hook !== null) {
    if (!$token || !hash_equals(webhook_secret($token), (string) $hook)) fail(403, 'forbidden');
    $u = json_decode((string) file_get_contents('php://input'), true);
    if (is_array($u)) {
        try {
            if (isset($u['message'])) store_message($u['message'], false);
            elseif (isset($u['channel_post'])) store_message($u['channel_post'], false);
            elseif (isset($u['edited_message'])) store_message($u['edited_message'], true);
            elseif (isset($u['edited_channel_post'])) store_message($u['edited_channel_post'], true);
            elseif (isset($u['my_chat_member']['chat'])) {
                $c = $u['my_chat_member']['chat'];
                $in = in_array($u['my_chat_member']['new_chat_member']['status'] ?? '', ['member', 'administrator', 'creator'], true) ? 1 : 0;
                db()->prepare('INSERT INTO chats (chat_id, title, type, last_at, last_text, member) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title, member = excluded.member')
                    ->execute([(string) $c['id'], (string) ($c['title'] ?? ''), (string) ($c['type'] ?? ''), time(), '', $in]);
            }
        } catch (Throwable $e) {
            // Telegram retries on errors; a message we cannot store is dropped rather than retried forever.
        }
    }
    echo '{"ok":true}';
    exit;
}

// ---------- the app ----------

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $storage = class_exists('PDO') && in_array('sqlite', PDO::getAvailableDrivers(), true);
    echo json_encode(['configured' => $token !== null, 'storage' => $storage]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'method');

function fs_url(string $path): string {
    return 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/databases/' . rawurlencode('(default)') . '/documents/' . $path;
}
/** Reads a Firestore document with the caller's own token: the security rules decide. */
function read_doc(string $path, string $idToken): ?array {
    $ch = curl_init(fs_url($path));
    curl_setopt_array($ch, [CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $idToken], CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $doc = is_string($raw) ? json_decode($raw, true) : null;
    return $status === 200 && isset($doc['fields']) ? $doc['fields'] : null;
}
$sv = fn(?array $f, string $k) => is_string($f[$k]['stringValue'] ?? null) ? $f[$k]['stringValue'] : null;

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+([A-Za-z0-9_\-.]+)$/', $auth, $mm)) fail(401, 'unauthorized');
$idToken = $mm[1];
$parts = explode('.', $idToken);
$payload = count($parts) === 3 ? json_decode((string) base64_decode(strtr($parts[1], '-_', '+/')), true) : null;
$uid = is_array($payload) ? (string) ($payload['user_id'] ?? $payload['sub'] ?? '') : '';
if (!preg_match('/^[A-Za-z0-9_\-]{6,128}$/', $uid)) fail(401, 'unauthorized');
$me = read_doc('authProfiles/' . rawurlencode($uid), $idToken);
if (!$me || ($me['active']['booleanValue'] ?? false) !== true) fail(403, 'forbidden');
$role = $sv($me, 'role') ?? '';
$myName = $sv($me, 'name') ?? 'موظف';
$myUserId = $sv($me, 'userId') ?? $uid;
$isTop = in_array($role, ['admin', 'general_manager'], true);
$isManager = $isTop || in_array($role, ['regional_manager', 'branch_manager'], true);

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) fail(400, 'bad_request');
$action = (string) ($in['action'] ?? '');

if ($action === 'setup') {
    if (!$isTop) fail(403, 'forbidden');
    $new = trim((string) ($in['token'] ?? ''));
    if ($new !== '') {
        if (!preg_match('/^\d{5,15}:[A-Za-z0-9_-]{30,60}$/', $new)) fail(400, 'bad_token');
        $me2 = tg($new, 'getMe');
        if (empty($me2['ok'])) fail(400, 'bad_token');
        if (@file_put_contents(secrets_path(), "<?php\nreturn ['bot_token' => " . var_export($new, true) . "];\n", LOCK_EX) === false) fail(500, 'cannot_save');
        @chmod(secrets_path(), 0600);
        $token = $new;
    }
    if (!$token) fail(400, 'bad_token');
    $url = 'https://' . $_SERVER['HTTP_HOST'] . strtok($_SERVER['REQUEST_URI'], '?');
    $r = tg($token, 'setWebhook', ['url' => $url, 'secret_token' => webhook_secret($token), 'allowed_updates' => ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'my_chat_member'], 'drop_pending_updates' => false]);
    if (empty($r['ok'])) fail(502, 'webhook_failed');
    $action = 'status';
}

if (!$token) fail(503, 'not_configured');

if ($action === 'status') {
    if (!$isTop) fail(403, 'forbidden');
    $bot = tg($token, 'getMe')['result'] ?? [];
    $hookInfo = tg($token, 'getWebhookInfo')['result'] ?? [];
    echo json_encode([
        'bot' => ['username' => $bot['username'] ?? null, 'name' => $bot['first_name'] ?? null, 'readsAllMessages' => (bool) ($bot['can_read_all_group_messages'] ?? false)],
        'webhook' => ['connected' => !empty($hookInfo['url']), 'pending' => (int) ($hookInfo['pending_update_count'] ?? 0), 'lastError' => $hookInfo['last_error_message'] ?? null],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'chats') {
    if (!$isManager) fail(403, 'forbidden');
    $rows = db()->query('SELECT c.chat_id, c.title, c.type, c.last_at, c.last_text, c.member, (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.chat_id) AS n FROM chats c ORDER BY c.last_at DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['chats' => array_map(fn($r) => ['chatId' => $r['chat_id'], 'title' => $r['title'], 'type' => $r['type'], 'lastAt' => (int) $r['last_at'], 'lastText' => $r['last_text'], 'member' => (bool) $r['member'], 'count' => (int) $r['n']], $rows)], JSON_UNESCAPED_UNICODE);
    exit;
}

// The rest works on one group's chat; the chat id comes from the group record this person may read.
$groupId = (string) ($in['groupId'] ?? '');
if (!preg_match('/^[A-Za-z0-9_\-]{1,80}$/', $groupId)) fail(400, 'bad_request');
$group = read_doc('telegramGroups/' . rawurlencode($groupId), $idToken);
if (!$group) fail(403, 'forbidden');
$chatId = $sv($group, 'chatId');
if (!$chatId || !preg_match('/^-?\d{3,20}$/', $chatId)) fail(409, 'not_linked');
if (($group['active']['booleanValue'] ?? true) !== true && !$isManager) fail(403, 'forbidden');

if ($action === 'messages') {
    $after = max(0, (int) ($in['after'] ?? 0));
    if ($after === 0) {
        $st = db()->prepare('SELECT * FROM (SELECT * FROM messages WHERE chat_id = ? ORDER BY message_id DESC LIMIT ' . PAGE . ') ORDER BY message_id ASC');
        $st->execute([$chatId]);
    } else {
        $st = db()->prepare('SELECT * FROM messages WHERE chat_id = ? AND rev > ? ORDER BY message_id ASC LIMIT ' . PAGE);
        $st->execute([$chatId, $after]);
    }
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $rev = (int) db()->query('SELECT IFNULL(MAX(rev), 0) FROM messages')->fetchColumn();
    echo json_encode([
        'rev' => $rev,
        'messages' => array_map(fn($r) => [
            'id' => (int) $r['message_id'], 'date' => (int) $r['date'], 'fromId' => $r['from_id'], 'fromName' => $r['from_name'], 'username' => $r['from_username'],
            'isBot' => (bool) $r['is_bot'], 'kind' => $r['kind'], 'text' => $r['text'], 'fileId' => $r['file_id'], 'fileName' => $r['file_name'],
            'replyTo' => $r['reply_to'] !== null ? (int) $r['reply_to'] : null, 'edited' => (bool) $r['edited'], 'sentBy' => $r['sent_by'],
        ], $rows),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'send') {
    $text = trim((string) ($in['text'] ?? ''));
    if ($text === '' || mb_strlen($text) > MAX_TEXT) fail(400, 'bad_text');
    $esc = fn(string $s) => htmlspecialchars($s, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $r = tg($token, 'sendMessage', ['chat_id' => $chatId, 'text' => '<b>' . $esc($myName) . "</b>\n" . $esc($text), 'parse_mode' => 'HTML', 'disable_web_page_preview' => true]);
    if (empty($r['ok'])) fail(502, 'send_failed');
    $m = $r['result'];
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('INSERT OR IGNORE INTO messages (chat_id, message_id, rev, date, from_id, from_name, from_username, is_bot, kind, text, sent_by) VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)')
        ->execute([$chatId, (int) $m['message_id'], next_rev(), (int) $m['date'], (string) ($m['from']['id'] ?? ''), $myName, 'text', $text, $myUserId]);
    $pdo->commit();
    echo json_encode(['ok' => true, 'id' => (int) $m['message_id']]);
    exit;
}

if ($action === 'file') {
    $fileId = (string) ($in['fileId'] ?? '');
    $st = db()->prepare('SELECT kind, file_name FROM messages WHERE chat_id = ? AND file_id = ? LIMIT 1');
    $st->execute([$chatId, $fileId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) fail(404, 'not_found'); // only files that were posted in this group's chat
    $f = tg($token, 'getFile', ['file_id' => $fileId])['result'] ?? null;
    if (!is_array($f) || empty($f['file_path']) || (int) ($f['file_size'] ?? 0) > 20 * 1024 * 1024) fail(404, 'not_found');
    $ch = curl_init("https://api.telegram.org/file/bot{$token}/" . $f['file_path']);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60]);
    $bytes = curl_exec($ch);
    curl_close($ch);
    if (!is_string($bytes)) fail(502, 'file_failed');
    $ext = strtolower(pathinfo((string) $f['file_path'], PATHINFO_EXTENSION));
    $types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', 'oga' => 'audio/ogg', 'ogg' => 'audio/ogg', 'mp3' => 'audio/mpeg', 'm4a' => 'audio/mp4', 'pdf' => 'application/pdf'];
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="file.' . preg_replace('/[^a-z0-9]/', '', $ext) . '"');
    echo $bytes;
    exit;
}

fail(400, 'bad_request');
