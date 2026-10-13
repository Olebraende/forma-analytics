// Lists every English source string passed to t(...) plus the data-driven labels, so translators
// (and the i18n test) can check that each has a Norwegian counterpart.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rel = (p) => join(root, p)

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = walk(rel('src')).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f) && !f.includes('/src/i18n/'))
const keys = new Set()
const call = /\bt0?\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g
const ternary = /\bt\(\s*[^'"`()]*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(call)) keys.add((m[1] ?? m[2]).replace(/\\'/g, "'"))
  for (const m of src.matchAll(ternary)) { keys.add(m[1].replace(/\\'/g, "'")); keys.add(m[2].replace(/\\'/g, "'")) }
}
// Data-driven labels translated at the point of use.
const data = [
  ...readFileSync(rel('src/data/categories.ts'), 'utf8').matchAll(/name: '([^']+)'/g),
  ...readFileSync(rel('src/themes/themes.ts'), 'utf8').matchAll(/(?:name|description): '([^']+)'/g),
  ...readFileSync(rel('src/finance/calc.ts'), 'utf8').matchAll(/label: '([^']+)'/g),
  ...readFileSync(rel('src/routes/Analytics.tsx'), 'utf8').matchAll(/label: '([^']+)'/g),
  ...readFileSync(rel('src/layouts/nav.ts'), 'utf8').matchAll(/label: '([^']+)'/g),
  ...readFileSync(rel('src/layouts/AppLayout.tsx'), 'utf8').matchAll(/^  '([^']+)',$/gm),
  ...readFileSync(rel('src/layouts/Brand.tsx'), 'utf8').matchAll(/^  '([^']+)',$/gm),
  ...readFileSync(rel('src/storage/exchange.ts'), 'utf8').matchAll(/error: '([^']+)'/g),
  ...readFileSync(rel('src/storage/db.ts'), 'utf8').matchAll(/StorageError\('([^']+)'/g),
  ...readFileSync(rel('src/finance/store.tsx'), 'utf8').matchAll(/'(Could not load data\.)'/g),
]
for (const m of data) keys.add(m[1])
export const allKeys = [...keys].sort()
if (process.argv[1].endsWith('extract-i18n.mjs')) console.log(JSON.stringify(allKeys, null, 1))
