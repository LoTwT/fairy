import { describe, expect, it } from "vitest"

import { stripRichText } from "../src"

describe("stripRichText", () => {
  it("removes inline tags and keeps line breaks", () => {
    expect(
      stripRichText(
        'Press <span style="color: #FFFFFF">[Basic Attack]</span><br/>Deal DMG.',
      ),
    ).toBe("Press [Basic Attack]\nDeal DMG.")
  })

  it("collapses extra blank lines after stripping tags", () => {
    expect(stripRichText("A<br/><br/><br/>B")).toBe("A\n\nB")
  })
})
