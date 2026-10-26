'use strict';

const db = require('../lib/db');

const ALLOWED_INQUIRY_TYPES = new Set([
    'job',
    'internship',
    'interview',
    'freelance',
    'technical',
    'general'
]);

const INQUIRY_TYPE_LABELS = {
    job: 'Job Opportunity',
    internship: 'Internship / OJT Opportunity',
    interview: 'Interview Invitation',
    freelance: 'Freelance / Project Collaboration',
    technical: 'Technical Discussion',
    general: 'General Professional Inquiry'
};

const MAX_BODY_BYTES = 16 * 1024; // 16 KB strict payload ceiling
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 submissions per IP per 15-minute window
const PROVIDER_TIMEOUT_MS = 8000;

// In-memory rate-limit store (IP -> { count, resetAt })
const rateLimitStore = new Map();

/**
 * Strips CR, LF, and control characters to prevent email header injection.
 */
function sanitizeSingleLine(value, maxLength = 160) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/[\r\n\x00-\x1F\x7F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

/**
 * Sanitizes multi-line plain text message body while preserving line breaks.
 */
function sanitizeMultiLine(value, maxLength = 4000) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '')
        .trim()
        .slice(0, maxLength);
}

function isValidEmail(email) {
    if (typeof email !== 'string' || email.length > 254) return false;
    if (/[\r\n\s]/.test(email)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Checks and updates rate limit for a client identifier (IP).
 */
function checkRateLimit(clientKey, now = Date.now()) {
    const key = clientKey || 'unknown';
    // Periodic cleanup of expired entries
    if (rateLimitStore.size > 1000) {
        for (const [k, v] of rateLimitStore.entries()) {
            if (now >= v.resetAt) rateLimitStore.delete(k);
        }
    }

    const entry = rateLimitStore.get(key);
    if (!entry || now >= entry.resetAt) {
        const record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
        rateLimitStore.set(key, record);
        return {
            allowed: true,
            remaining: RATE_LIMIT_MAX_REQUESTS - 1,
            retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
        };
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
        };
    }

    entry.count += 1;
    return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    };
}

function resetRateLimitStore() {
    rateLimitStore.clear();
}

/**
 * Validates and normalizes incoming contact payload.
 */
function validateContactPayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { valid: false, errors: { form: 'Request payload must be a JSON object.' } };
    }

    // Honeypot check: if bot filled the hidden "website" field, flag as honeypot
    const honeypot = typeof raw.website === 'string' ? raw.website.trim() : '';
    if (honeypot !== '') {
        return { valid: true, isSpamHoneypot: true, data: null };
    }

    const errors = {};
    const name = sanitizeSingleLine(raw.name, 120);
    const email = sanitizeSingleLine(raw.email, 254);
    const company = sanitizeSingleLine(raw.company || '', 120);
    const rawInquiryType = sanitizeSingleLine(raw.inquiryType || 'general', 40).toLowerCase();
    const inquiryType = ALLOWED_INQUIRY_TYPES.has(rawInquiryType) ? rawInquiryType : 'general';
    const rawSubject = sanitizeSingleLine(raw.subject || '', 160);
    const message = sanitizeMultiLine(raw.message, 4000);

    if (!name || name.length < 2) {
        errors.name = 'Full name is required (at least 2 characters).';
    }
    if (!email || !isValidEmail(email)) {
        errors.email = 'Please enter a valid work or personal email address.';
    }
    if (raw.inquiryType && !ALLOWED_INQUIRY_TYPES.has(rawInquiryType)) {
        errors.inquiryType = 'Please select a valid inquiry category.';
    }
    if (!message || message.length < 10) {
        errors.message = 'Please enter a message of at least 10 characters.';
    }

    const inquiryLabel = INQUIRY_TYPE_LABELS[inquiryType] || INQUIRY_TYPE_LABELS.general;
    const subject = rawSubject || `${inquiryLabel} from ${name}`;

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        isSpamHoneypot: false,
        data: {
            name,
            email,
            company,
            inquiryType,
            inquiryLabel,
            subject,
            message,
            submittedAt: new Date().toISOString()
        }
    };
}

/**
 * Formats plain-text email content safely (never injects untrusted HTML).
 */
