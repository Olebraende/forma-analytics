import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, tone = 'danger', onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      size="sm"
      title={title}
      description={message}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant={tone}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
              } finally {
                setBusy(false)
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <span />
    </Modal>
  )
}
