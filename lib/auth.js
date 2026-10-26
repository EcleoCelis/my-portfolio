'use strict';

const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'portfolio_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecretKey(env = process.env) {
    const secret = env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || '';
    return String(secret).trim();
}

function isAdminConfigured(env = process.env) {
    return Boolean(env.ADMIN_PASSWORD && String(env.ADMIN_PASSWORD).trim().length >= 8);
}

/**
 * Constant-time password comparison to prevent timing side-channel attacks.
 */
function verifyAdminPassword(candidatePassword, env = process.env) {
    if (!isAdminConfigured(env) || typeof candidatePassword !== 'string') return false;
    const expected = String(env.ADMIN_PASSWORD).trim();
    const a = Buffer.from(candidatePassword, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * Creates an HMAC-SHA256 signed session token containing expiration timestamp.
 */
function createSessionToken(env = process.env, now = Date.now()) {
    const secret = getSecretKey(env);
    if (!secret) throw new Error('ADMIN_NOT_CONFIGURED');
    const payload = Buffer.from(JSON.stringify({
        role: 'admin',
        iat: now,
        exp: now + SESSION_DURATION_MS
    }), 'utf8').toString('base64url');

    const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64url');

    return `${payload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token.
 */
function verifySessionToken(token, env = process.env, now = Date.now()) {
    const secret = getSecretKey(env);
    if (!secret || typeof token !== 'string' || !token.includes('.')) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;

    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return false;
    }

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (decoded.role !== 'admin' || typeof decoded.exp !== 'number') return false;
        return now < decoded.exp;
    } catch (e) {
        return false;
    }
}

function parseCookies(cookieHeader) {
    const cookies = {};
    if (typeof cookieHeader !== 'string' || !cookieHeader) return cookies;
    cookieHeader.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        cookies[k] = decodeURIComponent(v);
    });
    return cookies;
}

function isRequestAuthenticated(headers = {}, env = process.env) {
    const cookies = parseCookies(headers.cookie || headers.Cookie || '');
    const token = cookies[SESSION_COOKIE_NAME];
    if (token && verifySessionToken(token, env)) return true;

    const authHeader = String(headers.authorization || headers.Authorization || '');
    if (authHeader.startsWith('Bearer ')) {
        const bearerToken = authHeader.slice(7).trim();
        return verifySessionToken(bearerToken, env);
    }
    return false;
}

function buildSessionCookie(token, isProduction = false) {
    const maxAgeSec = Math.floor(SESSION_DURATION_MS / 1000);
    const secureFlag = isProduction ? '; Secure' : '';
    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secureFlag}`;
}

function buildClearSessionCookie() {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

module.exports = {
    SESSION_COOKIE_NAME,
    isAdminConfigured,
    verifyAdminPassword,
    createSessionToken,
    verifySessionToken,
    isRequestAuthenticated,
    buildSessionCookie,
    buildClearSessionCookie
};
