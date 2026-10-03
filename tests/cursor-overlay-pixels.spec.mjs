import { test, expect } from '@playwright/test';

// Compare rendered pixels, not just z-index/style declarations: a composited
// blend layer can have correct bounds while showing seams above/below a menu.
for (const motion of ['reduce', 'no-preference']) test(`rounded overlays preserve exposed blob pixels with motion ${motion}`, async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: motion });
  test.skip(info.project.name === 'production-mobile', 'Custom blend cursor requires a fine pointer');
  const meta = info.project.metadata;
  await page.goto(`http://127.0.0.1:${meta.development ? meta.sitePort : meta.port}/`);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.id = 'qa-blob-pixels';
    link.href = '/work/';
    link.style.cssText = 'position:fixed;left:60px;top:120px;width:360px;height:280px;border-radius:48px;background:#fff;z-index:100;';
    document.body.append(link);
  });
  await page.mouse.move(240, 260);
  const fill = page.locator('.samey-cursor-link-fill-slice');
  await expect.poll(async () => (await fill.boundingBox())?.width ?? 0).toBeGreaterThan(340);
  // Let the finite hover expansion settle before comparing occlusion frames.
  await page.waitForTimeout(600);
  const clip = { x: 60, y: 120, width: 360, height: 280 };
  const before = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(() => {
    const panel = document.createElement('div');
    panel.id = 'qa-blob-panel';
    panel.dataset.sameyOverlay = '';
    panel.setAttribute('role', 'dialog');
    panel.style.cssText = 'position:fixed;left:200px;top:200px;width:150px;height:100px;border-radius:24px;background:rgb(30,60,90);overflow:hidden;';
    document.body.append(panel);
  });
  await expect(page.locator('#qa-blob-panel')).toBeVisible();
  await expect(fill).toBeVisible();
  await page.locator('#qa-blob-panel').evaluate(element =>
    Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => undefined))));
  const after = (await page.screenshot({ clip })).toString('base64');
  const comparison = await page.evaluate(async ({ before, after }) => {
    const decode = async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      return { pixels: context.getImageData(0, 0, image.width, image.height).data, width: image.width, height: image.height };
    };
    const a = await decode(before), b = await decode(after);
    const scale = a.width / 360;
    const changes = [];
    let changedOutside = 0, outside = 0, painted = 0, opaqueInside = 0, inside = 0;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      const sx = x / scale, sy = y / scale, i = (y * a.width + x) * 4;
      // Include the exposed round corners and rows above/below; allow two
      // device-independent pixels for the overlay's antialiased edge.
      const dx = Math.max(164 - sx, 0, sx - 266), dy = Math.max(104 - sy, 0, sy - 156);
      const outsidePanel = sx < 138 || sx > 292 || sy < 78 || sy > 182 || Math.hypot(dx, dy) > 26;
      if (outsidePanel) {
        outside++;
        if (a.pixels[i] < 100) painted++;
        if ([0, 1, 2].some(c => Math.abs(a.pixels[i + c] - b.pixels[i + c]) > 2)) { changedOutside++; if(changes.length<20) changes.push({sx,sy,a:[...a.pixels.slice(i,i+3)],b:[...b.pixels.slice(i,i+3)]}); }
      }
      // Sample a strip inside the surface, clear of the pointer and edges.
      if (sx > 230 && sx < 240 && sy > 110 && sy < 150) {
        inside++;
        if ([30, 60, 90].every((v, c) => Math.abs(b.pixels[i + c] - v) <= 1)) opaqueInside++;
      }
    }
    return { changedOutside, outside, painted, opaqueInside, inside, changes };
  }, { before, after });
  expect(comparison.painted, 'The reference must contain a substantial inverted blob').toBeGreaterThan(20000);
  expect(comparison.changedOutside, 'No seams or erased fragments outside the rounded dialog: ' + JSON.stringify(comparison.changes)).toBe(0);
  expect(comparison.opaqueInside).toBe(comparison.inside);
  expect(comparison.inside).toBeGreaterThan(100);
});
