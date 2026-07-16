/**
 * Audio Engine
 * Howler.js wrapper for local file playback
 */

const AudioEngine = (() => {
    let sound = null;
    let currentObjectUrl = null;
    let isPlaying = false;
    let volume = 0.8;
    let isMuted = false;
    let currentRate = 1;
    let updateInterval = null;

    // Web Audio API for visualization
    let audioContext = null;
    let analyser = null;
    let sourceNode = null;

    // Song cache to avoid reloading
    const songCache = new Map();
    const CACHE_MAX = 50;

    function getCachedUrl(url) {
        return songCache.get(url) || null;
    }

    function cacheSongUrl(originalUrl, blobUrl) {
        if (songCache.size >= CACHE_MAX) {
            // Remove oldest entry
            var firstKey = songCache.keys().next().value;
            var oldUrl = songCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            songCache.delete(firstKey);
        }
        songCache.set(originalUrl, blobUrl);
    }

    // Event callbacks
    const listeners = {
        play: [],
        pause: [],
        end: [],
        timeupdate: [],
        load: [],
        error: [],
        loading: []
    };

    function on(event, callback) {
        if (listeners[event]) listeners[event].push(callback);
    }

    function off(event, callback) {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
    }

    function emit(event, data) {
        if (listeners[event]) {
            listeners[event].forEach(cb => cb(data));
        }
    }

    // Load and play a file from File object or Object URL
    function play(source) {
        // Cleanup previous
        stop();

        let url;
        if (source instanceof File) {
            url = URL.createObjectURL(source);
            currentObjectUrl = url;
        } else if (typeof source === 'string') {
            url = proxyNeteaseUrl(source);
            // Check cache for URL-based sources
            var cached = getCachedUrl(url);
            if (cached) {
                url = cached;
            }
        } else {
            return;
        }

        emit('loading');
        sound = new Howl({
            src: [url],
            html5: true,
            volume: isMuted ? 0 : volume,
            onplay: () => {
                isPlaying = true;
                startTimeUpdate();
                emit('play');
            },
            onpause: () => {
                isPlaying = false;
                stopTimeUpdate();
                emit('pause');
            },
            onend: () => {
                isPlaying = false;
                stopTimeUpdate();
                emit('end');
            },
            onload: () => {
                emit('load', {
                    duration: sound.duration()
                });
                // Cache URL-based sources
                if (source && typeof source === 'string' && !getCachedUrl(source)) {
                    // Store original URL mapping for cache
                    songCache.set(source, url);
                }
            },
            onloaderror: (id, err) => {
                console.error('Load error:', err);
                emit('error', err);
            }
        });

        sound.rate(currentRate);
        sound.play();
    }

    // Load without auto-playing
    function load(source) {
        stop();
        isPlaying = false;
        var url;
        if (source instanceof File) { url = URL.createObjectURL(source); currentObjectUrl = url; }
        else if (typeof source === 'string') { url = proxyNeteaseUrl(source); }
        else return;

        sound = new Howl({
            src: [url], html5: true, volume: isMuted ? 0 : volume,
            onplay: () => { isPlaying = true; startTimeUpdate(); emit('play'); },
            onpause: () => { isPlaying = false; stopTimeUpdate(); emit('pause'); },
            onend: () => { isPlaying = false; stopTimeUpdate(); emit('end'); },
            onload: () => { emit('load', { duration: sound.duration() }); },
            onloaderror: (id, err) => { console.error('Load error:', err); }
        });
        sound.rate(currentRate);

        // Setup Web Audio API for visualization
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            if (sound._sounds && sound._sounds[0] && sound._sounds[0]._node) {
                if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
                sourceNode = audioContext.createMediaElementSource(sound._sounds[0]._node);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                sourceNode.connect(analyser);
                analyser.connect(audioContext.destination);
            }
        } catch(e) { console.error('Web Audio API setup error:', e); }
    }

    function pause() {
        if (sound && isPlaying) {
            sound.pause();
        }
    }

    function resume() {
        if (sound) {
            sound.play();
        }
    }

    function togglePlay() {
        if (isPlaying) pause();
        else resume();
    }

    function stop() {
        if (sound) {
            sound.stop();
            sound.unload();
            sound = null;
        }
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        isPlaying = false;
        stopTimeUpdate();
        emit('pause');
    }

    let seekTimer = null;
    let isSeeking = false;

    // ponytail: direct node access for CDN URLs where Howler seek() fails
    function getAudioNode() {
        try {
            if (sound && sound._sounds && sound._sounds[0] && sound._sounds[0]._node) {
                return sound._sounds[0]._node;
            }
        } catch(e) {}
        return null;
    }

    // Proxy NetEase CDN URLs through server for seeking support
    function proxyNeteaseUrl(url) {
        if (!url || typeof url !== 'string') return url;
        // Only proxy direct CDN URLs (http...music.126.net), skip already-proxied /api/ paths
        if (url.startsWith('http') && (url.indexOf('.music.126.net') > -1 || url.indexOf('.music.163.com') > -1)) {
            return '/api/netease/stream?url=' + encodeURIComponent(url);
        }
        return url;
    }

    function seek(time) {
        if (sound) {
            var node = getAudioNode();
            if (node) {
                // Direct seek on native audio element - works on remote CDN URLs
                try { node.currentTime = time; } catch(e) {}
            } else {
                // Fallback to Howler seek with debounce
                if (seekTimer) clearTimeout(seekTimer);
                isSeeking = true;
                seekTimer = setTimeout(function() {
                    sound.seek(time);
                    isSeeking = false;
                }, 50);
            }
            // Emit timeupdate immediately for UI responsiveness
            var dur = sound.duration();
            if (!dur || !isFinite(dur)) {
                dur = (node && node.duration && isFinite(node.duration)) ? node.duration : 0;
            }
            emit('timeupdate', {
                current: time,
                duration: dur
            });
        }
    }

    function seekPercent(percent) {
        var duration = getDuration();
        if (duration > 0) {
            seek(duration * Math.max(0, Math.min(1, percent)));
        }
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (sound && !isMuted) {
            sound.volume(volume);
        }
    }

    function getVolume() {
        return volume;
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (sound) {
            sound.volume(isMuted ? 0 : volume);
        }
        return isMuted;
    }

    function getPosition() {
        if (!sound) return 0;
        var node = getAudioNode();
        return node ? node.currentTime : sound.seek();
    }

    function getDuration() {
        if (!sound) return 0;
        var d = sound.duration();
        // ponytail: Howler may return Infinity on remote CDN URLs
        if (!d || !isFinite(d)) {
            var node = getAudioNode();
            if (node && node.duration && isFinite(node.duration)) {
                return node.duration;
            }
        }
        return d;
    }

    function setRate(rate) {
        currentRate = rate;
        if (sound) sound.rate(rate);
    }

    function getRate() {
        return currentRate;
    }

    function getIsPlaying() {
        return isPlaying;
    }

    // Time update loop
    function startTimeUpdate() {
        stopTimeUpdate();
        updateInterval = setInterval(() => {
            if (sound && isPlaying && !isSeeking) {
                var node = getAudioNode();
                var current = node ? node.currentTime : sound.seek();
                var duration = sound.duration();
                // ponytail: fallback duration from native node
                if (!duration || !isFinite(duration)) {
                    duration = (node && node.duration && isFinite(node.duration)) ? node.duration : 0;
                }
                emit('timeupdate', {
                    current: current,
                    duration: duration
                });
                // Detect end if near the end and not progressing
                if (duration > 0 && current > 0 && current >= duration - 0.5) {
                    // Let onend handle it naturally, but force if stuck
                    setTimeout(function() {
                        if (sound && isPlaying) {
                            var c = node ? node.currentTime : sound.seek();
                            if (c >= duration - 0.3) {
                                isPlaying = false;
                                stopTimeUpdate();
                                emit('end');
                            }
                        }
                    }, 1000);
                }
            }
        }, 50); // ~20fps update
    }

    function stopTimeUpdate() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    return {
        play,
        load,
        pause,
        resume,
        togglePlay,
        stop,
        seek,
        seekPercent,
        setVolume,
        getVolume,
        toggleMute,
        getPosition,
        getDuration,
        setRate,
        getRate,
        getIsPlaying,
        getAnalyser: function() { return analyser; },
        on,
        off,
        get isMuted() { return isMuted; }
    };
})();
