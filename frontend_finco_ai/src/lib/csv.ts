// CSV for Excel with Spanish/Colombian regional settings: ";" between cells, comma decimals, UTF-8 BOM.

export type CsvCell = string | number | null | undefined

const SEPARATOR = ';'

/** An API decimal string ("-130000.50") as Excel reads it in es-CO ("-130000,50"). */
export function csvAmount(value: string): string {
  return value.replace('.', ',')
}

function cell(value: CsvCell): string {
  const text = value == null ? '' : String(value)
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(cell).join(SEPARATOR)).join('\r\n')
}

/** Starts a download of `rows` as `filename` (the BOM makes Excel read UTF-8 accents). */
export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
