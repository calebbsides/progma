import { test, expect } from './fixtures.js'

test.describe('Progma overlay injection', () => {
  test('injects the client script tag into the page', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    const scriptSrc = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      return scripts.map((s) => s.getAttribute('src')).find((s) => s?.includes('__progma'))
    })
    expect(scriptSrc).toBe('/__progma/client.js')
  })

  test('renders the Progma toggle button', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    const toggle = page.locator('#progma-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveText('✦')
  })

  test('opens the panel when toggle is clicked', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    const panel = page.locator('#progma-panel')
    await expect(panel).toHaveClass(/hidden/)

    await page.locator('#progma-toggle').click()
    await expect(panel).not.toHaveClass(/hidden/)
  })

  test('closes the panel on second toggle click', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    const toggle = page.locator('#progma-toggle')
    await toggle.click()
    await toggle.click()
    await expect(page.locator('#progma-panel')).toHaveClass(/hidden/)
  })

  test('toggle button has active class when panel is open', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    await expect(page.locator('#progma-toggle')).toHaveClass(/active/)
  })
})

test.describe('Annotation mode', () => {
  test('annotate button appears in the panel', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    await expect(page.locator('#progma-annotate-btn')).toBeVisible()
  })

  test('annotate button toggles active state', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    const btn = page.locator('#progma-annotate-btn')
    await btn.click()
    await expect(btn).toHaveClass(/active/)
    await btn.click()
    await expect(btn).not.toHaveClass(/active/)
  })

  test('annotation modal appears after clicking an element in annotate mode', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    await page.locator('#progma-annotate-btn').click()

    // Click the page heading (outside the Progma root)
    await page.locator('h1').first().click({ force: true })

    await expect(page.locator('#progma-annotation-modal')).not.toHaveClass(/hidden/)
  })

  test('annotation modal can be cancelled', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    await page.locator('#progma-annotate-btn').click()
    await page.locator('h1').first().click({ force: true })

    await page.locator('#progma-annotation-cancel').click()
    await expect(page.locator('#progma-annotation-modal')).toHaveClass(/hidden/)
  })
})

test.describe('AI chat panel', () => {
  test('chat input and send button are present', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    await expect(page.locator('#progma-input')).toBeVisible()
    await expect(page.locator('#progma-send')).toBeVisible()
  })

  test('send button is enabled when panel opens', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()
    await expect(page.locator('#progma-send')).toBeEnabled()
  })

  test('typing in the input and pressing Enter adds a user message', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    await page.locator('#progma-toggle').click()

    // Intercept WebSocket to avoid real AI call
    await page.route('/__progma/ws', (route) => route.abort())

    await page.locator('#progma-input').fill('change the header to Progma')
    await page.locator('#progma-input').press('Enter')

    const userMsg = page.locator('.progma-msg.user').first()
    await expect(userMsg).toBeVisible()
    await expect(userMsg).toHaveText('change the header to Progma')
  })
})

test.describe('Proxy transparency', () => {
  test('serves the underlying Vite app content through the proxy', async ({ page, progmaUrl }) => {
    await page.goto(progmaUrl)
    // Vite default template has a Vite logo
    const viteLogo = page.locator('img[alt="Vite logo"], a[href*="vitejs"]').first()
    await expect(viteLogo).toBeVisible()
  })

  test('client.js is served at /__progma/client.js', async ({ page, progmaUrl }) => {
    const response = await page.request.get(`${progmaUrl}/__progma/client.js`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('javascript')
    const body = await response.text()
    expect(body).toContain('progma')
  })
})
