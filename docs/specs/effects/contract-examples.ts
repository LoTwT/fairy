/**
 * 可编译的规范实例与类型反例；不是已审核发布的游戏规则数据。
 * supplied 明确由调用方提供有效实例。其余时序选择仅演示接口，证据边界见 examples.md。
 */
import type {
  Activation,
  Condition,
  ConfigurationChange,
  ContributionOperation,
  ContributionRule,
  CoreSkillLevel,
  EffectEngine,
  EffectState,
  EntityId,
  EvaluationInput,
  Event,
  InstantRule,
  ModificationRule,
  NumericExpression,
  Parameter,
  Quantity,
  ResolvedOutput,
  Result,
  RuleSet,
  RuleSource,
  SourceBinding,
  StateDefinition,
  StateInput,
  StateObservation,
  StatOperation,
  SuppliedEffectInstance,
  SuppliedInstancesUpdate,
  TransitionInput,
  Unit,
  WorldObservation,
} from "./contracts.ts"

const always = { kind: "constant", value: true } as const
const literal = <U extends Unit>(unit: U, value: number) =>
  ({ kind: "literal", unit, value }) as const

function atLeast(
  field: "mindscapeRank" | "coreSkillLevel" | "refinement" | "setPieces",
  value: number,
): Condition<"configuration"> {
  return {
    kind: "compare-number",
    unit: "count",
    operator: "gte",
    left: { kind: "configuration-number", unit: "count", field },
    right: literal("count", value),
  }
}

const astraSource = {
  identity: { kind: "agent", entityId: "1311" },
  section: "core-passive",
  references: [
    {
      sourceId: "nanoka-zzz",
      version: "3.1",
      locale: "zh",
      resourcePath: "zzz/3.1/zh/character/1311.json",
      pointer: "/passive/level/1311507/desc/0",
    },
  ],
} as const satisfies RuleSource

const rinaSource = {
  identity: { kind: "agent", entityId: "1211" },
  section: "core-passive",
  references: [
    {
      sourceId: "nanoka-zzz",
      version: "3.1",
      locale: "zh",
      resourcePath: "zzz/3.1/zh/character/1211.json",
      pointer: "/passive/level/1211507/desc/0",
    },
  ],
} as const satisfies RuleSource

const woodpeckerSource = {
  identity: { kind: "drive-disc", entityId: "31000" },
  section: "four-piece",
  references: [
    {
      sourceId: "nanoka-zzz",
      version: "3.1",
      locale: "zh",
      resourcePath: "zzz/3.1/zh/equipment/31000.json",
      pointer: "/desc4",
    },
  ],
} as const satisfies RuleSource

const elegantVanitySource = {
  identity: { kind: "w-engine", entityId: "14131" },
  section: "talent",
  references: [
    {
      sourceId: "nanoka-zzz",
      version: "3.1",
      locale: "zh",
      resourcePath: "zzz/3.1/zh/weapon/14131.json",
      pointer: "/talents/1/desc",
    },
  ],
} as const satisfies RuleSource

export const astraCore = {
  kind: "contribution",
  effectId: "agent:1311:core:attack-conversion",
  source: astraSource,
  config: atLeast("coreSkillLevel", 1),
  parameters: {
    ratio: {
      kind: "by-rank",
      unit: "ratio",
      rank: "coreSkillLevel",
      values: { 1: 0.22, 2: 0.24, 3: 0.26, 4: 0.28, 5: 0.3, 6: 0.32, 7: 0.35 },
    },
    cap: { kind: "constant", unit: "attack-points", value: 1200 },
  },
  activation: { kind: "supplied" },
  beneficiary: { kind: "holder-and-trigger-actor" },
  when: always,
  scope: "entity",
  operation: {
    kind: "stat-adjustment",
    stat: "attack",
    stage: "final-fixed",
    value: {
      kind: "minimum",
      unit: "attack-points",
      operands: [
        {
          kind: "multiply",
          unit: "attack-points",
          coefficient: { kind: "parameter", unit: "ratio", name: "ratio" },
          value: {
            kind: "stat",
            unit: "attack-points",
            entity: { role: "holder" },
            stat: "attack",
            stage: "initial",
            at: "evaluation",
          },
        },
        { kind: "parameter", unit: "attack-points", name: "cap" },
      ],
    },
  },
} as const satisfies ContributionRule

export const astraMindscapeTwo = {
  kind: "modification",
  effectId: "agent:1311:mindscape-2:core-enhancement",
  source: {
    ...astraSource,
    section: "mindscape-2",
    references: [{ ...astraSource.references[0], pointer: "/talent/2/desc" }],
  },
  config: atLeast("mindscapeRank", 2),
  parameters: {},
  phase: "configuration",
  target: { kind: "effect", effectId: astraCore.effectId },
  modifications: [
    {
      field: "parameter",
      name: "ratio",
      unit: "ratio",
      change: { operator: "add", value: literal("ratio", 0.19) },
    },
    {
      field: "parameter",
      name: "cap",
      unit: "attack-points",
      change: { operator: "add", value: literal("attack-points", 400) },
    },
  ],
} as const satisfies ModificationRule

