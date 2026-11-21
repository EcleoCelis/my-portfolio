'use strict';

const auth = require('../lib/auth');
const db = require('../lib/db');
const analytics = require('../lib/analytics');

const MAX_BODY_BYTES = 4096;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateLimitStore = new Map();

function resetRateLimitStore() {
    rateLimitStore.clear();
}

function checkRateLimit(clientKey, now = Date.now()) {
    // Only kept transiently in memory for abuse prevention; never stored in DB
    const key = clientKey || 'anon';
    const recent = (rateLimitStore.get(key) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
        const retryAfterSeconds = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000));
        rateLimitStore.set(key, recent);
        return { allowed: false, retryAfterSeconds };
    }
    recent.push(now);
    rateLimitStore.set(key, recent);
    if (rateLimitStore.size > 1000) {
        // Bound memory usage
        const firstKey = rateLimitStore.keys().next().value;
        rateLimitStore.delete(firstKey);
    }
    return { allowed: true };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.end(JSON.stringify(payload));
}

function readRawBody(req) {
    return new Promise((resolve, reject) => {
        if (typeof req.body === 'string') return resolve(req.body);
        if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body));
        let data = '';
        let byteLength = 0;
        req.on('data', chunk => {
            byteLength += chunk.length;
            if (byteLength > MAX_BODY_BYTES + 1024) {
                reject(new Error('PAYLOAD_TOO_LARGE'));
                req.destroy();
                return;
            }
            data += chunk.toString('utf8');
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function extractClientKey(req) {
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return (req.socket && req.socket.remoteAddress) || 'local';
}

async function analyticsHandler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    const parsedUrl = new URL(req.url || '/api/analytics', `http://${req.headers.host || 'localhost'}`);

    if (method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
        res.end();
        return;
    }

    // ------------------------------------------------------------------------
    // PUBLIC EVENT INGESTION & VOLUNTARY IDENTIFICATION (POST /api/analytics)
    // ------------------------------------------------------------------------
    if (method === 'POST') {
        // Respect DNT if header is explicitly set and client sent a tracking event
        const isAdmin = auth.isRequestAuthenticated(req.headers || {});
        if (isAdmin) {
            return sendJson(res, 200, {
                ok: true,
                recorded: false,
                excluded: true,
                reason: 'ADMIN_ACTIVITY_EXCLUDED'
            });
        }

        const rateStatus = checkRateLimit(extractClientKey(req));
        if (!rateStatus.allowed) {
            return sendJson(
                res,
                429,
                { ok: false, code: 'RATE_LIMITED', message: 'Too many analytics events.' },
                { 'Retry-After': String(rateStatus.retryAfterSeconds) }
            );
        }

        let rawBody;
        try {
            rawBody = await readRawBody(req);
        } catch (err) {
            if (err && err.message === 'PAYLOAD_TOO_LARGE') {
                return sendJson(res, 413, { ok: false, code: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 4 KB limit.' });
            }
            return sendJson(res, 400, { ok: false, code: 'READ_ERROR', message: 'Unable to read request body.' });
        }

        if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
            return sendJson(res, 413, { ok: false, code: 'PAYLOAD_TOO_LARGE', message: 'Payload exceeds 4 KB limit.' });
        }

        let body;
        try {
            body = rawBody ? JSON.parse(rawBody) : {};
        } catch (e) {
            return sendJson(res, 400, { ok: false, code: 'INVALID_JSON', message: 'Malformed JSON body.' });
        }

        if (!db.isDatabaseConfigured()) {
            return sendJson(res, 200, {
                ok: true,
                recorded: false,
                reason: 'DATABASE_NOT_CONFIGURED'
            });
        }

        // Branch A: Voluntary Visitor Identification (e.g., optional résumé request form)
        if (body.action === 'identify') {
            const name = String(body.name || '').trim();
            const email = String(body.email || '').trim();
            const company = String(body.company || '').trim();
            if (name.length < 2) {
                return sendJson(res, 422, {
                    ok: false,
                    code: 'VALIDATION_FAILED',
                    message: 'Please enter your name (at least 2 characters) or choose direct anonymous download.'
                });
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                return sendJson(res, 422, {
                    ok: false,
                    code: 'VALIDATION_FAILED',
                    message: 'Please provide a valid email address or leave email blank.'
                });
            }

            const result = await analytics.registerVoluntaryIdentity({
                visitorId: body.visitorId,
                sessionId: body.sessionId,
                name,
                email,
                company,
                source: body.source === 'contact_form' ? 'contact_form' : 'resume_request'
            });

            return sendJson(res, 200, {
                ok: true,
                identified: Boolean(result.saved),
                sessionId: result.sessionId || body.sessionId || ''
            });
        }

        // Branch B: Standard public analytics event (page_view, session_start, resume_requested)
        // Note: resume_served is ONLY recorded server-side by /api/resume so clients cannot forge file deliveries!
        const publicAllowedTypes = new Set(['session_start', 'page_view', 'resume_requested']);
        const eventType = String(body.eventType || 'page_view').trim();
        if (!publicAllowedTypes.has(eventType)) {
            return sendJson(res, 422, {
                ok: false,
                code: 'INVALID_EVENT_TYPE',
                message: 'Unsupported public analytics event type.'
            });
        }

        const result = await analytics.recordAnalyticsEvent({
            eventId: body.eventId,
            eventType,
            visitorId: body.visitorId,
            sessionId: body.sessionId,
            pagePath: body.pagePath,
            referrer: body.referrer,
            currentHost: (req.headers && req.headers.host) || '',
            userAgent: (req.headers && (req.headers['user-agent'] || req.headers['User-Agent'])) || '',
            deviceCategory: body.deviceCategory,
            downloadResource: body.downloadResource || (eventType === 'resume_requested' ? analytics.RESUME_FILENAME : ''),
            outcome: eventType === 'resume_requested' ? 'requested' : 'recorded'
        });

        return sendJson(res, 200, {
            ok: true,
            recorded: Boolean(result.recorded),
            deduplicated: Boolean(result.deduplicated),
            eventId: result.eventId || body.eventId || ''
        });
    }

    // ------------------------------------------------------------------------
    // ADMIN-ONLY REPORTING & PRIVACY MANAGEMENT (GET / DELETE /api/analytics)
    // ------------------------------------------------------------------------
    if (!auth.isRequestAuthenticated(req.headers || {})) {
        return sendJson(res, 401, {
            ok: false,
            code: 'UNAUTHORIZED',
            message: 'Administrator authentication is required to access visitor analytics.'
        });
    }

    if (!db.isDatabaseConfigured()) {
        return sendJson(res, 503, {
            ok: false,
            code: 'DATABASE_NOT_CONFIGURED',
            message: 'PostgreSQL DATABASE_URL is not configured. Persistent visitor analytics require PostgreSQL.'
        });
    }

    if (method === 'GET') {
        try {
            const dashboard = await analytics.getAnalyticsDashboard({
                range: parsedUrl.searchParams.get('range') || '30d',
                startDate: parsedUrl.searchParams.get('start') || '',
                endDate: parsedUrl.searchParams.get('end') || '',
                granularity: parsedUrl.searchParams.get('granularity') || 'daily',
                timezone: parsedUrl.searchParams.get('tz') || analytics.DEFAULT_TIMEZONE,
                activityPage: parsedUrl.searchParams.get('activityPage') || '1',
                activityFilter: parsedUrl.searchParams.get('activityFilter') || 'all',
                downloadsPage: parsedUrl.searchParams.get('downloadsPage') || '1'
            });

            return sendJson(res, 200, {
                ok: true,
                ...dashboard
            });
        } catch (err) {
            console.error('[api/analytics] Failed to query dashboard:', err && err.message ? err.message : 'Error');
            return sendJson(res, 500, {
                ok: false,
                code: 'ANALYTICS_QUERY_FAILED',
                message: 'Unable to load visitor analytics from PostgreSQL.'
            });
        }
    }

    if (method === 'DELETE') {
        const action = parsedUrl.searchParams.get('action') || '';
        try {
            if (action === 'purge') {
                const days = parsedUrl.searchParams.get('retentionDays') || '180';
                const result = await analytics.purgeOldAnalytics(days);
                return sendJson(res, 200, {
                    ok: true,
                    message: `Purged ${result.deletedEvents} event(s) and ${result.deletedSessions} session(s) older than ${result.retentionDays} days.`,
                    ...result
                });
            }

            if (action === 'delete_identity') {
                const id = parsedUrl.searchParams.get('id');
                if (!id) {
                    return sendJson(res, 400, { ok: false, code: 'MISSING_ID', message: 'Visitor identity ID is required.' });
                }
                const deleted = await analytics.deleteVisitorIdentity(id);
                if (!deleted) {
                    return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Visitor identity record not found.' });
                }
                return sendJson(res, 200, {
                    ok: true,
                    message: 'Personal identity record deleted. Linked historical traffic has been anonymized.'
                });
            }

            return sendJson(res, 400, {
                ok: false,
                code: 'UNKNOWN_ACTION',
                message: 'Specify action=purge or action=delete_identity.'
            });
        } catch (err) {
            console.error('[api/analytics] Delete operation failed:', err && err.message ? err.message : 'Error');
            return sendJson(res, 500, {
                ok: false,
                code: 'ANALYTICS_DELETE_FAILED',
                message: 'Unable to complete analytics deletion request.'
            });
        }
    }

    return sendJson(res, 405, {
        ok: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET, POST, and DELETE methods are supported.'
    }, { Allow: 'GET, POST, DELETE, OPTIONS' });
}

module.exports = analyticsHandler;
module.exports.resetRateLimitStore = resetRateLimitStore;
