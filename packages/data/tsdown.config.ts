import { prepareCalculationData } from "./scripts/prepare-calculation-data.ts"
import { rmSync } from "node:fs"
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "tsdown"
import {
  generateCatalog,
  preparePublication,
} from "./scripts/prepare-publication.ts"
import { derivePublishedIndex } from "./scripts/nanoka-integration/published-index.ts"
import {
  verifyIntegratedSnapshot,
  verifyPublishedIntegratedSnapshot,
} from "./scripts/nanoka-integration/snapshot-verify.ts"
import { prepareDefinitions } from "./scripts/prepare-definitions.ts"
import {
  verifyDefinitionsPublication,
  writeMinifiedDefinitionsPublication,
} from "./scripts/definitions-publication.ts"
import {
  verifyMinifiedPublication,
  writeMinifiedPublication,
} from "./scripts/publication-minify.ts"

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
    await prepareDefinitions(
      join(packageDirectory, "definitions"),
      join(buildDirectory, ".generated/definitions"),
      index,
    )
    await prepareCalculationData(
      join(buildDirectory, ".generated"),
      index,
      JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"))
        .version,
    )
    await writeFile(
      join(buildDirectory, ".generated/browser-catalog.ts"),
      await generateCatalog(
        join(buildDirectory, ".generated/integrated"),
        derivePublishedIndex(index),
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
    // 私有 tsconfig：include 与相对导入都解析到本次构建的副本，
    // 类型处理不得跟随包目录下 typecheck 生成的 .generated。
    await writeFile(
      join(buildDirectory, "tsconfig.build.json"),
      `${JSON.stringify(
        {
          extends: "../tsconfig.build.json",
          include: ["src/**/*.ts"],
        },
        null,
        2,
      )}\n`,
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
    tsconfig: join(buildDirectory, "tsconfig.build.json"),
    clean: true,
    dts: { eager: true },
    entry: {
      "index": join(buildDirectory, "src/index.ts"),
      "index.browser": join(buildDirectory, "src/index.browser.ts"),
    },
    outDir: join(packageDirectory, "dist"),
    format: ["esm"],
    sourcemap: false,
    deps: {
      neverBundle: [/\.json$/u],
      alwaysBundle: ["@randomplay/shared"],
      dts: { alwaysBundle: ["@randomplay/shared"] },
    },
    hooks: {
      "build:done": async () => {
        const snapshot = join(buildDirectory, ".generated/integrated")
        const index = await verifyIntegratedSnapshot({
          artifactDirectory: snapshot,
        })
        // 归档副本保持 v3 原字节；dist 发布 v4 索引（成员去掉 sourceRecord）与
        // 其余删除字符串外排版空白的副本，并以清单记录归档摘要 → 发布摘要的映射。
        const publication = await writeMinifiedPublication({
          archiveDirectory: snapshot,
          publicationDirectory: join(packageDirectory, "dist/integrated"),
          manifestPath: join(packageDirectory, "dist/publication.json"),
          index,
        })
        await verifyMinifiedPublication({
          publicationDirectory: join(packageDirectory, "dist/integrated"),
          manifestPath: join(packageDirectory, "dist/publication.json"),
          index,
          archiveDirectory: snapshot,
        })
        // 发布字节按发布验证器复核 v4 结构、身份、派生索引值与发布清单摘要。
        await verifyPublishedIntegratedSnapshot({
          artifactDirectory: join(packageDirectory, "dist/integrated"),
          expectedArchiveIndex: index,
          publicationDigests: (path: string) =>
            publication.files[path]?.publicationSha256,
        })
        // definitions 归档保持原字节；dist 只发布删除字符串外排版空白的副本，
        // 并以独立清单记录归档摘要 → 发布摘要的字节级映射。
        const definitionsDirectory = join(
          buildDirectory,
          ".generated/definitions",
        )
        const publishedDefinitionsDirectory = join(
          packageDirectory,
          "dist/definitions",
        )
        const definitionsManifestPath = join(
          packageDirectory,
          "dist/definitions-publication.json",
        )
        await writeMinifiedDefinitionsPublication({
          archiveDirectory: definitionsDirectory,
          publicationDirectory: publishedDefinitionsDirectory,
          manifestPath: definitionsManifestPath,
        })
        await verifyDefinitionsPublication({
          publicationDirectory: publishedDefinitionsDirectory,
          manifestPath: definitionsManifestPath,
          archiveDirectory: definitionsDirectory,
        })
        await rm(buildDirectory, { recursive: true, force: true })
      },
    },
  }
})