export const astraHitCriticalRate = {
  kind: "contribution",
  effectId: "agent:1311:mindscape-6:hit-critical-rate",
  source: {
    ...astraSource,
    section: "mindscape-6",
    references: [{ ...astraSource.references[0], pointer: "/talent/6/desc" }],
  },
  config: atLeast("mindscapeRank", 6),
  parameters: {},
  activation: { kind: "continuous" },
  beneficiary: { kind: "holder" },
  scope: "hit",
  when: {
    kind: "all",
    conditions: [
      {
        kind: "same-entity",
        left: { role: "holder" },
        right: { role: "hitActor" },
      },
      {
        kind: "one-of",
        fact: "hit.actionId",
        values: ["action:astra:tremolo", "action:astra:tone-cluster"],
      },
      {
        kind: "state-is",
        stateId: "state:astra:aria-cadenza",
        owner: { role: "holder" },
        at: "action-start",
        active: true,
      },
    ],
  },
  operation: {
    kind: "stat-adjustment",
    stat: "criticalRate",
    stage: "direct",
    value: literal("ratio", 0.8),
  },
} as const satisfies ContributionRule

export const astraHitMultiplier = {
  ...astraHitCriticalRate,
  effectId: "agent:1311:mindscape-6:hit-multiplier",
  operation: {
    kind: "hit-adjustment",
    field: "damageMultiplier",
    operator: "scale",
    value: literal("multiplier", 2),
  },
} as const satisfies ContributionRule

/** 动作 ID 是规范语义别名，生产适配与触发时点仍需实例页所列证据。 */
export const astraMindscapeTwoActions = {
  kind: "instant",
  effectId: "agent:1311:mindscape-2:entry-actions",
  source: astraMindscapeTwo.source,
  config: atLeast("mindscapeRank", 2),
  parameters: {},
  beneficiary: { kind: "holder" },
  trigger: {
    eventKinds: ["entry"],
    when: {
      kind: "all",
      conditions: [
        {
          kind: "same-team",
          left: { role: "triggerActor" },
          right: { role: "holder" },
        },
        {
          kind: "not",
          condition: {
            kind: "same-entity",
            left: { role: "triggerActor" },
            right: { role: "holder" },
          },
        },
        {
          kind: "state-is",
          stateId: "state:astra:aria-cadenza",
          owner: { role: "holder" },
          at: "before-event",
          active: true,
        },
      ],
    },
    cooldown: {
      groupId: "astra-mindscape-2-entry-actions",
      partition: "binding",
      seconds: literal("seconds", 3),
    },
  },
  operation: {
    kind: "action-request",
    actions: [
      { actionId: "action:astra:tremolo", count: literal("count", 1) },
      { actionId: "action:astra:tone-cluster", count: literal("count", 3) },
    ],
  },
} as const satisfies InstantRule

export const astraMindscapeSixAction = {
  kind: "instant",
  effectId: "agent:1311:mindscape-6:automatic-third-hit",
  source: astraHitCriticalRate.source,
  config: atLeast("mindscapeRank", 6),
  parameters: {},
  beneficiary: { kind: "holder" },
  trigger: {
    eventKinds: ["precision-support"],
    when: {
      kind: "same-entity",
      left: { role: "triggerActor" },
      right: { role: "holder" },
    },
    cooldown: {
      groupId: "astra-mindscape-6-automatic-third-hit",
      partition: "binding",
      seconds: literal("seconds", 10),
    },
  },
  operation: {
    kind: "action-request",
    actions: [
      {
        actionId: "action:astra:charged-basic-third",
        count: literal("count", 1),
      },
    ],
  },
} as const satisfies InstantRule

export const astraAutomaticThirdHitCriticalRate = {
  ...astraHitCriticalRate,
  effectId: "agent:1311:mindscape-6:automatic-third-hit-critical-rate",
  when: {
    kind: "all",
    conditions: [
      {
        kind: "same-entity",
        left: { role: "holder" },
        right: { role: "hitActor" },
      },
      {
        kind: "one-of",
        fact: "hit.actionId",
        values: ["action:astra:charged-basic-third"],
      },
      {
        kind: "one-of",
        fact: "hit.originEffectId",
        values: [astraMindscapeSixAction.effectId],
      },
    ],
  },
} as const satisfies ContributionRule

export const rinaCore = {
  kind: "contribution",
  effectId: "agent:1211:core:penetration-conversion",
  source: rinaSource,
  config: atLeast("coreSkillLevel", 1),
  parameters: {
    ratio: { kind: "constant", unit: "ratio", value: 0.25 },
    flat: {
      kind: "by-rank",
      unit: "ratio",
      rank: "coreSkillLevel",
      values: {
        1: 0.06,
        2: 0.075,
        3: 0.09,
        4: 0.102,
        5: 0.108,
        6: 0.114,
        7: 0.12,
      },
    },
    cap: { kind: "constant", unit: "ratio", value: 0.3 },
  },
  activation: { kind: "supplied" },
  beneficiary: { kind: "team-except-holder" },
  scope: "entity",
  when: always,
  operation: {
    kind: "stat-adjustment",
    stat: "penetrationRatio",
    stage: "direct",
    value: {
      kind: "minimum",
      unit: "ratio",
      operands: [
        {
          kind: "add",
          unit: "ratio",
          operands: [
            {
              kind: "multiply",
              unit: "ratio",
              coefficient: { kind: "parameter", unit: "ratio", name: "ratio" },
              value: {
                kind: "stat",
                unit: "ratio",
                entity: { role: "holder" },
                stat: "penetrationRatio",
                stage: "current",
                at: "evaluation",
              },
            },
            { kind: "parameter", unit: "ratio", name: "flat" },
          ],
        },
        { kind: "parameter", unit: "ratio", name: "cap" },
      ],
    },
  },
} as const satisfies ContributionRule

