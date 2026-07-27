import type { SupportedLanguage } from "./policy.ts"
import { isPlainObject, isValidCharacterId } from "./policy.ts"

export interface CharacterDetailResource {
  characterId: string
  language: SupportedLanguage
  assetId: string
  localPath: string
}

export function createCharacterDetailResource(
  characterId: string,
  language: SupportedLanguage,
): CharacterDetailResource {
  return {
    characterId,
    language,
    assetId: `character-detail:${language}:${characterId}`,
    localPath: `${language}/character/${characterId}.json`,
  }
}

export function discoverCharacterIds(value: unknown): string[] {
  if (!isPlainObject(value)) {
    throw new Error("character.json 顶层必须是普通对象")
  }

  const ids = Object.keys(value)
  if (ids.length === 0) {
    throw new Error("character.json 不能为空")
  }
  for (const id of ids) {
    if (!isValidCharacterId(id)) {
      throw new Error(`character.json 包含非法 Agent ID：${id}`)
    }
    if (!isPlainObject(value[id])) {
      throw new Error(`character.json 的 Agent ${id} 必须是普通对象`)
    }
  }

  return ids.toSorted((left, right) => {
    const leftNumber = BigInt(left)
    const rightNumber = BigInt(right)
    return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0
  })
}

export function createCharacterDetailResources(
  characterIds: string[],
  languages: SupportedLanguage[],
): CharacterDetailResource[] {
  return characterIds.flatMap((characterId) =>
    languages.map((language) =>
      createCharacterDetailResource(characterId, language),
    ),
  )
}

export function validateCharacterDetail(
  value: unknown,
  expectedCharacterId: string,
): void {
  if (!isPlainObject(value)) {
    throw new Error(`Agent ${expectedCharacterId} 详情必须是普通对象`)
  }
  if (value.id === undefined) {
    return
  }
  if (
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    String(value.id) !== expectedCharacterId
  ) {
    throw new Error(
      `Agent 详情 ID 与路径不一致：期望 ${expectedCharacterId}，实际 ${String(value.id)}`,
    )
  }
}
