import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLElement> {
  interactive?: boolean
  as?: 'section' | 'article' | 'div'
}

export function Card({ interactive, as: Tag = 'div', className, ...rest }: CardProps) {
  return <Tag className={[styles.card, interactive && styles.interactive, className].filter(Boolean).join(' ')} {...rest} />
}

export function CardHeader({ title, description, action, id, level = 2 }: { title: string; description?: string; action?: ReactNode; id?: string; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <H id={id} className={styles.title}>
          {title}
        </H>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