/** evaluation 仅为本规范数值场景选择，不能作为实时读取的游戏证据。 */
export const rinaMindscapeOne = {
  kind: "modification",
  effectId: "agent:1211:mindscape-1:core-enhancement",
  source: {
    ...rinaSource,
    section: "mindscape-1",
    references: [{ ...rinaSource.references[0], pointer: "/talent/1/desc" }],
  },
  config: atLeast("mindscapeRank", 1),
  parameters: {},
  phase: "contribution",
  target: { kind: "effect", effectId: rinaCore.effectId },
  when: {
    kind: "within-summon-distance",
    entity: { role: "beneficiary" },
    summonOwner: { role: "holder" },
    summonKinds: ["drusilla", "anastella"],
    maximum: literal("meters", 10),
    at: "evaluation",
  },
  modifications: [
    {
      field: "output",
      unit: "ratio",
      change: { operator: "scale", value: literal("multiplier", 1.3) },
    },
  ],
} as const satisfies ModificationRule

export const woodpeckerTwoPiece = {
  kind: "contribution",
  effectId: "disc:31000:two-piece:critical-rate",
  source: {
    ...woodpeckerSource,
    section: "two-piece",
    references: [{ ...woodpeckerSource.references[0], pointer: "/desc2" }],
  },
  config: atLeast("setPieces", 2),
  parameters: {},
  activation: { kind: "continuous" },
  beneficiary: { kind: "holder" },
  scope: "entity",
  when: always,
  operation: {
    kind: "stat-adjustment",
    stat: "criticalRate",
    stage: "direct",
    value: literal("ratio", 0.08),
  },
} as const satisfies ContributionRule

/** 这里的最终百分比与刷新策略是合成验收前提，尚不代表已证实的游戏时序。 */
export const woodpeckerFourPiece = {
  kind: "contribution",
  effectId: "disc:31000:four-piece:attack",
  source: woodpeckerSource,
  config: atLeast("setPieces", 4),
  parameters: {},
  activation: {
    kind: "triggered",
    trigger: {
      eventKinds: ["hit-resolved"],
      when: {
        kind: "all",
        conditions: [
          {
            kind: "same-entity",
            left: { role: "triggerActor" },
            right: { role: "holder" },
          },
          { kind: "event-flag", field: "isCriticalHit", value: true },
          {
            kind: "one-of",
            fact: "event.skillCategory",
            values: ["basic", "dodge-counter", "enhanced-special"],
          },
        ],
      },
    },
    lifetime: {
      kind: "timed",
      seconds: literal("seconds", 6),
      clock: "shared",
      onRetrigger: { kind: "refresh" },
      refreshExisting: "all",
    },
    layering: {
      recipientPartition: "individual",
      keys: ["skill-category"],
      maximum: literal("count", 1),
      onRetrigger: "keep-count",
      atCapacity: "ignore-new-layer",
    },
  },
  beneficiary: { kind: "holder" },
  scope: "entity",
  when: always,
  operation: {
    kind: "stat-adjustment",
    stat: "attack",
    stage: "final-percentage",
    value: literal("ratio", 0.09),
  },
} as const satisfies ContributionRule

export const elegantVanityDamage = {
  kind: "contribution",
  effectId: "w-engine:14131:damage-on-energy-spend",
  source: elegantVanitySource,
  config: atLeast("refinement", 1),
  parameters: {
    damageBonus: {
      kind: "by-rank",
      unit: "ratio",
      rank: "refinement",
      values: { 1: 0.1, 2: 0.115, 3: 0.13, 4: 0.145, 5: 0.16 },
    },
  },
  activation: { kind: "supplied" },
  beneficiary: { kind: "team" },
  scope: "entity",
  when: always,
  operation: {
    kind: "factor-contribution",
    channel: "damage-bonus",
    value: { kind: "parameter", unit: "ratio", name: "damageBonus" },
  },
  uniqueness: {
    key: "elegant-vanity-damage",
    scope: "team",
    select: { kind: "single-source-only" },
  },
} as const satisfies ContributionRule

export const elegantVanityEnergy = {
  kind: "instant",
  effectId: "w-engine:14131:energy-on-entry",
  source: elegantVanitySource,
  config: atLeast("refinement", 1),
  parameters: {
    energy: {
      kind: "by-rank",
      unit: "energy-points",
      rank: "refinement",
      values: { 1: 5, 2: 5.5, 3: 6, 4: 6.5, 5: 7 },
    },
  },
  trigger: {
    eventKinds: ["entry"],
    when: {
      kind: "same-team",
      left: { role: "triggerActor" },
      right: { role: "holder" },
    },
    cooldown: {
      groupId: "elegant-vanity-energy",
      partition: "binding",
      seconds: literal("seconds", 5),
    },
  },
  beneficiary: { kind: "holder" },
  operation: {
    kind: "resource-generation",
    resource: "energy",
    amount: { kind: "parameter", unit: "energy-points", name: "energy" },
  },
} as const satisfies InstantRule

