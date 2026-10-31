// Sirve la build de `www` en local y genera los informes de Lighthouse de /login
// en docs/lighthouse (móvil y escritorio). Requiere haber ejecutado `npm run build`.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('www');
const REPORTS = resolve('docs', 'lighthouse');
const PORT = 4300;
const URL_TO_AUDIT = `http://localhost:${PORT}/login`;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

if (!existsSync(join(ROOT, 'index.html'))) {
  process.stderr.write('No existe www/index.html. Ejecuta antes: npm run build\n');
  process.exit(1);
}
mkdirSync(REPORTS, { recursive: true });

// Las rutas que no son archivos devuelven index.html, igual que en Vercel.
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, URL_TO_AUDIT).pathname));
  const candidate = join(ROOT, path);
  const isFile = candidate.startsWith(ROOT) && existsSync(candidate) && statSync(candidate).isFile();
  const file = isFile ? candidate : join(ROOT, 'index.html');

  response.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});

/**
 * Lanza Lighthouse y guarda sus informes HTML y JSON.
 *
 * @param {string} name Nombre base de los informes
 * @param {string[]} flags Opciones adicionales
 * @returns {Promise<number>} Código de salida
 */
function audit(name, flags) {
  const args = [
    '--yes',
    'lighthouse',
    URL_TO_AUDIT,
    '--output=html',
    '--output=json',
    `--output-path="${join(REPORTS, name)}"`,
    '--chrome-flags="--headless=new"',
    '--quiet',
    ...flags,
  ];

  return new Promise((done) => {
    spawn('npx', args, { stdio: 'inherit', shell: true }).on('close', (code) => done(code ?? 1));
  });
}

server.listen(PORT, async () => {
  const mobile = await audit('login-movil', []);
  const desktop = await audit('login-escritorio', ['--preset=desktop']);
  server.close();
  process.exit(mobile || desktop);
});
