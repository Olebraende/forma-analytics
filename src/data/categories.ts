import type { Category } from '@/types/models'

export const CATEGORIES: readonly Category[] = [
  { id: 'salary', name: 'Salary', type: 'income', icon: 'Briefcase' },
  { id: 'freelance', name: 'Freelance', type: 'income', icon: 'Laptop' },
  { id: 'investments', name: 'Investments', type: 'income', icon: 'TrendingUp' },
  { id: 'other-income', name: 'Other income', type: 'income', icon: 'CircleDollarSign' },
  { id: 'housing', name: 'Housing', type: 'expense', icon: 'House' },
  { id: 'groceries', name: 'Groceries', type: 'expense', icon: 'ShoppingBasket' },
  { id: 'transport', name: 'Transport', type: 'expense', icon: 'Bus' },
  { id: 'dining', name: 'Dining out', type: 'expense', icon: 'Utensils' },
  { id: 'utilities', name: 'Utilities', type: 'expense', icon: 'Zap' },
  { id: 'health', name: 'Health', type: 'expense', icon: 'HeartPulse' },
  { id: 'leisure', name: 'Leisure', type: 'expense', icon: 'Ticket' },
  { id: 'shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag' },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', icon: 'Repeat' },
  { id: 'travel', name: 'Travel', type: 'expense', icon: 'Plane' },
  { id: 'other-expense', name: 'Other expenses', type: 'expense', icon: 'Ellipsis' },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export const getCategory = (id: string): Category =>
  byId.get(id) ?? { id, name: 'Uncategorised', type: 'expense', icon: 'Ellipsis' }

export const isCategoryId = (id: string) => byId.has(id)

export const categoriesFor = (type: Category['type']) => CATEGORIES.filter((c) => c.type === type)
