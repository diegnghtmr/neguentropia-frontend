import assert from 'node:assert/strict';
import test from 'node:test';

const origin = process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:80';
const request = (pathname) => fetch(new URL(pathname, origin), {
  signal: AbortSignal.timeout(4_000),
});

test('serves the real SPA document, JavaScript, CSS and icon', { timeout: 10_000 }, async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(response.headers.get('cache-control') ?? '', /no-cache/);
  const html = await response.text();
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<div id="root"><\/div>/);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(assets.some((asset) => asset.endsWith('.js')));
  assert.ok(assets.some((asset) => asset.endsWith('.css')));
  for (const asset of assets) {
    const result = await request(asset);
    assert.equal(result.status, 200);
    assert.match(result.headers.get('cache-control') ?? '', /immutable/);
    assert.match(result.headers.get('content-type') ?? '', asset.endsWith('.css') ? /text\/css/ : /javascript/);
    assert.ok((await result.text()).length > 0);
  }
  const icon = await request('/favicon.svg');
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get('content-type') ?? '', /image\/svg\+xml/);
  assert.match(await icon.text(), /<svg/);
});

test('serves the same SPA document for a deep link', { timeout: 10_000 }, async () => {
  const root = await request('/');
  const deepLink = await request('/_spa_probe/deep');
  assert.equal(root.status, 200);
  assert.equal(deepLink.status, 200);
  assert.match(deepLink.headers.get('content-type') ?? '', /text\/html/);
  assert.match(deepLink.headers.get('cache-control') ?? '', /no-cache/);
  assert.equal(await deepLink.text(), await root.text());
});

test('does not mask a missing static asset with the SPA document', { timeout: 10_000 }, async () => {
  const result = await request('/assets/missing.js');
  assert.equal(result.status, 404);
  assert.doesNotMatch(await result.text(), /<div id="root"><\/div>/);
});
