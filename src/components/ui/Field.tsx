import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { CircleAlert } from 'lucide-react'
import styles from './Field.module.css'

interface Common {
  label: string
  hint?: string
  error?: string
}

function Wrapper({ id, label, hint, error, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

const describedBy = (id: string, p: Common) => (p.error ? `${id}-error` : p.hint ? `${id}-hint` : undefined)

export function TextField({ label, hint, error, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const id = rest.id ?? auto
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input id={id} className={styles.control} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, { label, hint, error })} {...rest} />
    </Wrapper>
  )
}

export function SelectField({ label, hint, error, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId()
  const id = rest.id ?? auto
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select id={id} className={`${styles.control} ${styles.select}`} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, { label, hint, error })} {...rest}>
        {children}
      </select>
    </Wrapper>
  )
}
