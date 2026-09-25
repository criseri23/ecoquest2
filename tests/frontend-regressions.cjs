// npm install playwright (o usar NODE_PATH). Servidor: ECOQUEST_TEST_URL.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.ECOQUEST_TEST_URL || 'http://localhost:5239';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const context = await browser.newContext({ permissions: ['geolocation', 'camera'], geolocation: { latitude: -34.5914, longitude: -58.4891, accuracy: 20 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/ia/analizar', route => route.fulfill({ json: { title: 'Botella de plástico', badge: 'Reciclaje', points: '+5', container: 'Contenedor verde', text: 'Limpiala antes de reciclar. '.repeat(20), isWaste: true, canUseGreenContainer: true, wasteType: 'plastico', confidence: 'alta' } }));
    for (const [width, height] of [[320, 568], [390, 700], [1440, 650], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.goto(base + '/pages/escanear.html');
      await page.waitForFunction(() => document.querySelector('.camera-frame').classList.contains('is-live'));
      await page.click('#scanButton');
      await page.locator('.map-action').waitFor();
      const result = await page.evaluate(() => {
        const panel = document.querySelector('.scan-panel');
        panel.scrollTop = panel.scrollHeight;
        const button = document.querySelector('.map-action').getBoundingClientRect();
        const nav = document.querySelector('.bottom-nav').getBoundingClientRect();
        return { bottom: button.bottom, top: button.top, nav: nav.top, panel: panel.getBoundingClientRect().top, scroll: panel.scrollTop, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(result.bottom <= result.nav && result.top >= result.panel, JSON.stringify(result));
      assert.equal(result.overflow, false);
      console.log(`PASS scan result reachable at ${width}x${height}`);
      if (width === 390) await page.screenshot({ path: '.local-build/scan-fixed.png' });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '/pages/config.html');
    await page.selectOption('#motionPreference', 'on');
    await page.goto(base + '/pages/inicio.html');
    await page.waitForFunction(() => document.querySelector('.home-capybara-kayak img').src.includes('kayak-2'), null, { timeout: 15000 });
    assert.equal(await page.locator('html').getAttribute('data-motion'), 'on');
    assert.ok(await page.locator('.home-capybara-kayak img').evaluate(img => img.complete && img.naturalWidth > 0));
    console.log('PASS explicit animation setting works with system reduced motion');
    await page.goto(base + '/pages/config.html');
    await page.selectOption('#motionPreference', 'auto');
    await page.goto(base + '/pages/inicio.html');
    const src = await page.locator('.home-capybara-kayak img').getAttribute('src');
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('.home-capybara-kayak img').getAttribute('src'), src);
    assert.equal(await page.locator('.home-capybara-kayak .home-capybara-body').evaluate(element => getComputedStyle(element).animationName), 'none');
    console.log('PASS automatic mode respects reduced motion');

    // Una selección vieja no debe anular la búsqueda al tocar Mi ubicación.
    await page.evaluate(() => sessionStorage.setItem('ecoquestSelectedPoint', 'puntos_verdes|75'));
    await page.goto(base + '/pages/mapa.html');
    await page.waitForFunction(() => /puntos y contenedores/.test(document.querySelector('#locationStatus').textContent), null, { timeout: 30000 });
    await page.click('#locateButton');
    await page.waitForFunction(() => /línea recta/.test(document.querySelector('#selectedPointDistance').textContent));
    assert.match(await page.locator('#selectedPointType').innerText(), /contenedor verde/);
    assert.match(await page.locator('#selectedPointDistance').innerText(), /^\d+ m /);
    assert.ok(parseInt(await page.locator('#selectedPointDistance').innerText()) < 500);
    console.log('PASS location replaces far destination with nearby recycling container');
    await page.route('**/api/contenedores', route => route.abort());
    await page.reload();
    await page.waitForFunction(() => /copia del catálogo oficial/.test(document.querySelector('#locationStatus').textContent), null, { timeout: 10000 });
    await page.click('#locateButton');
    await page.waitForFunction(() => /línea recta/.test(document.querySelector('#selectedPointDistance').textContent));
    assert.ok(parseInt(await page.locator('#selectedPointDistance').innerText()) < 500);
    console.log('PASS API failure still finds real nearby containers from bundled catalog');
    await page.screenshot({ path: '.local-build/map-fixed.png' });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
