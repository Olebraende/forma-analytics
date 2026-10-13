import { useMemo } from 'react'
import { usePrefs } from '@/app/prefs'
import { makeT, type TFunction } from './index'

export function useT(): TFunction {
  const { prefs } = usePrefs()
  return useMemo(() => makeT(prefs.language), [prefs.language])
}
