export const NOT_IMPLEMENTED_MESSAGE = 'fairy CLI is not yet implemented.'

export interface Logger {
  log: (message: string) => void
}

export function run(logger: Logger = console): string {
  logger.log(NOT_IMPLEMENTED_MESSAGE)
  return NOT_IMPLEMENTED_MESSAGE
}

if (import.meta.main) {
  run()
}
