import { appendFileSync, writeFileSync } from "node:fs"
import { once } from "node:events"

if (process.env.NANOKA_CLI_TEST_WAIT_FOR_STDIN === "1") {
  await once(process.stdin, "data")
  process.stdin.pause()
}

const requestLog = process.env.NANOKA_CLI_TEST_REQUEST_LOG
if (requestLog === undefined) throw new Error("Missing CLI fixture request log")
writeFileSync(requestLog, "")

const isTTY = process.env.NANOKA_CLI_TEST_TTY === "1"
Object.defineProperty(process.stdin, "isTTY", { value: isTTY })
Object.defineProperty(process.stdout, "isTTY", { value: isTTY })

globalThis.fetch = async (input) => {
  const url = new URL(String(input))
  appendFileSync(requestLog, `${url.pathname}\n`)
  if (url.href === "https://static.nanoka.cc/manifest.json") {
    return Response.json({
      zzz: { live: "3.0", latest: "3.1", available: ["3.0", "3.1"] },
    })
  }
  if (url.origin !== "https://static.nanoka.cc")
    throw new Error(`Unexpected fixture origin: ${url.origin}`)
  if (/^\/zzz\/3\.[01]\/character\.json$/u.test(url.pathname)) {
    return Response.json({ "1": { name: "Fixture" } })
  }
  if (/^\/zzz\/3\.[01]\/(zh|en)\/character\/1\.json$/u.test(url.pathname)) {
    return Response.json(
      process.env.NANOKA_CLI_TEST_INVALID_DETAIL === "1" ? [] : { id: 1 },
    )
  }
  throw new Error(`Unexpected fixture path: ${url.pathname}`)
}
