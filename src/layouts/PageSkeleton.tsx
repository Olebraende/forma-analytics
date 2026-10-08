import { Skeleton } from '@/components/ui/Misc'
import { Card } from '@/components/ui/Card'

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <Skeleton height="2.25rem" width="14rem" />
      <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton height="0.9rem" width="50%" />
            <div style={{ height: 12 }} />
            <Skeleton height="2rem" width="70%" />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton height="16rem" />
      </Card>
    </div>
  )
}
