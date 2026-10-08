/** All monetary amounts are integers in minor currency units (e.g. øre). */
export type Minor = number

export type TransactionType = 'income' | 'expense'
export type RecordSource = 'demo' | 'user'

export interface Transaction {
  id: string
  type: TransactionType
  /** Always positive; the sign is carried by `type`. */
  amount: Minor
  categoryId: string
  /** Calendar date, YYYY-MM-DD (local, no timezone). */
  date: string
  description: string
  source: RecordSource
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  /** Monthly spending limit. */
  limit: Minor
  source: RecordSource
}

export interface SavingsGoal {
  id: string
  name: string
  target: Minor
  saved: Minor
  /** Optional YYYY-MM-DD */
  targetDate?: string
  source: RecordSource
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string
}

export type Period = 'this-month' | 'last-month' | '3m' | '6m' | '12m' | 'ytd'

export interface DateRange {
  /** inclusive YYYY-MM-DD */
  from: string
  /** inclusive YYYY-MM-DD */
  to: string
}

export interface FinanceData {
  transactions: Transaction[]
  budgets: Budget[]
  goals: SavingsGoal[]
}

export const SCHEMA_VERSION = 1
export const APP_ID = 'forma-analytics'

export interface ExportFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  data: FinanceData
}
