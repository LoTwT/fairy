import type { Diagnostic } from "../schema"

export function warning(key: string, path?: string, messageParams?: Record<string, unknown>): Diagnostic {
  return {
    key,
    severity: "warning",
    ...(path === undefined ? {} : { path }),
    ...(messageParams === undefined ? {} : { messageParams }),
  }
}

export function error(key: string, path?: string, messageParams?: Record<string, unknown>): Diagnostic {
  return {
    key,
    severity: "error",
    ...(path === undefined ? {} : { path }),
    ...(messageParams === undefined ? {} : { messageParams }),
  }
}
