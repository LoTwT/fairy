import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

export const packageDirectory = fileURLToPath(
  new URL("../../", import.meta.url),
)
export const workspaceDirectory = join(packageDirectory, "../..")

export function listFiles(directory: string, root = directory): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory()
        ? listFiles(path, root)
        : [relative(root, path).split(sep).join("/")]
    })
    .toSorted()
}

/** 实际打包、解包与只依赖本地 tarball 的离线安装，不读取 raw。 */
export function installPackedConsumer(
  temporaryDirectory: string,
  sourceDirectory = packageDirectory,
  includeCore = false,
) {
  execFileSync(
    "corepack",
    ["pnpm", "pack", "--pack-destination", temporaryDirectory],
    {
      cwd: sourceDirectory,
      stdio: "pipe",
      // Packing must never implicitly install into its source, regardless of the test runner.
      env: { ...process.env, pnpm_config_verify_deps_before_run: "false" },
    },
  )
  const tarball = readdirSync(temporaryDirectory).find((file) =>
    file.endsWith(".tgz"),
  )
  if (!tarball) throw new Error("Missing package tarball")
  const tarballPath = join(temporaryDirectory, tarball)
  const unpackedDirectory = join(temporaryDirectory, "unpacked")
  mkdirSync(unpackedDirectory)
  execFileSync("tar", ["-xzf", tarballPath, "-C", unpackedDirectory], {
    stdio: "pipe",
  })
  const packedRoot = join(unpackedDirectory, "package")
  const consumerDirectory = join(temporaryDirectory, "consumer")
  mkdirSync(consumerDirectory)
  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify(
      {
        name: "randomplay-data-packed-consumer",
        private: true,
        type: "module",
        packageManager: JSON.parse(
          readFileSync(join(workspaceDirectory, "package.json"), "utf8"),
        ).packageManager,
        dependencies: {
          "@randomplay/data": `file:${relative(consumerDirectory, tarballPath)}`,
        },
      },
      null,
      2,
    ),
  )
  if (includeCore) {
    const tarballs: Record<string, string> = {}
    const engineDirectory = join(temporaryDirectory, "engines")
    mkdirSync(engineDirectory)
    for (const name of ["core"]) {
      const directory = join(workspaceDirectory, "packages", name)
      execFileSync(
        "corepack",
        ["pnpm", "pack", "--pack-destination", engineDirectory],
        { cwd: directory, stdio: "pipe" },
      )
      const manifest = JSON.parse(
        readFileSync(join(directory, "package.json"), "utf8"),
      )
      tarballs[name] = join(
        engineDirectory,
        `randomplay-${name}-${manifest.version}.tgz`,
      )
    }
    const manifestPath = join(consumerDirectory, "package.json")
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    manifest.dependencies["@randomplay/core"] = `file:${tarballs.core}`
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    writeFileSync(
      join(consumerDirectory, "pnpm-workspace.yaml"),
      `overrides:\n  "@randomplay/core": ${JSON.stringify(`file:${tarballs.core}`)}\n`,
    )
  }
  for (const mode of ["--lockfile-only", "--frozen-lockfile"])
    execFileSync(
      "corepack",
      [
        "pnpm",
        "install",
        "--offline",
        mode,
        ...(includeCore ? [] : ["--ignore-workspace"]),
      ],
      { cwd: consumerDirectory, stdio: "pipe" },
    )
  return { tarballPath, packedRoot, consumerDirectory }
}
