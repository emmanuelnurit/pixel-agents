import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStaticFilesHandler } from '../src/staticFiles.js';

interface Fixture {
  server: http.Server;
  port: number;
  rootDir: string;
  cleanup: () => void;
}

async function startFixture(layout: Record<string, string>): Promise<Fixture> {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-static-'));
  for (const [rel, body] of Object.entries(layout)) {
    const full = path.join(rootDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  const handler = createStaticFilesHandler({ rootDir });
  const server = http.createServer((req, res) => {
    handler(req, res).catch((err) => {
      res.writeHead(500);
      res.end(String(err));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  return {
    server,
    port,
    rootDir,
    cleanup: () => {
      server.close();
      fs.rmSync(rootDir, { recursive: true, force: true });
    },
  };
}

async function get(port: number, urlPath: string, method = 'GET'): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}${urlPath}`, { method });
}

/** Raw TCP request that preserves the path exactly (http.request/fetch both normalize `../`). */
function rawRequest(port: number, rawPath: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.on('error', reject);
    socket.connect(port, '127.0.0.1', () => {
      socket.write(`GET ${rawPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    const chunks: Buffer[] = [];
    socket.on('data', (c: Buffer) => chunks.push(c));
    socket.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const [head, ...rest] = raw.split('\r\n\r\n');
      const statusLine = head.split('\r\n')[0] ?? '';
      const match = statusLine.match(/^HTTP\/\d\.\d\s+(\d+)/);
      resolve({ status: match ? Number(match[1]) : 0, body: rest.join('\r\n\r\n') });
    });
  });
}

describe('createStaticFilesHandler', () => {
  let fx: Fixture;

  afterEach(() => {
    fx?.cleanup();
  });

  describe('with a typical SPA dist layout', () => {
    beforeEach(async () => {
      fx = await startFixture({
        'index.html': '<!doctype html><html><body>app shell</body></html>',
        'assets/app.js': 'console.log("hi")',
        'assets/app.css': 'body{color:red}',
        'favicon.png': 'fake-png-bytes',
      });
    });

    it('serves index.html on GET /', async () => {
      const res = await get(fx.port, '/');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      expect(await res.text()).toContain('app shell');
    });

    it('serves JS assets with correct Content-Type', async () => {
      const res = await get(fx.port, '/assets/app.js');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
      expect(await res.text()).toBe('console.log("hi")');
    });

    it('serves CSS assets with correct Content-Type', async () => {
      const res = await get(fx.port, '/assets/app.css');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/css; charset=utf-8');
    });

    it('falls back to index.html for arbitrary client-side routes', async () => {
      const res = await get(fx.port, '/arbitrary/route/deep');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      expect(await res.text()).toContain('app shell');
    });

    it('rejects path traversal attempts with 403', async () => {
      // fetch would normalize `..`; use a raw request to preserve the path exactly.
      const res = await rawRequest(fx.port, '/../../../etc/passwd');
      expect(res.status).toBe(403);
    });

    it('rejects non-GET/HEAD methods with 405', async () => {
      const res = await get(fx.port, '/', 'POST');
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('GET, HEAD');
    });

    it('supports HEAD with empty body and correct headers', async () => {
      const res = await get(fx.port, '/assets/app.js', 'HEAD');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
      expect(await res.text()).toBe('');
    });

    it('uses octet-stream for unknown extensions', async () => {
      const extra = path.join(fx.rootDir, 'data.bin');
      fs.writeFileSync(extra, 'raw');
      const res = await get(fx.port, '/data.bin');
      expect(res.headers.get('content-type')).toBe('application/octet-stream');
    });
  });

  describe('with no index.html', () => {
    beforeEach(async () => {
      fx = await startFixture({ 'only.txt': 'standalone' });
    });

    it('returns 404 when file missing and no SPA fallback available', async () => {
      const res = await get(fx.port, '/missing.png');
      expect(res.status).toBe(404);
    });
  });
});
