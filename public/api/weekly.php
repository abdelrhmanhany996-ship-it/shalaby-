<?php
/**
 * The weekly sales report, made by a server cron job (nobody has to open the app):
 *
 *   php api/weekly.php                       the week that contains today (Saturday to Friday, Cairo time)
 *   php api/weekly.php --from=2026-10-24 --to=2026-10-30
 *   php api/weekly.php --dry                 prints the report and saves/sends nothing
 *
 * It reads users, purchases and targets with the service account (crm-firebase-admin.json, the same file api/admin.php uses,
 * kept outside public_html), works out what each person sold against their target for the period, saves it in
 * weeklyReports/{from} (the app lists it on the sales report page for the owner and the sales managers) and, when
 * crm-weekly.php next to it names a Telegram chat (['telegram_chat_id' => '-100…']) and the Telegram bot is set up, sends the
 * short text there too. Run from the command line only: it cannot be reached from the web.
 *
 * The maths is the same as src/lib/salesReport.ts (tests/weekly-parity keeps them equal).
 */
declare(strict_types=1);

const FIREBASE_PROJECT_ID = 'shalaby-crm-eg';
const DEPARTMENTS = ['construction', 'decor', 'garden', 'general'];

// ---------- the report (pure) ----------

function days_in_month(string $m): int {
    [$y, $mo] = array_map('intval', explode('-', $m));
    return (int) date('t', mktime(0, 0, 0, $mo, 1, $y));
}

function shift_month(string $m, int $by): string {
    [$y, $mo] = array_map('intval', explode('-', $m));
    $t = mktime(0, 0, 0, $mo + $by, 1, $y);
    return date('Y-m', $t);
}

function add_days(string $date, int $days): string {
    return date('Y-m-d', strtotime($date . ' ' . ($days >= 0 ? '+' : '') . $days . ' days'));
}

/** Saturday to Friday around $today (YYYY-MM-DD). */
function week_range(string $today): array {
    $dow = (int) date('w', strtotime($today . ' 12:00:00')); // Sunday = 0 ... Saturday = 6
    $from = add_days($today, -(($dow + 1) % 7));
    return [$from, add_days($from, 6)];
}

/** What a purchase counts for a target: its per-department split, restricted to the departments that count. */
function booking_counted(array $b, array $wanted): float {
    $amounts = $b['departmentAmounts'] ?? null;
    $sum = 0.0;
    foreach ($wanted as $dep) {
        if (is_array($amounts)) $sum += (float) ($amounts[$dep] ?? 0);
        elseif (($b['department'] ?? 'general') === $dep) $sum += (float) ($b['amount'] ?? 0);
    }
    return $sum;
}

function target_for_period(string $userId, string $from, string $to, array $targets, float $defaultAmount): int {
    if ($to < $from) return 0;
    $total = 0.0;
    for ($m = substr($from, 0, 7); $m <= substr($to, 0, 7); $m = shift_month($m, 1)) {
        $amount = $targets["tgt-$userId-$m"] ?? $defaultAmount;
        $dim = days_in_month($m);
        $start = $m === substr($from, 0, 7) ? (int) substr($from, 8, 2) : 1;
        $end = $m === substr($to, 0, 7) ? (int) substr($to, 8, 2) : $dim;
        $total += $amount * max(0, $end - $start + 1) / $dim;
    }
    return (int) round($total);
}

/**
 * @param array $users    [{id,name,role,active}]
 * @param array $bookings [{id,agentId,amount,bookingDate,bookingStatus,paymentStatus?,department?,departmentAmounts?}]
 * @param array $targets  ['tgt-<user>-<YYYY-MM>' => amount]
 * @param array $settings ['departments' => [...], 'defaultAmount' => n]
 */
