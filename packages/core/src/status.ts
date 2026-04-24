import type { StatusDurationRequest, StatusDurationResult } from './types.js'
import { DEFAULT_STATUS_DURATIONS } from './constants.js'
import { floorInt } from './math.js'

export function calculateFreezeDuration(request: Omit<StatusDurationRequest, 'kind'>): number {
  const baseDuration = request.baseDuration ?? DEFAULT_STATUS_DURATIONS.freeze
  return baseDuration * (1 + (request.durationBonus ?? 0))
}

export function calculateAnomalyStatusDuration(request: Omit<StatusDurationRequest, 'kind'>): number {
  const baseDuration = request.baseDuration ?? DEFAULT_STATUS_DURATIONS.burn
  const masteryFactor = 1 + (floorInt(request.anomalyMastery ?? 0) / 1000)
  const proficiencyFactor = 1 + ((request.anomalyProficiency ?? 0) / 1000)
  return baseDuration * masteryFactor * proficiencyFactor * (1 + (request.durationBonus ?? 0))
}

export function calculateStatusDuration(request: StatusDurationRequest): StatusDurationResult {
  if (request.kind === 'freeze') {
    return {
      kind: request.kind,
      duration: calculateFreezeDuration(request),
    }
  }

  const baseDuration = request.baseDuration ?? DEFAULT_STATUS_DURATIONS[request.kind]

  return {
    kind: request.kind,
    duration: calculateAnomalyStatusDuration({
      ...request,
      baseDuration,
    }),
  }
}
