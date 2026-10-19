import type { BrowserContext, Page } from '@playwright/test'

export const SECURE_HOST = 'http://blog.localhost:3200'
export const INSECURE_HOST = 'http://blog.example:3200'

export const WITHOUT_LOCAL_NETWORK_CHECKS = {
  launchOptions: { args: ['--disable-features=LocalNetworkAccessChecks'] },
}

export type HostMessage = { readonly origin: string; readonly data: unknown }

const hostPage = (src: string) => `<!doctype html>
<title>A blog</title>
<script>
  window.messages = []
  addEventListener('message', (event) => window.messages.push({ origin: event.origin, data: event.data }))
</script>
<h1>A blog</h1>
<iframe id="embed" src="${src}" title="Typika" style="width: 1000px; height: 640px; border: 0"></iframe>`

export const serveHostPages = (context: BrowserContext, appUrl: string) =>
  context.route(/^http:\/\/blog\.(localhost|example):3200\//, (route) => {
    const embed = new URL(route.request().url()).searchParams.get('embed') ?? ''
    return route.fulfill({ contentType: 'text/html', body: hostPage(`${appUrl}${embed}`) })
  })

export const openHostPage = async (page: Page, host: string, embedPath: string) => {
  await page.goto(`${host}/?embed=${encodeURIComponent(embedPath)}`)
  return page.frameLocator('#embed')
}

export const hostMessages = (page: Page) =>
  page.evaluate(() => (window as unknown as { readonly messages: ReadonlyArray<HostMessage> }).messages)

export const postToEmbed = (page: Page, message: unknown) =>
  page.evaluate((data) => {
    const frame = document.querySelector<HTMLIFrameElement>('#embed')
    frame?.contentWindow?.postMessage(data, '*')
  }, message)
