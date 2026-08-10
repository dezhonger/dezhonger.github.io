import { readFile, writeFile } from 'node:fs/promises'

const [filePath] = process.argv.slice(2)

if (!filePath) {
  throw new Error('Expected a generated file path.')
}

const source = await readFile(filePath, 'utf8')
const normalized = source.replace(/[\t ]+$/gm, '')

if (normalized !== source) {
  await writeFile(filePath, normalized, 'utf8')
}
