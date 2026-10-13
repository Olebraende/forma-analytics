/** Reads the text layer of a PDF locally. pdf.js is loaded only when a PDF is actually chosen. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_PAGES = 5

export class PdfReadError extends Error {
  constructor(public readonly code: 'too-large' | 'not-pdf' | 'protected' | 'no-text' | 'failed') {
    super(code)
  }
}

interface Item {
  str: string
  x: number
  y: number
  w: number
}

/** Groups text fragments into lines by vertical position, left to right. */
export function toLines(items: Item[]): string[] {
  const rows: { y: number; items: Item[] }[] = []
  for (const it of [...items].sort((a, b) => b.y - a.y)) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= 2.5)
    if (row) row.items.push(it)
    else rows.push({ y: it.y, items: [it] })
  }
  return rows
    .map((r) => {
      const sorted = r.items.sort((a, b) => a.x - b.x)
      let line = ''
      let end = -Infinity
      for (const it of sorted) {
        if (!it.str.trim() && !it.str) continue
        const gap = it.x - end
        line += (line && gap > 1.5 ? (gap > 14 ? '  ' : ' ') : '') + it.str
        end = it.x + it.w
      }
      return line.replace(/\s+$/g, '').replace(/^\s+/, '')
    })
    .filter((l) => l.length > 0)
}

export async function extractPdfLines(file: File): Promise<string[]> {
  if (file.size > MAX_PDF_BYTES) throw new PdfReadError('too-large')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') throw new PdfReadError('not-pdf')
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  try {
    const task = pdfjs.getDocument({ data: bytes, enableXfa: false, useSystemFonts: true })
    const doc = await task.promise
    const lines: string[] = []
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const items: Item[] = []
      for (const raw of content.items) {
        if (!('str' in raw)) continue
        items.push({ str: raw.str, x: raw.transform[4] as number, y: raw.transform[5] as number, w: raw.width })
      }
      lines.push(...toLines(items))
    }
    await task.destroy()
    if (lines.length === 0) throw new PdfReadError('no-text')
    return lines
  } catch (e) {
    if (e instanceof PdfReadError) throw e
    if (e instanceof Error && e.name === 'PasswordException') throw new PdfReadError('protected')
    throw new PdfReadError('failed')
  }
}
