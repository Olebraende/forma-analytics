import styles from './Mascot.module.css'

/** Original Santa illustration. Decorative: the speech line beside it carries the text. */
export function Santa({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={styles.avatar}>
      <circle cx="32" cy="32" r="31" fill="#fceaea" />
      <ellipse cx="32" cy="40" rx="15" ry="13" fill="#f6cfb2" />
      <path d="M15 40c0 17 11 21 17 21s17-4 17-21c-4 7-9 9-17 9s-13-2-17-9z" fill="#fff" />
      <path d="M13 29c0-14 11-22 24-21 4 7 8 12 13 21z" fill="#c62828" />
      <rect x="10" y="26" width="44" height="10" rx="5" fill="#fff" />
      <circle cx="45" cy="9" r="5.5" fill="#fff" className={styles.pom} />
      <circle cx="26" cy="40" r="1.9" fill="#3b1f1f" />
      <circle cx="38" cy="40" r="1.9" fill="#3b1f1f" />
      <circle cx="21.5" cy="44" r="2.8" fill="#f28b8b" opacity="0.65" />
      <circle cx="42.5" cy="44" r="2.8" fill="#f28b8b" opacity="0.65" />
      <circle cx="32" cy="43.5" r="3" fill="#e57373" />
      <path d="M22 49c3-3 7-3 10-1 3-2 7-2 10 1-3 4-7 5-10 3-3 2-7 1-10-3z" fill="#fff" />
    </svg>
  )
}

/** Original jack-o'-lantern illustration with a flickering glow. */
export function Pumpkin({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={styles.avatar}>
      <circle cx="32" cy="32" r="31" fill="#2a1a40" />
      <path d="M30 14c0-4 2-7 6-8" stroke="#6ee7a8" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="32" cy="36" rx="23" ry="19" fill="#f97316" />
      <path d="M32 17c-7 5-7 33 0 38M32 17c7 5 7 33 0 38M21 20c-6 8-5 26 2 33M43 20c6 8 5 26-2 33" stroke="#c2570c" strokeWidth="1.6" fill="none" opacity="0.7" />
      <g className={styles.glow} fill="#fde68a">
        <path d="M18 31l8 2-5 7z" />
        <path d="M46 31l-8 2 5 7z" />
        <path d="M32 38l3 5h-6z" />
        <path d="M20 46c4 5 20 5 24 0-3 2-5 1-7 3-2-2-4-2-5 0-2-2-4-1-5-1-2 0-4 0-7-2z" />
      </g>
    </svg>
  )
}

export function Gift({ body, ribbon, size = 30 }: { body: string; ribbon: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="4" y="14" width="24" height="15" rx="2" fill={body} />
      <rect x="2" y="10" width="28" height="6" rx="2" fill={body} />
      <rect x="2" y="13" width="28" height="1.5" fill="#000" opacity="0.12" />
      <rect x="14.5" y="10" width="3" height="19" fill={ribbon} />
      <path d="M16 10c-2-6-9-6-8-2 .7 2.6 5 2 8 2zM16 10c2-6 9-6 8-2-.7 2.6-5 2-8 2z" fill={ribbon} />
    </svg>
  )
}

export function Mascot({ kind, line, collapsed }: { kind: 'christmas' | 'halloween'; line: string; collapsed?: boolean }) {
  return (
    <div className={styles.mascot} data-kind={kind} data-collapsed={collapsed || undefined}>
      {kind === 'christmas' && !collapsed && (
        <div className={styles.gifts} aria-hidden="true">
          <span style={{ '--i': 0 } as React.CSSProperties}><Gift body="#e5484d" ribbon="#fde68a" /></span>
          <span style={{ '--i': 1 } as React.CSSProperties}><Gift body="#2f9e5f" ribbon="#fff" size={36} /></span>
          <span style={{ '--i': 2 } as React.CSSProperties}><Gift body="#f5c542" ribbon="#c62828" size={26} /></span>
        </div>
      )}
      <div className={styles.row}>
        <div className={styles.figure}>{kind === 'christmas' ? <Santa size={collapsed ? 44 : 56} /> : <Pumpkin size={collapsed ? 44 : 56} />}</div>
        {!collapsed && <p className={styles.bubble}>{line}</p>}
      </div>
    </div>
  )
}
