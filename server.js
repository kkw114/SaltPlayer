const express = require('express');
const path = require('path');
const fs = require('fs');
const { parseFile, parseBuffer } = require('music-metadata');

// NetEase Cloud Music API
let neteaseApi = null;
try {
    neteaseApi = require('@neteasecloudmusicapienhanced/api');
    console.log('NetEase Cloud Music API loaded');
} catch (e) {
    console.warn('NetEase API not available:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = process.env.MUSIC_DIR || path.join(__dirname, 'music');

const AUDIO_EXTS = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma', '.opus', '.webm'];

app.use(express.static(__dirname));
app.use('/music', express.static(MUSIC_DIR));
app.use(express.json());

// NetEase Cloud Music API proxy routes
if (neteaseApi) {
    // Generic proxy handler for NetEase API
    async function proxyNeteaseApi(apiName, params) {
        try {
            if (typeof neteaseApi[apiName] !== 'function') {
                throw new Error('API not found: ' + apiName);
            }
            const result = await neteaseApi[apiName](params);
            return result;
        } catch (e) {
            console.error('NetEase API error:', apiName, e.message);
            throw e;
        }
    }

    // Helper to extract cookie from query
    function getCookieFromReq(req) {
        return req.query.cookie || '';
    }

    // Search songs
    app.get('/api/netease/search', async (req, res) => {
        try {
            const { keywords, type = 1, limit = 30, offset = 0 } = req.query;
            if (!keywords) return res.status(400).json({ error: 'keywords required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('search', { keywords, type: Number(type), limit: Number(limit), offset: Number(offset), cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get song URL
    app.get('/api/netease/song/url', async (req, res) => {
        try {
            const { id, br = 320000 } = req.query;
            if (!id) return res.status(400).json({ error: 'id required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('song_url', { id, br: Number(br), cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get song detail
    app.get('/api/netease/song/detail', async (req, res) => {
        try {
            const { ids } = req.query;
            if (!ids) return res.status(400).json({ error: 'ids required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('song_detail', { ids, cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get lyrics
    app.get('/api/netease/lyric', async (req, res) => {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('lyric', { id, cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get playlist detail
    app.get('/api/netease/playlist/detail', async (req, res) => {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('playlist_detail', { id, cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get personalized playlists
    app.get('/api/netease/personalized', async (req, res) => {
        try {
            const { limit = 30 } = req.query;
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('personalized', { limit: Number(limit), cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get toplists
    app.get('/api/netease/toplist', async (req, res) => {
        try {
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('toplist', { cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get top playlist
    app.get('/api/netease/top/playlist', async (req, res) => {
        try {
            const { order = 'hot', cat = '', limit = 30, offset = 0 } = req.query;
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('top_playlist', { order, cat, limit: Number(limit), offset: Number(offset), cookie });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // QR code login - get key
    app.get('/api/netease/login/qr/key', async (req, res) => {
        try {
            const result = await proxyNeteaseApi('login_qr_key', { timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // QR code login - create QR
    app.get('/api/netease/login/qr/create', async (req, res) => {
        try {
            const { key, qrimg = true } = req.query;
            if (!key) return res.status(400).json({ error: 'key required' });
            const result = await proxyNeteaseApi('login_qr_create', { key, qrimg: qrimg === 'true' || qrimg === true, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // QR code login - check status
    app.get('/api/netease/login/qr/check', async (req, res) => {
        try {
            const { key } = req.query;
            if (!key) return res.status(400).json({ error: 'key required' });
            const result = await proxyNeteaseApi('login_qr_check', { key, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Phone login
    app.post('/api/netease/login/cellphone', async (req, res) => {
        try {
            const { phone, password, countrycode } = req.body;
            if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });
            const params = { phone, password };
            if (countrycode) params.countrycode = countrycode;
            const result = await proxyNeteaseApi('login_cellphone', params);
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get user account
    app.get('/api/netease/user/account', async (req, res) => {
        try {
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('user_account', { cookie, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get user playlist
    app.get('/api/netease/user/playlist', async (req, res) => {
        try {
            const { uid, limit = 100, offset = 0 } = req.query;
            if (!uid) return res.status(400).json({ error: 'uid required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('user_playlist', { uid: Number(uid), limit: Number(limit), offset: Number(offset), cookie, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Refresh login
    app.get('/api/netease/login/refresh', async (req, res) => {
        try {
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('login_refresh', { cookie, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Daily recommend songs
    app.get('/api/netease/recommend/songs', async (req, res) => {
        try {
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('recommend_songs', { cookie, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Like/unlike a song
    app.get('/api/netease/like', async (req, res) => {
        try {
            const { id, like, cookie, timestamp } = req.query;
            if (!id) return res.status(400).json({ error: 'id required' });
            const cookieStr = cookie || getCookieFromReq(req);
            // API expects like as string 'true' or 'false'
            const likeStr = (like === 'true' || like === '1') ? 'true' : 'false';
            const result = await proxyNeteaseApi('like', { id: Number(id), like: likeStr, cookie: cookieStr, timestamp: Number(timestamp) || Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Get user liked songs IDs
    app.get('/api/netease/likelist', async (req, res) => {
        try {
            const { uid } = req.query;
            if (!uid) return res.status(400).json({ error: 'uid required' });
            const cookie = getCookieFromReq(req);
            const result = await proxyNeteaseApi('likelist', { uid: Number(uid), cookie, timestamp: Date.now() });
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // Proxy cover image to avoid CORS
    app.get('/api/netease/cover', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).end();
            const https = require('https');
            const http = require('http');
            const targetUrl = decodeURIComponent(url);
            const isHttps = targetUrl.startsWith('https');
            const mod = isHttps ? https : http;
            mod.get(targetUrl, { headers: { 'Referer': 'https://music.163.com/' } }, (proxyRes) => {
                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                    mod.get(proxyRes.headers.location, (redirectRes) => {
                        res.set('Content-Type', redirectRes.headers['content-type'] || 'image/jpeg');
                        res.set('Cache-Control', 'public, max-age=86400');
                        redirectRes.pipe(res);
                    }).on('error', () => res.status(404).end());
                    return;
                }
                res.set('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
                res.set('Cache-Control', 'public, max-age=86400');
                proxyRes.pipe(res);
            }).on('error', () => res.status(404).end());
        } catch (e) { res.status(404).end(); }
    });

    // Proxy download for NetEase songs
    app.get('/api/netease/download', async (req, res) => {
        try {
            const { url, filename } = req.query;
            if (!url) return res.status(400).end();
            const https = require('https');
            const http = require('http');
            const targetUrl = decodeURIComponent(url);
            const isHttps = targetUrl.startsWith('https');
            const mod = isHttps ? https : http;
            const safeName = (filename || 'song').replace(/[\/\\:*?"<>|]/g, '_');
            mod.get(targetUrl, { headers: { 'Referer': 'https://music.163.com/' } }, (proxyRes) => {
                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                    mod.get(proxyRes.headers.location, (redirectRes) => {
                        res.set('Content-Type', redirectRes.headers['content-type'] || 'audio/mpeg');
                        res.set('Content-Disposition', 'attachment; filename="' + encodeURIComponent(safeName) + '"');
                        redirectRes.pipe(res);
                    }).on('error', () => res.status(500).end());
                    return;
                }
                res.set('Content-Type', proxyRes.headers['content-type'] || 'audio/mpeg');
                res.set('Content-Disposition', 'attachment; filename="' + encodeURIComponent(safeName) + '"');
                proxyRes.pipe(res);
            }).on('error', () => res.status(500).end());
        } catch (e) { res.status(500).end(); }
    });

    console.log('NetEase API routes registered at /api/netease/*');
}

// WebDAV session store
const webdavSessions = {};

function parsePropfindXML(xml) {
    const results = [];
    // Support both D: and plain XML namespaces
    const prefix = xml.indexOf('D:href') > -1 ? 'D:' : '';
    const hrefRegex = new RegExp('<' + prefix + 'href>([^<]+)<\/' + prefix + 'href>', 'gi');
    const collectionRegex = new RegExp('<' + prefix + 'collection[^>]*\/>', 'gi');
    const displayNameRegex = new RegExp('<' + prefix + 'displayname>([^<]+)<\/' + prefix + 'displayname>', 'gi');
    const getContentLengthRegex = new RegExp('<' + prefix + 'getcontentlength>([^<]+)<\/' + prefix + 'getcontentlength>', 'gi');

    const responses = xml.split(/<[A-Za-z]*:?response>/gi).slice(1);
    for (const resp of responses) {
        hrefRegex.lastIndex = 0;
        const hrefMatch = hrefRegex.exec(resp);
        if (!hrefMatch) continue;
        var raw = hrefMatch[1].trim();
        var href = raw;
        try { var decoded = decodeURIComponent(raw); if (decoded !== raw) href = decoded; } catch(e) {}

        collectionRegex.lastIndex = 0;
        const isDir = collectionRegex.test(resp);

        displayNameRegex.lastIndex = 0;
        const nameMatch = displayNameRegex.exec(resp);
        const name = nameMatch ? nameMatch[1] : href.split('/').filter(Boolean).pop() || href;

        getContentLengthRegex.lastIndex = 0;
        const sizeMatch = getContentLengthRegex.exec(resp);
        const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;

        results.push({ name, href, isDir, size });
    }
    return results;
}

function makeWebdavRequest(sessionId, method, urlPath, body, headers) {
    const session = webdavSessions[sessionId];
    if (!session) return Promise.reject(new Error('No session'));

    // Encode Chinese chars in URL, preserving forward slashes
    var rawUrl = session.url.replace(/[^\x00-\x7F]+/g, function(m) { return encodeURIComponent(m); });
    const baseUrl = new URL(rawUrl);
    const isHttps = baseUrl.protocol === 'https:';
    const httpMod = isHttps ? require('https') : require('http');
    const basePath = baseUrl.pathname.replace(/\/$/, '');
    // If urlPath is absolute (starts with /), use it directly
    var fullPath;
    if (urlPath && urlPath.charAt(0) === '/') {
        fullPath = urlPath;
    } else {
        fullPath = (basePath ? basePath + '/' : '/') + (urlPath || '').replace(/^\//, '');
    }
    fullPath = fullPath.replace(/\/{2,}/g, '/');

    const auth = Buffer.from(session.username + ':' + session.password).toString('base64');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: baseUrl.hostname,
            port: baseUrl.port || (isHttps ? 443 : 80),
            path: fullPath,
            method: method,
            rejectUnauthorized: false,
            headers: Object.assign({
                'Authorization': 'Basic ' + auth,
                'Host': baseUrl.hostname
            }, headers || {})
        };

        const req = httpMod.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

// Connect to WebDAV
app.post('/api/webdav/connect', async (req, res) => {
    try {
        const { url, username, password } = req.body;
        const sessionId = 'webdav-' + Date.now();
        var rawUrl = url.replace(/[^\x00-\x7F]+/g, function(m) { return encodeURIComponent(m); });
        webdavSessions[sessionId] = { url: url, username, password };
        // Test connection with OPTIONS first (more widely supported)
        var result = await makeWebdavRequest(sessionId, 'OPTIONS', '', null, {});
        if (result.status < 200 || result.status >= 400) {
            // Try PROPFIND as fallback
            result = await makeWebdavRequest(sessionId, 'PROPFIND', '', '<?xml version="1.0"?><D:propfind xmlns:D="DAV:"><D:prop><D:displayname/><D:resourcetype/></D:prop></D:propfind>', { 'Depth': '0', 'Content-Type': 'application/xml' });
        }
        if (result.status >= 200 && result.status < 400) {
            res.json({ sessionId });
        } else {
            delete webdavSessions[sessionId];
            res.status(401).json({ error: '连接失败: HTTP ' + result.status });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// List WebDAV directory
app.get('/api/webdav/list', async (req, res) => {
    try {
        const { session, path: dirPath } = req.query;
        const decodedPath = decodeURIComponent(dirPath || '');
        const encodedPath = decodedPath.split('/').map(function(seg) { return encodeURIComponent(seg); }).join('/');
        const body = '<?xml version="1.0"?><D:propfind xmlns:D="DAV:"><D:prop><D:displayname/><D:resourcetype/><D:getlastmodified/><D:getcontentlength/></D:prop></D:propfind>';
        const result = await makeWebdavRequest(session, 'PROPFIND', encodedPath || '', body, { 'Depth': '1', 'Content-Type': 'application/xml' });
        const entries = parsePropfindXML(result.body.toString('utf-8'));
        const children = entries.filter(e => {
            const ePath = e.href.replace(/\/$/, '');
            const basePath = (decodedPath || '').replace(/\/$/, '');
            return ePath !== basePath;
        });
        res.json(children);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stream WebDAV file (with Range support for seeking)
app.get('/api/webdav/stream', (req, res) => {
    (async () => {
        try {
            const { session, path: filePath } = req.query;
            const decodedPath = decodeURIComponent(filePath || '');
            const encodedPath = decodedPath.split('/').map(function(seg) { return encodeURIComponent(seg); }).join('/');
            const session2 = webdavSessions[session];
            if (!session2) { res.status(401).end(); return; }
            const rawUrl = session2.url.replace(/[^\x00-\x7F]+/g, m => encodeURIComponent(m));
            const baseUrl = new URL(rawUrl);
            const isHttps = baseUrl.protocol === 'https:';
            const httpMod = isHttps ? require('https') : require('http');
            const auth = Buffer.from(session2.username + ':' + session2.password).toString('base64');
            const options = {
                hostname: baseUrl.hostname,
                port: baseUrl.port || (isHttps ? 443 : 80),
                path: encodedPath.replace(/\/{2,}/g, '/'),
                method: 'GET',
                rejectUnauthorized: false,
                headers: { 'Authorization': 'Basic ' + auth, 'Host': baseUrl.hostname }
            };
            if (req.headers.range) options.headers['Range'] = req.headers.range;
            const proxyReq = httpMod.request(options, (proxyRes) => {
                res.status(proxyRes.statusCode);
                if (proxyRes.headers['content-type']) res.set('Content-Type', proxyRes.headers['content-type']);
                if (proxyRes.headers['content-length']) res.set('Content-Length', proxyRes.headers['content-length']);
                if (proxyRes.headers['content-range']) res.set('Content-Range', proxyRes.headers['content-range']);
                if (proxyRes.headers['accept-ranges']) res.set('Accept-Ranges', proxyRes.headers['accept-ranges']);
                proxyRes.pipe(res);
            });
            proxyReq.on('error', (e) => { console.error('Stream error:', e.message); res.status(500).end(); });
            proxyReq.setTimeout(60000, () => { proxyReq.destroy(); res.status(504).end(); });
            proxyReq.end();
        } catch(e) { console.error('Stream error:', e); res.status(500).end(); }
    })();
});

// Extract cover from WebDAV file (read up to 2MB of header)
app.get('/api/webdav/cover', async (req, res) => {
    try {
        const { session, path: filePath } = req.query;
        const decodedPath = decodeURIComponent(filePath || '');
        const encodedPath = decodedPath.split('/').map(function(seg) { return encodeURIComponent(seg); }).join('/');
        const result = await makeWebdavRequest(session, 'GET', encodedPath, null, { 'Range': 'bytes=0-2097151' });
        if (result.status >= 400) { res.status(404).end(); return; }
        var buffer = Buffer.from(result.body);
        var meta;
        // Determine mime from extension
        var ext = (filePath || '').split('.').pop().toLowerCase();
        var mimeMap = { mp3: 'audio/mpeg', flac: 'audio/flac', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', wma: 'audio/x-ms-wma', opus: 'audio/opus', webm: 'audio/webm' };
        var mime = mimeMap[ext] || '';
        try {
            meta = await parseBuffer(buffer, mime ? { mimeType: mime } : {});
        } catch(e) {
            try { meta = await parseBuffer(buffer); } catch(e2) {
                var tmpPath = require('path').join(require('os').tmpdir(), 'webdav-cover-' + Date.now() + '.' + ext);
                require('fs').writeFileSync(tmpPath, buffer);
                try { meta = await parseFile(tmpPath); } catch(e3) { meta = null; }
                try { require('fs').unlinkSync(tmpPath); } catch(e4) {}
            }
        }
        if (meta && meta.common.picture && meta.common.picture.length > 0) {
            const pic = meta.common.picture[0];
            res.set('Content-Type', pic.format || 'image/jpeg');
            res.send(Buffer.from(pic.data));
        } else {
            res.status(404).end();
        }
    } catch (e) { res.status(404).end(); }
});
// Cache: filePath -> { meta, coverBuffer, coverFormat }
const metaCache = new Map();

function cleanFilename(name) {
    return name.replace(/\.[^.]+$/, '').replace(/^\d+[.\-\s]+/, '').replace(/_/g, ' ').trim();
}

async function getMeta(fullPath) {
    if (metaCache.has(fullPath)) return metaCache.get(fullPath);
    const meta = await parseFile(fullPath);
    let coverBuffer = null;
    let coverFormat = null;
    if (meta.common.picture && meta.common.picture.length > 0) {
        coverBuffer = Buffer.from(meta.common.picture[0].data);
        coverFormat = meta.common.picture[0].format || 'image/jpeg';
    }
    const entry = { meta, coverBuffer, coverFormat };
    metaCache.set(fullPath, entry);
    return entry;
}

async function scanRecursive(dir, basePath) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = basePath ? basePath + '/' + entry.name : entry.name;
        if (entry.isDirectory()) {
            const sub = await scanRecursive(fullPath, relPath);
            results.push(...sub);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (AUDIO_EXTS.includes(ext)) {
                const lrcName = entry.name.replace(/\.[^.]+$/, '') + '.lrc';
                const lrcFullPath = path.join(dir, lrcName);
                const lrcRelPath = basePath ? basePath + '/' + lrcName : lrcName;
                results.push({
                    fullPath,
                    name: entry.name,
                    relPath: relPath.replace(/\\/g, '/'),
                    hasLrc: fs.existsSync(lrcFullPath),
                    lrcRelPath: lrcRelPath.replace(/\\/g, '/')
                });
            }
        }
    }
    return results;
}

function countAudioFiles(dir) {
    let count = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile() && AUDIO_EXTS.includes(path.extname(entry.name).toLowerCase())) {
                count++;
            }
        }
    } catch(e) {}
    return count;
}

function scanFlat(dir, basePath) {
    const results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (AUDIO_EXTS.includes(ext)) {
                    const lrcName = entry.name.replace(/\.[^.]+$/, '') + '.lrc';
                    const lrcFullPath = path.join(dir, lrcName);
                    const lrcRelPath = basePath ? basePath + '/' + lrcName : lrcName;
                    results.push({
                        fullPath,
                        name: entry.name,
                        relPath: (basePath ? basePath + '/' + entry.name : entry.name).replace(/\\/g, '/'),
                        hasLrc: fs.existsSync(lrcFullPath),
                        lrcRelPath: lrcRelPath.replace(/\\/g, '/')
                    });
                }
            }
        }
    } catch(e) {}
    return results;
}

app.get('/api/folders', (req, res) => {
    try {
        const subfolders = [];
        const entries = fs.readdirSync(MUSIC_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const count = countAudioFiles(path.join(MUSIC_DIR, entry.name));
                subfolders.push({ name: entry.name, path: entry.name, count });
            }
        }
        // Count files in root
        const rootCount = countAudioFiles(MUSIC_DIR);
        // Also count files recursively in subfolders (for "all" indicator)
        let totalCount = rootCount;
        for (const sf of subfolders) totalCount += sf.count;
        res.json({ subfolders, rootCount, totalCount });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        let dir = MUSIC_DIR;
        let basePath = '';
        const sub = req.query.sub;
        if (sub) {
            dir = path.join(MUSIC_DIR, sub);
            if (!dir.startsWith(MUSIC_DIR)) { res.status(403).end(); return; }
            basePath = sub;
        }
        const files = sub ? scanFlat(dir, basePath) : await scanRecursive(MUSIC_DIR, '');
        files.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

        const tracks = [];
        for (const f of files) {
            try {
                const { meta, coverBuffer } = await getMeta(f.fullPath);
                tracks.push({
                    name: f.name,
                    title: meta.common.title || cleanFilename(f.name),
                    artist: meta.common.artist || '未知艺术家',
                    album: meta.common.album || '未知专辑',
                    hasCover: !!coverBuffer,
                    track: meta.common.track && meta.common.track.no ? String(meta.common.track.no) : '',
                    year: meta.common.year || '',
                    genre: meta.common.genre && meta.common.genre.length ? meta.common.genre[0] : '',
                    url: '/music/' + f.relPath,
                    lrcUrl: f.hasLrc ? '/music/' + f.lrcRelPath : null
                });
            } catch (e) {
                console.warn('Metadata error for', f.name, e.message);
                tracks.push({
                    name: f.name,
                    title: cleanFilename(f.name),
                    artist: '未知艺术家',
                    album: '未知专辑',
                    hasCover: false,
                    track: '',
                    year: '',
                    genre: '',
                    url: '/music/' + f.relPath,
                    lrcUrl: f.hasLrc ? '/music/' + f.lrcRelPath : null
                });
            }
        }
        res.json(tracks);
    } catch (e) {
        console.error('API error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/cover', async (req, res) => {
    try {
        const file = req.query.file;
        if (!file) { res.status(400).end(); return; }
        const fullPath = path.join(MUSIC_DIR, file);
        if (!fullPath.startsWith(MUSIC_DIR)) { res.status(403).end(); return; }
        const { coverBuffer, coverFormat } = await getMeta(fullPath);
        if (!coverBuffer) { res.status(404).end(); return; }
        res.set('Content-Type', coverFormat);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(coverBuffer);
    } catch (e) {
        res.status(404).end();
    }
});

// Fonts
const FONTS_DIR = path.join(__dirname, 'fonts');
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });
app.use('/fonts', express.static(FONTS_DIR));

app.get('/api/fonts', (req, res) => {
    try {
        res.json(fs.readdirSync(FONTS_DIR).filter(function(f) { return /\.(ttf|otf|woff|woff2)$/i.test(f); }));
    } catch(e) { res.json([]); }
});

const multer = require('multer');
app.post('/api/fonts/upload', multer({
    storage: multer.diskStorage({
        destination: FONTS_DIR,
        filename: function(req, file, cb) { cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8')); }
    }),
    limits: { fileSize: 20 * 1024 * 1024 }
}).single('font'), function(req, res) {
    if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
    res.json({ name: req.file.filename });
});

// State endpoint for mini mode
let playerState = {
    title: '',
    artist: '',
    coverUrl: '',
    currentTime: 0,
    duration: 0,
    lyrics: [],
    currentLyricIndex: -1
};

app.get('/api/state', (req, res) => {
    res.json(playerState);
});

app.post('/api/state', (req, res) => {
    Object.assign(playerState, req.body);
    res.json({ ok: true });
});

// Mini mode route
app.get('/mini', (req, res) => {
    res.sendFile(path.join(__dirname, 'mini.html'));
});

// Mini settings route
app.get('/mini/st', (req, res) => {
    res.sendFile(path.join(__dirname, 'mini-settings.html'));
});

app.listen(PORT, '::', () => {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    console.log('Server running on:');
    console.log('  http://localhost:' + PORT);
    for (const [name, addrs] of Object.entries(ifaces)) {
        for (const addr of addrs) {
            if (!addr.internal) {
                const host = addr.family === 'IPv6' ? '[' + addr.address + ']' : addr.address;
                console.log('  http://' + host + ':' + PORT + '  (' + name + ')');
            }
        }
    }
    console.log('Music dir:', MUSIC_DIR);
});
