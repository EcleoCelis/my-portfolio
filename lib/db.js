'use strict';

const { Pool } = require('pg');

const DEFAULT_PROJECTS = [
    {
        slug: 'nutricare',
        title: 'NutriCare Platform',
        category: 'health',
        tag: 'Health Tech',
        description: 'A secure, cloud-enabled operational community platform offering offline metrics gathering and healthcare visualization analytics.',
        role_details: 'Capstone Project Leader (2025 — Present) — Led responsive interface architecture in Laravel and Tailwind CSS, optimized relational PostgreSQL queries, and integrated community healthcare analytics subsystems.',
        highlights: [
            'Designed responsive, accessible dashboard layouts using Laravel Blade and Tailwind CSS.',
            'Implemented offline-capable community health metrics collection workflows.',
            'Optimized relational PostgreSQL queries for healthcare visualization and reporting.'
        ],
        tech_stack: ['Laravel', 'Tailwind CSS', 'PostgreSQL'],
        live_url: '',
        repo_url: '',
        status_note: 'Academic Capstone Project — Public live deployment and repository URLs are pending institutional release. Use the button below to request a live code walkthrough or technical architecture review.',
        image_data: '',
        display_order: 1,
        project_type: 'system'
    }
];

let poolInstance = null;
let currentConnectionString = '';
let injectedAdapter = null;
let schemaInitialized = false;

function normalizeConnectionString(raw) {
    if (!raw) return '';
    let str = String(raw).trim();
    // Support python psycopg / asyncpg URLs (e.g., postgresql+psycopg://) by converting to standard postgresql://
    str = str.replace(/^postgresql\+[a-z0-9_-]+:\/\//i, 'postgresql://');
    return str;
}

/**
 * Allows injecting a mock or custom database adapter for testing.
 */
function setDbAdapter(adapter) {
    injectedAdapter = adapter;
    schemaInitialized = false;
}

function getPool() {
    if (injectedAdapter) return injectedAdapter;
    const connectionString = normalizeConnectionString(process.env.DATABASE_URL);
    if (!connectionString) return null;

    // In a cloud / Vercel environment, localhost cannot be reached. Avoid connection hang.
    if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(connectionString)) {
        console.warn('[db] Detected localhost DATABASE_URL in Vercel environment. Cloud database connection required for PostgreSQL persistence.');
        return null;
    }

    if (!poolInstance || currentConnectionString !== connectionString) {
        if (poolInstance) {
            try { poolInstance.end(); } catch (e) {}
        }
        currentConnectionString = connectionString;
        schemaInitialized = false;
        const useSsl = process.env.DATABASE_SSL === 'true' || /sslmode=require/i.test(connectionString);
        poolInstance = new Pool({
            connectionString,
            ssl: useSsl ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });
        poolInstance.on('error', (err) => {
            console.error('[db] Unexpected PostgreSQL pool error:', err && err.message ? err.message : 'Unknown');
        });
    }
    return poolInstance;
}

