import { rmSync } from "node:fs"
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "tsdown"
import {
  generateCatalog,
  preparePublication,
} from "./scripts/prepare-publication.ts"
import { verifyIntegratedSnapshot } from "./scripts/nanoka-integration/snapshot-verify.ts"

/** 静态 definitions 制品逐文件字节复验；与 integrated 的受管理协议无关。 */
async function verifyDefinitionsSnapshot({
  packageDirectory,
}: {
  packageDirectory: string
}): Promise<void> {
  const sourceRoot = join(packageDirectory, "definitions")
  const distRoot = join(packageDirectory, "dist/definitions")
  const entries = await readdir(sourceRoot, {
    recursive: true,
    withFileTypes: true,
  })
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }
    const relativePath = entry.parentPath
      ? `${entry.parentPath}/${entry.name}`.replace(`${sourceRoot}/`, "")
      : entry.name
    const [sourceBytes, distBytes] = await Promise.all([
      readFile(join(sourceRoot, relativePath)),
      readFile(join(distRoot, relativePath)),
    ])
    if (sourceBytes.length !== distBytes.length) {
      throw new Error(
        `definitions artifact mismatch for ${relativePath}: dist size differs from the tracked source`,
      )
    }
    for (let index = 0; index < sourceBytes.length; index += 1) {
      if (sourceBytes[index] !== distBytes[index]) {
        throw new Error(
          `definitions artifact mismatch for ${relativePath}: dist bytes differ from the tracked source`,
        )
      }
    }
  }
}

export default defineConfig(async (options) => {
  if (options.watch)
    throw new Error(
      "Watch builds are not supported; run pnpm build for a fresh publication snapshot",
    )

  const packageDirectory = fileURLToPath(new URL(".", import.meta.url))
  // Each build owns its complete input, independent of typecheck/test generation and later source updates.
  const buildDirectory = await mkdtemp(join(packageDirectory, ".publication-"))
  try {
    await cp(join(packageDirectory, "src"), join(buildDirectory, "src"), {
      recursive: true,
    })
    const index = await preparePublication(
      join(packageDirectory, "integrated"),
      join(buildDirectory, ".generated"),
    )
    await writeFile(
      join(buildDirectory, ".generated/browser-catalog.ts"),
      await generateCatalog(
        join(buildDirectory, ".generated/integrated"),
        index,
        false,
      ),
    )
    await writeFile(
      join(buildDirectory, "src/index.browser.ts"),
      (await readFile(join(buildDirectory, "src/index.ts"), "utf8")).replaceAll(
        "../.generated/catalog.ts",
        "../.generated/browser-catalog.ts",
      ),
    )
  } catch (error) {
    await rm(buildDirectory, { recursive: true, force: true })
    throw error
  }
  // Clean only this invocation's temporary input, including when compilation fails.
  process.once("exit", () => {
    rmSync(buildDirectory, { recursive: true, force: true })
  })

  return {
    cwd: buildDirectory,
    tsconfig: join(packageDirectory, "tsconfig.json"),
    clean: true,
    dts: true,
    entry: {
      "index": join(buildDirectory, "src/index.ts"),
      "index.browser": join(buildDirectory, "src/index.browser.ts"),
    },
    outDir: join(packageDirectory, "dist"),
    format: ["esm"],
    sourcemap: false,
    deps: { neverBundle: [/\.json$/u] },
    hooks: {
      "build:done": async () => {
        const snapshot = join(buildDirectory, ".generated/integrated")
        await verifyIntegratedSnapshot({ artifactDirectory: snapshot })
        await cp(snapshot, join(packageDirectory, "dist/integrated"), {
          recursive: true,
        })
        await verifyIntegratedSnapshot({
          artifactDirectory: join(packageDirectory, "dist/integrated"),
        })
        await cp(
          join(packageDirectory, "definitions"),
          join(packageDirectory, "dist/definitions"),
          { recursive: true },
        )
        await verifyDefinitionsSnapshot({
          packageDirectory,
        })
        await rm(buildDirectory, { recursive: true, force: true })
      },
    },
  }
})
