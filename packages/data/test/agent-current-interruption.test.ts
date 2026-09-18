import * as fs from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  migrateCurrentDataset,
  recoverCurrentDataset,
  updateCurrentDataset,
} from "../scripts/nanoka-integration/current.ts"
import type { CurrentCheckpoint } from "../scripts/nanoka-integration/current.ts"
import {
  change,
  createCurrentDatasetHarness,
} from "./fixtures/current-dataset.ts"

/**
 * 跨进程互斥、真实 SIGKILL 中断与恢复重入。
 * 真实进程死亡、BUSY、恢复重复执行与永久锁身份都必须按协议保持。
 *
 * 中断用例在父子进程之间交换同一份制品字节，因此保留真实格式化调用，
 * 保证跨进程的字节与 inode 比较仍然成立。
 */
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
}))
vi.mock("../scripts/nanoka-integration/format.ts", async (original) => ({
  ...(await original<
    typeof import("../scripts/nanoka-integration/format.ts")
  >()),
}))

const harness = createCurrentDatasetHarness()
const { fixture, control, bytes, verified, clean, child, editJson } = harness
afterEach(async () => {
  vi.restoreAllMocks()
  await harness.cleanup()
})

describe("real process interruption and restart", () => {
  const checkpoints: CurrentCheckpoint[] = [
    "locked",
    "initialized",
    "building",
    "candidate-ready",
    "journal-written",
    "prepared",
    "old-moved",
    "new-installed",
    "report-installed",
    "backup-cleaned",
    "work-cleaned",
    "idle",
  ]
  for (const initial of [true, false])
    it.each(checkpoints.filter((stage) => initial || stage !== "initialized"))(
      `SIGKILL first=${initial} at %s`,
      async (stage) => {
        const input = await fixture()
        if (!initial) await updateCurrentDataset(input)
        const before = initial ? undefined : await bytes(input.targetDirectory)
        await change(input)
        const running = await child(input, { pause: stage })
        const competitor = await child(input)
        const conflict = await competitor.done
        expect(conflict.code).toBe(1)
        expect(conflict.stderr).toContain("BUSY")
        const reader = await child(input, { mode: "read" })
        expect((await reader.done).stderr).toContain("BUSY")
        running.process.kill("SIGKILL")
        expect((await running.done).signal).toBe("SIGKILL")
        // 新进程取到残留数据库的锁；没有删除或按 PID 解锁。
        const lockBefore = await fs.stat(join(control(input), "lock.sqlite"), {
          bigint: true,
        })
        const recovery = await child(input, { mode: "recover" })
        const recovered = await recovery.done
        expect(recovered, recovered.stderr).toMatchObject({
          code: 0,
          stderr: "",
        })
        const committed = [
          "new-installed",
          "report-installed",
          "backup-cleaned",
          "work-cleaned",
          "idle",
        ].includes(stage)
        if (committed) {
          expect(
            JSON.parse(
              (await clean(input)).bytes["agents/2/details.zh.json"].toString(),
            ).name,
          ).toBe("changed")
        } else if (initial) {
          expect(JSON.parse(recovered.stdout).available).toBe(false)
          await expect(fs.lstat(input.targetDirectory)).rejects.toMatchObject({
            code: "ENOENT",
          })
        } else expect((await clean(input)).bytes).toEqual(before)
        const again = await child(input, { mode: "recover" })
        expect(JSON.parse((await again.done).stdout).outcome).toBe("unchanged")
        expect(
          (await fs.stat(join(control(input), "lock.sqlite"), { bigint: true }))
            .ino,
        ).toBe(lockBefore.ino)
        await updateCurrentDataset(input)
        await clean(input)
      },
      20000,
    )

  it("rejects reads after interrupted commit until recovery, and recovers an interrupted rollback", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await bytes(input.targetDirectory)
    await change(input)
    const writer = await child(input, { pause: "old-moved" })
    writer.process.kill("SIGKILL")
    await writer.done
    await expect(verified(input)).rejects.toThrow("RECOVERY_REQUIRED")
    const recovery = await child(input, {
      mode: "recover",
      pause: "old-restored",
    })
    recovery.process.kill("SIGKILL")
    await recovery.done
    const again = await child(input, { mode: "recover" })
    expect((await again.done).code).toBe(0)
    expect((await clean(input)).bytes).toEqual(before)
  })

  it("blocks a writer while another process is reading, then releases the dead reader's lock", async () => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const reader = await child(input, { mode: "read", pause: "reading" })
    await expect(updateCurrentDataset(input)).rejects.toThrow("BUSY")
    reader.process.kill("SIGKILL")
    await reader.done
    expect((await updateCurrentDataset(input)).outcome).toBe("unchanged")
    await clean(input)
  })
})

