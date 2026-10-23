import type {
  AgentActionsManifest,
  PanelAttributesManifest,
  StaticEffectsProduct,
} from "./manifests.ts"

/**
 * 依赖检查的节点使用相对 `packages/data` 的稳定路径，便于与文档、
 * manifest 声明和实际文件直接对照。
 */
export const artifactDependencyPaths = {
  integratedIndex: "integrated/index.json",
  panelAttributesManifest: "definitions/attributes/manifest.json",
  agentActionsManifest: "definitions/skills/manifest.json",
  staticCatalog: "definitions/effects/static-catalog.json",
  staticCoverage: "definitions/effects/static-coverage.json",
  skillsRegistry: "scripts/skills/registry.json",
  sourceManifest: "scripts/static-effects/source-manifest.json",
} as const

export type DependencyNodeKind =
  | "integrated-index"
  | "manifest"
  | "integrated-input"
  | "definition-artifact"
  | "static-catalog"
  | "static-coverage"
  | "skills-registry"
  | "source-manifest"

export type DependencyEdgeKind =
  | "source-version"
  | "input"
  | "artifact"
  | "static-catalog"
  | "skills-registry"
  | "source-files"

export type DependencyViolationCode =
  | "source-version-mismatch"
  | "input-missing"
  | "input-sha256-mismatch"
  | "artifact-missing"
  | "artifact-sha256-mismatch"
  | "static-catalog-sha256-mismatch"
  | "skills-registry-missing"
  | "skills-registry-sha256-mismatch"
  | "source-manifest-missing"
  | "source-file-missing"
  | "source-file-extra"
  | "source-file-sha256-mismatch"

export interface DependencyNode {
  readonly id: string
  readonly kind: DependencyNodeKind
}

export interface DependencyEdge {
  readonly from: string
  readonly to: string
  readonly kind: DependencyEdgeKind
}

export interface DependencyViolation {
  readonly code: DependencyViolationCode
  /** 违规关联的图节点，通常是 manifest、制品或输入文件。 */
  readonly node: string
  /** 节点内部的具体来源文件；与节点路径相同时省略。 */
  readonly path?: string
  readonly expected: string
  readonly actual: string
}

/** 已读取的实际文件摘要；`sha256` 缺失表示文件不可读。 */
export interface DependencyFileDigest {
  readonly path: string
  readonly sha256?: string
}

export interface ArtifactDependencyInputs {
  readonly panelAttributes: PanelAttributesManifest
  readonly agentActions: AgentActionsManifest
  /** P1-1 已校验三制品身份与 catalog/coverage 来源一致。 */
  readonly staticEffects: StaticEffectsProduct
  readonly integratedSourceVersion: string
  readonly integratedInputFiles: readonly DependencyFileDigest[]
  readonly definitionArtifactFiles: readonly DependencyFileDigest[]
  readonly skillsRegistryFile: DependencyFileDigest | undefined
  readonly sourceManifestFiles: readonly DependencyFileDigest[] | undefined
}

export interface ArtifactDependencySummary {
  readonly nodes: number
  readonly edges: number
  readonly violations: number
}

export interface ArtifactDependencyReport {
  readonly schemaVersion: 1
  readonly ok: boolean
  readonly summary: ArtifactDependencySummary
  readonly nodes: readonly DependencyNode[]
  readonly edges: readonly DependencyEdge[]
  readonly violations: readonly DependencyViolation[]
}

const missing = "<missing>"

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function digestMap(
  files: readonly DependencyFileDigest[],
): ReadonlyMap<string, string | undefined> {
  const map = new Map<string, string | undefined>()
  for (const file of files) map.set(file.path, file.sha256)
  return map
}

function integratedInputNodeId(path: string): string {
  return `integrated/${path}`
}

function definitionNodeId(path: string): string {
  return `definitions/${path}`
}

function formatLocation(violation: DependencyViolation): string {
  return violation.path === undefined || violation.path === violation.node
    ? violation.node
    : `${violation.node} [${violation.path}]`
}

/** 只汇总依赖图与违规，不重复打印全部节点。 */
export function formatArtifactDependencyReport(
  report: ArtifactDependencyReport,
): string {
  const lines = [
    `制品依赖检查${report.ok ? "通过" : "失败"}：${report.summary.nodes} 个节点、${report.summary.edges} 条边、${report.summary.violations} 个违规。`,
  ]
  for (const violation of report.violations)
    lines.push(
      `- [${violation.code}] ${formatLocation(violation)}（期望 ${violation.expected}，实际 ${violation.actual}）`,
    )
  return lines.join("\n")
}

