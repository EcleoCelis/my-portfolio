'use strict';

/**
 * Lightweight, privacy-conscious portfolio visitor analytics client.
 * - Uses pseudonymous random UUIDs (no IP collection, no browser fingerprinting).
 * - Respects browser Do Not Track (DNT) and explicit visitor opt-out.
 * - Uses 30-minute sliding sessions in sessionStorage so refreshes do not inflate visit counts.
 * - Completely non-blocking; failures never disrupt portfolio navigation.
 */
(function () {
    const VISITOR_KEY = 'portfolio_vid_v1';
    const SESSION_KEY = 'portfolio_sid_v1';
    const SESSION_TS_KEY = 'portfolio_sts_v1';
    const OPTOUT_KEY = 'portfolio_analytics_optout';
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

    function randomHex(bytes) {
        try {
            if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
                const arr = new Uint8Array(bytes);
                window.crypto.getRandomValues(arr);
                return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {}
        return Math.random().toString(16).slice(2) + Date.now().toString(16);
    }

    function generateId(prefix) {
        return prefix + '_' + randomHex(10);
    }

    function isDntEnabled() {
        try {
            return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
        } catch (e) {
            return false;
        }
    }

    function isOptedOut() {
        try {
            if (localStorage.getItem(OPTOUT_KEY) === '1') return true;
        } catch (e) {}
        return isDntEnabled();
    }

    function setOptOut(optOut) {
        try {
            if (optOut) {
                localStorage.setItem(OPTOUT_KEY, '1');
            } else {
                localStorage.removeItem(OPTOUT_KEY);
            }
        } catch (e) {}
    }

    function getDeviceCategory() {
        const w = window.innerWidth || 1280;
        if (w <= 640) return 'mobile';
        if (w <= 1024) return 'tablet';
        return 'desktop';
    }

    function getOrCreateContext() {
        let visitorId = '';
        let sessionId = '';
        let isNewSession = false;
        const now = Date.now();

        try {
            visitorId = localStorage.getItem(VISITOR_KEY) || '';
            if (!visitorId) {
                visitorId = generateId('vis');
                localStorage.setItem(VISITOR_KEY, visitorId);
            }
        } catch (e) {
            visitorId = generateId('vis');
        }

        try {
            const existingSid = sessionStorage.getItem(SESSION_KEY) || '';
            const lastTs = Number(sessionStorage.getItem(SESSION_TS_KEY) || '0');
            if (existingSid && lastTs && (now - lastTs) < SESSION_TIMEOUT_MS) {
                sessionId = existingSid;
            } else {
                sessionId = generateId('ses');
                isNewSession = true;
                sessionStorage.setItem(SESSION_KEY, sessionId);
            }
            sessionStorage.setItem(SESSION_TS_KEY, String(now));
        } catch (e) {
            sessionId = generateId('ses');
            isNewSession = true;
        }

        return { visitorId, sessionId, isNewSession };
    }

    function sendPayload(payload) {
        if (typeof fetch !== 'function' || !window.location || !/^https?:$/i.test(window.location.protocol)) {
            return Promise.resolve({ ok: false, skipped: true });
        }
        return fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        })
            .then(r => r.json().catch(() => ({ ok: r.ok })))
            .catch(() => ({ ok: false }));
    }

    function trackEvent(eventType, extra) {
        if (isOptedOut()) return Promise.resolve({ ok: false, optedOut: true });
        const ctx = getOrCreateContext();
        const opts = extra || {};
        return sendPayload({
            eventId: opts.eventId || generateId('evt'),
            eventType: eventType || 'page_view',
            visitorId: ctx.visitorId,
            sessionId: ctx.sessionId,
            pagePath: opts.pagePath || (window.location ? window.location.pathname : '/'),
            referrer: typeof opts.referrer === 'string' ? opts.referrer : (document.referrer || ''),
            deviceCategory: getDeviceCategory(),
            downloadResource: opts.downloadResource || ''
        });
    }

    function identifyVisitor(details) {
        const ctx = getOrCreateContext();
        return sendPayload({
            action: 'identify',
            visitorId: ctx.visitorId,
            sessionId: ctx.sessionId,
            name: details && details.name ? details.name : '',
            email: details && details.email ? details.email : '',
            company: details && details.company ? details.company : '',
            source: (details && details.source) || 'resume_request'
        });
    }

    function initOptOutToggle() {
        const btn = document.getElementById('analyticsOptOutBtn');
        if (!btn) return;

        const syncLabel = () => {
            if (isDntEnabled()) {
                btn.textContent = 'Analytics paused (Do Not Track active)';
                btn.disabled = true;
                return;
            }
            const optedOut = isOptedOut();
            btn.textContent = optedOut ? 'Analytics: Opted Out (Enable)' : 'Opt Out of Analytics';
            btn.setAttribute('aria-pressed', String(optedOut));
        };

        syncLabel();
        btn.addEventListener('click', () => {
            const next = !isOptedOut();
            setOptOut(next);
            syncLabel();
        });
    }

    window.PortfolioAnalytics = {
        getContext: getOrCreateContext,
        generateId,
        isOptedOut,
        setOptOut,
        trackEvent,
        identifyVisitor
    };

    document.addEventListener('DOMContentLoaded', () => {
        initOptOutToggle();

        // Never track admin portal pages
        const pathname = (window.location && window.location.pathname) || '/';
        if (/^\/admin/i.test(pathname)) return;
        if (isOptedOut()) return;

        const ctx = getOrCreateContext();
        if (ctx.isNewSession) {
            trackEvent('session_start', { pagePath: pathname });
        }
        trackEvent('page_view', { pagePath: pathname });
    });
})();
