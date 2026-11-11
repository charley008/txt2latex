import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

const image = process.env.TEST_IMAGE || 'txt2latex:smoke';
const name = `txt2latex-smoke-${process.pid}`;
const docker = (...args) => execFileSync('docker', args, {encoding: 'utf8'}).trim();

if (!process.env.TEST_IMAGE) {
    execFileSync('docker', ['build', '-t', image, '.'], {stdio: 'inherit'});
}
docker('run', '--rm', image, '-t');
let started = false;
try {
    docker('run', '-d', '--init', '--name', name, '-p', '127.0.0.1::3000', image);
    started = true;
    const port = docker('port', name, '3000/tcp').split(':').at(-1);
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 40; i++) {
        try {
            const r = await fetch(`${base}/api/health`, {signal: AbortSignal.timeout(1000)});
            assert.equal(r.status, 200);
            assert.deepEqual(await r.json(), {ok: true});
            ready = true;
            break;
        } catch {
            await setTimeout(250);
        }
    }
    assert.ok(ready, 'Container did not become ready');
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
    const html = await page.text();
    const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)].map(m => m[1]);
    assert.ok(assets.some(p => p.endsWith('.js')));
    assert.ok(assets.some(p => p.endsWith('.css')));
    for (const path of assets) {
        const r = await fetch(new URL(path, `${base}/`));
        assert.equal(r.status, 200, path);
        assert.match(r.headers.get('content-type'), path.endsWith('.js') ? /javascript/ : /text\/css/);
        if (path.endsWith('.css')) {
            const css = await r.text();
            const font = css.match(/url\((?:["'])?(\.\/[^)"']+\.woff2)(?:["'])?\)/);
            assert.ok(font, 'Bundled KaTeX font missing');
            const response = await fetch(new URL(font[1], new URL(path, `${base}/`)));
            assert.equal(response.status, 200);
        }
    }
    for (const path of ['/api', '/api/config', '/api/convert']) {
        for (const method of ['GET', 'POST']) {
            const r = await fetch(`${base}${path}`, {method});
            assert.equal(r.status, 404);
            assert.deepEqual(await r.json(), {error: '本站不提供 AI 代理。'});
        }
    }
    assert.equal((await fetch(`${base}/missing.js`)).status, 404);
    // Execute the actual healthcheck command as the image's default user.
    docker('exec', name, 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:3000/api/health');
    assert.equal(docker('exec', name, 'id', '-un'), 'nginx');
    console.log('Container smoke checks passed (HTML, JS, CSS, fonts, headers, API, healthcheck, non-root user).');
} finally {
    if (started) docker('rm', '-f', name);
}
