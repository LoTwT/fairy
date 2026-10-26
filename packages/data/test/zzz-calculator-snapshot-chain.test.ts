import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface SnapshotRefresh {
  reason: string
  implementationBase: string
  previous: {
    snapshotId: string
    artifactSha256: Record<string, string>
  }
  currentSnapshotId: string
}

interface ReferenceFixture {
  fairy?: { dataVersion?: { snapshotId?: string } }
  provenance?: { fairyCalculationDataVersion?: { snapshotId?: string } }
  fairySnapshotRefreshes: SnapshotRefresh[]
}

function load(name: string): ReferenceFixture {
  return JSON.parse(
    readFileSync(
      new URL(
        `./fixtures/zzz-calculator-${name}-reference.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as ReferenceFixture
}

const fixtures = {
  abloom: load("abloom"),
  static: load("static"),
  vortex: load("vortex"),
}

const staticPath = "packages/data/definitions/effects/static.json"
const catalogPath = "packages/data/definitions/effects/static-catalog.json"

/** 逐条核对过的历史基点；新刷新只能追加，不能就地改写。 */
const expectedImplementationBases = [
  "476553e928c8c952e2ddf42541a9e19665481391",
  "1f79d05b098145860160da1abcf507eddc0c9752",
  "67bc0ac8ead4a86899dcf3367691a8a5861dddc6",
  "a71b6316c5328303a83ec35940c9761746280c4c",
  "e430cfddf315068b99c87441e294c9a54e724572",
  "e63992e104af667e7ad03216e0bc2d3ce64cddda",
  "1e3aed68f5d034b88f3f6ee4542e58bdc2475711",
  "8a45993a8a9ff648880463461152936c74393385",
  "b1d32c5e4bf5d0f2f2866a24e599ae32f810b992",
  "fd79a5a5afb6b171c9d387d35f540d6f85d6408a",
  "e550d2f1",
  "37d980f2",
  "d8a8f202",
  "c9d191fa",
  "4b6063b6",
  "b65cddb6",
] as const

const expectedPreviousSnapshotIds = [
  "sha256:45ff13996d8c9d86b87e286f2c3d96378c0981a7b6575078a18f705253c0b3d7",
  "sha256:2e912b3ff60c50158f84d984d93d70d8653bae2df4a988f89d1be1d168a398dc",
  "sha256:3a842b434d5cb7568dc843873e1f23b58f2daf6820970620e2aeb316667c029d",
  "sha256:754db1ed00046d2da9b9f893a48c607badbc9e5137169217a4bd3b1678f25540",
  "sha256:72f8efdb8aea0ca44f1d8b37b3d28d6c095887b8853e6ac8c1a13c6d880fcc71",
  "sha256:6cf7f6a2da16cb770a4573e91608a60724ef0ce77d0bb1c363e231a7bcef9d9a",
  "sha256:e423558334fb76962ebdfab3681b32da4c637d5de485984a8ae74459a1c2fb87",
  "sha256:03d35c11134debc997977fb3c077da49a0ea90a2462c5c91f13b01d0ccf52a80",
  "sha256:7bb28d858be347be6ef86a5ae7d5a1f1286f4048b1039e01a6f3ae39b47f0c09",
  "sha256:5217cca17a930b923e837ae24527e61f7248223c2411ebf749e3fe6f90077000",
  "sha256:14d1e42b5f8b64f0fbb1e218c97edb64dbb7e5d7429e948999153bcfefd322cc",
  "sha256:b1f5824aaade8f014536b359af14e86239dc49cc85cf52d1e7e0d8b8c2fb65e9",
  "sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c",
  "sha256:8d23a7d2e64a07fd546f9982cd40a1a7890b8a71c2e942a59b9ebfb54d07965b",
  "sha256:9f56c4647bb6d33bdafe084134fa12a125e988cfb4f80300e5738035f4c36be2",
  "sha256:0d5a9837cb2f93ad874693aad41c6682edbdeadcb016b09c8818ebfd46997165",
] as const

const expectedCurrentSnapshotIds = [
  "sha256:2e912b3ff60c50158f84d984d93d70d8653bae2df4a988f89d1be1d168a398dc",
  "sha256:3a842b434d5cb7568dc843873e1f23b58f2daf6820970620e2aeb316667c029d",
  "sha256:754db1ed00046d2da9b9f893a48c607badbc9e5137169217a4bd3b1678f25540",
  "sha256:72f8efdb8aea0ca44f1d8b37b3d28d6c095887b8853e6ac8c1a13c6d880fcc71",
  "sha256:6cf7f6a2da16cb770a4573e91608a60724ef0ce77d0bb1c363e231a7bcef9d9a",
  "sha256:e423558334fb76962ebdfab3681b32da4c637d5de485984a8ae74459a1c2fb87",
  "sha256:03d35c11134debc997977fb3c077da49a0ea90a2462c5c91f13b01d0ccf52a80",
  "sha256:7bb28d858be347be6ef86a5ae7d5a1f1286f4048b1039e01a6f3ae39b47f0c09",
  "sha256:5217cca17a930b923e837ae24527e61f7248223c2411ebf749e3fe6f90077000",
  "sha256:14d1e42b5f8b64f0fbb1e218c97edb64dbb7e5d7429e948999153bcfefd322cc",
  "sha256:b1f5824aaade8f014536b359af14e86239dc49cc85cf52d1e7e0d8b8c2fb65e9",
  "sha256:02398d0fc76b4eed4bd7aaccd1370f8c161b5331266a0442c1f54ee67668f03c",
  "sha256:8d23a7d2e64a07fd546f9982cd40a1a7890b8a71c2e942a59b9ebfb54d07965b",
  "sha256:9f56c4647bb6d33bdafe084134fa12a125e988cfb4f80300e5738035f4c36be2",
  "sha256:0d5a9837cb2f93ad874693aad41c6682edbdeadcb016b09c8818ebfd46997165",
  "sha256:ccb28367195fe2f2b4183623a3332119fbc742ffc484b40cd9be89be645623ae",
] as const

/** 本次逐条核对过的 static-effects 制品摘要；entry 5 保留 PR-D 改写前的 catalog 值，entry 6 记录本次刷新前的字节。 */
const expectedArtifactSha256 = [
  [
    "e12ca8aa8f1497052c42965465bdebc8409dfe4206ff00b91944fc47bf3ef11a",
    "6ab706d8cefbf16e9f0b21ac41746df3bbc5f5cf1a3326e58b2c5f638b9ad228",
  ],
  [
    "d33f4897487e84454fb6d4ca55cfb8471906931356598b3abe0f61752a3d58eb",
    "c322d5e6104a478335e2a9df40337f05091640927dc4838390994c710b17e28e",
  ],
  [
    "c76226ebc3ba5e886cfd84800aeb230450b3cd5bbcbb615ae6b1a054bb93e98b",
    "e4a24ee13829885ca0848f384bfdae69e53b478e811597a187eecd3e5c0dd5f4",
  ],
  [
    "a8aac21c0307af11934c1eaf84a5f14cccf390487b5ea6e9505307c8e4ec3305",
    "2c75ada280abfd2269270a794a76a3558994bf882c5d6aae6180081b8d22fb12",
  ],
  [
    "a8aac21c0307af11934c1eaf84a5f14cccf390487b5ea6e9505307c8e4ec3305",
    "2c75ada280abfd2269270a794a76a3558994bf882c5d6aae6180081b8d22fb12",
  ],
  [
    "a8aac21c0307af11934c1eaf84a5f14cccf390487b5ea6e9505307c8e4ec3305",
    "2c75ada280abfd2269270a794a76a3558994bf882c5d6aae6180081b8d22fb12",
  ],
  [
    "a8aac21c0307af11934c1eaf84a5f14cccf390487b5ea6e9505307c8e4ec3305",
    "0958a918aebb418d67e67280b4ccbdc83f63a8362ee8d478bb9c5bd1739761dc",
  ],
  [
    "a8aac21c0307af11934c1eaf84a5f14cccf390487b5ea6e9505307c8e4ec3305",
    "216b53724babb594ab3344525388d69db6d2781a1c52afa72e28165e5a35eaf7",
  ],
  [
    "a8aac21c0307af11934c1eaf84a5f14cccf390487b5ea6e9505307c8e4ec3305",
    "216b53724babb594ab3344525388d69db6d2781a1c52afa72e28165e5a35eaf7",
  ],
  [
    "ded653e4cef2476fe734f600a3a32e84ab67fe06eac27d162e53d4e509f16a5c",
    "642bfef9034f86d92ea616e03d38cfc659c88a1f0021deaefbd481111eac7312",
  ],
  [
    "b258a6296583e2121782e6ceaa2cd83e73c8fa183f48574635e26bf95a9a5d86",
    "838f73960714aa54cd7174ed6f2f0aa00d95c798595d8d1b2c9d4a2c0e692424",
  ],
  [
    "4ac26c773f9d9371c579e0c9f5cd271800454d7cae46b424d5390771941ee97b",
    "b0f7831d1e02118f6445b5e9e091e309733464c467ff63a7f0df22f0f95323df",
  ],
  [
    "3a30bd0e5e5bc8fc2087163da1fc5e857cbca71ccc1bf2bf8c3b2777193ce823",
    "c8455d57b00a0329da50841e4d1a0bcc7e35bc28fd2b4319520dba01ab1c670c",
  ],
  [
    "f92a28d490bf640a4332fd8117589aeb901c8bdc9ff6ffcad8fd2f9032c68424",
    "e6da1a47356054611280a3edd7e3c93406facf28ac17138df294fef3945c0e83",
  ],
  [
    "1af6cc927d5a64fb5fe50943444263ed990f485e417cca80acde80af3934d8ec",
    "28a603be5dc2a47d5b817e46a5cc3d4ad06b5e0bb976886ba237998e4cbf4fdb",
  ],
  [
    "285dfa01ef6087d45740e9784e466e06953543d8e336fbf860c2e5efe46abe6d",
    "ca8b4f0b810c0720f46e410ae4318b37a491c9e2afe3012c5643b4e0baa4a2d0",
  ],
] as const

describe("ZZZ Calculator 快照刷新链", () => {
  it("三份夹具均为 16 条，相邻条目首尾相接，末条等于当前消费快照", () => {
    for (const [name, fixture] of Object.entries(fixtures)) {
      const entries = fixture.fairySnapshotRefreshes
      expect(entries, name).toHaveLength(16)
      entries.forEach((entry, index) => {
        expect(entry.implementationBase, `${name} entry ${index}`).toBe(
          expectedImplementationBases[index],
        )
        expect(entry.previous.snapshotId, `${name} entry ${index}`).toBe(
          expectedPreviousSnapshotIds[index],
        )
        expect(entry.currentSnapshotId, `${name} entry ${index}`).toBe(
          expectedCurrentSnapshotIds[index],
        )
        if (index > 0)
          expect(entry.previous.snapshotId, `${name} entry ${index}`).toBe(
            entries[index - 1]!.currentSnapshotId,
          )
      })
      const snapshotId =
        fixture.fairy?.dataVersion?.snapshotId ??
        fixture.provenance?.fairyCalculationDataVersion?.snapshotId
      expect(snapshotId, name).toBe(expectedCurrentSnapshotIds.at(-1))
      expect(entries.at(-1)!.currentSnapshotId, name).toBe(snapshotId)
    }
  })

  it("三份夹具的刷新链逐条相同", () => {
    // 各文件对同一刷新记录的 artifactSha256 记录范围可以不同（历史条目可能未记录），
    // 因此只比较快照链与实施基点；摘要由下一个用例按已记录项逐条核对。
    const reference = fixtures.abloom.fairySnapshotRefreshes.map(
      ({ implementationBase, previous, currentSnapshotId }) => ({
        implementationBase,
        previousSnapshotId: previous.snapshotId,
        currentSnapshotId,
      }),
    )
    for (const [name, fixture] of Object.entries(fixtures)) {
      expect(
        fixture.fairySnapshotRefreshes.map(
          ({ implementationBase, previous, currentSnapshotId }) => ({
            implementationBase,
            previousSnapshotId: previous.snapshotId,
            currentSnapshotId,
          }),
        ),
        name,
      ).toStrictEqual(reference)
    }
  })

  it("已记录的历史制品摘要逐条钉住，防止就地改写", () => {
    for (const [name, fixture] of Object.entries(fixtures)) {
      fixture.fairySnapshotRefreshes.forEach((entry, index) => {
        const expected = expectedArtifactSha256[index]!
        const expectedRecord = {
          [staticPath]: expected[0],
          [catalogPath]: expected[1],
        }
        // 只有 static/vortex 的 entry 0 历史上整体未记录摘要；其余条目必须两项齐全且值正确，
        // 不能以空对象规避核对。
        if (
          index === 0 &&
          (name === "static" || name === "vortex") &&
          Object.keys(entry.previous.artifactSha256).length === 0
        )
          return
        expect(
          entry.previous.artifactSha256,
          `${name} entry ${index}`,
        ).toStrictEqual(expectedRecord)
      })
    }
  })
})