export const exampleRuleSet = {
  schemaVersion: 1,
  ruleSetId: "effect-spec-examples",
  revision: "2",
  effects: [
    astraCore,
    astraMindscapeTwo,
    astraHitCriticalRate,
    astraHitMultiplier,
    astraMindscapeTwoActions,
    astraMindscapeSixAction,
    astraAutomaticThirdHitCriticalRate,
    rinaCore,
    rinaMindscapeOne,
    woodpeckerTwoPiece,
    woodpeckerFourPiece,
    elegantVanityDamage,
    elegantVanityEnergy,
  ],
  states: [
    {
      stateId: "state:astra:aria-cadenza",
      source: astraSource,
      parameters: {},
      input: "observed",
    },
  ],
  actions: [
    { actionId: "action:astra:tremolo", source: astraSource },
    { actionId: "action:astra:tone-cluster", source: astraSource },
    {
      actionId: "action:astra:charged-basic-third",
      source: astraHitCriticalRate.source,
    },
  ],
} as const satisfies RuleSet

/** 以下是模型合成夹具；2 秒、10 秒等基数不对应任何游戏条款。 */
const syntheticSource = {
  identity: { kind: "environment", entityId: "effect-spec-fixture" },
  section: "contract-validation",
  references: [
    {
      sourceId: "fairy-spec",
      version: "1",
      locale: "zh",
      resourcePath: "docs/specs/effects/execution.md",
      pointer: "",
    },
  ],
} as const satisfies RuleSource

export const syntheticState = {
  stateId: "state:spec:linger",
  source: syntheticSource,
  parameters: {
    lingerSeconds: { kind: "constant", unit: "seconds", value: 2 },
  },
  input: "observed",
} as const satisfies StateDefinition

export const syntheticStateModification = {
  kind: "modification",
  effectId: "environment:spec:linger-extension",
  source: syntheticSource,
  config: always,
  parameters: {},
  phase: "configuration",
  target: { kind: "state", stateId: syntheticState.stateId },
  modifications: [
    {
      field: "parameter",
      name: "lingerSeconds",
      unit: "seconds",
      change: { operator: "add", value: literal("seconds", 5.5) },
    },
  ],
} as const satisfies ModificationRule

export const syntheticTimedEffect = {
  kind: "contribution",
  effectId: "environment:spec:timed-effect",
  source: syntheticSource,
  config: always,
  parameters: {},
  beneficiary: { kind: "holder" },
  scope: "entity",
  when: always,
  activation: {
    kind: "triggered",
    trigger: { eventKinds: ["entry"], when: always },
    lifetime: {
      kind: "timed",
      seconds: literal("seconds", 10),
      clock: "shared",
      onRetrigger: {
        kind: "extend",
        limit: { kind: "remaining", maximum: literal("seconds", 30) },
      },
      refreshExisting: "all",
    },
    layering: {
      recipientPartition: "individual",
      keys: [],
      maximum: literal("count", 1),
      onRetrigger: "keep-count",
      atCapacity: "ignore-new-layer",
    },
  },
  operation: {
    kind: "stat-adjustment",
    stat: "attack",
    stage: "final-fixed",
    value: literal("attack-points", 100),
  },
} as const satisfies ContributionRule

export const syntheticActivationModification = {
  kind: "modification",
  effectId: "environment:spec:conditional-duration",
  source: syntheticSource,
  config: always,
  parameters: {},
  phase: "activation",
  target: { kind: "effect", effectId: syntheticTimedEffect.effectId },
  when: {
    kind: "state-is",
    stateId: syntheticState.stateId,
    owner: { role: "holder" },
    at: "before-event",
    active: true,
  },
  modifications: [
    {
      field: "duration-seconds",
      change: { operator: "add", value: literal("seconds", 5.5) },
    },
  ],
} as const satisfies ModificationRule

/** 两条不同作用域的贡献在同一命中消费，使用同一个唯一组。 */
export const syntheticGlobalDamage = {
  ...syntheticTimedEffect,
  effectId: "environment:spec:global-damage",
  activation: { kind: "continuous" },
  operation: {
    kind: "factor-contribution",
    channel: "damage-bonus",
    value: literal("ratio", 0.1),
  },
  uniqueness: {
    key: "spec-exclusive-damage",
    scope: "team",
    select: { kind: "highest-value" },
  },
} as const satisfies ContributionRule

export const syntheticHitDamage = {
  ...syntheticGlobalDamage,
  effectId: "environment:spec:hit-damage",
  scope: "hit",
  when: {
    kind: "one-of",
    fact: "hit.skillCategory",
    values: ["basic"],
  },
  operation: {
    kind: "factor-contribution",
    channel: "damage-bonus",
    value: literal("ratio", 0.2),
  },
} as const satisfies ContributionRule

