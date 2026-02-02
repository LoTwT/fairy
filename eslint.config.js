// @ts-check

import { defineConfig } from "@ayingott/eslint-config"

export default defineConfig({
  typescript: true,
}).append({
  files: ["packages/zzz-data/data/**/*.json"],
  rules: {
    "antfu/consistent-list-newline": "off",
  },
})
