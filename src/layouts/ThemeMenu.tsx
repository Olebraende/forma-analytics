import { Palette } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { IconButton } from '@/components/ui/Button'
import { usePrefs } from '@/app/prefs'
import { THEMES } from '@/themes/themes'

export function ThemeMenu() {
  const { prefs, update, theme } = usePrefs()
  const items = [
    {
      id: 'auto',
      label: 'Automatic',
      description: prefs.seasonal ? 'System + seasonal' : 'Follows your system',
      icon: <Palette size={18} strokeWidth={1.75} aria-hidden="true" />,
      checked: prefs.theme === 'auto',
      onSelect: () => update({ theme: 'auto' }),
    },
    ...THEMES.map((t) => ({
      id: t.id,
      label: t.name,
      icon: <t.icon size={18} strokeWidth={1.75} aria-hidden="true" />,
      checked: prefs.theme === t.id,
      onSelect: () => update({ theme: t.id }),
    })),
  ]
  return (
    <Menu
      label="Theme"
      radio
      items={items}
      trigger={({ props }) => (
        <IconButton label={`Theme: ${THEMES.find((t) => t.id === theme)?.name ?? 'Light'}. Change theme`} variant="secondary" {...props}>
          <Palette size={18} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      )}
    />
  )
}