/** 重入后按新 activationId 建组；最大一层不阻止新组创建首层。 */
export const syntheticStateBoundEffect = {
  ...syntheticTimedEffect,
  effectId: "environment:spec:state-bound-effect",
  activation: {
    kind: "triggered",
    trigger: { eventKinds: ["state-observed"], when: always },
    lifetime: {
      kind: "state-bound",
      stateId: syntheticState.stateId,
      stateOwner: { role: "holder" },
    },
    layering: syntheticTimedEffect.activation.layering,
  },
} as const satisfies ContributionRule

export const syntheticRuleSet = {
  schemaVersion: 1,
  ruleSetId: "effect-spec-synthetic",
  revision: "3",
  effects: [
    syntheticTimedEffect,
    syntheticStateModification,
    syntheticActivationModification,
    syntheticGlobalDamage,
    syntheticHitDamage,
    syntheticStateBoundEffect,
  ],
  states: [syntheticState],
  actions: [{ actionId: "action:spec:basic", source: syntheticSource }],
} as const satisfies RuleSet

export const exampleBindings = [
  {
    kind: "agent",
    bindingId: "binding:astra",
    holderId: "entity:astra",
    sourceEntityId: "1311",
    eligible: true,
    configuration: { mindscapeRank: 2, coreSkillLevel: 7 },
  },
  {
    kind: "agent",
    bindingId: "binding:rina",
    holderId: "entity:rina",
    sourceEntityId: "1211",
    eligible: true,
    configuration: { mindscapeRank: 1, coreSkillLevel: 7 },
  },
  {
    kind: "drive-disc",
    bindingId: "binding:woodpecker",
    holderId: "entity:attacker",
    sourceEntityId: "31000",
    eligible: true,
    configuration: { setPieces: 4 },
  },
  {
    kind: "w-engine",
    bindingId: "binding:elegant-vanity",
    holderId: "entity:astra",
    sourceEntityId: "14131",
    eligible: true,
    configuration: { refinement: 1 },
  },
] as const satisfies readonly SourceBinding[]

export const exampleWorld = {
  entities: [
    {
      kind: "actor",
      entityId: "entity:astra",
      teamId: "team:one",
      generalStats: {
        attack: {
          baseValue: 3000,
          initialPercentage: [],
          initialFixed: [],
          finalPercentage: [],
          finalFixed: [],
        },
      },
      directStats: {},
    },
    {
      kind: "actor",
      entityId: "entity:attacker",
      teamId: "team:one",
      generalStats: {
        attack: {
          baseValue: 2000,
          initialPercentage: [],
          initialFixed: [],
          finalPercentage: [],
          finalFixed: [],
        },
      },
      directStats: {
        criticalRate: { baseValue: 0.05, additions: [] },
        penetrationRatio: { baseValue: 0, additions: [] },
      },
    },
    {
      kind: "actor",
      entityId: "entity:rina",
      teamId: "team:one",
      generalStats: {},
      directStats: { penetrationRatio: { baseValue: 0.4, additions: [] } },
    },
    {
      kind: "summon",
      entityId: "entity:drusilla",
      teamId: "team:one",
      ownerId: "entity:rina",
      summonKind: "drusilla",
      deployed: true,
    },
  ],
  states: [
    {
      stateId: "state:astra:aria-cadenza",
      bindingId: "binding:astra",
      ownerId: "entity:astra",
      active: true,
      activationId: "state-activation:astra-aria-first",
      since: 0,
    },
  ],
  distances: [
    { first: "entity:attacker", second: "entity:drusilla", meters: 8 },
  ],
} as const satisfies WorldObservation

export const suppliedAstraState = {
  sessionId: "session:astra-core-example",
  atSeconds: 0,
  instances: [
    {
      instanceId: "instance:astra-core",
      effectId: astraCore.effectId,
      bindingId: "binding:astra",
      beneficiaryIds: ["entity:astra", "entity:attacker"],
      stackKey: [],
      lifetime: { kind: "supplied" },
      layers: [
        {
          layerId: "layer:astra-core",
          startedAt: 0,
          expiresAt: 20,
          trigger: {
            eventId: "event:entry-followup",
            actorId: "entity:attacker",
            entryActorId: "entity:attacker",
            supportActorId: "entity:astra",
            activationSnapshotId: "snapshot:entry",
          },
        },
      ],
    },
  ],
  snapshots: [
    {
      snapshotId: "snapshot:entry",
      atSeconds: 0,
      attributes: [],
      world: exampleWorld,
    },
  ],
  cooldowns: [],
  eventHistory: { processedIds: [], last: null },
} as const satisfies StateInput

export const astraPanelQuery = {
  kind: "panel",
  atSeconds: 0,
  world: exampleWorld,
  observedSnapshots: [],
  entities: ["entity:attacker"],
  stats: ["attack"],
} as const satisfies EvaluationInput

/**
 * 给定有效核心实例的数值验收；每项分别遍历 0—6 影。
 * 0—1 影使用 expectedBaseAttackBonus，2—6 影使用 expectedEnhancedAttackBonus。
 * 公式与游戏证据见 examples.md；小数比较容差为 1e-9 攻击力点数。
 */
