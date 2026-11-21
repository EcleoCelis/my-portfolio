'use strict';

const fs = require('fs');
const auth = require('../lib/auth');
const db = require('../lib/db');
const analytics = require('../lib/analytics');

async function resumeHandler(req, res) {
    const method = (req.method || 'GET').toUpperCase();
    const parsedUrl = new URL(req.url || '/api/resume', `http://${req.headers.host || 'localhost'}`);

    if (method !== 'GET' && method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, HEAD');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Only GET and HEAD requests are allowed.' }));
        return;
    }

    const filePath = analytics.getResumeFilePath();
    const isAdmin = auth.isRequestAuthenticated(req.headers || {});
    const visitorId = parsedUrl.searchParams.get('vid') || '';
    const sessionId = parsedUrl.searchParams.get('sid') || '';
    const requestEventId = parsedUrl.searchParams.get('reqId') || '';
    const userAgent = (req.headers && (req.headers['user-agent'] || req.headers['User-Agent'])) || '';
    const referrer = (req.headers && (req.headers.referer || req.headers.Referer)) || '';
    const host = (req.headers && req.headers.host) || '';

    // HEAD checks availability cleanly without recording a download event
    if (method === 'HEAD') {
        res.setHeader('Cache-Control', 'no-store');
        if (!filePath) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end();
            return;
        }
        const stat = fs.statSync(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Content-Disposition', `attachment; filename="${analytics.RESUME_FILENAME}"`);
        res.end();
        return;
    }

    // GET request: record actual server outcome unless authenticated admin
    if (!filePath) {
        if (!isAdmin && db.isDatabaseConfigured()) {
            try {
                await analytics.recordAnalyticsEvent({
                    eventId: requestEventId ? `unavail_${requestEventId}` : '',
                    eventType: 'resume_unavailable',
                    visitorId,
                    sessionId,
                    pagePath: '/api/resume',
                    referrer,
                    currentHost: host,
                    userAgent,
                    downloadResource: analytics.RESUME_FILENAME,
                    outcome: 'file_missing'
                });
            } catch (e) {}
        }

        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
            ok: false,
            code: 'RESUME_NOT_UPLOADED',
            resource: analytics.RESUME_FILENAME,
            message: 'The PDF resume file is currently pending upload by the portfolio owner.'
        }));
        return;
    }

    try {
        const stat = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);

        if (!isAdmin && db.isDatabaseConfigured()) {
            try {
                await analytics.recordAnalyticsEvent({
                    eventId: requestEventId ? `served_${requestEventId}` : '',
                    eventType: 'resume_served',
                    visitorId,
                    sessionId,
                    pagePath: '/api/resume',
                    referrer,
                    currentHost: host,
                    userAgent,
                    downloadResource: analytics.RESUME_FILENAME,
                    outcome: 'file_served'
                });
            } catch (e) {}
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Content-Disposition', `attachment; filename="${analytics.RESUME_FILENAME}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.end(fileBuffer);
    } catch (err) {
        console.error('[api/resume] Failed to read/serve resume file:', err && err.message ? err.message : 'Error');
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
            ok: false,
            code: 'RESUME_DELIVERY_FAILED',
            message: 'Unable to deliver the resume PDF file at this time.'
        }));
    }
}

module.exports = resumeHandler;
