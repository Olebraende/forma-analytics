import { useMemo } from 'react'
import { todayISO } from '@/finance/calc'

/** Today's date, stable for the lifetime of a screen. */
export const useToday = () => useMemo(() => todayISO(), [])
