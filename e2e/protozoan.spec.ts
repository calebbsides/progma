import { test, expect } from './fixtures.js'

test.describe('Protozoan overlay injection', () => {
  test('injects the client script tag into the page', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    const scriptSrc = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      return scripts.map((s) => s.getAttribute('src')).find((s) => s?.includes('__protozoan'))
    })
    expect(scriptSrc).toBe('/__protozoan/client.js')
  })

  test('renders the Protozoan toggle button', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    const toggle = page.locator('#protozoan-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveText('✦')
  })

  test('opens the overlay when toggle is clicked', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    const overlay = page.locator('#protozoan-overlay')
    await expect(overlay).toHaveClass(/hidden/)

    await page.locator('#protozoan-toggle').click()
    await expect(overlay).not.toHaveClass(/hidden/)
  })

  test('closes the overlay on second toggle click', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    const toggle = page.locator('#protozoan-toggle')
    await toggle.click()
    await toggle.click()
    await expect(page.locator('#protozoan-overlay')).toHaveClass(/hidden/)
  })

  test('toggle button has active class when overlay is open', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    await page.locator('#protozoan-toggle').click()
    await expect(page.locator('#protozoan-toggle')).toHaveClass(/active/)
  })

  test('closes overlay via the X button', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    await page.locator('#protozoan-toggle').click()
    await page.locator('#protozoan-close').click()
    await expect(page.locator('#protozoan-overlay')).toHaveClass(/hidden/)
  })
})

test.describe('Element selection', () => {
  test('shows inspect hint when overlay is open and no element selected', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    await page.locator('#protozoan-toggle').click()
    await expect(page.locator('#protozoan-inspect-hint')).toBeVisible()
    await expect(page.locator('#protozoan-selected-badge')).toHaveClass(/hidden/)
  })

  test('chat panel is hidden until an element is selected', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    await page.locator('#protozoan-toggle').click()
    await expect(page.locator('#protozoan-chat')).toHaveClass(/hidden/)
  })
})

test.describe('AI chat panel', () => {
  test('chat input and send button are present after selecting an element', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    await page.locator('#protozoan-toggle').click()
    // Click the page heading to select it
    await page.locator('h1').first().click({ force: true })
    await expect(page.locator('#protozoan-input')).toBeVisible()
    await expect(page.locator('#protozoan-send')).toBeVisible()
  })

  test('typing in the input and pressing Enter adds a user message', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    await page.locator('#protozoan-toggle').click()

    // Intercept WebSocket to avoid real AI call
    await page.route('/__protozoan/ws', (route) => route.abort())

    await page.locator('h1').first().click({ force: true })
    await page.locator('#protozoan-input').fill('change the header color')
    await page.locator('#protozoan-input').press('Enter')

    const userMsg = page.locator('.protozoan-msg.user').first()
    await expect(userMsg).toBeVisible()
    await expect(userMsg).toHaveText('change the header color')
  })
})

test.describe('Proxy transparency', () => {
  test('serves the underlying Vite app content through the proxy', async ({ page, protozoanUrl }) => {
    await page.goto(protozoanUrl)
    const viteLogo = page.locator('img[alt="Vite logo"], a[href*="vitejs"]').first()
    await expect(viteLogo).toBeVisible()
  })

  test('client.js is served at /__protozoan/client.js', async ({ page, protozoanUrl }) => {
    const response = await page.request.get(`${protozoanUrl}/__protozoan/client.js`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('javascript')
    const body = await response.text()
    expect(body).toContain('protozoan')
  })
})
