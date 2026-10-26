'use strict';

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, HEAD');
        res.end();
        return;
    }

    const hasProvider = Boolean(process.env.RESEND_API_KEY || process.env.WEB3FORMS_ACCESS_KEY);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
        ok: true,
        service: 'portfolio-server',
        emailProviderConfigured: hasProvider,
        databaseConfigured: Boolean(process.env.DATABASE_URL)
    }));
};
