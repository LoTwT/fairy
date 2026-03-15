import { expect, it } from "vitest"
import {
  calcDABossAltHPReduction,
  calcEnemyDaze,
  calcEnemyDEF,
  calcPP20k,
  calcSDEnemyAltHPReduction,
  calcTSBossAltHPReduction,
} from "../src/buhflipexplode"

it("keeps enemy defense and daze formulas unchanged", () => {
  expect(calcEnemyDEF(100, 2)).toBe(108)
  expect(calcEnemyDaze(100, 22)).toBe(101)
})

it("keeps pp20k and alt hp reduction formulas unchanged", () => {
  expect(calcPP20k(60000)).toBe(16865)
  expect(calcSDEnemyAltHPReduction(["robot"], "10001", true)).toBe(0.1)
  expect(calcDABossAltHPReduction(["miasma"], "25300", 1)).toBe(0.045)
  expect(calcTSBossAltHPReduction(["miasma"], "25300")).toBe(0.045)
})
