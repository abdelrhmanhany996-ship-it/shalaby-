import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

export function shalabyPWA(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "shalaby-pwa",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      const output = path.resolve(config.root, config.build.outDir);
      const walk = async (directory: string): Promise<string[]> => {
        const entries = await readdir(directory, { withFileTypes: true });
        const groups = await Promise.all(
          entries.map((entry) =>
            entry.isDirectory()
              ? walk(path.join(directory, entry.name))
              : Promise.resolve([path.join(directory, entry.name)]),
          ),
        );
        return groups.flat();
      };
      const files = (await walk(output))
        .map((file) => path.relative(output, file).split(path.sep).join("/"))
        .sort();
      const staticFiles = files.filter(
        (file) =>
          /^(assets|fonts|icons)\/.*\.(js|css|woff2|png|svg|ico)$/.test(file) ||
          file === "offline.html",
      );
      const hash = createHash("sha256");
      for (const file of [
        ...staticFiles,
        "index.html",
        "manifest.webmanifest",
      ]) {
        hash.update(file).update(await readFile(path.join(output, file)));
      }
      const source = await readFile(
        path.join(config.root, "scripts/pwa-service-worker.js"),
        "utf8",
      );
      const base = config.base;
      const worker = source
        .replace(
          "__PWA_CACHE__",
          JSON.stringify(`shalaby-static-${hash.digest("hex").slice(0, 16)}`),
        )
        .replace(
          "__PWA_FILES__",
          JSON.stringify(staticFiles.map((file) => `${base}${file}`)),
        );
      await writeFile(path.join(output, "sw.js"), worker);
    },
  };
}