it("recovers forward after partial backup deletion and rollback after failed candidate rename", async () => {
  const input = await fixture()
  await updateCurrentDataset(input)
  const before = await verified(input)
  await change(input)
  const rename = fs.rename
  vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
    if (
      String(from).endsWith("work/candidate") &&
      String(to) === input.targetDirectory
    )
      throw new Error("rename failed")
    return rename(from, to)
  })
  await expect(updateCurrentDataset(input)).rejects.toThrow("rename failed")
  expect(await verified(input)).toEqual(before)
  vi.restoreAllMocks()
  const remove = fs.rm
  vi.spyOn(fs, "rm").mockImplementation(async (path, options) => {
    if (String(path) === join(control(input), "backup")) {
      await remove(join(String(path), "agents/2/data.json"), { force: true })
      throw new Error("partial cleanup")
    }
    return remove(path, options)
  })
  await expect(updateCurrentDataset(input)).rejects.toThrow("仍需恢复")
  vi.restoreAllMocks()
  expect((await recoverCurrentDataset(input)).outcome).toBe("committed")
  expect((await clean(input)).bytes).not.toEqual(before.bytes)
})

it("resumes rollback even after its candidate has been deleted and another recovery process is killed", async () => {
  const input = await fixture()
  await updateCurrentDataset(input)
  const before = await verified(input)
  await change(input)
  const writer = await child(input, { pause: "prepared" })
  writer.process.kill("SIGKILL")
  await writer.done
  const recovery = await child(input, {
    mode: "recover",
    pause: "work-cleaned",
  })
  recovery.process.kill("SIGKILL")
  await recovery.done
  const again = await child(input, { mode: "recover" })
  expect((await again.done).code).toBe(0)
  expect(await verified(input)).toEqual(before)
  await clean(input)
})

it("preserves partial initial state writes and refuses foreign recovery paths", async () => {
  const input = await fixture()
  await fs.mkdir(control(input), { recursive: true })
  await fs.writeFile(join(control(input), "state.next"), "{partial")
  expect((await recoverCurrentDataset(input)).available).toBe(false)
  expect((await updateCurrentDataset(input)).outcome).toBe("committed")
  const before = await bytes(input.targetDirectory)
  await editJson(join(control(input), "state.json"), (value) => {
    value.targetDirectory = input.rawRoot
  })
  await expect(recoverCurrentDataset(input)).rejects.toThrow("归属")
  expect(await bytes(input.targetDirectory)).toEqual(before)
})

it.each(["backup-partially-cleaned", "work-partially-cleaned"])(
  "restarts after SIGKILL in actual partial cleanup: %s",
  async (pause) => {
    const input = await fixture()
    await updateCurrentDataset(input)
    const before = await verified(input)
    await change(input)
    if (pause === "work-partially-cleaned") {
      const writer = await child(input, { pause: "prepared" })
      writer.process.kill("SIGKILL")
      await writer.done
    }
    const interrupted = await child(input, {
      mode: pause === "work-partially-cleaned" ? "recover" : "update",
      pause,
    })
    interrupted.process.kill("SIGKILL")
    expect((await interrupted.done).signal).toBe("SIGKILL")
    const recovery = await child(input, { mode: "recover" })
    expect((await recovery.done).code).toBe(0)
    const after = await clean(input)
    if (pause === "work-partially-cleaned") expect(after).toEqual(before)
    else expect(after.bytes).not.toEqual(before.bytes)
    const repeated = await child(input, { mode: "recover" })
    expect(JSON.parse((await repeated.done).stdout).outcome).toBe("unchanged")
  },
)

it("refuses to recreate a missing permanent lock in an already managed directory", async () => {
  const input = await fixture()
  await updateCurrentDataset(input)
  const before = await bytes(input.targetDirectory)
  await fs.rm(join(control(input), "lock.sqlite"))
  await expect(updateCurrentDataset(input)).rejects.toThrow("缺失永久锁")
  await expect(recoverCurrentDataset(input)).rejects.toThrow("缺失永久锁")
  await expect(migrateCurrentDataset(input)).rejects.toThrow("缺失永久锁")
  expect(await bytes(input.targetDirectory)).toEqual(before)
  await expect(
    fs.lstat(join(control(input), "lock.sqlite")),
  ).rejects.toMatchObject({ code: "ENOENT" })
})
