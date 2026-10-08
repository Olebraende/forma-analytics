import { useState, type ReactNode } from 'react'

import { Card, CardHeader } from '@/components/ui/Card'
import { Collapsible } from '@/components/ui/Misc'
import { DataTable } from './index'

interface Props {
  title: string
  description: string
  /** Plain-language takeaway, also available to screen readers. */
  summary?: string
  table?: { caption: string; columns: string[]; rows: string[][] }
  action?: ReactNode
  children: ReactNode
}

/** Card wrapper that pairs every chart with a text summary and a data table alternative. */
export function ChartCard({ title, description, summary, table, action, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Card as="section" aria-label={title}>
      <CardHeader title={title} description={description} action={action} />
      {children}
      {summary && <p className="sr-only">{summary}</p>}
      {table && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Collapsible label={open ? 'Hide data table' : 'Show data table'} open={open} onToggle={setOpen}>
            <DataTable {...table} />
          </Collapsible>
        </div>
      )}
    </Card>
  )
}

