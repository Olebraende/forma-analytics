import { applyChanges, loadAll, resetDbConnection } from './db'
import type { Transaction } from '@/types/models'

const t = (id: string): Transaction => ({ id, type: 'income', amount: 100, categoryId: 'salary', date: '2026-01-01', description: 'Pay', source: 'user', createdAt: '2026-01-01T00:00:00Z' })

beforeEach(async () => {
  await resetDbConnection()
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase('forma-analytics')
    r.onsuccess = r.onerror = () => res()
  })
})

describe('IndexedDB storage', () => {
  it('persists and reloads records', async () => {
    await applyChanges({ put: { transactions: [t('a'), t('b')], goals: [{ id: 'g', name: 'G', target: 1, saved: 0, source: 'user' } as never] } })
    await resetDbConnection() // simulate a reload
    const data = await loadAll()
    expect(data.transactions.map((x) => x.id).sort()).toEqual(['a', 'b'])
    expect(data.goals).toHaveLength(1)
  })
  it('deletes and clears atomically', async () => {
    await applyChanges({ put: { transactions: [t('a'), t('b')] } })
    await applyChanges({ remove: { transactions: ['a'] } })
    expect((await loadAll()).transactions.map((x) => x.id)).toEqual(['b'])
    await applyChanges({ clear: ['transactions'] })
    expect((await loadAll()).transactions).toEqual([])
  })
  it('updates in place by id', async () => {
    await applyChanges({ put: { transactions: [t('a')] } })
    const updated = { ...t('a'), amount: 999 }
    await applyChanges({ put: { transactions: [updated] } })
    const all = (await loadAll()).transactions
    expect(all).toHaveLength(1)
    expect(all[0]?.amount).toBe(999)
  })
})
