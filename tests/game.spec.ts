import { expect, test, type Page } from 'playwright/test'

async function useFixedSeed(page: Page) {
  await page.addInitScript(() => {
    const original = Crypto.prototype.getRandomValues
    Crypto.prototype.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = 13; return array }
      return original.call(this, array)
    }
  })
}

async function makeHumanDecision(page: Page) {
  const result = page.getByRole('dialog', { name: /Winning hand|Exhaustive draw/ })
  if (await result.isVisible().catch(() => false)) { await result.getByRole('button', { name: 'Next hand' }).click(); return 'hand' }
  const win = page.getByRole('button', { name: 'Win', exact: true })
  if (await win.isVisible().catch(() => false)) { await win.click(); return 'action' }
  const pass = page.getByRole('button', { name: 'Pass', exact: true })
  if (await pass.isVisible().catch(() => false)) { await pass.click(); return 'action' }
  const tile = page.getByRole('group', { name: 'Your concealed hand' }).getByRole('button').first()
  await tile.click({ timeout: 30_000 })
  return 'action'
}

test('plays a complete hand and match through the game interface', async ({ page }) => {
  await useFixedSeed(page)
  await page.goto('/game')
  await page.getByRole('button', { name: 'Start match' }).click()
  await expect(page.getByRole('region', { name: 'Match status' })).toContainText('East round')
  await expect(page.getByLabel('13 concealed tiles')).toHaveCount(3)

  let completedHands = 0
  for (let decisions = 0; decisions < 2_000; decisions += 1) {
    if (await page.getByRole('heading', { name: 'Final standings' }).isVisible().catch(() => false)) break
    if (await makeHumanDecision(page) === 'hand') completedHands += 1
  }
  expect(completedHands).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible()
  await expect(page.getByText(/Hand history \(/)).toBeVisible()
})

test('supports a narrow viewport and keyboard tile selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await useFixedSeed(page)
  await page.goto('/game')
  await page.getByRole('button', { name: 'Start match' }).click()
  const hand = page.getByRole('group', { name: 'Your concealed hand' })
  const firstTile = hand.getByRole('button').first()
  await firstTile.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Computer players are thinking|discarded|drew|called/)).toBeVisible()
})
