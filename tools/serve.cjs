'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.otf': 'font/otf', '.xml': 'application/xml', '.txt': 'text/plain' };
function server() {
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const parts = pathname.split('/').filter(Boolean);
    const publicRootFiles = ['index.html', 'portfolio.html', 'services.html', '404.html', 'scripts.js', 'theme.js', 'styles.css', 'robots.txt', 'sitemap.xml'];
    const allowed = !parts.length || (parts.length === 1 && publicRootFiles.includes(parts[0])) || ['img', 'fonts'].includes(parts[0]);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (parts.some(p => p.startsWith('.') || p.includes('\\')) || !filename.startsWith(root + path.sep)) {
      res.writeHead(404); res.end(); return;
    }
    if (!allowed) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(root, '404.html'))); return;
    }
    let stat;
    try {
      const real = fs.realpathSync(filename);
      if (!real.startsWith(root + path.sep)) throw new Error('outside root');
      stat = fs.statSync(real);
      if (!stat.isFile()) throw new Error('not a file');
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(root, '404.html'))); return;
    }
    const headers = { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    let start = 0; let end = stat.size - 1; let status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) { res.writeHead(416); res.end(); return; }
      start = Number(match[1]); end = match[2] ? Number(match[2]) : end;
      if (start > end || start >= stat.size || end >= stat.size) { res.writeHead(416); res.end(); return; }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(filename, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy()); stream.pipe(res);
  });
}
module.exports = { server };
if (require.main === module) {
  const instance = server();
  instance.listen(Number(process.env.PORT || 8765), '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${instance.address().port}`));
  ['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => instance.close()));
}
