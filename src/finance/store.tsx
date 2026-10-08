import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { generateDemoData } from '@/data/demo'
import { applyChanges, loadAll } from '@/storage/db'
import type { Budget, FinanceData, SavingsGoal, Transaction } from '@/types/models'
import { todayISO } from './calc'
import { usePrefs } from '@/app/prefs'

type Status = 'loading' | 'ready' | 'error'

interface State extends FinanceData {
  status: Status
  error: string | null
}

type Action =
  | { type: 'loaded'; data: FinanceData }
  | { type: 'failed'; message: string }
  | { type: 'upsert'; data: Partial<FinanceData> }
  | { type: 'remove'; ids: { transactions?: string[]; budgets?: string[]; goals?: string[] } }
  | { type: 'replace'; data: FinanceData }

const initial: State = { transactions: [], budgets: [], goals: [], status: 'loading', error: null }

const upsertList = <T extends { id: string }>(list: T[], rows: T[] | undefined) => {
  if (!rows?.length) return list
  const map = new Map(list.map((r) => [r.id, r]))
  for (const r of rows) map.set(r.id, r)
  return [...map.values()]
}
const drop = <T extends { id: string }>(list: T[], ids: string[] | undefined) => (ids?.length ? list.filter((r) => !ids.includes(r.id)) : list)

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
    case 'replace':
      return { ...action.data, status: 'ready', error: null }
    case 'failed':
      return { ...state, status: 'error', error: action.message }
    case 'upsert':
      return {
        ...state,
        transactions: upsertList(state.transactions, action.data.transactions),
        budgets: upsertList(state.budgets, action.data.budgets),
        goals: upsertList(state.goals, action.data.goals),
      }
    case 'remove':
      return {
        ...state,
        transactions: drop(state.transactions, action.ids.transactions),
        budgets: drop(state.budgets, action.ids.budgets),
        goals: drop(state.goals, action.ids.goals),
      }
  }
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

export interface FinanceApi extends FinanceData {
  status: Status
  error: string | null
  saveTransaction: (t: Transaction) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  saveBudget: (b: Budget) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  saveGoal: (g: SavingsGoal) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  /** Adds records without touching existing ones. */
  addRecords: (data: FinanceData) => Promise<void>
  /** Replaces everything. */
  replaceAll: (data: FinanceData) => Promise<void>
  removeDemo: () => Promise<void>
  loadDemo: () => Promise<void>
  resetDemo: () => Promise<void>
  clearAll: () => Promise<void>
  retry: () => void
  hasDemo: boolean
  hasUserData: boolean
}

const Ctx = createContext<FinanceApi | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const { prefs, update } = usePrefs()
  const seededRef = useRef(prefs.demoSeeded)
  const stateRef = useRef(state)
  stateRef.current = state

  const load = useCallback(async () => {
    try {
      let data = await loadAll()
      const isEmpty = !data.transactions.length && !data.budgets.length && !data.goals.length
      if (isEmpty && !seededRef.current) {
        // First run: show a realistic demo immediately. Flagged so deleting it is respected.
        data = generateDemoData(todayISO())
        await applyChanges({ put: { transactions: data.transactions, budgets: data.budgets, goals: data.goals } })
        seededRef.current = true
        update({ demoSeeded: true })
      }
      dispatch({ type: 'loaded', data })
    } catch (e) {
      dispatch({ type: 'failed', message: e instanceof Error ? e.message : 'Could not load data.' })
    }
  }, [update])

  useEffect(() => {
    void load()
  }, [load])

  const api = useMemo<FinanceApi>(() => {
    const current = () => stateRef.current
    return {
      transactions: state.transactions,
      budgets: state.budgets,
      goals: state.goals,
      status: state.status,
      error: state.error,
      hasDemo: [...state.transactions, ...state.budgets, ...state.goals].some((r) => r.source === 'demo'),
      hasUserData: [...state.transactions, ...state.budgets, ...state.goals].some((r) => r.source === 'user'),
      retry: () => void load(),
      async saveTransaction(t) {
        await applyChanges({ put: { transactions: [t] } })
        dispatch({ type: 'upsert', data: { transactions: [t] } })
      },
      async deleteTransaction(id) {
        await applyChanges({ remove: { transactions: [id] } })
        dispatch({ type: 'remove', ids: { transactions: [id] } })
      },
      async saveBudget(b) {
        await applyChanges({ put: { budgets: [b] } })
        dispatch({ type: 'upsert', data: { budgets: [b] } })
      },
      async deleteBudget(id) {
        await applyChanges({ remove: { budgets: [id] } })
        dispatch({ type: 'remove', ids: { budgets: [id] } })
      },
      async saveGoal(g) {
        await applyChanges({ put: { goals: [g] } })
        dispatch({ type: 'upsert', data: { goals: [g] } })
      },
      async deleteGoal(id) {
        await applyChanges({ remove: { goals: [id] } })
        dispatch({ type: 'remove', ids: { goals: [id] } })
      },
      async addRecords(data) {
        await applyChanges({ put: { transactions: data.transactions, budgets: data.budgets, goals: data.goals } })
        dispatch({ type: 'upsert', data })
      },
      async replaceAll(data) {
        await applyChanges({ clear: ['transactions', 'budgets', 'goals'], put: { transactions: data.transactions, budgets: data.budgets, goals: data.goals } })
        dispatch({ type: 'replace', data })
      },
      async removeDemo() {
        const s = current()
        const ids = {
          transactions: s.transactions.filter((r) => r.source === 'demo').map((r) => r.id),
          budgets: s.budgets.filter((r) => r.source === 'demo').map((r) => r.id),
          goals: s.goals.filter((r) => r.source === 'demo').map((r) => r.id),
        }
        await applyChanges({ remove: ids })
        dispatch({ type: 'remove', ids })
      },
      async loadDemo() {
        const demo = generateDemoData(todayISO())
        const s = current()
        // Demo budgets for categories the user already budgets would conflict; skip those.
        const taken = new Set(s.budgets.map((b) => b.categoryId))
        const data = { ...demo, budgets: demo.budgets.filter((b) => !taken.has(b.categoryId)) }
        await applyChanges({ put: { transactions: data.transactions, budgets: data.budgets, goals: data.goals } })
        dispatch({ type: 'upsert', data })
      },
      async resetDemo() {
        const s = current()
        const demo = generateDemoData(todayISO())
        const keep = {
          transactions: s.transactions.filter((r) => r.source !== 'demo'),
          budgets: s.budgets.filter((r) => r.source !== 'demo'),
          goals: s.goals.filter((r) => r.source !== 'demo'),
        }
        const taken = new Set(keep.budgets.map((b) => b.categoryId))
        const data: FinanceData = {
          transactions: [...keep.transactions, ...demo.transactions],
          budgets: [...keep.budgets, ...demo.budgets.filter((b) => !taken.has(b.categoryId))],
          goals: [...keep.goals, ...demo.goals],
        }
        await applyChanges({ clear: ['transactions', 'budgets', 'goals'], put: data })
        dispatch({ type: 'replace', data })
      },
      async clearAll() {
        await applyChanges({ clear: ['transactions', 'budgets', 'goals'] })
        dispatch({ type: 'replace', data: { transactions: [], budgets: [], goals: [] } })
      },
    }
  }, [state, load])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useFinance(): FinanceApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useFinance must be used within FinanceProvider')
  return v
}
