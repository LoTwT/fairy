import { describe, expect, it } from "vitest"
import { serializeJson } from "../src/integration/serialize-json.ts"

const text = (value: unknown) => new TextDecoder().decode(serializeJson(value))

describe("integration canonical JSON bytes", () => {
  it("orders decimal keys without Number precision loss and preserves other keys and array order", () => {
    const source = JSON.parse(
      '{"9007199254740993":3,"9007199254740992":2,"10000000000000000":"longer","9999999999999999":"shorter","100000000000000000000000000000000000":4,"10":10,"2":2,"0":0,"01":"leading","1e2":"exponent","1.0":"dot","-1":"minus","+1":"plus","__proto__":{"constructor":null},"constructor":false,"😀":"emoji","":"private","中":["b","a",0,{},[]],"a/b~":"\\n\\u0000"}',
    )
    const expected = `{
  "0": 0,
  "2": 2,
  "10": 10,
  "9007199254740992": 2,
  "9007199254740993": 3,
  "9999999999999999": "shorter",
  "10000000000000000": "longer",
  "100000000000000000000000000000000000": 4,
  "+1": "plus",
  "-1": "minus",
  "01": "leading",
  "1.0": "dot",
  "1e2": "exponent",
  "__proto__": {
    "constructor": null
  },
  "a/b~": "\\n\\u0000",
  "constructor": false,
  "中": [
    "b",
    "a",
    0,
    {},
    []
  ],
  "😀": "emoji",
  "": "private"
}
`
    expect(Buffer.from(serializeJson(source))).toEqual(
      Buffer.from(expected, "utf8"),
    )
    expect(JSON.parse(expected)).toEqual(source)
    expect(Object.hasOwn(JSON.parse(expected), "__proto__")).toBe(true)
  })

  it("handles empty containers and surrogate escaping without losing string values", () => {
    expect(text({ z: [], a: {}, value: "\ud800" })).toBe(
      '{\n  "a": {},\n  "value": "\\ud800",\n  "z": []\n}\n',
    )
    expect(text([3, 1, 3])).toBe("[\n  3,\n  1,\n  3\n]\n")
  })

  it("preserves finite fractional values without rounding", () => {
    expect(text([1.25, -0.5, 1e-7, 5e-324, 0.30000000000000004])).toBe(
      "[\n  1.25,\n  -0.5,\n  1e-7,\n  5e-324,\n  0.30000000000000004\n]\n",
    )
  })

  it.each([NaN, Infinity, -Infinity, -0, 9007199254740992, undefined, 1n])(
    "rejects non-roundtrippable %s",
    (value) => {
      expect(() => serializeJson({ value })).toThrow()
    },
  )
})
