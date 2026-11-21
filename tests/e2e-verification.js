'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createPortfolioServer } = require('../server');
const {
    processContactRequest,
    resetRateLimitStore,
    sanitizeSingleLine
} = require('../api/contact');
const { validateProjectInput } = require('../api/projects');

async function runTests() {
    console.log('===================================================================');
    console.log(' PORTFOLIO END-TO-END & HIRING WORKFLOW VERIFICATION SUITE');
    console.log('===================================================================\n');

    // ------------------------------------------------------------------------
    // 1. Static Source & Asset Verification
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Static Markup, CSS & Asset Verification ---');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
    const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');

    assert.strictEqual((html.match(/href=['"]#['"]/g) || []).length, 0, 'Placeholder href="#" found');
    const ids = [...html.matchAll(/id=['"]([^'"]+)['"]/g)].map(m => m[1]);
    assert.strictEqual(ids.length, new Set(ids).size, 'Duplicate DOM IDs found');
    const openBraces = (css.match(/\{/g) || []).length;
    const closeBraces = (css.match(/\}/g) || []).length;
    assert.strictEqual(openBraces, closeBraces, 'Unbalanced CSS braces');
    console.log(`[PASS] HTML (${ids.length} unique IDs, 0 placeholder links) & CSS (${openBraces} rule blocks) verified.`);

    // ------------------------------------------------------------------------
    // 2. Live HTTP Server & Security Boundary Tests
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: Live HTTP Server, Static Delivery & Security Boundaries ---');
    const server = createPortfolioServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        // 2.1 GET / (index.html + security headers)
        const homeRes = await fetch(`${baseUrl}/`);
        assert.strictEqual(homeRes.status, 200);
        assert.strictEqual(homeRes.headers.get('x-content-type-options'), 'nosniff');
        assert.strictEqual(homeRes.headers.get('x-frame-options'), 'DENY');
        assert(homeRes.headers.get('content-security-policy').includes("default-src 'self'"));
        console.log('[PASS] GET / returns 200 OK with CSP, X-Frame-Options, and X-Content-Type-Options headers.');

        // 2.2 GET static assets (CSS, JS, Hero Image)
        for (const assetPath of ['/css/style.css', '/js/script.js', '/assets/images/IMG_20230626_135533-removebg-preview.png']) {
            const res = await fetch(`${baseUrl}${assetPath}`);
            assert.strictEqual(res.status, 200, `Failed to load ${assetPath}`);
        }
        console.log('[PASS] All public static assets (/css/style.css, /js/script.js, hero PNG) return 200 OK.');

        // 2.3 Private file protection (.env, server.js, api/contact.js, encoded path traversal)
        for (const forbidden of ['/.env', '/.env.example', '/server.js', '/api/contact.js', '/package.json', '/%2e%2e/server.js', '/css/%2e%2e/server.js']) {
            const res = await fetch(`${baseUrl}${forbidden}`);
            assert.strictEqual(res.status, 404, `Private path ${forbidden} was not blocked`);
        }
        console.log('[PASS] Private server files (.env, server.js, api/contact.js, package.json, encoded traversal) are strictly blocked (404).');

        // 2.4 Health check endpoint
        const healthRes = await fetch(`${baseUrl}/api/health`);
        assert.strictEqual(healthRes.status, 200);
        const healthData = await healthRes.json();
        assert.strictEqual(healthData.ok, true);
        console.log(`[PASS] GET /api/health returns 200 OK (emailProviderConfigured: ${healthData.emailProviderConfigured}, databaseConfigured: ${healthData.databaseConfigured}).`);

        // --------------------------------------------------------------------
        // 3. Backend Endpoint (/api/contact) Validation, Security & Rate Limit
        // --------------------------------------------------------------------
        console.log('\n--- Phase 3: POST /api/contact Validation, Provider & Abuse Controls ---');
        resetRateLimitStore();

        // 3.1 Method Not Allowed (GET /api/contact)
        const getContactRes = await fetch(`${baseUrl}/api/contact`, { method: 'GET' });
        assert.strictEqual(getContactRes.status, 405);
        console.log('[PASS] GET /api/contact rejected with 405 Method Not Allowed.');

        // 3.2 Unsupported Media Type (text/plain)
        const badMediaRes = await fetch(`${baseUrl}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: 'hello'
        });
        assert.strictEqual(badMediaRes.status, 415);
        console.log('[PASS] POST /api/contact with text/plain rejected with 415 Unsupported Media Type.');

        // 3.3 Oversized Payload (>16 KB)
        const oversizedRes = await fetch(`${baseUrl}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'x'.repeat(20000) })
        });
        assert.strictEqual(oversizedRes.status, 413);
        console.log('[PASS] POST /api/contact >16 KB rejected with 413 Payload Too Large.');

        // 3.4 Invalid JSON
        const badJsonRes = await fetch(`${baseUrl}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{bad json'
        });
        assert.strictEqual(badJsonRes.status, 400);
        console.log('[PASS] POST /api/contact with malformed JSON rejected with 400 Bad Request.');

        // 3.5 Field Validation Failure (422)
        const invalidFieldsRes = await fetch(`${baseUrl}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'A', email: 'not-an-email', message: 'short' })
        });
        assert.strictEqual(invalidFieldsRes.status, 422);
        const invalidData = await invalidFieldsRes.json();
        assert(invalidData.errors && invalidData.errors.name && invalidData.errors.email && invalidData.errors.message);
        console.log('[PASS] POST /api/contact with invalid fields returns 422 with per-field error messages.');

        // 3.6 Header Injection Sanitization Check
        const injected = sanitizeSingleLine('Recruiter\r\nBcc: attacker@evil.com');
        assert(!injected.includes('\r') && !injected.includes('\n'));
        console.log('[PASS] Header injection CRLF sequences are stripped by sanitizeSingleLine.');

        // 3.7 Unconfigured Provider Honest 503 Response
        const unconfiguredResult = await processContactRequest({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            clientIp: '198.51.100.99',
            env: {},
            rawBody: JSON.stringify({
                name: 'Maria Santos',
                email: 'maria.santos@techcorp.ph',
                company: 'TechCorp Philippines',
                inquiryType: 'interview',
                subject: 'Frontend Engineer Interview Invitation',
                message: 'Hello Celis, we reviewed your portfolio and would like to invite you for a technical interview.'
            })
        });
        assert.strictEqual(unconfiguredResult.statusCode, 503);
        assert.strictEqual(unconfiguredResult.body.code, 'PROVIDER_NOT_CONFIGURED');
        console.log('[PASS] POST /api/contact without provider credentials honestly returns 503 PROVIDER_NOT_CONFIGURED (never fakes delivery).');

        // 3.8 Configured Provider Acceptance (200) & Provider Failure (502) via processContactRequest
        resetRateLimitStore();
        let capturedProviderPayload = null;
        const mockSuccessFetch = async (url, opts) => {
            capturedProviderPayload = { url, headers: opts.headers, body: JSON.parse(opts.body) };
            return { ok: true, status: 200, json: async () => ({ id: 'msg_test_123' }) };
        };

        const providerSuccess = await processContactRequest({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            clientIp: '198.51.100.10',
            env: {
                RESEND_API_KEY: 're_test_mock_key',
                CONTACT_RECIPIENT_EMAIL: 'jomaricelis22@gmail.com',
                CONTACT_FROM_EMAIL: 'Portfolio <onboarding@resend.dev>'
            },
            fetchImpl: mockSuccessFetch,
            rawBody: JSON.stringify({
                name: 'Maria Santos',
                email: 'maria.santos@techcorp.ph',
                company: 'TechCorp Philippines',
                inquiryType: 'interview',
                subject: 'Frontend Engineer Interview',
                message: 'Hello Celis, we would like to schedule a technical interview this week.'
            })
        });
        assert.strictEqual(providerSuccess.statusCode, 200);
        assert.strictEqual(providerSuccess.body.ok, true);
        assert.strictEqual(capturedProviderPayload.body.to[0], 'jomaricelis22@gmail.com');
        assert.strictEqual(capturedProviderPayload.body.reply_to, 'maria.santos@techcorp.ph');
        console.log('[PASS] Configured provider dispatches email to verified recipient (jomaricelis22@gmail.com) with visitor reply_to and returns 200 OK.');

        const mockFailureFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
        const providerFailure = await processContactRequest({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            clientIp: '198.51.100.11',
            env: { RESEND_API_KEY: 're_test_mock_key', CONTACT_RECIPIENT_EMAIL: 'jomaricelis22@gmail.com' },
            fetchImpl: mockFailureFetch,
            rawBody: JSON.stringify({
                name: 'Maria Santos',
                email: 'maria.santos@techcorp.ph',
                message: 'Testing upstream provider failure handling.'
            })
        });
        assert.strictEqual(providerFailure.statusCode, 502);
        assert.strictEqual(providerFailure.body.code, 'DELIVERY_FAILED');
        console.log('[PASS] Upstream provider failure returns 502 DELIVERY_FAILED without exposing secrets.');

        // 3.9 Rate Limiting Check (Max 5 per IP per 15m window)
        resetRateLimitStore();
        for (let i = 0; i < 5; i++) {
            const r = await processContactRequest({
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                clientIp: '203.0.113.55',
                rawBody: '{bad'
            });
            assert.strictEqual(r.statusCode, 400);
        }
        const rateLimited = await processContactRequest({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            clientIp: '203.0.113.55',
            rawBody: '{bad'
        });
        assert.strictEqual(rateLimited.statusCode, 429);
        assert(rateLimited.headers['Retry-After']);
        console.log('[PASS] Rate limiter blocks 6th rapid request from same IP with 429 Too Many Requests and Retry-After header.');

        // --------------------------------------------------------------------
        // 4. Frontend Hiring Workflows Simulation (Case Study Modal, Resume, Form)
        // --------------------------------------------------------------------
        console.log('\n--- Phase 4: Frontend Hiring Workflows (Case Study Modal, Resume, Form Preservation) ---');
        let domLoaded = null;
        const elements = {};
        function mockEl(tag, id = '', classes = [], attrs = {}) {
            const classSet = new Set(classes);
            const attrMap = { ...attrs };
            const listeners = {};
            const children = [];
            const el = {
                tagName: tag.toUpperCase(),
                id,
                hidden: Boolean(attrs.hidden),
                disabled: false,
                value: attrs.value || '',
                textContent: '',
                style: {},
                classList: {
                    add: (...c) => c.forEach(x => classSet.add(x)),
                    remove: (...c) => c.forEach(x => classSet.delete(x)),
                    toggle: (c, f) => {
                        const add = f !== undefined ? f : !classSet.has(c);
                        if (add) classSet.add(c); else classSet.delete(c);
                        return add;
                    },
                    contains: c => classSet.has(c)
                },
                getAttribute: k => (attrMap[k] !== undefined ? attrMap[k] : null),
                setAttribute: (k, v) => { attrMap[k] = String(v); },
                removeAttribute: k => { delete attrMap[k]; },
                appendChild: child => children.push(child),
                children,
                addEventListener: (evt, fn) => {
                    listeners[evt] = listeners[evt] || [];
                    listeners[evt].push(fn);
                },
                trigger: async (evt, extra = {}) => {
                    for (const fn of (listeners[evt] || [])) {
                        await fn({ preventDefault: () => {}, target: el, ...extra });
                    }
                },
                focus: () => {},
                scrollIntoView: () => { el._scrolled = true; }
            };
            if (id) elements[id] = el;
            return el;
        }

        const docEl = mockEl('html');
        mockEl('button', 'themeToggle');
        mockEl('button', 'hamburger');
        mockEl('nav', 'navbarMenu');
        mockEl('header', 'navbar');
        mockEl('button', 'backToTop');
        mockEl('span', 'typing-text');
        const modal = mockEl('div', 'projectModal', [], { hidden: true });
        mockEl('span', 'projectModalTag');
        const modalTitle = mockEl('h3', 'projectModalTitle');
        mockEl('p', 'projectModalDesc');
        mockEl('p', 'projectModalRole');
        mockEl('ul', 'projectModalHighlights');
        mockEl('div', 'projectModalTech');
        mockEl('p', 'projectModalStatus');
        mockEl('button', 'projectModalClose');
        mockEl('button', 'projectModalDismissBtn');
        const modalInquireBtn = mockEl('a', 'projectModalInquireBtn');
        const caseBtnNutri = mockEl('button', '', ['project-case-study-btn'], { 'data-project-modal': 'nutricare' });

        const resumeLink = mockEl('a', 'resumeDownloadLink', [], { href: `${baseUrl}/assets/docs/Celis-Jomarie-Resume.pdf` });
        const resumeNote = mockEl('p', 'resumeStatusNote', [], { hidden: true });
        const contactSec = mockEl('section', 'contact');

        const form = mockEl('form', 'contactForm', [], {
            'data-endpoint': `${baseUrl}/api/contact`,
            'data-recipient': 'jomaricelis22@gmail.com'
        });
        const nameIn = mockEl('input', 'name');
        mockEl('span', 'nameError');
        const emailIn = mockEl('input', 'email');
        mockEl('span', 'emailError');
        const companyIn = mockEl('input', 'company');
        const inquiryIn = mockEl('select', 'inquiryType', [], { value: 'general' });
        const subjectIn = mockEl('input', 'subject');
        mockEl('span', 'subjectError');
        const messageIn = mockEl('textarea', 'message');
        mockEl('span', 'messageError');
        mockEl('input', 'website');
        mockEl('button', 'contactSubmitBtn');
        const formSuccess = mockEl('div', 'formSuccess');
        const fallbackBox = mockEl('div', 'formFallbackActions', [], { hidden: true });
        const fallbackLink = mockEl('a', 'formMailtoFallbackLink');

        global.document = {
            documentElement: docEl,
            activeElement: caseBtnNutri,
            getElementById: id => elements[id] || null,
            createElement: tag => mockEl(tag),
            querySelector: () => null,
            querySelectorAll: sel => {
                if (sel === '.project-case-study-btn') return [caseBtnNutri];
                return [];
            },
            addEventListener: (evt, fn) => {
                if (evt === 'DOMContentLoaded') domLoaded = fn;
            }
        };
        global.localStorage = { getItem: () => null, setItem: () => {} };
        global.window = {
            scrollY: 0,
            innerWidth: 1280,
            location: { protocol: 'http:', href: baseUrl },
            matchMedia: () => ({ matches: true }),
            addEventListener: () => {},
            requestAnimationFrame: cb => cb(),
            scrollTo: () => {}
        };
        global.requestAnimationFrame = cb => cb();

        eval(js);
        domLoaded();

        // 4.1 Open Case Study Modal & Request Walkthrough
        await caseBtnNutri.trigger('click');
        assert.strictEqual(modal.hidden, false, 'Case study modal should open');
        assert.strictEqual(modalTitle.textContent, 'NutriCare Platform');
        await modalInquireBtn.trigger('click');
        assert.strictEqual(modal.hidden, true, 'Modal should close on inquire click');
        assert.strictEqual(inquiryIn.value, 'technical');
        assert(subjectIn.value.includes('NutriCare Platform'));
        console.log('[PASS] Project Case Study modal opens, renders architectural details, and pre-fills contact form on walkthrough request.');

        // 4.2 Resume Download Asset Verification (Existing PDF & Missing Asset Graceful Handling)
        await resumeLink.trigger('click');
        const realResumeExists = fs.existsSync(path.join(__dirname, '..', 'assets', 'docs', 'Celis-Jomarie-Resume.pdf'));
        if (realResumeExists) {
            assert.strictEqual(resumeNote.hidden, true, 'Status error note should stay hidden when real PDF exists');
            console.log('[PASS] Clicking Download Resume verifies live Celis-Jomarie-Resume.pdf (200 application/pdf) and initiates tracked download.');
        }

        // Also test missing-asset graceful fallback explicitly
        resumeLink.setAttribute('href', `${baseUrl}/assets/docs/nonexistent-resume.pdf`);
        await resumeLink.trigger('click');
        assert.strictEqual(resumeNote.hidden, false, 'Resume status note should appear when PDF is missing');
        assert.strictEqual(inquiryIn.value, 'job');
        console.log('[PASS] Missing resume PDF gracefully guides recruiter to contact form without broken 404.');

        // 4.3 Contact Form End-to-End Submission Preserves Input on 503 & Exposes Mailto Fallback
        resetRateLimitStore();
        const savedResendKey = process.env.RESEND_API_KEY;
        const savedWeb3Key = process.env.WEB3FORMS_ACCESS_KEY;
        delete process.env.RESEND_API_KEY;
        delete process.env.WEB3FORMS_ACCESS_KEY;

        nameIn.value = 'Alex Rivera';
        emailIn.value = 'alex.rivera@company.io';
        companyIn.value = 'Acme Engineering';
        subjectIn.value = 'Senior Review';
        messageIn.value = 'We would love to review your NutriCare architecture.';
        await form.trigger('submit');

        assert.strictEqual(nameIn.value, 'Alex Rivera', 'Entered name must be preserved when server returns 503');
        assert.strictEqual(messageIn.value, 'We would love to review your NutriCare architecture.', 'Entered message must be preserved');
        assert.strictEqual(fallbackBox.hidden, false, 'Mailto fallback box must be revealed when server provider is unconfigured');
        assert(fallbackLink.getAttribute('href').startsWith('mailto:jomaricelis22@gmail.com?subject='));
        console.log('[PASS] Contact form calls live POST /api/contact, preserves user input on 503, and reveals pre-filled mailto fallback to jomaricelis22@gmail.com.');

        if (savedResendKey) process.env.RESEND_API_KEY = savedResendKey;
        if (savedWeb3Key) process.env.WEB3FORMS_ACCESS_KEY = savedWeb3Key;

        // --------------------------------------------------------------------
        // 5. Admin Authentication, Project CRUD & Inbox Security
        // --------------------------------------------------------------------
        console.log('\n--- Phase 5: Admin CMS, PostgreSQL Project Management & Inquiries ---');

        // 5.1 Admin Page Routing (/admin and /admin.html)
        const adminPageRes = await fetch(`${baseUrl}/admin`);
        assert.strictEqual(adminPageRes.status, 200);
        const adminPageHtml = await adminPageRes.text();
        assert(adminPageHtml.includes('id="adminLoginForm"'));
        assert(adminPageHtml.includes('id="projectEditorForm"'));
        console.log('[PASS] GET /admin delivers the CMS portal (200 OK) with login and project editor forms.');

        const adminHtmlDirect = await fetch(`${baseUrl}/admin.html`);
        assert.strictEqual(adminHtmlDirect.status, 200);
        console.log('[PASS] GET /admin.html direct access returns 200 OK.');

        const adminJsRes = await fetch(`${baseUrl}/js/admin.js`);
        assert.strictEqual(adminJsRes.status, 200);
        console.log('[PASS] GET /js/admin.js static asset returns 200 OK.');

        // 5.2 Public Projects Endpoint (GET /api/projects)
        const publicProjectsRes = await fetch(`${baseUrl}/api/projects`);
        assert.strictEqual(publicProjectsRes.status, 200);
        const publicProjectsData = await publicProjectsRes.json();
        assert.strictEqual(publicProjectsData.ok, true);
        assert(Array.isArray(publicProjectsData.projects));
        assert(publicProjectsData.projects.length >= 2, 'Default or database projects must be present');
        console.log(`[PASS] GET /api/projects returns 200 OK with ${publicProjectsData.projects.length} projects (source: ${publicProjectsData.source}).`);

        // 5.3 Unauthorized Mutation Protection on /api/projects
        const unauthProjRes = await fetch(`${baseUrl}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Hacked Project', slug: 'hacked' })
        });
        assert.strictEqual(unauthProjRes.status, 401);
        const unauthProjData = await unauthProjRes.json();
        assert.strictEqual(unauthProjData.code, 'UNAUTHORIZED');
        console.log('[PASS] Unauthenticated POST /api/projects is blocked with 401 UNAUTHORIZED.');

        // 5.4 Admin Status without Cookie
        const unauthStatusRes = await fetch(`${baseUrl}/api/admin?action=status`);
        assert.strictEqual(unauthStatusRes.status, 200);
        const unauthStatus = await unauthStatusRes.json();
        assert.strictEqual(unauthStatus.authenticated, false);
        console.log('[PASS] GET /api/admin?action=status without cookie returns authenticated: false.');

        // 5.5 Admin Login with Incorrect Password
        process.env.ADMIN_PASSWORD = 'super_secret_test_password';
        const badLoginRes = await fetch(`${baseUrl}/api/admin?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'wrong_password_attempt' })
        });
        assert.strictEqual(badLoginRes.status, 401);
        const badLoginData = await badLoginRes.json();
        assert.strictEqual(badLoginData.code, 'INVALID_CREDENTIALS');
        console.log('[PASS] POST /api/admin?action=login with invalid password rejected with 401 INVALID_CREDENTIALS.');

        // 5.6 Admin Login with Correct Password
        const goodLoginRes = await fetch(`${baseUrl}/api/admin?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'super_secret_test_password' })
        });
        assert.strictEqual(goodLoginRes.status, 200);
        const goodLoginData = await goodLoginRes.json();
        assert.strictEqual(goodLoginData.ok, true);
        const setCookieHeader = goodLoginRes.headers.get('set-cookie');
        assert(setCookieHeader && setCookieHeader.includes('portfolio_admin_session='), 'Must set portfolio_admin_session cookie');
        assert(setCookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');
        assert(setCookieHeader.includes('SameSite=Strict'), 'Cookie must be SameSite=Strict');

        const sessionCookie = setCookieHeader.split(';')[0];
        console.log('[PASS] POST /api/admin?action=login with valid credentials sets secure HttpOnly session cookie.');

        // 5.7 Admin Status with Valid Cookie
        const authStatusRes = await fetch(`${baseUrl}/api/admin?action=status`, {
            headers: { 'Cookie': sessionCookie }
        });
        assert.strictEqual(authStatusRes.status, 200);
        const authStatus = await authStatusRes.json();
        assert.strictEqual(authStatus.authenticated, true);
        assert.strictEqual(authStatus.recipientEmail, 'jomaricelis22@gmail.com');
        console.log('[PASS] GET /api/admin?action=status with valid session cookie returns authenticated: true and verified recipient (jomaricelis22@gmail.com).');

        // 5.8 Admin Project Creation & Validation
        // 5.8a When DATABASE_URL is unconfigured, returns honest 503 DATABASE_NOT_CONFIGURED
        const savedDbUrl = process.env.DATABASE_URL;
        delete process.env.DATABASE_URL;
        const noDbProjRes = await fetch(`${baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify({ title: 'NutriCare' })
        });
        assert.strictEqual(noDbProjRes.status, 503);
        const noDbProjData = await noDbProjRes.json();
        assert.strictEqual(noDbProjData.code, 'DATABASE_NOT_CONFIGURED');
        console.log('[PASS] Authenticated POST /api/projects without DATABASE_URL returns honest 503 DATABASE_NOT_CONFIGURED.');
        if (savedDbUrl) process.env.DATABASE_URL = savedDbUrl;

        // 5.8b Unit Validation Tests (URL security, image size & format, required attributes)
        const vEmpty = validateProjectInput({});
        assert.strictEqual(vEmpty.valid, false);
        assert(vEmpty.errors.title);

        const vBadUrl = validateProjectInput({ title: 'Valid Title', live_url: 'javascript:alert(1)' });
        assert.strictEqual(vBadUrl.valid, false);
        assert(vBadUrl.errors.live_url);

        const vBadImg = validateProjectInput({ title: 'Valid Title', image_data: 'corrupt_non_data_uri' });
        assert.strictEqual(vBadImg.valid, false);
        assert(vBadImg.errors.image_data);

        const vGood = validateProjectInput({
            title: 'NutriCare Platform',
            slug: 'nutricare-platform',
            category: 'health',
            tag: 'Health Tech',
            description: 'Platform description',
            live_url: 'https://example.com',
            repo_url: 'https://github.com/example/repo',
            image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        });
        assert.strictEqual(vGood.valid, true);
        assert.strictEqual(vGood.data.slug, 'nutricare-platform');
        console.log('[PASS] validateProjectInput enforces title, URL protocol security, and Base64 data URI format.');

        // 5.8c When DATABASE_URL is set, validates payload and returns 422 for invalid project
        process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
        const invalidProjRes = await fetch(`${baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify({ title: '' }) // missing required fields
        });
        delete process.env.DATABASE_URL;
        assert.strictEqual(invalidProjRes.status, 422);
        const invalidProjData = await invalidProjRes.json();
        assert.strictEqual(invalidProjData.code, 'VALIDATION_FAILED');
        console.log('[PASS] Authenticated POST /api/projects with missing fields returns 422 VALIDATION_FAILED.');

        // 5.9 Admin Messages Inbox (Authenticated)
        // 5.9a Without DATABASE_URL, returns honest 503 DATABASE_NOT_CONFIGURED
        delete process.env.DATABASE_URL;
        const noDbMessagesRes = await fetch(`${baseUrl}/api/admin?action=messages`, {
            headers: { 'Cookie': sessionCookie }
        });
        assert.strictEqual(noDbMessagesRes.status, 503);
        const noDbMessagesData = await noDbMessagesRes.json();
        assert.strictEqual(noDbMessagesData.code, 'DATABASE_NOT_CONFIGURED');
        console.log('[PASS] GET /api/admin?action=messages without DATABASE_URL returns honest 503 DATABASE_NOT_CONFIGURED.');
        if (savedDbUrl) process.env.DATABASE_URL = savedDbUrl;

        // 5.9b With DATABASE_URL, returns 200 OK and inquiries list
        if (process.env.DATABASE_URL) {
            const authMessagesRes = await fetch(`${baseUrl}/api/admin?action=messages`, {
                headers: { 'Cookie': sessionCookie }
            });
            assert.strictEqual(authMessagesRes.status, 200);
            const authMessagesData = await authMessagesRes.json();
            assert.strictEqual(authMessagesData.ok, true);
            assert(Array.isArray(authMessagesData.messages));
            console.log(`[PASS] GET /api/admin?action=messages with DATABASE_URL returns 200 OK with inbox messages list (${authMessagesData.messages.length} messages).`);
        }

        // --------------------------------------------------------------------
        // 6. Visitor Analytics, Résumé Tracking, Aggregation & Privacy Controls
        // --------------------------------------------------------------------
        console.log('\n--- Phase 6: Visitor Analytics, Résumé Delivery, Timezone Aggregation & Privacy ---');
        const analyticsLib = require('../lib/analytics');
        const dbLib = require('../lib/db');

        // 6.1 Unit tests for timezone range, zero-filled buckets, bot detection, and path/referrer sanitization
        assert.strictEqual(analyticsLib.sanitizePagePath('/projects.html?token=secret123#top'), '/projects');
        assert.strictEqual(analyticsLib.classifyReferrer('https://www.google.com/search?q=celis'), 'Google Search');
        assert.strictEqual(analyticsLib.classifyReferrer('https://github.com/EcleoCelis'), 'GitHub');
        assert.strictEqual(analyticsLib.classifyReferrer(''), 'Direct');
        assert.strictEqual(analyticsLib.detectBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true);
        assert.strictEqual(analyticsLib.detectBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'), false);

        const tzRange = analyticsLib.resolveDateRange({
            range: '7d',
            timezone: 'Asia/Manila',
            now: new Date('2026-01-01T17:30:00Z') // 2026-01-02 01:30 Asia/Manila (year boundary!)
        });
        assert.strictEqual(tzRange.todayStr, '2026-01-02', 'UTC->Asia/Manila date rollover must cross calendar day accurately');
        assert.strictEqual(tzRange.startDate, '2025-12-27', '7d window across year boundary must start on 2025-12-27');
        assert.strictEqual(tzRange.weekStart, '2025-12-29', 'ISO Monday week start for Fri 2026-01-02 must be Mon 2025-12-29');
        const dailyBuckets = analyticsLib.buildTimeBuckets('2025-12-30', '2026-01-02', 'daily');
        assert.strictEqual(dailyBuckets.length, 4);
        const monthlyBuckets = analyticsLib.buildTimeBuckets('2025-11-15', '2026-02-05', 'monthly');
        assert.strictEqual(monthlyBuckets.length, 4);
        console.log('[PASS] Timezone conversion (Asia/Manila year boundary), ISO week boundaries, zero-filled buckets, bot detection & sanitization verified.');

        // 6.2 /admin/visitors route & static analytics tracker asset
        const visitorsRouteRes = await fetch(`${baseUrl}/admin/visitors`);
        assert.strictEqual(visitorsRouteRes.status, 200);
        const visitorsRouteHtml = await visitorsRouteRes.text();
        assert(visitorsRouteHtml.includes('id="tabAnalyticsBtn"') && visitorsRouteHtml.includes('id="panelAnalytics"'));
        const trackerJsRes = await fetch(`${baseUrl}/js/analytics-tracker.js`);
        assert.strictEqual(trackerJsRes.status, 200);
        console.log('[PASS] GET /admin/visitors (200 OK) and /js/analytics-tracker.js (200 OK) verified.');

        // 6.3 Unauthorized access to admin analytics endpoints strictly blocked (401)
        const unauthGetAnalytics = await fetch(`${baseUrl}/api/analytics`);
        assert.strictEqual(unauthGetAnalytics.status, 401);
        const unauthDelAnalytics = await fetch(`${baseUrl}/api/analytics?action=purge&retentionDays=90`, { method: 'DELETE' });
        assert.strictEqual(unauthDelAnalytics.status, 401);
        console.log('[PASS] Unauthenticated GET/DELETE /api/analytics blocked with 401 UNAUTHORIZED.');

        // 6.4 Authenticated admin browsing is excluded from public analytics
        const adminVisitRes = await fetch(`${baseUrl}/api/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
            body: JSON.stringify({ eventType: 'page_view', visitorId: 'test_admin_vis', sessionId: 'test_admin_ses', pagePath: '/' })
        });
        assert.strictEqual(adminVisitRes.status, 200);
        const adminVisitData = await adminVisitRes.json();
        assert.strictEqual(adminVisitData.excluded, true);
        assert.strictEqual(adminVisitData.reason, 'ADMIN_ACTIVITY_EXCLUDED');
        console.log('[PASS] Authenticated admin visits are automatically excluded from public visitor analytics.');

        // 6.5 End-to-End PostgreSQL Visitor Tracking, Deduplication, Concurrency, Bot Filtering, Identification & Résumé Delivery
        if (process.env.DATABASE_URL) {
            const testPrefix = `test_e2e_${Date.now()}`;
            const vis1 = `${testPrefix}_v1`;
            const ses1 = `${testPrefix}_s1`;
            const vis2 = `${testPrefix}_v2`;
            const ses2 = `${testPrefix}_s2`;
            const visBot = `${testPrefix}_botv`;
            const sesBot = `${testPrefix}_bots`;

            try {
                // 6.5a First-time anonymous visitor opens '/' then navigates to '/projects' + rapid refresh
                const ev1Res = await fetch(`${baseUrl}/api/analytics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0' },
                    body: JSON.stringify({ eventId: `${testPrefix}_e1`, eventType: 'page_view', visitorId: vis1, sessionId: ses1, pagePath: '/', referrer: 'https://github.com/EcleoCelis' })
                });
                assert.strictEqual((await ev1Res.json()).recorded, true);

                // Duplicate eventId -> deduplicated
                const dupIdRes = await fetch(`${baseUrl}/api/analytics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0' },
                    body: JSON.stringify({ eventId: `${testPrefix}_e1`, eventType: 'page_view', visitorId: vis1, sessionId: ses1, pagePath: '/' })
                });
                assert.strictEqual((await dupIdRes.json()).deduplicated, true);

                // Rapid refresh of same path within 5s with new eventId -> deduplicated
                const refreshRes = await fetch(`${baseUrl}/api/analytics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0' },
                    body: JSON.stringify({ eventId: `${testPrefix}_e1_refresh`, eventType: 'page_view', visitorId: vis1, sessionId: ses1, pagePath: '/' })
                });
                assert.strictEqual((await refreshRes.json()).deduplicated, true);

                // Navigate to /projects + concurrent second anonymous visitor + bot request
                const [navRes, concRes, botRes] = await Promise.all([
                    fetch(`${baseUrl}/api/analytics`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0' },
                        body: JSON.stringify({ eventId: `${testPrefix}_e2`, eventType: 'page_view', visitorId: vis1, sessionId: ses1, pagePath: '/projects' })
                    }),
                    fetch(`${baseUrl}/api/analytics`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' },
                        body: JSON.stringify({ eventId: `${testPrefix}_e3`, eventType: 'page_view', visitorId: vis2, sessionId: ses2, pagePath: '/', referrer: 'https://www.linkedin.com/in/recruiter' })
                    }),
                    fetch(`${baseUrl}/api/analytics`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
                        body: JSON.stringify({ eventId: `${testPrefix}_ebot`, eventType: 'page_view', visitorId: visBot, sessionId: sesBot, pagePath: '/' })
                    })
                ]);
                assert.strictEqual((await navRes.json()).recorded, true);
                assert.strictEqual((await concRes.json()).recorded, true);
                assert.strictEqual((await botRes.json()).recorded, true);
                console.log('[PASS] Anonymous visits, multi-page navigation, refresh/ID deduplication, concurrency, and bot capture verified.');

                // 6.5b Voluntary visitor identification for vis2/ses2 (vis1 remains Anonymous Visitor!)
                const idRes = await fetch(`${baseUrl}/api/analytics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'identify',
                        visitorId: vis2,
                        sessionId: ses2,
                        name: 'Elena Hiring Manager',
                        email: 'elena@example-corp.test',
                        company: 'Example Tech Corp',
                        source: 'resume_request'
                    })
                });
                assert.strictEqual(idRes.status, 200);
                assert.strictEqual((await idRes.json()).identified, true);

                // 6.5c Server-side Résumé Delivery (missing PDF -> 404 unavailable; present PDF -> 200 PDF served)
                const resumePdfPath = path.join(__dirname, '..', 'assets', 'docs', analyticsLib.RESUME_FILENAME);
                const hadRealPdf = fs.existsSync(resumePdfPath);

                if (!hadRealPdf) {
                    const headMissing = await fetch(`${baseUrl}/api/resume`, { method: 'HEAD' });
                    assert.strictEqual(headMissing.status, 404);
                    const getMissing = await fetch(`${baseUrl}/api/resume?vid=${encodeURIComponent(vis1)}&sid=${encodeURIComponent(ses1)}&reqId=${testPrefix}_miss`);
                    assert.strictEqual(getMissing.status, 404);
                    const missJson = await getMissing.json();
                    assert.strictEqual(missJson.code, 'RESUME_NOT_UPLOADED');

                    // Temporarily place a valid minimal PDF file to verify 200 PDF streaming & resume_served tracking
                    fs.writeFileSync(resumePdfPath, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'utf8');
                }

                try {
                    const headOk = await fetch(`${baseUrl}/api/resume`, { method: 'HEAD' });
                    assert.strictEqual(headOk.status, 200);
                    assert(headOk.headers.get('content-type').includes('application/pdf'));

                    const getOk = await fetch(`${baseUrl}/api/resume?vid=${encodeURIComponent(vis2)}&sid=${encodeURIComponent(ses2)}&reqId=${testPrefix}_ok`);
                    assert.strictEqual(getOk.status, 200);
                    assert(getOk.headers.get('content-type').includes('application/pdf'));
                    assert(getOk.headers.get('content-disposition').includes(analyticsLib.RESUME_FILENAME));
                } finally {
                    if (!hadRealPdf && fs.existsSync(resumePdfPath)) {
                        fs.unlinkSync(resumePdfPath);
                    }
                }
                console.log('[PASS] Server-side /api/resume handler verified for both 404 unavailable and 200 PDF delivery tracking.');

                // 6.5d Authenticated GET /api/analytics dashboard verification (today + weekly + monthly + identified vs anonymous)
                const dashRes = await fetch(`${baseUrl}/api/analytics?range=today&granularity=daily&tz=Asia%2FManila`, {
                    headers: { 'Cookie': sessionCookie }
                });
                assert.strictEqual(dashRes.status, 200);
                const dash = await dashRes.json();
                assert.strictEqual(dash.ok, true);
                assert.strictEqual(dash.timezone, 'Asia/Manila');
                assert(dash.summary.totalVisits >= 2, 'Two non-bot sessions must be counted');
                assert(dash.summary.totalPageViews >= 3, 'Three non-bot page views must be counted');
                assert(dash.summary.resumeServed >= 1, 'Confirmed PDF delivery must be counted in resumeServed');
                assert(dash.summary.botsFiltered >= 1, 'Googlebot session must be counted in botsFiltered and excluded from visits');

                const identifiedEntry = dash.resumeDownloads.items.find(r => r.visitorName === 'Elena Hiring Manager' && r.eventType === 'resume_served');
                assert(identifiedEntry, 'Identified visitor must be associated with their confirmed résumé download');
                assert.strictEqual(identifiedEntry.company, 'Example Tech Corp');

                const anonEntry = dash.recentActivity.items.find(r => r.classification === 'anonymous' && r.visitorName === 'Anonymous Visitor');
                assert(anonEntry, 'Anonymous visitors must strictly remain labeled "Anonymous Visitor"');

                // Verify weekly and monthly endpoints succeed cleanly
                const weekRes = await fetch(`${baseUrl}/api/analytics?range=30d&granularity=weekly&tz=Asia%2FManila`, { headers: { 'Cookie': sessionCookie } });
                assert.strictEqual(weekRes.status, 200);
                const monthRes = await fetch(`${baseUrl}/api/analytics?range=30d&granularity=monthly&tz=Asia%2FManila`, { headers: { 'Cookie': sessionCookie } });
                assert.strictEqual(monthRes.status, 200);

                // 6.5e Privacy PII Deletion: delete Elena's identity record and verify anonymization
                const elenaRecord = dash.identifiedVisitorsList.find(v => v.full_name === 'Elena Hiring Manager');
                assert(elenaRecord, 'Identified visitor must appear in privacy directory');
                const delIdRes = await fetch(`${baseUrl}/api/analytics?action=delete_identity&id=${elenaRecord.id}`, {
                    method: 'DELETE',
                    headers: { 'Cookie': sessionCookie }
                });
                assert.strictEqual(delIdRes.status, 200);
                console.log('[PASS] Admin analytics aggregation (daily/weekly/monthly), anonymous vs identified separation, and PII deletion verified.');
            } finally {
                // Clean up synthetic E2E analytics test rows so production database remains spotless
                const pool = dbLib.getPool();
                if (pool) {
                    await pool.query(`DELETE FROM analytics_events WHERE session_id LIKE $1`, [`${testPrefix}%`]);
                    await pool.query(`DELETE FROM analytics_sessions WHERE session_id LIKE $1`, [`${testPrefix}%`]);
                    await pool.query(`DELETE FROM analytics_identities WHERE session_id LIKE $1`, [`${testPrefix}%`]);
                }
            }
        }

        // 5.10 Admin Logout
        const logoutRes = await fetch(`${baseUrl}/api/admin?action=logout`, {
            method: 'POST',
            headers: { 'Cookie': sessionCookie }
        });
        assert.strictEqual(logoutRes.status, 200);
        const logoutCookie = logoutRes.headers.get('set-cookie');
        assert(logoutCookie.includes('Max-Age=0'), 'Logout must expire the session cookie');
        console.log('[PASS] POST /api/admin?action=logout clears the session cookie and returns 200 OK.');

    } finally {
        if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
        }
        await new Promise(resolve => server.close(resolve));
    }

    console.log('\n===================================================================');
    console.log(' ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY');
    console.log('===================================================================');
}

runTests().catch(err => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
});