export const astraCoreNumericCases = [
  {
    caseId: "level-1-uncapped",
    coreSkillLevel: 1,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 440,
    expectedEnhancedAttackBonus: 820,
  },
  {
    caseId: "level-2-uncapped",
    coreSkillLevel: 2,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 480,
    expectedEnhancedAttackBonus: 860,
  },
  {
    caseId: "level-3-uncapped",
    coreSkillLevel: 3,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 520,
    expectedEnhancedAttackBonus: 900,
  },
  {
    caseId: "level-4-uncapped",
    coreSkillLevel: 4,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 560,
    expectedEnhancedAttackBonus: 940,
  },
  {
    caseId: "level-5-uncapped",
    coreSkillLevel: 5,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 600,
    expectedEnhancedAttackBonus: 980,
  },
  {
    caseId: "level-6-uncapped",
    coreSkillLevel: 6,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 640,
    expectedEnhancedAttackBonus: 1020,
  },
  {
    caseId: "level-7-uncapped",
    coreSkillLevel: 7,
    holderInitialAttack: 2000,
    expectedBaseAttackBonus: 700,
    expectedEnhancedAttackBonus: 1080,
  },
  {
    caseId: "zero-attack",
    coreSkillLevel: 7,
    holderInitialAttack: 0,
    expectedBaseAttackBonus: 0,
    expectedEnhancedAttackBonus: 0,
  },
  {
    caseId: "below-enhanced-cap",
    coreSkillLevel: 7,
    holderInitialAttack: 2950,
    expectedBaseAttackBonus: 1032.5,
    expectedEnhancedAttackBonus: 1593,
  },
  {
    caseId: "at-enhanced-cap",
    coreSkillLevel: 7,
    holderInitialAttack: 1600 / 0.54,
    expectedBaseAttackBonus: (1600 * 35) / 54,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "above-enhanced-cap",
    coreSkillLevel: 7,
    holderInitialAttack: 2963,
    expectedBaseAttackBonus: 1037.05,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "between-caps",
    coreSkillLevel: 7,
    holderInitialAttack: 3000,
    expectedBaseAttackBonus: 1050,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "below-base-cap",
    coreSkillLevel: 7,
    holderInitialAttack: 3428,
    expectedBaseAttackBonus: 1199.8,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "at-base-cap",
    coreSkillLevel: 7,
    holderInitialAttack: 1200 / 0.35,
    expectedBaseAttackBonus: 1200,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "above-base-cap",
    coreSkillLevel: 7,
    holderInitialAttack: 3429,
    expectedBaseAttackBonus: 1200,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "both-capped",
    coreSkillLevel: 7,
    holderInitialAttack: 4000,
    expectedBaseAttackBonus: 1200,
    expectedEnhancedAttackBonus: 1600,
  },
  {
    caseId: "lower-level-between-level-7-caps",
    coreSkillLevel: 1,
    holderInitialAttack: 3000,
    expectedBaseAttackBonus: 660,
    expectedEnhancedAttackBonus: 1230,
  },
] as const satisfies readonly {
  readonly caseId: string
  readonly coreSkillLevel: CoreSkillLevel
  readonly holderInitialAttack: number
  readonly expectedBaseAttackBonus: number
  readonly expectedEnhancedAttackBonus: number
}[]

/** 在已有自动层、音擎冷却和事件历史的会话中续期耀嘉音核心。 */
export const mixedStateBeforeSynchronization = {
  ...suppliedAstraState,
  atSeconds: 1,
  instances: [
    ...suppliedAstraState.instances,
    {
      instanceId: "instance:woodpecker-basic",
      effectId: woodpeckerFourPiece.effectId,
      bindingId: "binding:woodpecker",
      beneficiaryIds: ["entity:attacker"],
      stackKey: ["basic"],
      lifetime: { kind: "timed", firstActivatedAt: 1 },
      layers: [
        {
          layerId: "layer:woodpecker-basic",
          startedAt: 1,
          expiresAt: 7,
          trigger: {
            eventId: "event:basic-critical",
            actorId: "entity:attacker",
            skillCategory: "basic",
            activationSnapshotId: "snapshot:basic-critical",
          },
        },
      ],
    },
    {
      instanceId: "instance:elegant-vanity-damage",
      effectId: elegantVanityDamage.effectId,
      bindingId: "binding:elegant-vanity",
      beneficiaryIds: ["entity:astra", "entity:attacker", "entity:rina"],
      stackKey: [],
      lifetime: { kind: "supplied" },
      layers: [
        {
          layerId: "layer:elegant-vanity-damage",
          startedAt: 0,
          expiresAt: null,
          trigger: null,
        },
      ],
    },
  ],
  snapshots: [
    ...suppliedAstraState.snapshots,
    {
      snapshotId: "snapshot:basic-critical",
      atSeconds: 1,
      attributes: [],
      world: exampleWorld,
    },
  ],
  cooldowns: [
    {
      groupId: "elegant-vanity-energy",
      partitionKey: "7:binding22:binding:elegant-vanity",
      availableAt: 5,
    },
  ],
  eventHistory: {
    processedIds: ["event:entry", "event:basic-critical"],
    last: { eventId: "event:basic-critical", atSeconds: 1, sequence: 0 },
  },
} as const satisfies StateInput

