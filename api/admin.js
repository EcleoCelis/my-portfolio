'use strict';

const db = require('../lib/db');
const auth = require('../lib/auth');

async function processAdminRequest({ method, pathname = '/api/admin', headers = {}, query = {}, rawBody = '', env = process.env }) {
    const action = query.action || pathname.replace(/^\/api\/admin\/?/, '') || 'status';

    // 1. GET /api/admin?action=status — Check session & configuration status
    if (method === 'GET' && action === 'status') {
        const authenticated = auth.isRequestAuthenticated(headers, env);
        return {
            statusCode: 200,
            headers: {},
            body: {
                ok: true,
                authenticated,
                adminConfigured: auth.isAdminConfigured(env),
                databaseConfigured: db.isDatabaseConfigured(),
                emailProviderConfigured: Boolean(env.RESEND_API_KEY || env.WEB3FORMS_ACCESS_KEY),
                recipientEmail: env.CONTACT_RECIPIENT_EMAIL || 'jomaricelis22@gmail.com'
            }
        };
    }

    // 2. POST /api/admin?action=login — Authenticate with ADMIN_PASSWORD
    if (method === 'POST' && action === 'login') {
        if (!auth.isAdminConfigured(env)) {
            return {
                statusCode: 503,
                headers: {},
                body: {
                    ok: false,
                    code: 'ADMIN_NOT_CONFIGURED',
                    message: 'ADMIN_PASSWORD (at least 8 characters) is not yet configured in .env or server environment variables.'
                }
            };
        }

        let parsed;
        try {
            parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        } catch (e) {
            return { statusCode: 400, headers: {}, body: { ok: false, code: 'INVALID_JSON', message: 'Invalid JSON request body.' } };
        }

        const password = parsed && typeof parsed.password === 'string' ? parsed.password : '';
        if (!auth.verifyAdminPassword(password, env)) {
            return {
                statusCode: 401,
                headers: {},
                body: {
                    ok: false,
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid admin password.'
                }
            };
        }

        const token = auth.createSessionToken(env);
        const isProd = env.NODE_ENV === 'production';
        return {
            statusCode: 200,
            headers: {
                'Set-Cookie': auth.buildSessionCookie(token, isProd)
            },
            body: {
                ok: true,
                message: 'Authenticated successfully.'
            }
        };
    }

    // 3. POST /api/admin?action=logout — Clear session cookie
    if (method === 'POST' && action === 'logout') {
        return {
            statusCode: 200,
            headers: {
                'Set-Cookie': auth.buildClearSessionCookie()
            },
            body: {
                ok: true,
                message: 'Logged out.'
            }
        };
    }

    // All remaining admin routes require authentication
    if (!auth.isRequestAuthenticated(headers, env)) {
        return {
            statusCode: 401,
            headers: {},
            body: {
                ok: false,
                code: 'UNAUTHORIZED',
                message: 'Admin authentication required.'
            }
        };
    }

    if (!db.isDatabaseConfigured()) {
        return {
            statusCode: 503,
            headers: {},
            body: {
                ok: false,
                code: 'DATABASE_NOT_CONFIGURED',
                message: 'PostgreSQL DATABASE_URL is not configured.'
            }
        };
    }

    // 4. GET /api/admin?action=messages — List stored contact inquiries from PostgreSQL
    if (method === 'GET' && action === 'messages') {
        try {
            const messages = await db.listContactInquiries();
            return {
                statusCode: 200,
                headers: {},
                body: { ok: true, messages }
            };
        } catch (err) {
            return {
                statusCode: 500,
                headers: {},
                body: { ok: false, code: 'DB_ERROR', message: 'Failed to retrieve contact inquiries from PostgreSQL.' }
            };
        }
    }

    // 5. PATCH /api/admin?action=messages&id=X — Mark inquiry read/unread
    if (method === 'PATCH' && action === 'messages') {
        const id = query.id;
        let parsed = {};
        try {
            parsed = typeof rawBody === 'string' && rawBody ? JSON.parse(rawBody) : (rawBody || {});
        } catch (e) {}

        const targetId = id || parsed.id;
        if (!targetId || !Number.isInteger(Number(targetId))) {
            return { statusCode: 400, headers: {}, body: { ok: false, code: 'INVALID_ID', message: 'Valid inquiry id is required.' } };
        }

        try {
            const updated = await db.updateInquiryReadStatus(Number(targetId), Boolean(parsed.is_read));
            if (!updated) {
                return { statusCode: 404, headers: {}, body: { ok: false, code: 'NOT_FOUND', message: 'Inquiry not found.' } };
            }
            return { statusCode: 200, headers: {}, body: { ok: true, inquiry: updated } };
        } catch (err) {
            return { statusCode: 500, headers: {}, body: { ok: false, code: 'DB_ERROR', message: 'Failed to update inquiry status.' } };
        }
    }

    // 6. DELETE /api/admin?action=messages&id=X — Delete inquiry
    // 6. DELETE /api/admin?action=messages - Delete single inquiry (id=X) or bulk inquiries (ids=X,Y or body: { ids: [...] })
    if (method === 'DELETE' && action === 'messages') {
        let idsToDelete = [];
        if (query.ids) {
            idsToDelete = String(query.ids).split(',').map(s => Number(s.trim())).filter(Number.isInteger);
        } else if (query.id && Number.isInteger(Number(query.id))) {
            idsToDelete = [Number(query.id)];
        } else if (rawBody) {
            try {
                const parsed = JSON.parse(rawBody);
                if (Array.isArray(parsed.ids)) {
                    idsToDelete = parsed.ids.map(Number).filter(Number.isInteger);
                } else if (parsed.id && Number.isInteger(Number(parsed.id))) {
                    idsToDelete = [Number(parsed.id)];
                }
            } catch (e) {}
        }

        if (idsToDelete.length === 0) {
            return { statusCode: 400, headers: {}, body: { ok: false, code: 'INVALID_ID', message: 'Valid inquiry id or ids array is required.' } };
        }

        try {
            const count = await db.deleteContactInquiries(idsToDelete);
            if (count === 0 && idsToDelete.length === 1) {
                return { statusCode: 404, headers: {}, body: { ok: false, code: 'NOT_FOUND', message: 'Inquiry not found.' } };
            }
            return {
                statusCode: 200,
                headers: {},
                body: { ok: true, count, message: count === 1 ? '1 inquiry deleted.' : `${count} inquiries deleted.` }
            };
        } catch (err) {
            return { statusCode: 500, headers: {}, body: { ok: false, code: 'DB_ERROR', message: 'Failed to delete inquiries.' } };
        }
    }

    return {
        statusCode: 404,
        headers: {},
        body: { ok: false, code: 'NOT_FOUND', message: 'Unknown admin endpoint action.' }
    };
}

async function handler(req, res) {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    let rawBody = '';
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
        if (req.body && typeof req.body === 'object') {
            rawBody = JSON.stringify(req.body);
        } else if (typeof req.body === 'string') {
            rawBody = req.body;
        } else {
            rawBody = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => {
                    data += chunk;
                    if (Buffer.byteLength(data, 'utf8') > 64 * 1024) resolve(data);
                });
                req.on('end', () => resolve(data));
                req.on('error', reject);
            });
        }
    }

    const result = await processAdminRequest({
        method: req.method,
        pathname: parsedUrl.pathname,
        headers: req.headers,
        query,
        rawBody
    });

    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    for (const [k, v] of Object.entries(result.headers || {})) {
        res.setHeader(k, v);
    }
    res.end(JSON.stringify(result.body));
}

module.exports = handler;
module.exports.processAdminRequest = processAdminRequest;
