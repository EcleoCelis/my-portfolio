'use strict';

const db = require('../lib/db');
const auth = require('../lib/auth');
const { sanitizeSingleLine } = require('./contact');

const MAX_PROJECT_BODY_BYTES = 3 * 1024 * 1024; // 3 MB limit to support Base64 / data URI screenshots stored in PostgreSQL

function isValidHttpUrlOrEmpty(value) {
    if (!value) return true;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

function isValidImageDataOrEmpty(value) {
    if (!value) return true;
    if (typeof value !== 'string' || value.length > 2.8 * 1024 * 1024) return false;
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(value.trim());
}

function validateProjectInput(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { valid: false, errors: { form: 'Project payload must be a JSON object.' } };
    }

    const errors = {};
    const title = sanitizeSingleLine(raw.title || '', 180);
    const rawSlug = sanitizeSingleLine(raw.slug || title, 120)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const project_type = raw.project_type === 'design' ? 'design' : 'system';
    const rawCategory = sanitizeSingleLine(raw.category || raw.tag || (project_type === 'design' ? 'UI/UX Design' : 'Software Engineering'), 80);
    const category = rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
    const tag = rawCategory;
    const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, 2000) : '';
    const role_details = typeof raw.role_details === 'string'
        ? raw.role_details.trim().slice(0, 2000)
        : (typeof raw.role_contributions === 'string' ? raw.role_contributions.trim().slice(0, 2000) : '');
    const live_url = sanitizeSingleLine(raw.live_url || '', 500);
    const repo_url = sanitizeSingleLine(raw.repo_url || '', 500);
    const status_note = typeof raw.status_note === 'string' ? raw.status_note.trim().slice(0, 1000) : '';
    const image_data = typeof raw.image_data === 'string' ? raw.image_data.trim() : '';
    const display_order = Number.isFinite(Number(raw.display_order)) ? Number(raw.display_order) : 0;

    let highlights = [];
    if (Array.isArray(raw.highlights)) {
        highlights = raw.highlights.map(h => sanitizeSingleLine(String(h), 300)).filter(Boolean);
    } else if (typeof raw.highlights === 'string') {
        highlights = raw.highlights.split(/\r?\n/).map(h => sanitizeSingleLine(h, 300)).filter(Boolean);
    }

    let tech_stack = [];
    if (Array.isArray(raw.tech_stack)) {
        tech_stack = raw.tech_stack.map(t => sanitizeSingleLine(String(t), 60)).filter(Boolean);
    } else if (typeof raw.tech_stack === 'string') {
        tech_stack = raw.tech_stack.split(',').map(t => sanitizeSingleLine(t, 60)).filter(Boolean);
    }

    if (!title || title.length < 2) {
        errors.title = 'Project title is required.';
    }
    if (!rawSlug) {
        errors.slug = 'A valid project slug is required.';
    }
    if (!description || description.length < 10) {
        errors.description = 'Project description must be at least 10 characters.';
    }
    if (!isValidHttpUrlOrEmpty(live_url)) {
        errors.live_url = project_type === 'design'
            ? 'Interactive prototype URL must start with http:// or https://.'
            : 'Live demo URL must start with http:// or https://.';
    }
    if (project_type === 'system' && !isValidHttpUrlOrEmpty(repo_url)) {
        errors.repo_url = 'GitHub repository URL must start with http:// or https://.';
    }
    if (!isValidImageDataOrEmpty(image_data)) {
        errors.image_data = 'Uploaded screenshot must be a valid PNG, JPEG, WebP, or GIF image (max ~2.8 MB).';
    }

    if (Object.keys(errors).length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        data: {
            slug: rawSlug,
            title,
            category,
            tag,
            project_type,
            description,
            role_details,
            role_contributions: role_details,
            highlights,
            tech_stack,
            live_url,
            repo_url,
            status_note,
            image_data,
            display_order
        }
    };
}

