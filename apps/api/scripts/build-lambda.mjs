// Pre-bundle the Lambda into a standalone, workspace-free directory that
// SAM can package as-is (the built-in NodejsNpmBuilder runs `npm install`,
// which doesn't understand pnpm's `workspace:*` protocol — so we don't ship
// the workspace package.json to SAM at all).
//
// Output: apps/api/.lambda-build/
//   ├── forecast.mjs    (esbuild bundle: handler + @combo/shared inlined)
//   ├── forecast.mjs.map
//   └── package.json    ({ "type": "module" }, no deps)

import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const outDir = resolve(apiRoot, ".lambda-build");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(apiRoot, "src/handlers/forecast.ts")],
  outfile: resolve(outDir, "forecast.mjs"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  minify: true,
  sourcemap: true,
  // @aws-sdk is provided by the Lambda Node 24 runtime; everything else
  // (including @combo/shared workspace sources + @sentry/aws-serverless) is
  // inlined into the bundle.
  external: ["@aws-sdk/*"],
  banner: {
    js: "import{createRequire as r}from 'node:module';const require=r(import.meta.url);",
  },
  logLevel: "info",
});

await writeFile(
  resolve(outDir, "package.json"),
  JSON.stringify({ name: "comboweather-forecast", version: "0.1.0", type: "module" }, null, 2) +
    "\n",
);

console.log(`Lambda bundle written to ${outDir}`);
