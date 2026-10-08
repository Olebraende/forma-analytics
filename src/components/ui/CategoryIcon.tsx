import {
  Briefcase, Bus, CircleDollarSign, Ellipsis, HeartPulse, House, Laptop, Plane, Repeat, ShoppingBag, ShoppingBasket,
  Ticket, TrendingUp, Utensils, Zap, type LucideIcon,
} from 'lucide-react'
import { getCategory } from '@/data/categories'

const ICONS: Record<string, LucideIcon> = {
  Briefcase, Bus, CircleDollarSign, Ellipsis, HeartPulse, House, Laptop, Plane, Repeat, ShoppingBag, ShoppingBasket,
  Ticket, TrendingUp, Utensils, Zap,
}

export function CategoryIcon({ categoryId, size = 18 }: { categoryId: string; size?: number }) {
  const Icon = ICONS[getCategory(categoryId).icon] ?? Ellipsis
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />
}
