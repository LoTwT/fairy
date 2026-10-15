import { describe, expect, it } from "vitest"
import * as api from "../src/index.ts"
import * as engine from "../../core/src/index.ts"
import { roxyMindscapeConsumerSource } from "./fixtures/roxy-mindscape-consumer.ts"
import { roxyCoreWindConsumerSource } from "./fixtures/roxy-core-wind-consumer.ts"

describe("Roxy core wind formal data, high level and installed consumer behavior", () => {
  it("uses the same real data and explicit bound CR in Node and Vite", async () => {
    const verify = new Function(
      "api",
      "engine",
      `${roxyMindscapeConsumerSource}\n${roxyCoreWindConsumerSource}\nreturn verifyRoxyCoreWindConsumer(api,engine)`,
    )
    const result = await verify(api, engine)
    expect(result.normal).toBeCloseTo(2467.5, 9)
    expect(result.sharp).toBeCloseTo(4319.7, 9)
    expect(result.high).toBeCloseTo(5149.6725, 9)
    expect(result.missingRejected).toBe(true)
  })
})
