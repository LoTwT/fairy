#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { versionBump } from "bumpp"

const usage =
  "Usage: pnpm release:bump [version|major|minor|patch|premajor|preminor|prepatch|prerelease|next|conventional]"
const [, , releaseArg, ...extraArgs] = process.argv

if (extraArgs.length) {
  console.error(usage)
  process.exit(1)
}

const sh = (command, args) => execFileSync(command, args, { encoding: "utf8" }).trim()
const branch = sh("git", ["branch", "--show-current"])

if (branch !== "main") {
  console.error(`Release bump must run from main, got ${branch || "(detached HEAD)"}`)
  process.exit(1)
}

try {
  sh("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
}
catch {
  console.error("Release bump requires main to have an upstream branch before bumpp pushes the release tag.")
  process.exit(1)
}

const release = releaseArg ?? "patch"

await versionBump({
  release,
  files: [
    "package.json",
    "packages/core/package.json",
    "packages/data/package.json",
    "packages/cli/package.json",
  ],
  commit: true,
  tag: true,
  push: true,
  install: false,
  recursive: false,
  noGitCheck: false,
})
