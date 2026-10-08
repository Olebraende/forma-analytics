import type { Budget, FinanceData, SavingsGoal, Transaction } from '@/types/models'

const DB_NAME = 'forma-analytics'
/**
 * Schema versions
 *  1: transactions, budgets, goals object stores
 * Add future migrations as additional `if (oldVersion < N)` steps in `migrate`.
 */
export const DB_VERSION = 1

export type StoreName = 'transactions' | 'budgets' | 'goals'
const STORES: StoreName[] = ['transactions', 'budgets', 'goals']

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
  }
}

function migrate(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    const tx = db.createObjectStore('transactions', { keyPath: 'id' })
    tx.createIndex('date', 'date')
    db.createObjectStore('budgets', { keyPath: 'id' })
    db.createObjectStore('goals', { keyPath: 'id' })
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('This browser does not support IndexedDB, so data cannot be saved.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => migrate(req.result, e.oldVersion)
    req.onsuccess = () => {
      const db = req.result
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () =>
      reject(new StorageError('Could not open local storage. Private browsing or blocked site data can cause this.', { cause: req.error }))
    req.onblocked = () => reject(new StorageError('Local storage is blocked by another open tab. Close other tabs and retry.'))
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

/** Closes the connection and forgets it. Used by tests and after deleting the database. */
export async function resetDbConnection() {
  if (!dbPromise) return
  const db = await dbPromise.catch(() => null)
  db?.close()
  dbPromise = null
}

function run<T>(stores: StoreName[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T> | T): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let result: T
        let tx: IDBTransaction
        try {
          tx = db.transaction(stores, mode)
        } catch (cause) {
          reject(new StorageError('Local storage is unavailable.', { cause }))
          return
        }
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(toStorageError(tx.error))
        tx.onabort = () => reject(toStorageError(tx.error))
        Promise.resolve(work(tx)).then((r) => (result = r), reject)
      }),
  )
}

function toStorageError(err: DOMException | null): StorageError {
  if (err?.name === 'QuotaExceededError') return new StorageError('Browser storage is full. Export a backup and free some space.', { cause: err })
  return new StorageError('Saving to local storage failed. Your last change may not have been kept.', { cause: err })
}

const wrap = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

export async function loadAll(): Promise<FinanceData> {
  return run(STORES, 'readonly', async (tx) => {
    const [transactions, budgets, goals] = await Promise.all([
      wrap(tx.objectStore('transactions').getAll() as IDBRequest<Transaction[]>),
      wrap(tx.objectStore('budgets').getAll() as IDBRequest<Budget[]>),
      wrap(tx.objectStore('goals').getAll() as IDBRequest<SavingsGoal[]>),
    ])
    return { transactions, budgets, goals }
  })
}

export const putRecord = <T extends { id: string }>(store: StoreName, value: T) =>
  run([store], 'readwrite', (tx) => void tx.objectStore(store).put(value))

export const deleteRecord = (store: StoreName, id: string) =>
  run([store], 'readwrite', (tx) => void tx.objectStore(store).delete(id))

/** Applies deletions and upserts across stores atomically. */
export function applyChanges(changes: {
  put?: Partial<{ [K in StoreName]: { id: string }[] }>
  remove?: Partial<Record<StoreName, string[]>>
  clear?: StoreName[]
}) {
  const touched = new Set<StoreName>([
    ...(Object.keys(changes.put ?? {}) as StoreName[]),
    ...(Object.keys(changes.remove ?? {}) as StoreName[]),
    ...(changes.clear ?? []),
  ])
  if (touched.size === 0) return Promise.resolve()
  return run([...touched], 'readwrite', (tx) => {
    for (const s of changes.clear ?? []) tx.objectStore(s).clear()
    for (const [s, ids] of Object.entries(changes.remove ?? {}) as [StoreName, string[]][])
      for (const id of ids) tx.objectStore(s).delete(id)
    for (const [s, rows] of Object.entries(changes.put ?? {}) as [StoreName, { id: string }[]][])
      for (const row of rows) tx.objectStore(s).put(row)
  })
}