export const renewSuppliedAstra = {
  eventId: "event:sync-astra-core",
  atSeconds: 2,
  sequence: 0,
  replacements: [
    {
      effectId: astraCore.effectId,
      bindingId: "binding:astra",
      instances: [
        {
          ...suppliedAstraState.instances[0],
          layers: [
            { ...suppliedAstraState.instances[0].layers[0], expiresAt: 30 },
          ],
        },
      ],
    },
  ],
  world: exampleWorld,
  observedSnapshots: [],
} as const satisfies SuppliedInstancesUpdate

export const clearSuppliedAstra = {
  ...renewSuppliedAstra,
  eventId: "event:clear-astra-core",
  sequence: 1,
  replacements: [
    {
      effectId: astraCore.effectId,
      bindingId: "binding:astra",
      instances: [],
    },
  ],
} as const satisfies SuppliedInstancesUpdate

export const syntheticBinding = {
  kind: "environment",
  bindingId: "binding:spec",
  holderId: "entity:spec",
  sourceEntityId: syntheticSource.identity.entityId,
  eligible: true,
  configuration: {},
} as const satisfies SourceBinding

export const syntheticWorld = {
  entities: [
    {
      kind: "actor",
      entityId: syntheticBinding.holderId,
      teamId: "team:spec",
      generalStats: {
        attack: {
          baseValue: 1000,
          initialPercentage: [],
          initialFixed: [],
          finalPercentage: [],
          finalFixed: [],
        },
      },
      directStats: { criticalRate: { baseValue: 0.05, additions: [] } },
    },
    {
      kind: "actor",
      entityId: "entity:spec-target",
      teamId: "team:spec-target",
      generalStats: {},
      directStats: {},
    },
  ],
  states: [
    {
      stateId: syntheticState.stateId,
      bindingId: syntheticBinding.bindingId,
      ownerId: syntheticBinding.holderId,
      active: true,
      activationId: "state-activation:spec-a",
      since: 0,
    },
  ],
  distances: [],
} as const satisfies WorldObservation

export const syntheticHitQuery = {
  kind: "hit",
  atSeconds: 1,
  world: syntheticWorld,
  observedSnapshots: [
    {
      snapshotId: "snapshot:spec-action",
      atSeconds: 1,
      attributes: [],
      world: syntheticWorld,
    },
  ],
  hit: {
    hitId: "hit:spec-basic",
    actionInstanceId: "action-instance:spec-basic",
    actionId: "action:spec:basic",
    actorId: syntheticBinding.holderId,
    targetId: "entity:spec-target",
    skillCategory: "basic",
    actionSnapshotId: "snapshot:spec-action",
    origin: { kind: "direct" },
    damageItems: [{ itemId: "main", damageMultiplier: 1, stat: "attack" }],
  },
} as const satisfies EvaluationInput

/** scope: hit 的直接暴击率调整使用当前命中的属性地址。 */
export const canonicalHitCriticalRateOutput = {
  address: {
    kind: "stat",
    stat: "criticalRate",
    stage: "direct",
    entityId: syntheticBinding.holderId,
    hitId: syntheticHitQuery.hit.hitId,
  },
  operator: "add",
  value: { unit: "ratio", value: 0.2 },
} as const satisfies ResolvedOutput

export const stateBeforeReentry = {
  sessionId: "session:spec-reentry",
  atSeconds: 0,
  instances: [
    {
      instanceId: "instance:spec-a",
      effectId: syntheticStateBoundEffect.effectId,
      bindingId: syntheticBinding.bindingId,
      beneficiaryIds: [syntheticBinding.holderId],
      stackKey: [],
      lifetime: {
        kind: "state-bound",
        stateId: syntheticState.stateId,
        stateOwnerId: syntheticBinding.holderId,
        stateActivationId: syntheticWorld.states[0].activationId,
      },
      layers: [
        {
          layerId: "layer:spec-a",
          startedAt: 0,
          expiresAt: null,
          trigger: {
            eventId: "event:spec-first-entry",
            actorId: syntheticBinding.holderId,
            activationSnapshotId: "snapshot:spec-first-entry",
          },
        },
      ],
    },
  ],
  snapshots: [
    {
      snapshotId: "snapshot:spec-first-entry",
      atSeconds: 0,
      attributes: [],
      world: {
        ...syntheticWorld,
        states: [
          {
            ...syntheticWorld.states[0],
            active: false,
            activationId: null,
            since: null,
          },
        ],
      },
    },
  ],
  cooldowns: [],
  eventHistory: {
    processedIds: ["event:spec-first-entry"],
    last: { eventId: "event:spec-first-entry", atSeconds: 0, sequence: 0 },
  },
} as const satisfies StateInput

const reenteredState = {
  ...syntheticWorld.states[0],
  activationId: "state-activation:spec-b",
  since: 1,
} as const satisfies StateObservation

export const stateReentryTransition = {
  event: {
    kind: "state-observed",
    eventId: "event:spec-reentry",
    atSeconds: 1,
    sequence: 0,
    actorId: syntheticBinding.holderId,
    observation: reenteredState,
  },
  before: syntheticWorld,
  after: { ...syntheticWorld, states: [reenteredState] },
  observedSnapshots: [],
} as const satisfies TransitionInput

