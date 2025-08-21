// cors-proxy.js - Servidor proxy local
const http = require('http');
const https = require('https');
const url = require('url');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const targetUrl = url.parse(req.url, true).query.url;
    if (!targetUrl) {
        res.writeHead(400);
        res.end('URL requerida');
        return;
    }

    const options = url.parse(targetUrl);
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const proxyReq = (options.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500);
        res.end('Proxy Error');
    });

    req.pipe(proxyReq);
});

server.listen(8080, () => {
    console.log('🚀 CORS Proxy en http://localhost:8080');
});