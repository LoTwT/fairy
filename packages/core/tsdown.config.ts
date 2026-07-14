import { defineConfig } from "tsdown"

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  onSuccess: "node scripts/finalize-build.mjs",
  sourcemap: true,
})
