import { execSync } from "node:child_process"
import { resolve } from "node:path"
import { defineConfig } from "bumpp"

export default defineConfig({
  files: [
    "package.json",
    "packages/*/package.json",
  ],
  commit: true,
  tag: true,
  push: true,
  install: false,
  recursive: false,
  noGitCheck: false,
  execute: (operation) => {
    execSync("pnpm changelog", {
      cwd: operation.options.cwd,
      stdio: "inherit",
    })

    operation.update({
      updatedFiles: [
        ...operation.state.updatedFiles,
        resolve(operation.options.cwd, "CHANGELOG.md"),
      ],
    })
  },
})
