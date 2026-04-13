import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

function toModuleUrl(path) {
  return pathToFileURL(resolve(path)).href
}

async function main() {
  const dataModule = await import(toModuleUrl('packages/data/dist/index.js'))
  const coreModule = await import(toModuleUrl('packages/core/dist/index.js'))
  const cliModule = await import(toModuleUrl('packages/cli/dist/index.js'))

  if (dataModule.DATA_VERSION !== '0.0.0') {
    throw new Error('Unexpected DATA_VERSION export from built data package')
  }

  if (coreModule.calculate().damage !== 0) {
    throw new Error('Unexpected calculate() result from built core package')
  }

  if (cliModule.NOT_IMPLEMENTED_MESSAGE !== 'fairy CLI is not yet implemented.') {
    throw new Error('Unexpected CLI placeholder export from built CLI package')
  }

  const cliEntry = await readFile(resolve('packages/cli/dist/index.js'), 'utf8')

  if (!cliEntry.startsWith('#!/usr/bin/env node')) {
    throw new Error('Built CLI entry is missing the expected shebang')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
