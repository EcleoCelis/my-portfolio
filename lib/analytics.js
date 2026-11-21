'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const DEFAULT_TIMEZONE = 'Asia/Manila';
const ALLOWED_TIMEZONES = new Set([
    'Asia/Manila',
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
]);

const ALLOWED_EVENT_TYPES = new Set([
    'session_start',
    'page_view',
    'resume_requested',
    'resume_served',
    'resume_unavailable'
]);

const ALLOWED_IDENTITY_SOURCES = new Set([
    'contact_form',
    'resume_request'
]);

const BOT_UA_REGEX = /\b(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|discordbot|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|pagespeed|pingdom|uptimerobot|statuscake|curl|wget|python-requests|python-urllib|go-http-client|axios|node-fetch|postmanruntime|scrapy|semrush|ahrefs|mj12bot|dotbot|yandex|baiduspider|duckduckbot|applebot|googlebot|bingbot)\b/i;

const RESUME_FILENAME = 'Celis-Jomarie-Resume.pdf';

function sanitizeSingleLine(value, maxLen = 160) {
    return String(value == null ? '' : value)
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, maxLen);
}

function sanitizeId(value) {
    const clean = String(value == null ? '' : value)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 64);
    return clean;
}

function generateId(prefix = 'evt') {
    return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function sanitizePagePath(rawPath) {
    if (!rawPath) return '/';
    let str = String(rawPath).trim();
    // Strip protocol/host if accidentally passed
    try {
        if (/^https?:\/\//i.test(str)) {
            str = new URL(str).pathname;
        }
    } catch (e) {}
    // Strip query string and hash to prevent capturing sensitive URL tokens
    str = str.split('?')[0].split('#')[0].trim();
    if (!str.startsWith('/')) str = '/' + str;
    // Normalize known index routes
    if (str === '/index.html') str = '/';
    if (str === '/projects.html') str = '/projects';
    return str.slice(0, 255) || '/';
}

function classifyReferrer(rawReferrer, currentHost = '') {
    if (!rawReferrer || typeof rawReferrer !== 'string') return 'Direct';
    const trimmed = rawReferrer.trim();
    if (!trimmed) return 'Direct';
    if (!/^https?:\/\//i.test(trimmed)) {
        // Already a coarse label
        return sanitizeSingleLine(trimmed, 80) || 'Direct';
    }
    try {
        const url = new URL(trimmed);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        if (!host) return 'Direct';
        const cleanCurrent = String(currentHost || '').toLowerCase().split(':')[0].replace(/^www\./, '');
        if (cleanCurrent && host === cleanCurrent) return 'Portfolio';
        if (host.includes('google.')) return 'Google Search';
        if (host.includes('bing.com')) return 'Bing Search';
        if (host.includes('duckduckgo.com')) return 'DuckDuckGo';
        if (host.includes('linkedin.com') || host === 'lnkd.in') return 'LinkedIn';
        if (host.includes('github.com')) return 'GitHub';
        if (host.includes('facebook.com') || host === 'fb.com' || host === 'l.facebook.com' || host === 'lm.facebook.com') return 'Facebook';
        if (host.includes('indeed.com')) return 'Indeed';
        if (host.includes('jobstreet.')) return 'JobStreet';
        if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return 'X / Twitter';
        return host.slice(0, 80);
    } catch (e) {
        return 'Direct';
    }
}

function classifyDevice(userAgent = '', explicitCategory = '') {
    const allowed = new Set(['desktop', 'mobile', 'tablet']);
    const explicit = String(explicitCategory || '').toLowerCase().trim();
    if (allowed.has(explicit)) return explicit;

    const ua = String(userAgent || '').toLowerCase();
    if (!ua) return 'desktop';
    if (/(ipad|tablet|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/(mobile|iphone|ipod|android.*mobile|windows phone|blackberry)/i.test(ua)) return 'mobile';
    return 'desktop';
}

function detectBot(userAgent = '') {
    const ua = String(userAgent || '').trim();
    if (!ua) return false;
    return BOT_UA_REGEX.test(ua);
}

function normalizeTimezone(tz) {
    const clean = String(tz || '').trim();
    if (ALLOWED_TIMEZONES.has(clean)) return clean;
    return DEFAULT_TIMEZONE;
}

function getResumeFilePath() {
    const candidates = [
        path.join(__dirname, '..', 'assets', 'docs', RESUME_FILENAME),
        path.join(process.cwd(), 'assets', 'docs', RESUME_FILENAME)
    ];
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        } catch (e) {}
    }
    return null;
}

