import { readFileSync } from "node:fs"
import { defineConfig } from "vitest/config"

export default defineConfig({
  define: {
    FAIRY_PACKAGE_VERSION: JSON.stringify(
      JSON.parse(
        readFileSync(new URL("./package.json", import.meta.url), "utf8"),
      ).version,
    ),
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
})
