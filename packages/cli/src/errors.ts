export const cliErrorFallbackMessages = {
  "ERR-CLI-ARG": "Command argument error: {message}. Run `fairy help <command>` for usage.",
  "ERR-CLI-CMD": "Unknown subcommand: {command}. Available: calc / compare / scan / explain / migrate / help.",
  "ERR-CLI-JSON": "Failed to parse input JSON: {input}. Check the file format or run `fairy explain` for an example.",
  "ERR-CLI-SCHEMA": "Input does not match BattleSnapshot schema. See JSON `error.details` for specifics; refer to docs/data-contract/battle-snapshot.md.",
  "ERR-CLI-UNCAUGHT": "Uncaught error: {message}. Please file an issue with the input and command.",
} as const

export type CliErrorCode = keyof typeof cliErrorFallbackMessages

export function isCliErrorCode(code: string): code is CliErrorCode {
  return code in cliErrorFallbackMessages
}