type Assert<T extends true> = T
type NotAssignable<Actual, Expected> = [Actual] extends [Expected]
  ? false
  : true
type RatioLiteral = {
  readonly kind: "literal"
  readonly unit: "ratio"
  readonly value: 0.1
}

/** 若任一非法组合被类型放行，下面的 Assert 将导致 tsc 失败。 */
export type RejectedCombinations = [
  Assert<
    NotAssignable<
      {
        kind: "hit-adjustment"
        field: "criticalRate"
        operator: "add"
        value: RatioLiteral
      },
      ContributionOperation
    >
  >,
  Assert<
    NotAssignable<
      {
        field: "layer-maximum"
        change: {
          operator: "add"
          value: { kind: "literal"; unit: "count"; value: 1 }
        }
      },
      ConfigurationChange
    >
  >,
  Assert<
    NotAssignable<
      { field: "beneficiary"; operator: "set"; value: { kind: "team" } },
      ConfigurationChange
    >
  >,
  Assert<
    NotAssignable<
      {
        field: "condition"
        operator: "set"
        value: { kind: "constant"; value: true }
      },
      ConfigurationChange
    >
  >,
  Assert<
    NotAssignable<
      (typeof mixedStateBeforeSynchronization.instances)[1],
      SuppliedEffectInstance
    >
  >,
  Assert<
    NotAssignable<
      (typeof stateBeforeReentry.instances)[0],
      SuppliedEffectInstance
    >
  >,
  Assert<
    NotAssignable<
      Omit<typeof renewSuppliedAstra, "eventId">,
      SuppliedInstancesUpdate
    >
  >,
  Assert<
    NotAssignable<
      {
        address: { kind: "hit"; hitId: "hit:any"; field: "criticalRate" }
        operator: "add"
        value: Quantity<"ratio">
      },
      ResolvedOutput
    >
  >,
  Assert<
    NotAssignable<
      {
        stateId: "state:any"
        bindingId: "binding:any"
        ownerId: "entity:any"
        active: false
        activationId: "state-activation:any"
        since: 0
      },
      StateObservation
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "stat-adjustment"
        stat: "criticalRate"
        stage: "final-percentage"
        value: RatioLiteral
      },
      StatOperation
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "stat-adjustment"
        stat: "attack"
        stage: "final-fixed"
        value: RatioLiteral
      },
      StatOperation
    >
  >,
  Assert<NotAssignable<Quantity<"energy-points">, Quantity<"attack-points">>>,
  Assert<
    NotAssignable<
      { kind: "literal"; unit: "energy-points"; value: 5 },
      NumericExpression<"attack-points", "contribution">
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "by-rank"
        unit: "ratio"
        rank: "refinement"
        values: { 1: 0.1 }
      },
      Parameter<"ratio">
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "state-is"
        stateId: "state:any"
        owner: { role: "holder" }
        at: "evaluation"
        active: true
      },
      Condition<"configuration">
    >
  >,
  Assert<
    NotAssignable<
      { kind: "event-flag"; field: "isCriticalHit"; value: true },
      Condition<"contribution">
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "continuous"
        trigger: {
          eventKinds: ["entry"]
          when: { kind: "constant"; value: true }
        }
      },
      Activation
    >
  >,
  Assert<
    NotAssignable<
      Omit<typeof astraHitMultiplier, "scope"> & { scope: "entity" },
      ContributionRule
    >
  >,
  Assert<
    NotAssignable<
      typeof astraMindscapeTwo & { operation: typeof astraCore.operation },
      ModificationRule
    >
  >,
  Assert<
    NotAssignable<
      typeof elegantVanityEnergy & { activation: { kind: "continuous" } },
      InstantRule
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "w-engine"
        bindingId: "binding:bad"
        holderId: "entity:any"
        sourceEntityId: "14131"
        eligible: true
        configuration: { mindscapeRank: 2 }
      },
      SourceBinding
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "entry-followup"
        eventId: "event:bad"
        atSeconds: 0
        sequence: 0
        actorId: "entity:ally"
        entryAction: "chain"
      },
      Event
    >
  >,
  Assert<NotAssignable<"snapshot:wrong-identity", EntityId>>,
  Assert<
    NotAssignable<
      {
        address: { kind: "hit"; hitId: "hit:any"; field: "damageMultiplier" }
        operator: "add"
        value: Quantity<"ratio">
      },
      ResolvedOutput
    >
  >,
  Assert<
    NotAssignable<
      {
        kind: "stat"
        unit: "ratio"
        entity: { role: "holder" }
        stat: "criticalRate"
        stage: "initial"
        at: "evaluation"
      },
      NumericExpression<"ratio", "contribution">
    >
  >,
]

/** 增量同步必须基于旧状态，成功只返回新状态，不携带一次性请求。 */
export type SynchronizationApiContract = [
  Assert<
    Parameters<
      EffectEngine["synchronizeSuppliedInstances"]
    >[1] extends EffectState
      ? true
      : false
  >,
  Assert<
    ReturnType<
      EffectEngine["synchronizeSuppliedInstances"]
    > extends Result<EffectState>
      ? true
      : false
  >,
]
