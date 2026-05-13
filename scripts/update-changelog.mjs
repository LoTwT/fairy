import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = `v${packageJson.version}`

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  })
}

function tagExists(ref) {
  try {
    run('git', ['rev-parse', '--verify', `refs/tags/${ref}`], { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

function stripUnreleasedSection(markdown) {
  const match = /^## Unreleased(?:\r?\n|$)/m.exec(markdown)
  if (!match)
    return markdown

  const start = match.index
  const afterHeading = start + match[0].length
  const rest = markdown.slice(afterHeading)
  const nextRelease = /^## /m.exec(rest)

  if (!nextRelease)
    return markdown.slice(0, start)

  return markdown.slice(0, start) + markdown.slice(afterHeading + nextRelease.index)
}

function normalizeFinalNewline(markdown) {
  return `${markdown.replace(/\n+$/, '')}\n`
}

if (tagExists(tag)) {
  // During ordinary post-release development, package.json still points at the
  // latest published version. Regenerate from real tags and drop the transient
  // Unreleased section so `pnpm changelog` remains stable until the next bump.
  run('git-cliff', ['--output', 'CHANGELOG.md'], { stdio: 'inherit' })
  const changelog = readFileSync('CHANGELOG.md', 'utf8')
  writeFileSync('CHANGELOG.md', normalizeFinalNewline(stripUnreleasedSection(changelog)))
}
else {
  // During `bumpp`, package.json has already moved to the new version but the
  // tag does not exist yet. Use that future tag as the generated release entry.
  run('git-cliff', ['--tag', tag, '--output', 'CHANGELOG.md'], { stdio: 'inherit' })
  const changelog = readFileSync('CHANGELOG.md', 'utf8')
  writeFileSync('CHANGELOG.md', normalizeFinalNewline(changelog))
}