function isValidIsoDate(str) {
    return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/**
 * Formats a UTC Date into YYYY-MM-DD in the given IANA timezone.
 */
function formatDateInTz(date, timeZone = DEFAULT_TIMEZONE) {
    const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return dtf.format(date); // YYYY-MM-DD
}

/**
 * Computes date-range boundaries (YYYY-MM-DD in reporting timezone) for today / 7d / 30d / custom.
 */
function resolveDateRange({ range = '30d', startDate = '', endDate = '', timezone = DEFAULT_TIMEZONE, now = new Date() }) {
    const tz = normalizeTimezone(timezone);
    const todayStr = formatDateInTz(now, tz);

    const parseYmd = (ymd) => {
        const [y, m, d] = ymd.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    };
    const toYmd = (dt) => {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const addDays = (ymd, delta) => {
        const dt = parseYmd(ymd);
        dt.setUTCDate(dt.getUTCDate() + delta);
        return toYmd(dt);
    };

    let start = todayStr;
    let end = todayStr;
    let normalizedRange = String(range || '30d').toLowerCase();

    if (normalizedRange === 'today') {
        start = todayStr;
        end = todayStr;
    } else if (normalizedRange === '7d') {
        start = addDays(todayStr, -6);
        end = todayStr;
    } else if (normalizedRange === 'custom' && isValidIsoDate(startDate) && isValidIsoDate(endDate)) {
        start = startDate <= endDate ? startDate : endDate;
        end = startDate <= endDate ? endDate : startDate;
        // Guard maximum range span to 366 days for query safety
        const diffDays = Math.round((parseYmd(end) - parseYmd(start)) / 86400000);
        if (diffDays > 366) {
            start = addDays(end, -365);
        }
    } else {
        normalizedRange = '30d';
        start = addDays(todayStr, -29);
        end = todayStr;
    }

    // Current ISO calendar week (Monday–Sunday) in reporting timezone
    const todayUtc = parseYmd(todayStr);
    const dayOfWeek = todayUtc.getUTCDay(); // 0=Sun, 1=Mon..6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = addDays(todayStr, mondayOffset);
    const monthStart = `${todayStr.slice(0, 7)}-01`;

    return {
        timezone: tz,
        range: normalizedRange,
        startDate: start,
        endDate: end,
        todayStr,
        weekStart,
        monthStart
    };
}

/**
 * Generates zero-filled time buckets between startDate and endDate for daily, weekly (Mon-Sun), or monthly granularity.
 */
function buildTimeBuckets(startDate, endDate, granularity = 'daily') {
    const parseYmd = (ymd) => {
        const [y, m, d] = ymd.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    };
    const toYmd = (dt) => {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const shortMonth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const buckets = [];
    const startDt = parseYmd(startDate);
    const endDt = parseYmd(endDate);

    if (granularity === 'monthly') {
        const cursor = new Date(Date.UTC(startDt.getUTCFullYear(), startDt.getUTCMonth(), 1));
        const endMonth = new Date(Date.UTC(endDt.getUTCFullYear(), endDt.getUTCMonth(), 1));
        while (cursor <= endMonth) {
            const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
            const label = `${shortMonth[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
            buckets.push({ bucket: key, label });
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        return buckets;
    }

    if (granularity === 'weekly') {
        const cursor = new Date(startDt.getTime());
        const dow = cursor.getUTCDay();
        const mondayDelta = dow === 0 ? -6 : 1 - dow;
        cursor.setUTCDate(cursor.getUTCDate() + mondayDelta);

        while (cursor <= endDt) {
            const key = toYmd(cursor);
            const label = `Wk ${shortMonth[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`;
            buckets.push({ bucket: key, label });
            cursor.setUTCDate(cursor.getUTCDate() + 7);
        }
        return buckets;
    }

    // Default: daily
    const cursor = new Date(startDt.getTime());
    while (cursor <= endDt) {
        const key = toYmd(cursor);
        const label = `${shortMonth[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`;
        buckets.push({ bucket: key, label });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return buckets;
}

/**
 * Records a voluntary visitor identity (e.g., from contact form or optional résumé request).
 * Associates ONLY with the explicitly linked session_id; never merges unrelated anonymous sessions.
 */
async function registerVoluntaryIdentity({ visitorId, sessionId, name, email = '', company = '', source = 'contact_form' }) {
    const pool = db.getPool();
    if (!pool) return { saved: false, reason: 'DATABASE_NOT_CONFIGURED' };

    const cleanName = sanitizeSingleLine(name, 120);
    if (cleanName.length < 2) {
        return { saved: false, reason: 'INVALID_NAME' };
    }
    const cleanEmail = sanitizeSingleLine(email, 254).toLowerCase();
    const cleanCompany = sanitizeSingleLine(company, 120);
    const cleanSource = ALLOWED_IDENTITY_SOURCES.has(source) ? source : 'contact_form';
    const cleanVisitorId = sanitizeId(visitorId) || generateId('vis');
    const cleanSessionId = sanitizeId(sessionId) || generateId('ses');

    try {
        await db.ensureSchemaAndSeed();

        // Check if this exact session already has an identity record to update cleanly
        const existing = await pool.query(
            `SELECT id FROM analytics_identities WHERE session_id = $1 ORDER BY identified_at DESC LIMIT 1`,
            [cleanSessionId]
        );

        let identityId;
        if (existing.rows && existing.rows[0]) {
            identityId = existing.rows[0].id;
            await pool.query(
                `UPDATE analytics_identities
                 SET full_name = $1,
                     email = CASE WHEN $2 <> '' THEN $2 ELSE email END,
                     company = CASE WHEN $3 <> '' THEN $3 ELSE company END,
                     source = $4,
                     identified_at = NOW()
                 WHERE id = $5`,
                [cleanName, cleanEmail, cleanCompany, cleanSource, identityId]
            );
        } else {
            const ins = await pool.query(
                `INSERT INTO analytics_identities (visitor_id, session_id, full_name, email, company, source)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [cleanVisitorId, cleanSessionId, cleanName, cleanEmail, cleanCompany, cleanSource]
            );
            identityId = ins.rows[0].id;
        }

        // Associate ONLY this verified session and its events with the voluntary identity
        await pool.query(
            `UPDATE analytics_sessions SET identity_id = $1, last_seen_at = NOW() WHERE session_id = $2`,
            [identityId, cleanSessionId]
        );
        await pool.query(
            `UPDATE analytics_events SET identity_id = $1 WHERE session_id = $2 AND identity_id IS NULL`,
            [identityId, cleanSessionId]
        );

        return {
            saved: true,
            identityId,
            visitorId: cleanVisitorId,
            sessionId: cleanSessionId
        };
    } catch (err) {
        console.error('[analytics] Failed to register voluntary identity:', err && err.message ? err.message : 'Error');
        return { saved: false, reason: 'DATABASE_WRITE_FAILED' };
    }
}

/**
 * Records an analytics event idempotently with refresh deduplication and session upserts.
 */
async function recordAnalyticsEvent({
    eventId = '',
    eventType = 'page_view',
    visitorId = '',
    sessionId = '',
    pagePath = '/',
    referrer = '',
    currentHost = '',
    userAgent = '',
    deviceCategory = '',
    downloadResource = '',
    outcome = 'recorded',
    createdAt = null
}) {
    const pool = db.getPool();
    if (!pool) return { recorded: false, reason: 'DATABASE_NOT_CONFIGURED' };

    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
        return { recorded: false, reason: 'INVALID_EVENT_TYPE' };
    }

    const cleanEventId = sanitizeId(eventId) || generateId('evt');
    const cleanVisitorId = sanitizeId(visitorId) || generateId('vis');
    const cleanSessionId = sanitizeId(sessionId) || generateId('ses');
    const cleanPath = sanitizePagePath(pagePath);
    const cleanReferrer = classifyReferrer(referrer, currentHost);
    const cleanDevice = classifyDevice(userAgent, deviceCategory);
    const cleanResource = sanitizeSingleLine(downloadResource, 160);
    const cleanOutcome = sanitizeSingleLine(outcome, 40) || 'recorded';
    const isBot = detectBot(userAgent);
    const timestamp = createdAt ? new Date(createdAt) : new Date();

    try {
        await db.ensureSchemaAndSeed();

        // Look up voluntarily established identity for THIS session ONLY
        let identityId = null;
        const idRes = await pool.query(
            `SELECT id FROM analytics_identities WHERE session_id = $1 ORDER BY identified_at DESC LIMIT 1`,
            [cleanSessionId]
        );
        if (idRes.rows && idRes.rows[0]) {
            identityId = idRes.rows[0].id;
        }

        // Upsert session (refreshing the same page within a session updates last_seen_at without creating a new visit)
        await pool.query(
            `INSERT INTO analytics_sessions
                (session_id, visitor_id, identity_id, landing_path, referrer_source, device_category, is_bot, started_at, last_seen_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
             ON CONFLICT (session_id) DO UPDATE
             SET last_seen_at = GREATEST(analytics_sessions.last_seen_at, EXCLUDED.last_seen_at),
                 identity_id = COALESCE(analytics_sessions.identity_id, EXCLUDED.identity_id)`,
            [cleanSessionId, cleanVisitorId, identityId, cleanPath, cleanReferrer, cleanDevice, isBot, timestamp]
        );

        // Deduplicate rapid accidental page_view double-fires/refreshes within 5 seconds on the same path & session
        if (eventType === 'page_view') {
            const recentDup = await pool.query(
                `SELECT event_id FROM analytics_events
                 WHERE session_id = $1
                   AND event_type = 'page_view'
                   AND page_path = $2
                   AND created_at >= ($3::timestamptz - INTERVAL '5 seconds')
                   AND created_at <= ($3::timestamptz + INTERVAL '5 seconds')
                 LIMIT 1`,
                [cleanSessionId, cleanPath, timestamp]
            );
            if (recentDup.rows && recentDup.rows.length > 0) {
                return {
                    recorded: false,
                    deduplicated: true,
                    reason: 'RAPID_REFRESH_DEDUPLICATED',
                    sessionId: cleanSessionId,
                    visitorId: cleanVisitorId
                };
            }
        }

        const insertRes = await pool.query(
            `INSERT INTO analytics_events
                (event_id, event_type, visitor_id, session_id, identity_id, page_path, referrer_source, device_category, download_resource, outcome, is_bot, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (event_id) DO NOTHING
             RETURNING event_id`,
            [
                cleanEventId,
                eventType,
                cleanVisitorId,
                cleanSessionId,
                identityId,
                cleanPath,
                cleanReferrer,
                cleanDevice,
                cleanResource,
                cleanOutcome,
                isBot,
                timestamp
            ]
        );

        const inserted = Boolean(insertRes.rows && insertRes.rows.length > 0);
        return {
            recorded: inserted,
            deduplicated: !inserted,
            eventId: cleanEventId,
            sessionId: cleanSessionId,
            visitorId: cleanVisitorId,
            isBot
        };
    } catch (err) {
        console.error('[analytics] Failed to record event:', err && err.message ? err.message : 'Error');
        return { recorded: false, reason: 'DATABASE_WRITE_FAILED' };
    }
}

function formatEventLabel(eventType, pagePath, outcome) {
    if (eventType === 'resume_served') return 'Résumé file served';
    if (eventType === 'resume_requested') return 'Résumé download requested';
    if (eventType === 'resume_unavailable') return 'Résumé requested (file unavailable)';
    if (eventType === 'session_start') return 'Portfolio session started';
    if (eventType === 'page_view') {
        if (pagePath === '/projects' || pagePath === '/projects.html') return 'Projects archive view';
        if (pagePath === '/' || pagePath === '/index.html') return 'Portfolio visit';
        return `Page view (${pagePath})`;
    }
    return outcome || eventType;
}

/**
 * Fetches full admin analytics summary, time series, recent activity, and résumé download logs.
 */
async function getAnalyticsDashboard({
    range = '30d',
    startDate = '',
    endDate = '',
    granularity = 'daily',
    timezone = DEFAULT_TIMEZONE,
    activityPage = 1,
    activityFilter = 'all',
    downloadsPage = 1
} = {}) {
    const pool = db.getPool();
    if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
    await db.ensureSchemaAndSeed();

    const dateCtx = resolveDateRange({ range, startDate, endDate, timezone });
    const tz = dateCtx.timezone;
    const allowedGranularities = new Set(['daily', 'weekly', 'monthly']);
    const cleanGranularity = allowedGranularities.has(granularity) ? granularity : 'daily';

    const pageSize = 15;
    const actPage = Math.max(1, parseInt(activityPage, 10) || 1);
    const dlPage = Math.max(1, parseInt(downloadsPage, 10) || 1);

    // 1. Summary KPIs across selected range + Today / Calendar Week (Mon-Sun) / Calendar Month
    const summaryQuery = await pool.query(
        `WITH range_sessions AS (
            SELECT session_id, visitor_id, identity_id, is_bot, started_at
            FROM analytics_sessions
            WHERE (started_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
        ),
        range_events AS (
            SELECT event_id, event_type, visitor_id, session_id, identity_id, is_bot, created_at
            FROM analytics_events
            WHERE (created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
        )
        SELECT
            (SELECT COUNT(*)::int FROM range_sessions WHERE NOT is_bot) AS total_visits,
            (SELECT COUNT(DISTINCT visitor_id)::int FROM range_sessions WHERE NOT is_bot) AS unique_visitors,
            (SELECT COUNT(*)::int FROM range_events WHERE NOT is_bot AND event_type = 'page_view') AS total_page_views,
            (SELECT COUNT(*)::int FROM range_events WHERE NOT is_bot AND event_type = 'resume_served') AS resume_served,
            (SELECT COUNT(*)::int FROM range_events WHERE NOT is_bot AND event_type = 'resume_requested') AS resume_requested,
            (SELECT COUNT(*)::int FROM range_events WHERE NOT is_bot AND event_type = 'resume_unavailable') AS resume_unavailable,
            (SELECT COUNT(DISTINCT identity_id)::int FROM range_sessions WHERE NOT is_bot AND identity_id IS NOT NULL) AS identified_visitors_range,
            (SELECT COUNT(*)::int FROM analytics_identities) AS identified_visitors_total,
            (SELECT COUNT(*)::int FROM range_sessions WHERE is_bot) AS bots_filtered,
            (SELECT COUNT(*)::int FROM analytics_sessions WHERE NOT is_bot AND (started_at AT TIME ZONE $1)::date = $4::date) AS today_visits,
            (SELECT COUNT(*)::int FROM analytics_sessions WHERE NOT is_bot AND (started_at AT TIME ZONE $1)::date BETWEEN $5::date AND $4::date) AS weekly_visits,
            (SELECT COUNT(*)::int FROM analytics_sessions WHERE NOT is_bot AND (started_at AT TIME ZONE $1)::date BETWEEN $6::date AND $4::date) AS monthly_visits,
            (SELECT COUNT(*)::int FROM analytics_events WHERE NOT is_bot AND event_type = 'resume_served' AND (created_at AT TIME ZONE $1)::date = $4::date) AS today_downloads,
            (SELECT COUNT(*)::int FROM analytics_events WHERE NOT is_bot AND event_type = 'resume_served' AND (created_at AT TIME ZONE $1)::date BETWEEN $5::date AND $4::date) AS weekly_downloads,
            (SELECT COUNT(*)::int FROM analytics_events WHERE NOT is_bot AND event_type = 'resume_served' AND (created_at AT TIME ZONE $1)::date BETWEEN $6::date AND $4::date) AS monthly_downloads`,
        [tz, dateCtx.startDate, dateCtx.endDate, dateCtx.todayStr, dateCtx.weekStart, dateCtx.monthStart]
    );

    const s = summaryQuery.rows[0] || {};

    // 2. Bucket expression for daily / weekly (ISO Monday) / monthly
    let sessionBucketExpr;
    let eventBucketExpr;
    if (cleanGranularity === 'monthly') {
        sessionBucketExpr = `to_char(date_trunc('month', started_at AT TIME ZONE $1), 'YYYY-MM')`;
        eventBucketExpr = `to_char(date_trunc('month', created_at AT TIME ZONE $1), 'YYYY-MM')`;
    } else if (cleanGranularity === 'weekly') {
        sessionBucketExpr = `to_char(date_trunc('week', started_at AT TIME ZONE $1)::date, 'YYYY-MM-DD')`;
        eventBucketExpr = `to_char(date_trunc('week', created_at AT TIME ZONE $1)::date, 'YYYY-MM-DD')`;
    } else {
        sessionBucketExpr = `to_char((started_at AT TIME ZONE $1)::date, 'YYYY-MM-DD')`;
        eventBucketExpr = `to_char((created_at AT TIME ZONE $1)::date, 'YYYY-MM-DD')`;
    }

    const [sessionSeriesRes, pageViewSeriesRes, downloadSeriesRes] = await Promise.all([
        pool.query(
            `SELECT ${sessionBucketExpr} AS bucket,
                    COUNT(*)::int AS visits,
                    COUNT(DISTINCT visitor_id)::int AS unique_visitors
             FROM analytics_sessions
             WHERE NOT is_bot
               AND (started_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
             GROUP BY bucket
             ORDER BY bucket ASC`,
            [tz, dateCtx.startDate, dateCtx.endDate]
        ),
        pool.query(
            `SELECT ${eventBucketExpr} AS bucket,
                    COUNT(*)::int AS page_views
             FROM analytics_events
             WHERE NOT is_bot
               AND event_type = 'page_view'
               AND (created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
             GROUP BY bucket
             ORDER BY bucket ASC`,
            [tz, dateCtx.startDate, dateCtx.endDate]
        ),
        pool.query(
            `SELECT ${eventBucketExpr} AS bucket,
                    COUNT(*) FILTER (WHERE event_type = 'resume_requested')::int AS requested,
                    COUNT(*) FILTER (WHERE event_type = 'resume_served')::int AS served,
                    COUNT(*) FILTER (WHERE event_type = 'resume_unavailable')::int AS unavailable
             FROM analytics_events
             WHERE NOT is_bot
               AND event_type IN ('resume_requested', 'resume_served', 'resume_unavailable')
               AND (created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
             GROUP BY bucket
             ORDER BY bucket ASC`,
            [tz, dateCtx.startDate, dateCtx.endDate]
        )
    ]);

    const sessMap = new Map(sessionSeriesRes.rows.map(r => [r.bucket, r]));
    const pvMap = new Map(pageViewSeriesRes.rows.map(r => [r.bucket, r]));
    const dlMap = new Map(downloadSeriesRes.rows.map(r => [r.bucket, r]));

    const buckets = buildTimeBuckets(dateCtx.startDate, dateCtx.endDate, cleanGranularity);
    const trafficSeries = buckets.map(b => {
        const sr = sessMap.get(b.bucket);
        const pr = pvMap.get(b.bucket);
        return {
            bucket: b.bucket,
            label: b.label,
            visits: sr ? Number(sr.visits) : 0,
            uniqueVisitors: sr ? Number(sr.unique_visitors) : 0,
            pageViews: pr ? Number(pr.page_views) : 0
        };
    });

    const downloadSeries = buckets.map(b => {
        const dr = dlMap.get(b.bucket);
        return {
            bucket: b.bucket,
            label: b.label,
            requested: dr ? Number(dr.requested) : 0,
            served: dr ? Number(dr.served) : 0,
            unavailable: dr ? Number(dr.unavailable) : 0
        };
    });

    // 3. Paginated Recent Visitor Activity
    let filterSql = `NOT e.is_bot AND (e.created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date`;
    if (activityFilter === 'identified') {
        filterSql += ` AND e.identity_id IS NOT NULL`;
    } else if (activityFilter === 'anonymous') {
        filterSql += ` AND e.identity_id IS NULL`;
    } else if (activityFilter === 'resume') {
        filterSql += ` AND e.event_type IN ('resume_requested', 'resume_served', 'resume_unavailable')`;
    }

    const actCountRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM analytics_events e WHERE ${filterSql}`,
        [tz, dateCtx.startDate, dateCtx.endDate]
    );
    const actTotal = actCountRes.rows[0] ? Number(actCountRes.rows[0].total) : 0;
    const actTotalPages = Math.max(1, Math.ceil(actTotal / pageSize));
    const safeActPage = Math.min(actPage, actTotalPages);
    const actOffset = (safeActPage - 1) * pageSize;

    const actRowsRes = await pool.query(
        `SELECT e.event_id, e.event_type, e.page_path, e.referrer_source, e.device_category,
                e.download_resource, e.outcome, e.created_at, e.identity_id,
                i.full_name, i.company, i.source AS identity_source
         FROM analytics_events e
         LEFT JOIN analytics_identities i ON i.id = e.identity_id
         WHERE ${filterSql}
         ORDER BY e.created_at DESC
         LIMIT $4 OFFSET $5`,
        [tz, dateCtx.startDate, dateCtx.endDate, pageSize, actOffset]
    );

    const recentActivity = actRowsRes.rows.map(r => ({
        eventId: r.event_id,
        visitorName: r.full_name || 'Anonymous Visitor',
        classification: r.full_name ? 'identified' : 'anonymous',
        company: r.company || '',
        identitySource: r.identity_source || '',
        eventType: r.event_type,
        activityLabel: formatEventLabel(r.event_type, r.page_path, r.outcome),
        pagePath: r.page_path,
        source: r.referrer_source || 'Direct',
        deviceCategory: r.device_category || 'desktop',
        downloadResource: r.download_resource || '',
        outcome: r.outcome || 'recorded',
        timestamp: r.created_at
    }));

    // 4. Paginated Résumé Download Records
    const dlCountRes = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM analytics_events e
         WHERE NOT e.is_bot
           AND e.event_type IN ('resume_requested', 'resume_served', 'resume_unavailable')
           AND (e.created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date`,
        [tz, dateCtx.startDate, dateCtx.endDate]
    );
    const dlTotal = dlCountRes.rows[0] ? Number(dlCountRes.rows[0].total) : 0;
    const dlTotalPages = Math.max(1, Math.ceil(dlTotal / pageSize));
    const safeDlPage = Math.min(dlPage, dlTotalPages);
    const dlOffset = (safeDlPage - 1) * pageSize;

    const dlRowsRes = await pool.query(
        `SELECT e.event_id, e.event_type, e.download_resource, e.outcome, e.created_at,
                e.referrer_source, e.device_category, e.identity_id,
                i.full_name, i.company, i.email, i.source AS identity_source
         FROM analytics_events e
         LEFT JOIN analytics_identities i ON i.id = e.identity_id
         WHERE NOT e.is_bot
           AND e.event_type IN ('resume_requested', 'resume_served', 'resume_unavailable')
           AND (e.created_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
         ORDER BY e.created_at DESC
         LIMIT $4 OFFSET $5`,
        [tz, dateCtx.startDate, dateCtx.endDate, pageSize, dlOffset]
    );

    const resumeDownloads = dlRowsRes.rows.map(r => {
        let outcomeLabel = 'Download requested';
        if (r.event_type === 'resume_served') outcomeLabel = 'File served (HTTP 200)';
        else if (r.event_type === 'resume_unavailable') outcomeLabel = 'File unavailable (404)';
        return {
            eventId: r.event_id,
            visitorName: r.full_name || 'Anonymous Visitor',
            classification: r.full_name ? 'identified' : 'anonymous',
            company: r.company || '',
            resource: r.download_resource || RESUME_FILENAME,
            eventType: r.event_type,
            outcome: outcomeLabel,
            source: r.referrer_source || 'Direct',
            timestamp: r.created_at
        };
    });

    // 5. Voluntarily Identified Visitors directory (for admin visibility & GDPR/privacy deletion)
    const identitiesRes = await pool.query(
        `SELECT i.id, i.full_name, i.email, i.company, i.source, i.identified_at,
                (SELECT COUNT(*)::int FROM analytics_events e WHERE e.identity_id = i.id AND e.event_type = 'resume_served') AS resume_downloads,
                (SELECT COUNT(*)::int FROM analytics_events e WHERE e.identity_id = i.id AND e.event_type = 'page_view') AS page_views
         FROM analytics_identities i
         ORDER BY i.identified_at DESC
         LIMIT 50`
    );

    return {
        timezone: tz,
        weekDefinition: 'Monday–Sunday (ISO calendar week)',
        range: dateCtx.range,
        startDate: dateCtx.startDate,
        endDate: dateCtx.endDate,
        granularity: cleanGranularity,
        resumeFileAvailable: Boolean(getResumeFilePath()),
        resumeFilename: RESUME_FILENAME,
        summary: {
            totalVisits: Number(s.total_visits) || 0,
            uniqueVisitors: Number(s.unique_visitors) || 0,
            totalPageViews: Number(s.total_page_views) || 0,
            resumeServed: Number(s.resume_served) || 0,
            resumeRequested: Number(s.resume_requested) || 0,
            resumeUnavailable: Number(s.resume_unavailable) || 0,
            identifiedVisitors: Number(s.identified_visitors_total) || 0,
            identifiedVisitorsInRange: Number(s.identified_visitors_range) || 0,
            botsFiltered: Number(s.bots_filtered) || 0,
            todayVisits: Number(s.today_visits) || 0,
            weeklyVisits: Number(s.weekly_visits) || 0,
            monthlyVisits: Number(s.monthly_visits) || 0,
            todayDownloads: Number(s.today_downloads) || 0,
            weeklyDownloads: Number(s.weekly_downloads) || 0,
            monthlyDownloads: Number(s.monthly_downloads) || 0
        },
        trafficSeries,
        downloadSeries,
        recentActivity: {
            items: recentActivity,
            page: safeActPage,
            pageSize,
            total: actTotal,
            totalPages: actTotalPages
        },
        resumeDownloads: {
            items: resumeDownloads,
            page: safeDlPage,
            pageSize,
            total: dlTotal,
            totalPages: dlTotalPages
        },
        identifiedVisitorsList: identitiesRes.rows
    };
}

/**
 * Purges analytics events and sessions older than the specified retention window (days).
 */
async function purgeOldAnalytics(retentionDays = 180) {
    const pool = db.getPool();
    if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
    await db.ensureSchemaAndSeed();

    const days = Math.max(1, Math.min(3650, parseInt(retentionDays, 10) || 180));
    const evRes = await pool.query(
        `DELETE FROM analytics_events WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')`,
        [days]
    );
    const sesRes = await pool.query(
        `DELETE FROM analytics_sessions WHERE last_seen_at < NOW() - ($1::int * INTERVAL '1 day')`,
        [days]
    );
    return {
        retentionDays: days,
        deletedEvents: evRes.rowCount || 0,
        deletedSessions: sesRes.rowCount || 0
    };
}

/**
 * Deletes a voluntarily provided visitor identity record.
 * Linked sessions/events become anonymous (identity_id = NULL) via ON DELETE SET NULL.
 */
async function deleteVisitorIdentity(id) {
    const pool = db.getPool();
    if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
    await db.ensureSchemaAndSeed();

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return false;

    const res = await pool.query(
        `DELETE FROM analytics_identities WHERE id = $1 RETURNING id`,
        [numericId]
    );
    return res.rowCount > 0;
}

module.exports = {
    DEFAULT_TIMEZONE,
    RESUME_FILENAME,
    sanitizePagePath,
    classifyReferrer,
    classifyDevice,
    detectBot,
    normalizeTimezone,
    getResumeFilePath,
    resolveDateRange,
    buildTimeBuckets,
    registerVoluntaryIdentity,
    recordAnalyticsEvent,
    getAnalyticsDashboard,
    purgeOldAnalytics,
    deleteVisitorIdentity
};
