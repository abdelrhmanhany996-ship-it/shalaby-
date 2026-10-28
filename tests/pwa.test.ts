import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function worker() {
  const listeners = new Map<string, (event: any) => void>();
  const store = new Map([
    ["/offline.html", new Response("offline")],
    ["/assets/app.js", new Response("static asset")],
  ]);
  const deleted: string[] = [],
    added: string[][] = [];
  let skipped = 0,
    claimed = 0,
    requests = 0,
    offline = false;
  const cache = {
    match: async (path: string) => store.get(path),
    put: async (path: string, response: Response) => store.set(path, response),
    addAll: async (urls: string[]) => {
      added.push(urls);
    },
  };
  const source = readFileSync(
    new URL("../scripts/pwa-service-worker.js", import.meta.url),
    "utf8",
  )
    .replace("__PWA_CACHE__", JSON.stringify("shalaby-static-current"))
    .replace(
      "__PWA_FILES__",
      JSON.stringify(["/offline.html", "/assets/app.js"]),
    );
  vm.runInNewContext(source, {
    URL,
    Response,
    Set,
    self: {
      location: { origin: "https://crm.test" },
      registration: { scope: "https://crm.test/" },
      clients: {
        claim: async () => {
          claimed++;
        },
      },
      skipWaiting: async () => {
        skipped++;
      },
      addEventListener: (name: string, handler: (event: any) => void) =>
        listeners.set(name, handler),
    },
    caches: {
      open: async () => cache,
      keys: async () => [
        "shalaby-static-old",
        "shalaby-static-current",
        "another-application",
      ],
      delete: async (name: string) => {
        deleted.push(name);
      },
    },
    fetch: async () => {
      requests++;
      if (offline) throw new Error("offline");
      return new Response("network");
    },
  });
  const dispatch = async (
    name: string,
    extra: Record<string, unknown> = {},
  ) => {
    let response: Promise<Response> | undefined,
      work: Promise<unknown> | undefined;
    listeners.get(name)!({
      ...extra,
      respondWith: (p: Promise<Response>) => {
        response = p;
      },
      waitUntil: (p: Promise<unknown>) => {
        work = p;
      },
    });
    await work;
    return response;
  };
  const request = (url: string, mode = "cors", method = "GET") =>
    dispatch("fetch", { request: { url, mode, method } });
  return {
    dispatch,
    request,
    added,
    deleted,
    setOffline: () => {
      offline = true;
    },
    counts: () => ({ skipped, claimed, requests }),
  };
}
test("PWA installation caches static assets without automatically replacing the active worker", async () => {
  const w = worker();
  await w.dispatch("install");
  assert.deepEqual(Array.from(w.added[0]), ["/offline.html", "/assets/app.js"]);
  assert.equal(w.counts().skipped, 0);
});
test("PWA cache cleanup only deletes older caches belonging to this application", async () => {
  const w = worker();
  await w.dispatch("activate");
  assert.deepEqual(w.deleted, ["shalaby-static-old"]);
  assert.equal(w.counts().claimed, 1);
});
test("reopening the CRM checks the network and shows a data-free page offline", async () => {
  const w = worker();
  assert.equal(
    await (await w.request("https://crm.test/", "navigate"))!.text(),
    "network",
  );
  w.setOffline();
  assert.equal(
    await (await w.request("https://crm.test/", "navigate"))!.text(),
    "offline",
  );
});
test("PWA never intercepts CRM API responses, posts, third-party calls or query strings", async () => {
  const w = worker();
  for (const [url, method] of [
    ["https://crm.test/api/customers", "GET"],
    ["https://crm.test/api/permissions", "GET"],
    ["https://crm.test/assets/app.js?token=private", "GET"],
    ["https://crm.test/assets/app.js", "POST"],
    ["https://external.test/assets/app.js", "GET"],
  ]) {
    assert.equal(await w.request(url, "cors", method), undefined);
  }
  assert.equal(w.counts().requests, 0);
});
test("offline static files come from the explicit precache list", async () => {
  const w = worker();
  w.setOffline();
  assert.equal(
    await (await w.request("https://crm.test/assets/app.js"))!.text(),
    "static asset",
  );
  assert.equal(w.counts().requests, 0);
});
test("new PWA versions only activate immediately after an explicit update message", async () => {
  const w = worker();
  await w.dispatch("message", { data: { type: "OTHER" } });
  assert.equal(w.counts().skipped, 0);
  await w.dispatch("message", { data: { type: "ACTIVATE_UPDATE" } });
  assert.equal(w.counts().skipped, 1);
});