function formatInquiryPlainText(data) {
    const lines = [
        'New Professional Portfolio Inquiry',
        '==================================',
        `Timestamp (UTC): ${data.submittedAt}`,
        `Sender Name:     ${data.name}`,
        `Reply-To Email:  ${data.email}`,
        `Organization:    ${data.company || 'Not specified'}`,
        `Inquiry Type:    ${data.inquiryLabel}`,
        `Subject:         ${data.subject}`,
        '----------------------------------',
        'Message:',
        data.message,
        '----------------------------------'
    ];
    return lines.join('\n');
}

/**
 * Dispatches validated inquiry via configured provider (Resend API or Web3Forms API).
 * Recipient is strictly controlled by server environment variables.
 */
async function dispatchEmailViaProvider(data, env = process.env, fetchImpl = globalThis.fetch) {
    const recipient = sanitizeSingleLine(env.CONTACT_RECIPIENT_EMAIL || 'jomaricelis22@gmail.com', 254);
    const resendApiKey = env.RESEND_API_KEY ? String(env.RESEND_API_KEY).trim() : '';
    const web3FormsKey = env.WEB3FORMS_ACCESS_KEY ? String(env.WEB3FORMS_ACCESS_KEY).trim() : '';
    const fromEmail = sanitizeSingleLine(
        env.CONTACT_FROM_EMAIL || 'Portfolio Inquiry <onboarding@resend.dev>',
        254
    );

    if (!resendApiKey && !web3FormsKey) {
        return {
            configured: false,
            delivered: false,
            provider: null,
            recipient,
            reason: 'EMAIL_PROVIDER_NOT_CONFIGURED'
        };
    }

    if (typeof fetchImpl !== 'function') {
        throw new Error('Server runtime does not support fetch.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    const plainTextBody = formatInquiryPlainText(data);

    try {
        if (resendApiKey) {
            const response = await fetchImpl('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: fromEmail,
                    to: [recipient],
                    reply_to: data.email,
                    subject: `[Portfolio - ${data.inquiryLabel}] ${data.subject}`,
                    text: plainTextBody
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Email provider rejected request with HTTP ${response.status}`);
            }

            const result = await response.json().catch(() => ({}));
            return {
                configured: true,
                delivered: true,
                provider: 'resend',
                providerReferenceId: result.id || null,
                recipient
            };
        }

        // Fallback to Web3Forms API if WEB3FORMS_ACCESS_KEY is configured
        const response = await fetchImpl('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                access_key: web3FormsKey,
                subject: `[Portfolio - ${data.inquiryLabel}] ${data.subject}`,
                from_name: data.name,
                email: data.email,
                company: data.company || 'Not specified',
                inquiry_type: data.inquiryLabel,
                message: plainTextBody
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Email provider rejected request with HTTP ${response.status}`);
        }

        return {
            configured: true,
            delivered: true,
            provider: 'web3forms',
            providerReferenceId: null,
            recipient
        };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Core HTTP request processor shared by local Node server and serverless handler.
 */
async function processContactRequest({ method, headers = {}, rawBody = '', clientIp = 'unknown', env = process.env, fetchImpl = globalThis.fetch }) {
    if (method === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: { 'Allow': 'POST, OPTIONS' },
            body: null
        };
    }

    if (method !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Allow': 'POST, OPTIONS' },
            body: {
                ok: false,
                code: 'METHOD_NOT_ALLOWED',
                message: 'Only POST requests are accepted by this endpoint.'
            }
        };
    }

    const contentType = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
    if (!contentType.includes('application/json')) {
        return {
            statusCode: 415,
            headers: {},
            body: {
                ok: false,
                code: 'UNSUPPORTED_MEDIA_TYPE',
                message: 'Content-Type must be application/json.'
            }
        };
    }

    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
        return {
            statusCode: 413,
            headers: {},
            body: {
                ok: false,
                code: 'PAYLOAD_TOO_LARGE',
                message: 'Request payload exceeds the 16 KB maximum size limit.'
            }
        };
    }

    const rateStatus = checkRateLimit(clientIp);
    if (!rateStatus.allowed) {
        return {
            statusCode: 429,
            headers: { 'Retry-After': String(rateStatus.retryAfterSeconds) },
            body: {
                ok: false,
                code: 'RATE_LIMITED',
                message: `Too many inquiries submitted recently. Please wait ${rateStatus.retryAfterSeconds} seconds or use the direct email link.`
            }
        };
    }

    let parsedBody;
    try {
        parsedBody = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch (e) {
        return {
            statusCode: 400,
            headers: {},
            body: {
                ok: false,
                code: 'INVALID_JSON',
                message: 'Malformed JSON request body.'
            }
        };
    }

    const validation = validateContactPayload(parsedBody);
    if (!validation.valid) {
        return {
            statusCode: 422,
            headers: {},
            body: {
                ok: false,
                code: 'VALIDATION_FAILED',
                message: 'Please correct the highlighted fields and try again.',
                errors: validation.errors
            }
        };
    }

    // If honeypot triggered, silently return 200 to bots without sending an email
    if (validation.isSpamHoneypot) {
        return {
            statusCode: 200,
            headers: {},
            body: {
                ok: true,
                status: 'accepted',
                message: 'Your inquiry has been submitted successfully. Thank you for reaching out.'
            }
        };
    }

    try {
        const dispatchResult = await dispatchEmailViaProvider(validation.data, env, fetchImpl);
        const dbResult = await db.saveContactInquiry(validation.data, dispatchResult);

        if (!dispatchResult.configured) {
            return {
                statusCode: 503,
                headers: {},
                body: {
                    ok: false,
                    code: 'PROVIDER_NOT_CONFIGURED',
                    savedToDatabase: Boolean(dbResult.saved),
                    recipient: dispatchResult.recipient,
                    message: dbResult.saved
                        ? 'Your inquiry was saved to the portfolio database, but direct email delivery is awaiting provider API key configuration. You can also send your pre-filled inquiry via your email application below.'
                        : 'Direct server email delivery is awaiting provider API key configuration. You can send your pre-filled inquiry immediately via your email application below.'
                }
            };
        }

        return {
            statusCode: 200,
            headers: {},
            body: {
                ok: true,
                status: 'submitted',
                provider: dispatchResult.provider,
                savedToDatabase: Boolean(dbResult.saved),
                message: 'Your inquiry has been submitted successfully. Thank you for reaching out.'
            }
        };
    } catch (err) {
        // Still attempt to persist inquiry to PostgreSQL even if upstream email provider failed
        const dbResult = await db.saveContactInquiry(validation.data, { delivered: false, provider: 'error' });
        // Log operational failure code without logging visitor PII or secrets
        console.error('[api/contact] Delivery provider error:', err && err.name ? err.name : 'UnknownError');
        const fallbackRecipient = sanitizeSingleLine(env.CONTACT_RECIPIENT_EMAIL || 'jomaricelis22@gmail.com', 254);
        return {
            statusCode: 502,
            headers: {},
            body: {
                ok: false,
                code: 'DELIVERY_FAILED',
                savedToDatabase: Boolean(dbResult.saved),
                recipient: fallbackRecipient,
                message: 'The email service could not process your inquiry at this moment. Your message has been preserved—please retry or open it in your email client below.'
            }
        };
    }
}

/**
 * Vercel / Node Serverless Function Entrypoint (`POST /api/contact`).
 */
async function handler(req, res) {
    const clientIp =
        (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
        (req.socket && req.socket.remoteAddress) ||
        'unknown';
    const normalizedIp = String(clientIp).split(',')[0].trim();

    let rawBody = '';
    if (req.body && typeof req.body === 'object') {
        rawBody = JSON.stringify(req.body);
    } else if (typeof req.body === 'string') {
        rawBody = req.body;
    } else {
        rawBody = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => {
                data += chunk;
                if (Buffer.byteLength(data, 'utf8') > MAX_BODY_BYTES + 1024) {
                    resolve(data);
                }
            });
            req.on('end', () => resolve(data));
            req.on('error', reject);
        });
    }

    const result = await processContactRequest({
        method: req.method,
        headers: req.headers,
        rawBody,
        clientIp: normalizedIp
    });

    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    for (const [k, v] of Object.entries(result.headers || {})) {
        res.setHeader(k, v);
    }
    res.end(result.body ? JSON.stringify(result.body) : '');
}

module.exports = handler;
module.exports.processContactRequest = processContactRequest;
module.exports.validateContactPayload = validateContactPayload;
module.exports.checkRateLimit = checkRateLimit;
module.exports.resetRateLimitStore = resetRateLimitStore;
module.exports.sanitizeSingleLine = sanitizeSingleLine;
module.exports.MAX_BODY_BYTES = MAX_BODY_BYTES;
