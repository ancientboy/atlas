import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";

type SitesPluginOptions = {
  hostingConfigPath?: string;
  drizzleDir?: string;
  outDir?: string;
};

export function sites(options: SitesPluginOptions = {}): Plugin {
  const hostingConfigPath = options.hostingConfigPath ?? ".openai/hosting.json";
  const drizzleDir = options.drizzleDir ?? "drizzle";
  const outDir = options.outDir ?? "dist";

  return {
    name: "atlas-sites-artifact",
    apply: "build",
    async closeBundle() {
      const hostingTarget = join(outDir, ".openai", "hosting.json");
      const drizzleTarget = join(outDir, ".openai", "drizzle");

      await mkdir(dirname(hostingTarget), { recursive: true });
      const hostingJson = await readFile(hostingConfigPath, "utf8");
      await writeFile(hostingTarget, hostingJson);
      await cp(drizzleDir, drizzleTarget, { recursive: true, force: true });
    },
  };
}
