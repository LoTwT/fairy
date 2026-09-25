import { readFileSync } from "node:fs"
import { defineConfig } from "tsdown"

export default defineConfig({
  define: {
    FAIRY_PACKAGE_VERSION: JSON.stringify(
      JSON.parse(
        readFileSync(new URL("./package.json", import.meta.url), "utf8"),
      ).version,
    ),
  },
  clean: true,
  tsconfig: "tsconfig.build.json",
  dts: { eager: true },
  deps: {
    alwaysBundle: ["@randomplay/shared"],
    dts: { alwaysBundle: ["@randomplay/shared"] },
  },
  entry: ["src/index.ts"],
  format: ["esm"],
  sourcemap: true,
})
