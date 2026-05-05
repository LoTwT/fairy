import type {
  LocalizedLabel,
  RoundingMode,
  SourceRef,
  TraceEvent,
  TraceKind,
} from "../schema"

let traceCounter = 0

export function resetTraceCounter(): void {
  traceCounter = 0
}

export function makeTraceEvent(input: {
  kind: TraceKind
  path: string
  label?: LocalizedLabel
  inputs?: Record<string, unknown>
  formula?: string
  rawValue?: unknown
  displayValue?: unknown
  rounding?: { mode: RoundingMode; input: number; output: number; reason: string }
  source?: SourceRef
  sourceAlias?: string
  sourceAnchor?: string
  active?: boolean
  inactiveReason?: string
  refs?: string[]
}): TraceEvent {
  traceCounter += 1

  return {
    id: `trace-${traceCounter}`,
    kind: input.kind,
    path: input.path,
    ...(input.label === undefined ? {} : { label: input.label }),
    ...(input.inputs === undefined ? {} : { inputs: input.inputs }),
    ...(input.formula === undefined ? {} : { formula: input.formula }),
    ...(input.rawValue === undefined ? {} : { rawValue: input.rawValue }),
    ...(input.displayValue === undefined ? {} : { displayValue: input.displayValue }),
    ...(input.rounding === undefined ? {} : { rounding: input.rounding }),
    ...(input.source === undefined ? {} : { source: input.source }),
    ...(input.sourceAlias === undefined ? {} : { sourceAlias: input.sourceAlias }),
    ...(input.sourceAnchor === undefined ? {} : { sourceAnchor: input.sourceAnchor }),
    ...(input.active === undefined ? {} : { active: input.active }),
    ...(input.inactiveReason === undefined ? {} : { inactiveReason: input.inactiveReason }),
    ...(input.refs === undefined ? {} : { refs: input.refs }),
  }
}
