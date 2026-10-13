import { Palette } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { IconButton } from '@/components/ui/Button'
import { usePrefs } from '@/app/prefs'
import { useT } from '@/i18n/useT'
import { THEMES } from '@/themes/themes'

export function ThemeMenu() {
  const { prefs, update, theme } = usePrefs()
  const t = useT()
  const items = [
    {
      id: 'auto',
      label: t('Automatic'),
      description: prefs.seasonal ? t('System + seasonal') : t('Follows your system'),
      icon: <Palette size={18} strokeWidth={1.75} aria-hidden="true" />,
      checked: prefs.theme === 'auto',
      onSelect: () => update({ theme: 'auto' }),
    },
    ...THEMES.map((th) => ({
      id: th.id,
      label: t(th.name),
      icon: <th.icon size={18} strokeWidth={1.75} aria-hidden="true" />,
      checked: prefs.theme === th.id,
      onSelect: () => update({ theme: th.id }),
    })),
  ]
  return (
    <Menu
      label={t('Theme')}
      radio
      items={items}
      trigger={({ props }) => (
        <IconButton label={t('Theme: {name}. Change theme', { name: t(THEMES.find((th) => th.id === theme)?.name ?? 'Light') })} variant="secondary" {...props}>
          <Palette size={18} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      )}
    />
  )
}