function build_report(array $users, array $bookings, array $targets, array $settings, string $from, string $to): array {
    $wanted = !empty($settings['departments']) ? $settings['departments'] : DEPARTMENTS;
    $default = (float) ($settings['defaultAmount'] ?? 0);
    $rows = [];
    foreach ($users as $u) {
        if (empty($u['active']) || ($u['role'] ?? '') === 'admin') continue;
        $sold = 0.0;
        $deals = 0;
        $seen = [];
        foreach ($bookings as $b) {
            $d = substr((string) ($b['bookingDate'] ?? ''), 0, 10);
            if (($b['agentId'] ?? '') !== $u['id'] || $d < $from || $d > $to || isset($seen[$b['id']])) continue;
            $seen[$b['id']] = true;
            if (($b['bookingStatus'] ?? '') === 'cancelled' || ($b['paymentStatus'] ?? '') === 'refunded') continue;
            $c = booking_counted($b, $wanted);
            $sold += $c;
            if ($c > 0) $deals++;
        }
        $target = target_for_period($u['id'], $from, $to, $targets, $default);
        $rows[] = [
            'userId' => $u['id'], 'name' => $u['name'], 'sold' => (int) round($sold), 'deals' => $deals, 'target' => $target,
            'percent' => $target > 0 ? round($sold / $target * 1000) / 10 : 0,
        ];
    }
    usort($rows, fn($a, $b) => [$b['sold'], $a['name']] <=> [$a['sold'], $b['name']]);
    $sold = array_sum(array_column($rows, 'sold'));
    $target = array_sum(array_column($rows, 'target'));
    return [
        'from' => $from, 'to' => $to, 'rows' => $rows,
        'total' => ['sold' => $sold, 'deals' => array_sum(array_column($rows, 'deals')), 'target' => $target, 'percent' => $target > 0 ? round($sold / $target * 1000) / 10 : 0],
    ];
}

function report_text(array $r): string {
    $n = fn($x) => number_format((float) $x, 0, '.', ',');
    $lines = ["تقرير المبيعات الأسبوعي من {$r['from']} إلى {$r['to']}"];
    foreach ($r['rows'] as $x) {
        $lines[] = $x['name'] . ': باع ' . $n($x['sold']) . ' ج.م' . ($x['target'] ? ' من هدف ' . $n($x['target']) . ' (' . $x['percent'] . '٪)' . ($x['percent'] > 100 ? ' ⭐' : '') : ' (بدون هدف)');
    }
    $t = $r['total'];
    $lines[] = 'الإجمالي: ' . $n($t['sold']) . ' ج.م' . ($t['target'] ? ' من ' . $n($t['target']) . ' (' . $t['percent'] . '٪)' : '');
    return implode("\n", $lines);
}

// ---------- Firestore (service account) ----------

function find_file(string $name): ?string {
    foreach ([2, 3, 4, 5] as $up) {
        $p = dirname(__DIR__, $up) . '/' . $name;
        if (is_file($p)) return $p;
    }
    $home = getenv('HOME');
    return $home && is_file(rtrim($home, '/') . '/' . $name) ? rtrim($home, '/') . '/' . $name : null;
}

function b64url(string $s): string {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function http(string $method, string $url, array $headers = [], $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    return [$status, is_array($data) ? $data : []];
}

function google_token(array $sa): ?string {
    $now = time();
    $claims = ['iss' => $sa['client_email'], 'scope' => 'https://www.googleapis.com/auth/cloud-platform', 'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3000];
    $input = b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . b64url(json_encode($claims));
    if (!openssl_sign($input, $sig, $sa['private_key'], 'sha256')) return null;
    [$status, $data] = http('POST', 'https://oauth2.googleapis.com/token', ['Content-Type: application/x-www-form-urlencoded'],
        http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $input . '.' . b64url($sig)]));
    return $status === 200 && !empty($data['access_token']) ? (string) $data['access_token'] : null;
}

function fs_base(): string {
    return 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/databases/' . rawurlencode('(default)') . '/documents';
}

/** A Firestore typed value as a plain PHP value. */
function fv(array $v) {
    if (isset($v['stringValue'])) return $v['stringValue'];
    if (isset($v['integerValue'])) return (int) $v['integerValue'];
    if (isset($v['doubleValue'])) return (float) $v['doubleValue'];
    if (isset($v['booleanValue'])) return (bool) $v['booleanValue'];
    if (isset($v['arrayValue'])) return array_map('fv', $v['arrayValue']['values'] ?? []);
    if (isset($v['mapValue'])) return array_map('fv', $v['mapValue']['fields'] ?? []);
    return null;
}
function doc_fields(array $doc): array {
    return array_map('fv', $doc['fields'] ?? []);
}

function list_docs(string $collection, string $token): array {
    $out = [];
    $page = '';
    do {
        [$status, $data] = http('GET', fs_base() . '/' . $collection . '?pageSize=300' . ($page ? '&pageToken=' . urlencode($page) : ''), ['Authorization: Bearer ' . $token]);
        if ($status !== 200) throw new RuntimeException("read $collection failed ($status)");
        foreach ($data['documents'] ?? [] as $d) $out[] = doc_fields($d);
        $page = (string) ($data['nextPageToken'] ?? '');
    } while ($page);
    return $out;
}

