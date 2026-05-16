import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("..", import.meta.url))

const thresholds = {
  packedBytes: 3 * 1024 * 1024,
  unpackedBytes: 45 * 1024 * 1024,
  distIndexBytes: 256 * 1024,
  distTotalBytes: 512 * 1024,
}

function formatBytes(bytes) {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

function assertWithin(label, actual, limit) {
  if (actual > limit)
    throw new Error(`${label} is ${formatBytes(actual)}, above ${formatBytes(limit)}`)
}

function packMetadata() {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: packageDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  const result = JSON.parse(output)
  const metadata = result[0]
  if (!metadata)
    throw new Error("npm pack --dry-run returned no package metadata")
  return metadata
}

const metadata = packMetadata()
const files = metadata.files ?? []
const distIndex = files.find(file => file.path === "dist/index.mjs")
const distFiles = files.filter(file => file.path.startsWith("dist/"))
const distTotalBytes = distFiles.reduce((sum, file) => sum + file.size, 0)

if (!distIndex)
  throw new Error("dist/index.mjs is missing from the package payload")

assertWithin("packed package size", metadata.size, thresholds.packedBytes)
assertWithin("unpacked package size", metadata.unpackedSize, thresholds.unpackedBytes)
assertWithin("dist/index.mjs size", distIndex.size, thresholds.distIndexBytes)
assertWithin("dist total size", distTotalBytes, thresholds.distTotalBytes)

console.log([
  "package size guard passed",
  `packed=${formatBytes(metadata.size)} <= ${formatBytes(thresholds.packedBytes)}`,
  `unpacked=${formatBytes(metadata.unpackedSize)} <= ${formatBytes(thresholds.unpackedBytes)}`,
  `dist/index.mjs=${formatBytes(distIndex.size)} <= ${formatBytes(thresholds.distIndexBytes)}`,
  `distTotal=${formatBytes(distTotalBytes)} <= ${formatBytes(thresholds.distTotalBytes)}`,
].join("\n"))
