/**
 * NetEase Cloud Music API Module
 * Handles all communication with the NetEase API backend
 */

const NetEaseAPI = (() => {
    const BASE = '/api/netease';
    let fullCookie = '';

    function getCookie() { return fullCookie; }
    function setCookie(c) {
        fullCookie = c || '';
        // Extract and save essential cookies
        if (c) {
            var musicU = extractCookie(c, 'MUSIC_U');
            var csrf = extractCookie(c, '__csrf');
            if (musicU) localStorage.setItem('netease-music-u', musicU);
            if (csrf) localStorage.setItem('netease-csrf', csrf);
        }
    }

    function extractCookie(cookieStr, name) {
        var match = cookieStr.match(new RegExp(name + '=([^;]+)'));
        return match ? match[1] : null;
    }

    // Build minimal cookie string for API calls
    function getCookieParam() {
        var musicU = localStorage.getItem('netease-music-u');
        var csrf = localStorage.getItem('netease-csrf');
        // Fallback: try to extract from full cookie
        if (!musicU && fullCookie) {
            musicU = extractCookie(fullCookie, 'MUSIC_U');
            if (musicU) localStorage.setItem('netease-music-u', musicU);
        }
        if (!csrf && fullCookie) {
            csrf = extractCookie(fullCookie, '__csrf');
            if (csrf) localStorage.setItem('netease-csrf', csrf);
        }
        if (!musicU) return '';
        var cookie = 'MUSIC_U=' + musicU;
        if (csrf) cookie += ';__csrf=' + csrf;
        return '&cookie=' + encodeURIComponent(cookie);
    }

    async function request(url, options) {
        try {
            const resp = await fetch(url, options);
            if (!resp.ok) {
                console.error('NetEase API HTTP error:', resp.status);
                return null;
            }
            const data = await resp.json();
            if (data && data.body) return data.body;
            return data;
        } catch (e) {
            console.error('NetEase API error:', e);
            return null;
        }
    }

    async function search(keywords, type, limit, offset) {
        type = type || 1;
        limit = limit || 30;
        offset = offset || 0;
        var url = BASE + '/search?keywords=' + encodeURIComponent(keywords) + '&type=' + type + '&limit=' + limit + '&offset=' + offset + getCookieParam();
        return request(url);
    }

    async function getSongUrl(id, br) {
        // Get quality from settings
        var quality = '320000';
        if (typeof Settings !== 'undefined') {
            quality = Settings.get('neteaseQuality') || '320000';
        }
        if (quality === 'flac') quality = '350000'; // API uses 350000 for lossless
        br = br || quality;
        var url = BASE + '/song/url?id=' + id + '&br=' + br + getCookieParam();
        return request(url);
    }

    async function getSongDetail(ids) {
        var url = BASE + '/song/detail?ids=' + ids + getCookieParam();
        return request(url);
    }

    async function getLyric(id) {
        var url = BASE + '/lyric?id=' + id + getCookieParam();
        return request(url);
    }

    async function getPlaylistDetail(id) {
        var url = BASE + '/playlist/detail?id=' + id + getCookieParam();
        return request(url);
    }

    async function getPersonalized(limit) {
        limit = limit || 30;
        var url = BASE + '/personalized?limit=' + limit + getCookieParam();
        return request(url);
    }

    async function getToplist() {
        return request(BASE + '/toplist?' + getCookieParam().substring(1));
    }

    async function getTopPlaylist(order, cat, limit, offset) {
        order = order || 'hot';
        cat = cat || '';
        limit = limit || 30;
        offset = offset || 0;
        var url = BASE + '/top/playlist?order=' + order + '&cat=' + encodeURIComponent(cat) + '&limit=' + limit + '&offset=' + offset + getCookieParam();
        return request(url);
    }

    async function getQrKey() {
        return request(BASE + '/login/qr/key');
    }

    async function createQrCode(key) {
        return request(BASE + '/login/qr/create?key=' + key + '&qrimg=true');
    }

    async function checkQrStatus(key) {
        return request(BASE + '/login/qr/check?key=' + key);
    }

    async function loginWithPhone(phone, password, countrycode) {
        return request(BASE + '/login/cellphone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password, countrycode })
        });
    }

    async function getUserAccount() {
        var url = BASE + '/user/account?' + getCookieParam().substring(1);
        return request(url);
    }

    async function getUserPlaylist(uid, limit, offset) {
        limit = limit || 100;
        offset = offset || 0;
        var url = BASE + '/user/playlist?uid=' + uid + '&limit=' + limit + '&offset=' + offset + getCookieParam();
        return request(url);
    }

    async function refreshLogin() {
        var url = BASE + '/login/refresh?' + getCookieParam().substring(1);
        return request(url);
    }

    async function getArtist(id) {
        return request(BASE + '/artists?id=' + id + getCookieParam());
    }

    async function getAlbum(id) {
        return request(BASE + '/album?id=' + id + getCookieParam());
    }

    async function getDailyRecommend() {
        return request(BASE + '/recommend/songs?' + getCookieParam().substring(1));
    }

    async function likeSong(id, like) {
        var musicU = localStorage.getItem('netease-music-u');
        if (!musicU && fullCookie) {
            musicU = extractCookie(fullCookie, 'MUSIC_U');
        }
        var params = new URLSearchParams({
            id: Number(id),
            like: like ? 'true' : 'false',
            timestamp: Date.now(),
            cookie: musicU ? 'MUSIC_U=' + musicU : ''
        });
        return request(BASE + '/like?' + params.toString());
    }

    async function getLikelist(uid) {
        return request(BASE + '/likelist?uid=' + uid + getCookieParam());
    }

    function convertTrack(track) {
        var artistNames = '';
        if (track.ar && track.ar.length) {
            artistNames = track.ar.map(function(a) { return a.name; }).join('/');
        } else if (track.artists && track.artists.length) {
            artistNames = track.artists.map(function(a) { return a.name; }).join('/');
        }
        var albumName = '';
        var coverUrl = null;
        if (track.al) {
            albumName = track.al.name || '';
            coverUrl = track.al.picUrl || null;
        } else if (track.album) {
            albumName = track.album.name || '';
            coverUrl = track.album.picUrl || null;
        }
        if (!coverUrl && track.picUrl) {
            coverUrl = track.picUrl;
        }
        // Use proxy for cover images to avoid CORS
        var proxyCoverUrl = null;
        if (coverUrl) {
            proxyCoverUrl = BASE + '/cover?url=' + encodeURIComponent(coverUrl + '?param=300y300');
        }
        // High quality cover for download
        var hqCoverUrl = null;
        if (coverUrl) {
            hqCoverUrl = BASE + '/cover?url=' + encodeURIComponent(coverUrl + '?param=1200y1200');
        }
        return {
            id: track.id,
            name: track.name,
            title: track.name,
            artist: artistNames || '未知艺术家',
            album: albumName || '未知专辑',
            coverUrl: proxyCoverUrl,
            hqCoverUrl: hqCoverUrl,
            hasCover: !!coverUrl,
            duration: track.dt || track.duration || 0,
            neteaseId: track.id,
            url: '',
            lrcUrl: null
        };
    }

    function parseLRC(text) {
        if (!text) return [];
        var lines = text.split('\n');
        var result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            var timeRegex = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
            var timestamps = [];
            var match, lastIndex = 0;
            while ((match = timeRegex.exec(line)) !== null) {
                var min = parseInt(match[1]), sec = parseInt(match[2]);
                var ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                timestamps.push(min * 60000 + sec * 1000 + ms);
                lastIndex = timeRegex.lastIndex;
            }
            if (timestamps.length > 0) {
                var lyricText = line.substring(lastIndex).trim();
                for (var j = 0; j < timestamps.length; j++) {
                    result.push({ time: timestamps[j], original: lyricText, translation: '' });
                }
            }
        }
        result.sort(function(a, b) { return a.time - b.time; });
        return result;
    }

    return {
        search, getSongUrl, getSongDetail, getLyric,
        getPlaylistDetail, getPersonalized, getToplist, getTopPlaylist,
        getQrKey, createQrCode, checkQrStatus, loginWithPhone,
        getUserAccount, getUserPlaylist, refreshLogin, getArtist, getAlbum,
        getDailyRecommend, likeSong, getLikelist,
        convertTrack, parseLRC, getCookie, setCookie
    };
})();
