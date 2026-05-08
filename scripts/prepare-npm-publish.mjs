#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const [, , version, ...extraArgs] = process.argv

if (!version || extraArgs.length) {
  console.error("Usage: node scripts/prepare-npm-publish.mjs <version>")
  process.exit(1)
}

const publishDirectories = ["packages/core", "packages/data", "packages/cli"]
const root = process.cwd()

const readJson = path => JSON.parse(readFileSync(path, "utf8"))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const manifests = publishDirectories.map((directory) => {
  const path = join(root, directory, "package.json")
  return { directory, path, manifest: readJson(path) }
})
const publishNames = new Set(manifests.map(({ manifest }) => manifest.name))

for (const { directory, manifest } of manifests) {
  if (manifest.version !== version) {
    console.error(`${directory}/package.json version ${manifest.version} != ${version}`)
    process.exit(1)
  }
  if (manifest.private === true) {
    console.error(`${manifest.name} is private and cannot be published`)
    process.exit(1)
  }
}

let changed = false

for (const { path, manifest } of manifests) {
  for (const key of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    const dependencies = manifest[key]
    if (!dependencies) continue

    for (const [name, specifier] of Object.entries(dependencies)) {
      if (!publishNames.has(name)) continue
      if (typeof specifier !== "string") continue
      if (specifier.startsWith("workspace:")) {
        dependencies[name] = version
        changed = true
      }
    }
  }

  writeJson(path, manifest)
}

for (const { directory, manifest } of manifests) {
  for (const key of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    const dependencies = manifest[key] ?? {}
    for (const [name, specifier] of Object.entries(dependencies)) {
      if (publishNames.has(name) && specifier !== version) {
        console.error(`${directory}/package.json ${key}.${name} ${specifier} != ${version}`)
        process.exit(1)
      }
      if (typeof specifier === "string" && specifier.startsWith("workspace:")) {
        console.error(`${directory}/package.json still contains workspace protocol: ${key}.${name}`)
        process.exit(1)
      }
    }
  }
}

console.log(changed ? `Prepared npm publish manifests for ${version}` : `npm publish manifests already prepared for ${version}`)