function isDatabaseConfigured() {
    if (injectedAdapter) return true;
    const connectionString = normalizeConnectionString(process.env.DATABASE_URL);
    if (!connectionString) return false;
    if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(connectionString)) {
        return false;
    }
    return true;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS portfolio_projects (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(180) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'general',
    tag VARCHAR(80) NOT NULL DEFAULT 'Software Engineering',
    description TEXT NOT NULL,
    role_details TEXT NOT NULL DEFAULT '',
    highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
    live_url VARCHAR(500) NOT NULL DEFAULT '',
    repo_url VARCHAR(500) NOT NULL DEFAULT '',
    status_note TEXT NOT NULL DEFAULT '',
    image_data TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    project_type VARCHAR(30) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_inquiries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    company VARCHAR(120) NOT NULL DEFAULT '',
    inquiry_type VARCHAR(40) NOT NULL DEFAULT 'general',
    inquiry_label VARCHAR(80) NOT NULL DEFAULT 'General Professional Inquiry',
    subject VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    email_delivered BOOLEAN NOT NULL DEFAULT FALSE,
    email_provider VARCHAR(40) NOT NULL DEFAULT 'none',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function ensureSchemaAndSeed() {
    const db = getPool();
    if (!db) return false;
    if (schemaInitialized) return true;

    await db.query(SCHEMA_SQL);
    try {
        await db.query("ALTER TABLE portfolio_projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(30) NOT NULL DEFAULT 'system'");
    } catch (e) {}

    const countResult = await db.query('SELECT COUNT(*)::int AS count FROM portfolio_projects');
    const existingCount = countResult.rows && countResult.rows[0] ? Number(countResult.rows[0].count) : 0;

    if (existingCount === 0) {
        for (const proj of DEFAULT_PROJECTS) {
            await db.query(
                `INSERT INTO portfolio_projects
                (slug, title, category, tag, description, role_details, highlights, tech_stack, live_url, repo_url, status_note, image_data, display_order, project_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (slug) DO NOTHING`,
                [
                    proj.slug,
                    proj.title,
                    proj.category,
                    proj.tag,
                    proj.description,
                    proj.role_details,
                    JSON.stringify(proj.highlights),
                    JSON.stringify(proj.tech_stack),
                    proj.live_url,
                    proj.repo_url,
                    proj.status_note,
                    proj.image_data,
                    proj.display_order,
                    proj.project_type || 'system'
                ]
            );
        }
    }

    schemaInitialized = true;
    return true;
}

async function listProjects() {
    const db = getPool();
    if (!db) {
        const categories = [...new Set(DEFAULT_PROJECTS.map(p => p.tag || p.category).filter(Boolean))];
        return {
            source: 'fallback',
            categories,
            projects: DEFAULT_PROJECTS.map((p, idx) => ({ id: idx + 1, ...p }))
        };
    }

    try {
        await ensureSchemaAndSeed();
        const res = await db.query(
            `SELECT id, slug, title, category, tag, description, role_details, highlights, tech_stack,
                    live_url, repo_url, status_note, image_data, display_order, project_type, created_at, updated_at
             FROM portfolio_projects
             ORDER BY display_order ASC, id ASC`
        );
        const categories = [...new Set(res.rows.map(r => r.tag || r.category).filter(Boolean))];
        return {
            source: 'postgres',
            categories,
            projects: res.rows.map(row => ({
                ...row,
                project_type: row.project_type || 'system',
                role_contributions: row.role_details
            }))
        };
    } catch (err) {
        console.error('[db] Failed to query portfolio_projects, using fallback:', err && err.message ? err.message : 'Error');
        const categories = [...new Set(DEFAULT_PROJECTS.map(p => p.tag || p.category).filter(Boolean))];
        return {
            source: 'fallback',
            categories,
            error: 'DATABASE_CONNECTION_FAILED',
            projects: DEFAULT_PROJECTS.map((p, idx) => ({ id: idx + 1, ...p }))
        };
    }
}

async function createProject(projectData) {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    const res = await db.query(
        `INSERT INTO portfolio_projects
        (slug, title, category, tag, description, role_details, highlights, tech_stack, live_url, repo_url, status_note, image_data, display_order, project_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
            projectData.slug,
            projectData.title,
            projectData.category,
            projectData.tag,
            projectData.description,
            projectData.role_details || '',
            JSON.stringify(projectData.highlights || []),
            JSON.stringify(projectData.tech_stack || []),
            projectData.live_url || '',
            projectData.repo_url || '',
            projectData.status_note || '',
            projectData.image_data || '',
            Number(projectData.display_order) || 0,
            projectData.project_type || 'system'
        ]
    );
    const row = res.rows[0];
    return {
        ...row,
        project_type: row.project_type || 'system',
        role_contributions: row.role_details
    };
}

async function updateProject(id, projectData) {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    const res = await db.query(
        `UPDATE portfolio_projects
         SET slug = $1,
             title = $2,
             category = $3,
             tag = $4,
             description = $5,
             role_details = $6,
             highlights = $7::jsonb,
             tech_stack = $8::jsonb,
             live_url = $9,
             repo_url = $10,
             status_note = $11,
             image_data = $12,
             display_order = $13,
             project_type = $14,
             updated_at = NOW()
         WHERE id = $15
         RETURNING *`,
        [
            projectData.slug,
            projectData.title,
            projectData.category,
            projectData.tag,
            projectData.description,
            projectData.role_details || '',
            JSON.stringify(projectData.highlights || []),
            JSON.stringify(projectData.tech_stack || []),
            projectData.live_url || '',
            projectData.repo_url || '',
            projectData.status_note || '',
            projectData.image_data || '',
            Number(projectData.display_order) || 0,
            projectData.project_type || 'system',
            Number(id)
        ]
    );
    const row = res.rows[0];
    return row ? {
        ...row,
        project_type: row.project_type || 'system',
        role_contributions: row.role_details
    } : null;
}

async function deleteProject(id) {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    const res = await db.query('DELETE FROM portfolio_projects WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
}

async function saveContactInquiry(inquiry, deliveryMeta = {}) {
    const db = getPool();
    if (!db) return { saved: false, reason: 'DATABASE_NOT_CONFIGURED' };

    try {
        await ensureSchemaAndSeed();
        const res = await db.query(
            `INSERT INTO contact_inquiries
            (name, email, company, inquiry_type, inquiry_label, subject, message, email_delivered, email_provider)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, created_at`,
            [
                inquiry.name,
                inquiry.email,
                inquiry.company || '',
                inquiry.inquiryType || 'general',
                inquiry.inquiryLabel || 'General Professional Inquiry',
                inquiry.subject,
                inquiry.message,
                Boolean(deliveryMeta.delivered),
                deliveryMeta.provider || 'none'
            ]
        );
        return {
            saved: true,
            id: res.rows[0] ? res.rows[0].id : null
        };
    } catch (err) {
        console.error('[db] Failed to store contact inquiry in PostgreSQL:', err && err.message ? err.message : 'Error');
        return { saved: false, reason: 'DATABASE_WRITE_FAILED' };
    }
}

async function listContactInquiries() {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    const res = await db.query(
        `SELECT id, name, email, company, inquiry_type, inquiry_label, subject, message,
                email_delivered, email_provider, is_read, created_at
         FROM contact_inquiries
         ORDER BY created_at DESC, id DESC`
    );
    return res.rows;
}

async function updateInquiryReadStatus(id, isRead) {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    const res = await db.query(
        'UPDATE contact_inquiries SET is_read = $1 WHERE id = $2 RETURNING *',
        [Boolean(isRead), Number(id)]
    );
    return res.rows[0] || null;
}

async function deleteContactInquiry(id) {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    const res = await db.query('DELETE FROM contact_inquiries WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
}

async function deleteContactInquiries(ids) {
    const db = getPool();
    if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
    await ensureSchemaAndSeed();

    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const numericIds = ids.map(Number).filter(Number.isInteger);
    if (numericIds.length === 0) return 0;

    const placeholders = numericIds.map((_, i) => `$${i + 1}`).join(', ');
    const res = await db.query(`DELETE FROM contact_inquiries WHERE id IN (${placeholders}) RETURNING id`, numericIds);
    return res.rowCount;
}

module.exports = {
    DEFAULT_PROJECTS,
    setDbAdapter,
    getPool,
    isDatabaseConfigured,
    ensureSchemaAndSeed,
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    saveContactInquiry,
    listContactInquiries,
    updateInquiryReadStatus,
    deleteContactInquiry,
    deleteContactInquiries
};
