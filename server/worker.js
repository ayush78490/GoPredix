/**
 * Cloudflare Worker Adapter for Vercel/Express Functions
 * Allows running existing Node.js functions on Cloudflare Workers
 */

import validateMarket from './api/validateMarket.js';
import resolveMarket from './api/resolveMarket.js';

export default {
    async fetch(request, env, ctx) {
        // 1. Shim process.env
        globalThis.process = { env: env };

        // 2. Route request
        const url = new URL(request.url);
        const path = url.pathname;

        let handler;
        if (path === '/api/validateMarket') {
            handler = validateMarket;
        } else if (path === '/api/resolveMarket') {
            handler = resolveMarket;
        } else {
            return new Response('Not Found', { status: 404 });
        }

        // 3. Create Mock Request (req)
        const req = {
            method: request.method,
            headers: Object.fromEntries(request.headers),
            url: request.url,
            body: {}, // Will be populated below
            query: Object.fromEntries(url.searchParams)
        };

        // Parse body if JSON
        if (request.method === 'POST' || request.method === 'PUT') {
            try {
                req.body = await request.json();
            } catch (e) {
                req.body = {};
            }
        }

        // 4. Create Mock Response (res)
        let responseBody = null;
        let responseStatus = 200;
        let responseHeaders = new Headers();

        const res = {
            status: (code) => {
                responseStatus = code;
                return res;
            },
            json: (data) => {
                responseBody = JSON.stringify(data);
                responseHeaders.set('Content-Type', 'application/json');
                return res;
            },
            send: (data) => {
                responseBody = data;
                return res;
            },
            setHeader: (key, value) => {
                responseHeaders.set(key, value);
                return res;
            },
            end: () => {
                return res;
            }
        };

        // 5. Execute Handler
        try {
            await handler(req, res);
        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 6. Return Cloudflare Response
        return new Response(responseBody, {
            status: responseStatus,
            headers: responseHeaders
        });
    }
};
