// Public text helpers for published JSON payloads.
//
// Several released data fields preserve source-compatible rich text strings
// with inline tags like <span>, <br/>, and data-icon markup. Consumers that
// need plain text should normalize them explicitly instead of assuming the
// payload is already clean text.

/** Source-compatible rich text payload stored as a string in published JSON. */
export type RichTextString = string

const lineBreakPattern = /<br\s*\/?>/gi
const tagPattern = /<[^>]+>/g
const blankLinePattern = /\n{3,}/g

/**
 * Strip source rich-text tags from a published string payload.
 *
 * This helper preserves line breaks from `<br/>` tags and removes all other
 * markup. It does not decode HTML entities.
 */
export function stripRichText(value: RichTextString): string {
  return value
    .replace(lineBreakPattern, "\n")
    .replace(tagPattern, "")
    .replace(blankLinePattern, "\n\n")
    .trim()
}
