import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { periodReport } from "../src/lib/salesReport";
import { defaultTargetSettings } from "../src/lib/targets";
import type { Booking, User } from "../src/types/crm";

const hasPhp = spawnSync("php", ["-v"]).status === 0;

test("the weekly cron script (api/weekly.php) works out the same report as the app", { skip: !hasPhp && "php is not installed" }, () => {
  const users = [
    { id: "u1", name: "أحمد", role: "sales_agent", active: true },
    { id: "u2", name: "منى", role: "branch_manager", active: true },
    { id: "u3", name: "قديم", role: "sales_agent", active: false },
    { id: "dev", name: "مطور", role: "admin", active: true },
  ] as User[];
  const bk = (id: string, agentId: string, amount: number, bookingDate: string, extra: Record<string, unknown> = {}) =>
    ({ id, agentId, amount, bookingDate, bookingStatus: "completed", department: "general", ...extra }) as unknown as Booking;
  const bookings = [
    bk("1", "u1", 400000, "2026-10-25"),
    bk("2", "u1", 150000, "2026-10-28", { departmentAmounts: { general: 100000, decor: 50000 } }),
    bk("3", "u1", 99999, "2026-10-26", { bookingStatus: "cancelled" }),
    bk("4", "u2", 250000, "2026-10-30"),
    bk("5", "u2", 70000, "2026-10-23"), // before the week
    bk("6", "u1", 5000, "2026-10-27", { paymentStatus: "refunded" }),
  ];
  const targets = [{ id: "tgt-u1-2026-10", userId: "u1", amount: 3100000 }, { id: "tgt-u2-2026-10", userId: "u2", amount: 620000 }] as any[];
  const settings = { ...defaultTargetSettings, defaultAmount: 0 };
  const from = "2026-10-24";
  const to = "2026-10-30";
  const ts = periodReport({ users, bookings, targets, settings, from, to });

  const php = `
    require ${JSON.stringify(new URL("../public/api/weekly.php", import.meta.url).pathname)};
    $d = json_decode(file_get_contents('php://stdin'), true);
    $t = []; foreach ($d['targets'] as $x) $t[$x['id']] = $x['amount'];
    echo json_encode(build_report($d['users'], $d['bookings'], $t, $d['settings'], $d['from'], $d['to']));
  `;
  const r = spawnSync("php", ["-r", php], { input: JSON.stringify({ users, bookings, targets, settings, from, to }), encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const pick = (rows: { userId: string; sold: number; deals: number; target: number; percent: number }[]) => rows.map(({ userId, sold, deals, target, percent }) => ({ userId, sold, deals, target, percent }));
  assert.deepEqual(pick(out.rows), pick(ts.rows));
  assert.deepEqual(out.total, ts.total);
});