async function processProjectsRequest({ method, headers = {}, query = {}, rawBody = '', env = process.env }) {
    if (method === 'GET') {
        const result = await db.listProjects();
        return {
            statusCode: 200,
            headers: {},
            body: {
                ok: true,
                source: result.source,
                categories: result.categories || [],
                projects: result.projects
            }
        };
    }

    // Mutating operations (POST, PUT, DELETE) require Admin authentication
    if (!auth.isRequestAuthenticated(headers, env)) {
        return {
            statusCode: 401,
            headers: {},
            body: {
                ok: false,
                code: 'UNAUTHORIZED',
                message: 'Admin authentication is required to modify portfolio projects.'
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
                message: 'PostgreSQL DATABASE_URL is not configured in the server environment.'
            }
        };
    }

    if (method === 'DELETE') {
        const id = query.id;
        if (!id || !Number.isInteger(Number(id))) {
            return {
                statusCode: 400,
                headers: {},
                body: { ok: false, code: 'INVALID_ID', message: 'Valid project id query parameter is required.' }
            };
        }
        try {
            const deleted = await db.deleteProject(Number(id));
            if (!deleted) {
                return { statusCode: 404, headers: {}, body: { ok: false, code: 'NOT_FOUND', message: 'Project not found.' } };
            }
            return { statusCode: 200, headers: {}, body: { ok: true, message: 'Project deleted successfully.' } };
        } catch (err) {
            return { statusCode: 500, headers: {}, body: { ok: false, code: 'DB_ERROR', message: 'Failed to delete project.' } };
        }
    }

    if (method === 'POST' || method === 'PUT') {
        if (Buffer.byteLength(rawBody, 'utf8') > MAX_PROJECT_BODY_BYTES) {
            return {
                statusCode: 413,
                headers: {},
                body: { ok: false, code: 'PAYLOAD_TOO_LARGE', message: 'Project payload exceeds the 3 MB limit.' }
            };
        }

        let parsed;
        try {
            parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        } catch (e) {
            return { statusCode: 400, headers: {}, body: { ok: false, code: 'INVALID_JSON', message: 'Invalid JSON body.' } };
        }

        const validation = validateProjectInput(parsed);
        if (!validation.valid) {
            return {
                statusCode: 422,
                headers: {},
                body: { ok: false, code: 'VALIDATION_FAILED', message: 'Please check the project fields.', errors: validation.errors }
            };
        }

        try {
            if (method === 'POST') {
                const created = await db.createProject(validation.data);
                return { statusCode: 201, headers: {}, body: { ok: true, project: created, message: 'Project created in PostgreSQL.' } };
            }

            const id = parsed.id || query.id;
            if (!id || !Number.isInteger(Number(id))) {
                return { statusCode: 400, headers: {}, body: { ok: false, code: 'INVALID_ID', message: 'Project ID is required for update.' } };
            }
            const updated = await db.updateProject(Number(id), validation.data);
            if (!updated) {
                return { statusCode: 404, headers: {}, body: { ok: false, code: 'NOT_FOUND', message: 'Project not found.' } };
            }
            return { statusCode: 200, headers: {}, body: { ok: true, project: updated, message: 'Project updated in PostgreSQL.' } };
        } catch (err) {
            const isDuplicate = err && err.code === '23505';
            return {
                statusCode: isDuplicate ? 409 : 500,
                headers: {},
                body: {
                    ok: false,
                    code: isDuplicate ? 'DUPLICATE_SLUG' : 'DB_ERROR',
                    message: isDuplicate ? 'A project with this slug already exists.' : 'Database operation failed.'
                }
            };
        }
    }

    return {
        statusCode: 405,
        headers: { 'Allow': 'GET, POST, PUT, DELETE' },
        body: { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' }
    };
}

async function handler(req, res) {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    let rawBody = '';
    if (req.method === 'POST' || req.method === 'PUT') {
        if (req.body && typeof req.body === 'object') {
            rawBody = JSON.stringify(req.body);
        } else if (typeof req.body === 'string') {
            rawBody = req.body;
        } else {
            rawBody = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => {
                    data += chunk;
                    if (Buffer.byteLength(data, 'utf8') > MAX_PROJECT_BODY_BYTES + 1024) resolve(data);
                });
                req.on('end', () => resolve(data));
                req.on('error', reject);
            });
        }
    }

    const result = await processProjectsRequest({
        method: req.method,
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
module.exports.processProjectsRequest = processProjectsRequest;
module.exports.validateProjectInput = validateProjectInput;
