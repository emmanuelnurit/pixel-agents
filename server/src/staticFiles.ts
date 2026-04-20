import * as fs from 'fs/promises';
import * as http from 'http';
import * as path from 'path';

/** MIME types served by the SPA static handler. Unknown extensions fall back to octet-stream. */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export interface StaticFilesOptions {
  /** Absolute path to the directory to serve (typically `webview-ui/dist`). */
  rootDir: string;
}

export type StaticFilesHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<void>;

/**
 * Serve static files from `rootDir` with SPA fallback.
 *
 * Any GET/HEAD request that does not resolve to a file returns `index.html`
 * so the client-side router can take over. Path traversal attempts (resolved
 * path outside `rootDir`) return `403`.
 *
 * No VS Code dependency: this module is safe to use in standalone server mode.
 */
export function createStaticFilesHandler(options: StaticFilesOptions): StaticFilesHandler {
  const rootDir = path.resolve(options.rootDir);
  const indexPath = path.join(rootDir, 'index.html');

  return async function handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }

    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    // Reject explicit path traversal before normalization collapses it: any `..`
    // segment in the request path is treated as hostile.
    if (urlPath.split('/').some((seg) => seg === '..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const relative = path.posix.normalize('/' + urlPath).replace(/^\/+/, '');
    const candidate = path.resolve(rootDir, relative);
    if (candidate !== rootDir && !candidate.startsWith(rootDir + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const resolved = (await resolveFile(candidate)) ?? (await resolveFile(indexPath));
    if (!resolved) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const contentType = MIME_TYPES[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
    const data = await fs.readFile(resolved);
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length });
    res.end(req.method === 'HEAD' ? undefined : data);
  };
}

async function resolveFile(candidate: string): Promise<string | null> {
  try {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) {
      const indexInDir = path.join(candidate, 'index.html');
      await fs.stat(indexInDir);
      return indexInDir;
    }
    return candidate;
  } catch {
    return null;
  }
}
