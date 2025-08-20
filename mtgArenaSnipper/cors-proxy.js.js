// cors-proxy.js
// 🌐 Servidor proxy local para resolver CORS en desarrollo

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8080;

const server = http.createServer((req, res) => {
    // Headers CORS permisivos para desarrollo
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Extraer URL target del query parameter
    const parsedUrl = url.parse(req.url, true);
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
        res.writeHead(400);
        res.end('Error: Se requiere parámetro "url"');
        return;
    }

    console.log(`🔗 Proxying request to: ${targetUrl}`);

    // Determinar si usar HTTP o HTTPS
    const targetParsed = url.parse(targetUrl);
    const isHttps = targetParsed.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    // Configurar request al target
    const options = {
        hostname: targetParsed.hostname,
        port: targetParsed.port || (isHttps ? 443 : 80),
        path: targetParsed.path,
        method: req.method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    };

    // Hacer request al target
    const proxyReq = httpModule.request(options, (proxyRes) => {
        // Copiar status code
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // Pipe response
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error(`❌ Proxy error: ${err.message}`);
        res.writeHead(500);
        res.end(`Proxy Error: ${err.message}`);
    });

    // Pipe request body si existe
    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`🚀 CORS Proxy server running on http://localhost:${PORT}`);
    console.log(`📖 Uso: http://localhost:${PORT}?url=TARGET_URL`);
    console.log(`🔗 Ejemplo: http://localhost:${PORT}?url=${encodeURIComponent('https://www.mtggoldfish.com/metagame/standard')}`);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando CORS Proxy server...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});