/**
 * 只读校验跨制品声明与真实文件是否指向同一批输入与输出。
 * 结构合法性与三制品身份一致性由 P1-1 读取器负责；本函数不再复制 schema。
 */
export function verifyArtifactDependencies(
  inputs: ArtifactDependencyInputs,
): ArtifactDependencyReport {
  const nodes = new Map<string, DependencyNode>()
  const edges = new Map<string, DependencyEdge>()
  const violations: DependencyViolation[] = []
  const violationKeys = new Set<string>()

  const addNode = (id: string, kind: DependencyNodeKind): void => {
    nodes.set(id, { id, kind })
  }
  const addEdge = (
    from: string,
    to: string,
    kind: DependencyEdgeKind,
  ): void => {
    const id = `${from}\u0000${to}\u0000${kind}`
    edges.set(id, { from, to, kind })
  }
  const addViolation = (violation: DependencyViolation): void => {
    const key = [
      violation.code,
      violation.node,
      violation.path ?? "",
      violation.expected,
      violation.actual,
    ].join("\u0000")
    if (violationKeys.has(key)) return
    violationKeys.add(key)
    violations.push(violation)
  }

  const inputDigests = digestMap(inputs.integratedInputFiles)
  const artifactDigests = digestMap(inputs.definitionArtifactFiles)

  addNode(artifactDependencyPaths.integratedIndex, "integrated-index")
  addNode(artifactDependencyPaths.panelAttributesManifest, "manifest")
  addNode(artifactDependencyPaths.agentActionsManifest, "manifest")

  const checkSourceVersion = (
    manifest: PanelAttributesManifest | AgentActionsManifest,
    manifestNode: string,
  ): void => {
    addEdge(
      manifestNode,
      artifactDependencyPaths.integratedIndex,
      "source-version",
    )
    const expected = inputs.integratedSourceVersion
    const actual = manifest.source.version ?? missing
    if (actual !== expected)
      addViolation({
        code: "source-version-mismatch",
        node: manifestNode,
        path: "sourceVersion",
        expected,
        actual,
      })
  }

  const checkInputs = (
    manifest: PanelAttributesManifest | AgentActionsManifest,
    manifestNode: string,
  ): void => {
    for (const input of manifest.extensions.inputs) {
      const node = integratedInputNodeId(input.path)
      addNode(node, "integrated-input")
      addEdge(manifestNode, node, "input")
      const actual = inputDigests.get(input.path)
      if (actual === undefined)
        addViolation({
          code: "input-missing",
          node,
          expected: input.sha256,
          actual: missing,
        })
      else if (actual !== input.sha256)
        addViolation({
          code: "input-sha256-mismatch",
          node,
          expected: input.sha256,
          actual,
        })
    }
  }

  const checkArtifacts = (
    manifest: PanelAttributesManifest | AgentActionsManifest,
    manifestNode: string,
  ): void => {
    for (const artifact of manifest.artifacts) {
      const node = definitionNodeId(artifact.path)
      addNode(node, "definition-artifact")
      addEdge(manifestNode, node, "artifact")
      const actual = artifactDigests.get(artifact.path)
      if (actual === undefined)
        addViolation({
          code: "artifact-missing",
          node,
          expected: artifact.sha256,
          actual: missing,
        })
      else if (actual !== artifact.sha256)
        addViolation({
          code: "artifact-sha256-mismatch",
          node,
          expected: artifact.sha256,
          actual,
        })
    }
  }

  checkSourceVersion(
    inputs.panelAttributes,
    artifactDependencyPaths.panelAttributesManifest,
  )
  checkSourceVersion(
    inputs.agentActions,
    artifactDependencyPaths.agentActionsManifest,
  )
  checkInputs(
    inputs.panelAttributes,
    artifactDependencyPaths.panelAttributesManifest,
  )
  checkInputs(inputs.agentActions, artifactDependencyPaths.agentActionsManifest)
  checkArtifacts(
    inputs.panelAttributes,
    artifactDependencyPaths.panelAttributesManifest,
  )
  checkArtifacts(
    inputs.agentActions,
    artifactDependencyPaths.agentActionsManifest,
  )

  addNode(artifactDependencyPaths.staticCatalog, "static-catalog")
  addNode(artifactDependencyPaths.staticCoverage, "static-coverage")
  addNode(artifactDependencyPaths.skillsRegistry, "skills-registry")
  addNode(artifactDependencyPaths.sourceManifest, "source-manifest")

  addEdge(
    artifactDependencyPaths.agentActionsManifest,
    artifactDependencyPaths.staticCatalog,
    "static-catalog",
  )
  addEdge(
    artifactDependencyPaths.agentActionsManifest,
    artifactDependencyPaths.skillsRegistry,
    "skills-registry",
  )
  addEdge(
    artifactDependencyPaths.staticCatalog,
    artifactDependencyPaths.sourceManifest,
    "source-files",
  )
  addEdge(
    artifactDependencyPaths.staticCoverage,
    artifactDependencyPaths.sourceManifest,
    "source-files",
  )

  const declaredStaticCatalogSha256 =
    inputs.agentActions.extensions.staticCatalogSha256
  const actualStaticCatalogSha256 =
    inputs.staticEffects.manifest.artifacts.find(
      (artifact) => artifact.path === "effects/static-catalog.json",
    )?.sha256
  if (actualStaticCatalogSha256 !== declaredStaticCatalogSha256)
    addViolation({
      code: "static-catalog-sha256-mismatch",
      node: artifactDependencyPaths.staticCatalog,
      expected: declaredStaticCatalogSha256,
      actual: actualStaticCatalogSha256 ?? missing,
    })

  const declaredRegistrySha256 = inputs.agentActions.extensions.registrySha256
  const actualRegistrySha256 = inputs.skillsRegistryFile?.sha256
  if (actualRegistrySha256 === undefined)
    addViolation({
      code: "skills-registry-missing",
      node: artifactDependencyPaths.skillsRegistry,
      expected: declaredRegistrySha256,
      actual: missing,
    })
  else if (actualRegistrySha256 !== declaredRegistrySha256)
    addViolation({
      code: "skills-registry-sha256-mismatch",
      node: artifactDependencyPaths.skillsRegistry,
      expected: declaredRegistrySha256,
      actual: actualRegistrySha256,
    })

  const sourceFiles = digestMap(
    inputs.staticEffects.manifest.extensions.sourceFiles,
  )
  if (inputs.sourceManifestFiles === undefined) {
    addViolation({
      code: "source-manifest-missing",
      node: artifactDependencyPaths.sourceManifest,
      expected: "readable source-manifest.json",
      actual: missing,
    })
  } else {
    const sourceManifestFiles = digestMap(inputs.sourceManifestFiles)
    const paths = new Set([
      ...sourceFiles.keys(),
      ...sourceManifestFiles.keys(),
    ])
    for (const path of [...paths].toSorted(compareText)) {
      const declared = sourceFiles.get(path)
      const sourceDigest = sourceManifestFiles.get(path)
      if (declared === undefined)
        addViolation({
          code: "source-file-missing",
          node: artifactDependencyPaths.staticCatalog,
          path,
          expected: sourceDigest ?? missing,
          actual: missing,
        })
      else if (sourceDigest === undefined)
        addViolation({
          code: "source-file-extra",
          node: artifactDependencyPaths.staticCatalog,
          path,
          expected: missing,
          actual: declared,
        })
      else if (declared !== sourceDigest)
        addViolation({
          code: "source-file-sha256-mismatch",
          node: artifactDependencyPaths.staticCatalog,
          path,
          expected: sourceDigest,
          actual: declared,
        })
    }
  }

  const sortedNodes = [...nodes.values()].toSorted((left, right) =>
    compareText(left.id, right.id),
  )
  const sortedEdges = [...edges.values()].toSorted(
    (left, right) =>
      compareText(left.from, right.from) ||
      compareText(left.to, right.to) ||
      compareText(left.kind, right.kind),
  )
  const sortedViolations = violations.toSorted(
    (left, right) =>
      compareText(left.code, right.code) ||
      compareText(left.node, right.node) ||
      compareText(left.path ?? "", right.path ?? "") ||
      compareText(left.expected, right.expected) ||
      compareText(left.actual, right.actual),
  )

  return {
    schemaVersion: 1,
    ok: sortedViolations.length === 0,
    summary: {
      nodes: sortedNodes.length,
      edges: sortedEdges.length,
      violations: sortedViolations.length,
    },
    nodes: sortedNodes,
    edges: sortedEdges,
    violations: sortedViolations,
  }
}