function query_bookings(string $from, string $to, string $token): array {
    $body = ['structuredQuery' => [
        'from' => [['collectionId' => 'bookings']],
        'where' => ['compositeFilter' => ['op' => 'AND', 'filters' => [
            ['fieldFilter' => ['field' => ['fieldPath' => 'bookingDate'], 'op' => 'GREATER_THAN_OR_EQUAL', 'value' => ['stringValue' => $from]]],
            ['fieldFilter' => ['field' => ['fieldPath' => 'bookingDate'], 'op' => 'LESS_THAN_OR_EQUAL', 'value' => ['stringValue' => $to . '~']]],
        ]]],
    ]];
    [$status, $data] = http('POST', fs_base() . ':runQuery', ['Authorization: Bearer ' . $token, 'Content-Type: application/json'], json_encode($body));
    if ($status !== 200) throw new RuntimeException("read bookings failed ($status)");
    $out = [];
    foreach ($data as $row) if (isset($row['document'])) $out[] = doc_fields($row['document']);
    return $out;
}

function save_report(array $r, string $text, string $token): void {
    $doc = ['fields' => [
        'id' => ['stringValue' => $r['from']], 'from' => ['stringValue' => $r['from']], 'to' => ['stringValue' => $r['to']],
        'createdAt' => ['stringValue' => gmdate('c')], 'text' => ['stringValue' => $text],
        'rowsJson' => ['stringValue' => json_encode($r['rows'], JSON_UNESCAPED_UNICODE)],
        'totalJson' => ['stringValue' => json_encode($r['total'])],
    ]];
    [$status] = http('PATCH', fs_base() . '/weeklyReports/' . rawurlencode($r['from']), ['Authorization: Bearer ' . $token, 'Content-Type: application/json'], json_encode($doc));
    if ($status !== 200) throw new RuntimeException("save report failed ($status)");
}

function send_telegram(string $text): ?string {
    $cfgPath = find_file('crm-weekly.php');
    $tgPath = find_file('crm-telegram-secrets.php');
    if (!$cfgPath || !$tgPath) return null;
    $cfg = @include $cfgPath;
    $tg = @include $tgPath;
    $chat = is_array($cfg) ? (string) ($cfg['telegram_chat_id'] ?? '') : '';
    $token = is_array($tg) ? (string) ($tg['bot_token'] ?? '') : '';
    if ($chat === '' || $token === '') return null;
    [$status, $data] = http('POST', "https://api.telegram.org/bot{$token}/sendMessage", ['Content-Type: application/json'], json_encode(['chat_id' => $chat, 'text' => $text]));
    return $status === 200 ? 'sent' : 'telegram_failed_' . $status . ':' . ($data['description'] ?? '');
}

function run(array $argv): int {
    date_default_timezone_set('Africa/Cairo');
    $opts = [];
    foreach (array_slice($argv, 1) as $a) if (preg_match('/^--([a-z]+)(?:=(.*))?$/', $a, $m)) $opts[$m[1]] = $m[2] ?? true;
    $today = date('Y-m-d');
    [$from, $to] = isset($opts['from'], $opts['to']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $opts['from']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $opts['to']) ? [$opts['from'], $opts['to']] : week_range($today);

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
    try {
        // Targets count whole months, so purchases are read from the first day of the earliest month touched.
        $monthStart = substr($from, 0, 7) . '-01';
        $users = list_docs('users', $token);
        $bookings = query_bookings(min($from, $monthStart), $to, $token);
        $targets = [];
        foreach (list_docs('employeeTargets', $token) as $t) if (isset($t['id'], $t['amount'])) $targets[$t['id']] = (float) $t['amount'];
        [$status, $s] = http('GET', fs_base() . '/settings/targets', ['Authorization: Bearer ' . $token]);
        $settings = $status === 200 ? doc_fields($s) : [];
        $report = build_report($users, $bookings, $targets, $settings, $from, $to);
        $text = report_text($report);
        echo $text . "\n";
        if (isset($opts['dry'])) return 0;
        save_report($report, $text, $token);
        $tg = send_telegram($text);
        echo 'saved weeklyReports/' . $from . ($tg ? " ($tg)" : '') . "\n";
        return 0;
    } catch (Throwable $e) {
        fwrite(STDERR, 'failed: ' . $e->getMessage() . "\n");
        return 1;
    }
}

if (PHP_SAPI === 'cli' && isset($argv[0]) && realpath($argv[0]) === __FILE__) exit(run($argv));
if (PHP_SAPI !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'cli_only']);
}
