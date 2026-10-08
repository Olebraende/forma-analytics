import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders, AppRoutes } from '@/app/App'
import { PREFS_KEY } from '@/storage/prefs'
import { resetDbConnection } from '@/storage/db'

async function resetEverything() {
  await resetDbConnection()
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase('forma-analytics')
    r.onsuccess = r.onerror = () => res()
  })
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
}

function renderApp(path = '/') {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(resetEverything)

describe('first run and navigation', () => {
  it('seeds labelled demo data and shows the overview', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(await screen.findByText(/exploring fictional demo data/i)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Recent transactions' })).toBeInTheDocument()
  })

  it('navigates between sections and marks the current page', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('heading', { level: 1, name: 'Overview' })
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0] as HTMLElement
    await user.click(within(nav).getByRole('link', { name: /Budgets/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Budgets' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Budgets/ })).toHaveAttribute('aria-current', 'page')
  })
})

describe('transaction management', () => {
  it('validates, adds, edits and deletes a transaction', async () => {
    const user = userEvent.setup()
    renderApp('/transactions')
    await screen.findByRole('heading', { level: 1, name: 'Transactions' })
    await screen.findAllByRole('row')

    await user.click(screen.getAllByRole('button', { name: 'Add transaction' }).at(-1) as HTMLElement)
    const dialog = await screen.findByRole('dialog', { name: 'Add transaction' })
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }))
    expect(await within(dialog).findByText(/Enter an amount above zero/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true')

    await user.type(within(dialog).getByLabelText('Amount'), '1 234,50')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'dining')
    await user.type(within(dialog).getByLabelText('Description'), 'Zebra Test Dinner')
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }))

    await user.type(screen.getByLabelText('Search'), 'Zebra')
    const row = await screen.findByRole('row', { name: /Zebra Test Dinner/ })
    expect(row).toHaveTextContent(/1\s?234,50/)

    await user.click(within(row).getByRole('button', { name: 'Edit Zebra Test Dinner' }))
    const edit = await screen.findByRole('dialog', { name: 'Edit transaction' })
    const desc = within(edit).getByLabelText('Description')
    await user.clear(desc)
    await user.type(desc, 'Zebra Renamed')
    await user.click(within(edit).getByRole('button', { name: 'Save changes' }))
    const renamed = await screen.findByRole('row', { name: /Zebra Renamed/ })

    await user.click(within(renamed).getByRole('button', { name: 'Delete Zebra Renamed' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete transaction?' })
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('row', { name: /Zebra/ })).not.toBeInTheDocument())
  })

  it('persists transactions across a reload', async () => {
    const user = userEvent.setup()
    const first = renderApp('/transactions')
    await screen.findAllByRole('row')
    await user.click(screen.getAllByRole('button', { name: 'Add transaction' }).at(-1) as HTMLElement)
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Amount'), '77')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'groceries')
    await user.type(within(dialog).getByLabelText('Description'), 'Persisted Quince')
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    first.unmount()
    await resetDbConnection()

    renderApp('/transactions')
    await user.type(await screen.findByLabelText('Search'), 'Quince')
    expect(await screen.findByRole('row', { name: /Persisted Quince/ })).toBeInTheDocument()
  })
})

describe('theme preferences', () => {
  it('applies and persists a manually selected theme', async () => {
    const user = userEvent.setup()
    renderApp('/settings')
    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    await user.click(screen.getByRole('radio', { name: /Halloween/ }))
    expect(document.documentElement.dataset.theme).toBe('halloween')
    expect(JSON.parse(localStorage.getItem(PREFS_KEY) as string).theme).toBe('halloween')
  })

  it('restores the saved theme on startup', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'dark' }))
    renderApp('/settings')
    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('only enables seasonal switching in automatic mode', async () => {
    renderApp('/settings')
    const toggle = await screen.findByRole('switch', { name: /seasonal themes automatically/i })
    expect(toggle).toBeDisabled()
  })
})

describe('demo data management', () => {
  it('removes only demo data and keeps user data', async () => {
    const user = userEvent.setup()
    renderApp('/transactions')
    await screen.findAllByRole('row')
    await user.click(screen.getAllByRole('button', { name: 'Add transaction' }).at(-1) as HTMLElement)
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Amount'), '10')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'transport')
    await user.type(within(dialog).getByLabelText('Description'), 'Mine Only')
    await user.click(within(dialog).getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getAllByRole('link', { name: /Settings/ })[0] as HTMLElement)
    await user.click(await screen.findByRole('button', { name: 'Remove demo data' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove demo data' }))
    await waitFor(() => expect(screen.getByText(/Currently stored: 1 transactions, 0 budgets, 0 goals/)).toBeInTheDocument())
  })
})
