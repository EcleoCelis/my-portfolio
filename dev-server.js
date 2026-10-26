'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const contactHandler = require('./api/contact');
const projectsHandler = require('./api/projects');
const adminHandler = require('./api/admin');
const healthHandler = require('./api/health');

// Dynamically sync local .env file changes without requiring manual server restart
let lastEnvMtime = 0;
function syncEnvFile() {
    const envPath = path.join(__dirname, '.env');
    try {
        if (!fs.existsSync(envPath)) return;
        const stats = fs.statSync(envPath);
        if (stats.mtimeMs <= lastEnvMtime) return;
        lastEnvMtime = stats.mtimeMs;
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) return;
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            process.env[key] = val;
        });
    } catch (e) {}
}

syncEnvFile();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.ico': 'image/x-icon'
};

// Strictly allowlist public static files and directories so private configs (.env, server.js, api/, lib/) are never served
function isAllowedStaticPath(relPath) {
    if (!relPath) return true;
    const normalized = relPath.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('.')) return false;
    if (normalized === 'server.js' || normalized === 'dev-server.js' || normalized.startsWith('api/') || normalized.startsWith('lib/') || normalized.startsWith('tests/') || normalized.startsWith('docs/')) {
        return false;
    }
    if (!normalized.includes('/') && normalized.endsWith('.html')) return true;
    return (
        normalized.startsWith('css/') ||
        normalized.startsWith('js/') ||
        normalized.startsWith('assets/')
    );
}

function applySecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' mailto:;"
    );
}

function createPortfolioServer() {
    return http.createServer(async (req, res) => {
        syncEnvFile();
        applySecurityHeaders(res);

        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = decodeURIComponent(parsedUrl.pathname);

        // Route 1: Contact API Endpoint
        if (pathname === '/api/contact') {
            try {
                await contactHandler(req, res);
            } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                    ok: false,
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected server error occurred.'
                }));
            }
            return;
        }

        // Route 2: Projects API Endpoint (Public GET, Admin-only POST/PUT/DELETE)
        if (pathname === '/api/projects') {
            try {
                await projectsHandler(req, res);
            } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                    ok: false,
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected server error occurred while handling projects.'
                }));
            }
            return;
        }

        // Route 3: Admin CMS & Messages API Endpoint (Admin-only actions)
        if (pathname === '/api/admin') {
            try {
                await adminHandler(req, res);
            } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                    ok: false,
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected server error occurred in admin handler.'
                }));
            }
            return;
        }

        // Route 4: Health Check Endpoint
        if (pathname === '/api/health') {
            try {
                await healthHandler(req, res);
            } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ ok: false, code: 'INTERNAL_ERROR', message: 'Health check failed.' }));
            }
            return;
        }

        // Route 5: Static Asset Delivery (GET / HEAD only)
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, HEAD');
            res.end('Method Not Allowed');
            return;
        }

        let relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        if (relPath === 'admin') {
            relPath = 'admin.html';
        }
        if (relPath === 'projects') {
            relPath = 'projects.html';
        }

        if (!isAllowedStaticPath(relPath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Not Found');
            return;
        }

        const fullPath = path.join(__dirname, relPath);
        fs.stat(fullPath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end('Not Found');
                return;
            }

            const ext = path.extname(fullPath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.statusCode = 200;
            res.setHeader('Content-Type', contentType);

            if (ext === '.pdf') {
                res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
            }

            if (req.method === 'HEAD') {
                res.end();
                return;
            }

            const stream = fs.createReadStream(fullPath);
            stream.on('error', () => {
                if (!res.headersSent) {
                    res.statusCode = 500;
                    res.end('Internal Server Error');
                }
            });
            stream.pipe(res);
        });
    });
}

const serverInstance = createPortfolioServer();

if (require.main === module) {
    const port = Number(process.env.PORT) || 3000;
    serverInstance.listen(port, () => {
        console.log(`Portfolio server running at http://localhost:${port}`);
    });
}

const serverlessHandler = (req, res) => {
    serverInstance.emit('request', req, res);
};

module.exports = serverlessHandler;
module.exports.createPortfolioServer = createPortfolioServer;
module.exports.isAllowedStaticPath = isAllowedStaticPath;
