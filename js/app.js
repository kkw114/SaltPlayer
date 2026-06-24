/**
 * App - Main Application
 */

const App = (() => {
    let lrcFileMap = {};
    let firstLoad = true;

    let sourceMode = 'default';
    let playbackSourceMode = 'default'; // Actual playback source, doesn't change when just viewing tabs
    let currentSubfolder = '';
    let localDirHandle = null;
    let localSubfolders = [];
    let currentLabel = 'SaltLink';
    let lastStateUpdate = 0;

    function postState() {
        var t = PlaylistManager.getCurrentTrack();
        if (!t) return;
        var lyrics = typeof LyricsEngine !== 'undefined' ? LyricsEngine.lyrics : [];
        var currentLyricIndex = typeof LyricsEngine !== 'undefined' ? LyricsEngine.currentLine : -1;
        // 获取当前主题色
        var rootStyle = getComputedStyle(document.documentElement);
        var accentColor = rootStyle.getPropertyValue('--rnp-accent-color').trim() || 'rgb(120,120,120)';
        var accentRgb = rootStyle.getPropertyValue('--rnp-accent-color-rgb').trim() || '120,120,120';
        var shade2 = rootStyle.getPropertyValue('--rnp-accent-color-shade-2').trim() || 'rgb(255,255,255)';
        var shade2Rgb = rootStyle.getPropertyValue('--rnp-accent-color-shade-2-rgb').trim() || '255,255,255';
        // 获取调色板 - 压缩为简单格式
        var palette = window._rnpPalette || null;
        var paletteCompact = null;
        if (palette && palette.length > 0) {
            paletteCompact = palette.map(function(c) { return [c[0], c[1], c[2]]; });
        }
        // 获取字体设置
        var customFontFamily = typeof Settings !== 'undefined' ? Settings.get('customFontFamily') || '' : '';
        // 处理封面URL - 使用代理避免CORS问题
        var coverUrl = t.coverUrl || '';
        if (coverUrl && coverUrl.startsWith('http')) {
            coverUrl = '/api/netease/cover?url=' + encodeURIComponent(coverUrl);
        }
        var state = {
            title: t.title || t.name || '',
            artist: t.artist || '',
            coverUrl: coverUrl,
            rawCoverUrl: t.coverUrl || '',
            currentTime: typeof AudioEngine !== 'undefined' ? AudioEngine.getPosition() : 0,
            duration: typeof AudioEngine !== 'undefined' ? AudioEngine.getDuration() : 0,
            lyrics: lyrics.map(function(l) { return { original: l.original || '', translation: l.translation || '' }; }),
            currentLyricIndex: currentLyricIndex,
            playing: typeof AudioEngine !== 'undefined' ? AudioEngine.getIsPlaying() : false,
            accentColor: accentColor,
            accentRgb: accentRgb,
            shade2: shade2,
            shade2Rgb: shade2Rgb,
            palette: paletteCompact,
            customFontFamily: customFontFamily
        };
        fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        }).catch(function() {});
    }

    function fmtRate(r) {
        var s = r.toFixed(2);
        if (s.endsWith('00')) s = s.slice(0, -3);
        else if (s.endsWith('0')) s = s.slice(0, -1);
        return s + 'x';
    }

    function init() {
        var debugEl = document.getElementById('debug-log');
        // Auto-clear previous log
        if (debugEl) debugEl.textContent = '';
        var debugSwitch = document.getElementById('debug-switch');
        var debugOn = false;
        if (debugSwitch) {
            debugSwitch.addEventListener('change', function() {
                debugOn = this.checked;
                if (debugOn && debugEl) debugEl.style.display = 'block';
                else if (debugEl) debugEl.style.display = 'none';
                // Sync settings panel debug switch
                var dss = document.getElementById('debug-switch-settings');
                if (dss) dss.checked = this.checked;
            });
        }
        // Also sync from settings panel
        var dss2 = document.getElementById('debug-switch-settings');
        if (dss2) {
            dss2.addEventListener('change', function() {
                debugOn = this.checked;
                if (debugOn && debugEl) debugEl.style.display = 'block';
                else if (debugEl) debugEl.style.display = 'none';
                if (debugSwitch) debugSwitch.checked = this.checked;
            });
        }
        function debug(msg) {
            console.log('[init]', msg);
            if (debugOn && debugEl) {
                debugEl.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n';
                debugEl.scrollTop = debugEl.scrollHeight;
            }
        }
        // Toggle debug panel visibility
        function toggleDebugPanel(show) {
            var panel = document.getElementById('debug-log-panel');
            if (panel) panel.style.display = show ? 'block' : 'none';
        }
        if (debugSwitch) {
            debugSwitch.addEventListener('change', function() {
                debugOn = this.checked;
                toggleDebugPanel(this.checked);
                var dss = document.getElementById('debug-switch-settings');
                if (dss) dss.checked = this.checked;
            });
        }
        // Drag functionality
        var debugHeader = document.getElementById('debug-log-header');
        if (debugHeader) {
            var dragX = 0, dragY = 0, dragging = false;
            debugHeader.addEventListener('mousedown', function(e) {
                dragging = true;
                var panel = document.getElementById('debug-log-panel');
                dragX = e.clientX - panel.offsetLeft;
                dragY = e.clientY - panel.offsetTop;
                e.preventDefault();
            });
            document.addEventListener('mousemove', function(e) {
                if (!dragging) return;
                var panel = document.getElementById('debug-log-panel');
                panel.style.left = (e.clientX - dragX) + 'px';
                panel.style.top = (e.clientY - dragY) + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            });
            document.addEventListener('mouseup', function() { dragging = false; });
        }
        // Clear button
        var clearBtn = document.getElementById('debug-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                var log = document.getElementById('debug-log');
                if (log) log.textContent = '';
            });
        }
        // Copy button
        var copyBtn = document.getElementById('debug-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                var log = document.getElementById('debug-log');
                if (log) {
                    navigator.clipboard.writeText(log.textContent).catch(function() {});
                    copyBtn.textContent = '✓';
                    setTimeout(function() { copyBtn.textContent = '📋'; }, 1000);
                }
            });
        }
        try {
            debug('UI.init...');
            UI.init();
            debug('initSettingsEvents...');
            UI.initSettingsEvents();
            debug('initSourceEvents...');
            UI.initSourceEvents();
            UI.updatePlaymodeUI(PlaylistManager.getPlaymode());
            UI.showLyricsPanel();
            UI.initVolumeUI();
            debug('bindEvents...');
            bindEvents();
            bindKeyboardShortcuts();
            // Restore playback settings
            AudioEngine.setVolume(Settings.get('volume') / 100 || 0.8);
            UI.updateVolumeUI(AudioEngine.getVolume(), false);
            var savedRate = Settings.get('rate') || 1;
            AudioEngine.setRate(savedRate);
            document.getElementById('btn-speed').textContent = fmtRate(savedRate);
            // Auto-restore font
            var savedFont = Settings.get('customFontFamily');
            if (savedFont) {
                fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                    var found = null;
                    for (var i = 0; i < fonts.length; i++) {
                        if (fonts[i].replace(/\.[^.]+$/, '') === savedFont) { found = fonts[i]; break; }
                    }
                    if (found) {
                        var ext = found.split('.').pop().toLowerCase();
                        var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                        var style = document.getElementById('custom-font-style');
                        if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
                        style.textContent = '@font-face { font-family: "' + savedFont + '"; src: url("/fonts/' + found + '") format("' + fmt + '"); }';
                        document.body.classList.add('rnp-custom-font');
                        document.documentElement.style.setProperty('--rnp-custom-font-family', '"' + savedFont + '", "Inter", sans-serif');
                    }
                });
            }
            // Restore per-element font variables
            var perFonts = { lyricFontFamily: '--font-lyric', transFontFamily: '--font-trans', titleFontFamily: '--font-title', artistFontFamily: '--font-artist' };
            for (var pfk in perFonts) {
                if (perFonts.hasOwnProperty(pfk)) {
                    var pfv = Settings.get(pfk);
                    if (pfv) {
                        document.documentElement.style.setProperty(perFonts[pfk], '"' + pfv + '", "Inter", sans-serif');
                    }
                }
            }
            debug('loadWebdavSavedList...');
            loadWebdavSavedList();
            debug('init done');
        } catch(e) { debug('ERROR: ' + e.message); console.error('App init error:', e); }

        sourceMode = 'default';
        playbackSourceMode = 'default';
        var lastSrc = Settings.get('lastSource') || 'default';
        var lastSub = Settings.get('lastSubfolder') || '';
        var lastIdx = Settings.get('lastTrackIndex');
        var forceDefault = localStorage.getItem('salt-force-default') === '1';
        if (forceDefault) {
            lastSrc = 'default';
            lastIdx = -1;
            localStorage.removeItem('salt-force-default');
        }
        var dailyAsDefault = Settings.get('neteaseDefaultDaily') && !forceDefault;
        debug('lastSrc=' + lastSrc + ' lastSub=' + lastSub + ' lastIdx=' + lastIdx + ' dailyAsDefault=' + dailyAsDefault);

        // If daily recommend as default, skip loading default source
        if (dailyAsDefault) {
            sourceMode = 'netease';
            UI.updateSourceLabel('网易云音乐', 'netease');
            UI.showPlayer();
            // Show loading state
            UI.updateTrackInfo({ title: '加载每日推荐...', artist: '网易云音乐' });
            // Load folder list in background
            fetch('/api/folders').then(function(r) { return r.json(); }).then(function(d) {
                UI.renderSourceFolders(d.subfolders, d.totalCount, '');
            });
            // Switch to netease tab and load daily
            if (typeof NetEaseUI !== 'undefined') {
                NetEaseUI.restoreLogin();
                UI.updateSourceTab('netease');
                // Load liked songs
                if (typeof loadLikedSongs === 'function') loadLikedSongs();
                setTimeout(function() {
                    NetEaseUI.loadDailyRecommend().then(function() {
                        NetEaseAPI.getDailyRecommend().then(function(data) {
                            if (data && data.data && data.data.dailySongs) {
                                var tracks = data.data.dailySongs;
                                var now = new Date();
                                if (now.getHours() < 6) now.setDate(now.getDate() - 1);
                                var dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日';
                                NetEaseUI.playNeteaseTracks(tracks, 0, '每日推荐 · ' + dateStr);
                            }
                        });
                    });
                }, 500);
            }
            return;
        }

        // If last source was webdav or netease, check if valid
        if (lastSrc === 'webdav' || lastSrc === 'netease') {
            if (lastSrc === 'netease') {
                // Check if logged in
                var neCookie = localStorage.getItem('netease-cookie') || localStorage.getItem('netease-music-u');
                if (!neCookie && !dailyAsDefault) {
                    // Not logged in, fall back to default
                    lastSrc = 'default';
                    Settings.set('lastSource', 'default');
                } else {
                    sourceMode = 'netease';
                    UI.updateSourceLabel('网易云音乐', 'netease');
                    if (typeof NetEaseUI !== 'undefined') NetEaseUI.restoreLogin();
                    tryRestoreLocalFolder();
                    return;
                }
            } else {
                sourceMode = 'webdav';
                debug('tryRestoreWebdav...');
                tryRestoreWebdav();
                tryRestoreLocalFolder();
                return;
            }
        }

        // Load default source
        if (lastSub && lastSub.charAt(0) !== '/') {
            currentSubfolder = lastSub;
        } else {
            currentSubfolder = '';
        }
            UI.updateSourceLabel('SaltLink', 'default');
        var _restoreSub = currentSubfolder;
        debug('loadFromServer, sub=' + currentSubfolder);
        UI.showPlayer();
        loadFromServer().then(function() {
            debug('server loaded, tracks=' + PlaylistManager.length);
            if (lastIdx >= 0 && lastIdx < PlaylistManager.length) {
                PlaylistManager.setCurrentIndexSilent(lastIdx);
            }
            fetch('/api/folders').then(function(r) { return r.json(); }).then(function(d) {
                UI.renderSourceFolders(d.subfolders, d.totalCount, _restoreSub);
            });
        }).catch(function(e) { debug('server load FAILED: ' + (e && e.message)); });
        tryRestoreLocalFolder();
    }

    function bindEvents() {
        var els = UI.els;

        // Fix position button
        var fixBtn = document.getElementById('btn-fix-position');
        if (fixBtn) {
            fixBtn.addEventListener('click', function() {
                localStorage.setItem('salt-force-default', '1');
                // Disable daily recommend as default page
                Settings.set('neteaseDefaultDaily', false);
                location.reload();
            });
        }

        els.btnPlay.addEventListener('click', function() { AudioEngine.togglePlay(); });
        els.btnNext.addEventListener('click', function() { playNext(); });
        els.btnPrev.addEventListener('click', function() { playPrev(); });
        els.btnPlaymode.addEventListener('click', function() { UI.updatePlaymodeUI(PlaylistManager.cyclePlaymode()); });
        els.btnMute.addEventListener('click', function() {
            UI.updateVolumeUI(AudioEngine.getVolume(), AudioEngine.toggleMute());
            Settings.set('volume', Math.round(AudioEngine.getVolume() * 100));
        });

        setupSlider(els.progressBar, function(pct) { AudioEngine.seekPercent(pct); });

        els.btnMute.addEventListener('wheel', function(e) {
            e.preventDefault();
            var v = AudioEngine.getVolume() + (e.deltaY > 0 ? -0.05 : 0.05);
            v = Math.max(0, Math.min(1, v));
            AudioEngine.setVolume(v);
            UI.updateVolumeUI(v, false);
            Settings.set('volume', Math.round(v * 100));
        });

        els.btnTogglePlaylist.addEventListener('click', function() { UI.togglePlaylistPanel(); });
        document.getElementById('btn-close-playlist').addEventListener('click', function() { UI.togglePlaylistPanel(); });

        // Sort playlist button
        var btnSort = document.getElementById('btn-sort-playlist');
        var sortDropdown = document.getElementById('sort-dropdown');
        if (btnSort && sortDropdown) {
            btnSort.addEventListener('click', function(e) {
                e.stopPropagation();
                sortDropdown.classList.toggle('hidden');
            });
            sortDropdown.querySelectorAll('.sort-option').forEach(function(opt) {
                opt.addEventListener('click', function() {
                    var sortType = opt.dataset.sort;
                    sortDropdown.querySelectorAll('.sort-option').forEach(function(o) { o.classList.remove('active'); });
                    opt.classList.add('active');
                    sortDropdown.classList.add('hidden');
                    UI.sortPlaylist(sortType);
                });
            });
            document.addEventListener('click', function() { sortDropdown.classList.add('hidden'); });
        }

        // Playlist search
        var playlistSearchInput = document.getElementById('playlist-search-input');
        var btnClearSearch = document.getElementById('btn-clear-search');
        if (playlistSearchInput) {
            var searchTimer = null;
            playlistSearchInput.addEventListener('input', function() {
                clearTimeout(searchTimer);
                // Show/hide clear button
                if (btnClearSearch) {
                    btnClearSearch.classList.toggle('hidden', !playlistSearchInput.value);
                }
                searchTimer = setTimeout(function() {
                    UI.filterPlaylist(playlistSearchInput.value);
                }, 200);
            });
        }
        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', function() {
                playlistSearchInput.value = '';
                btnClearSearch.classList.add('hidden');
                UI.filterPlaylist('');
                playlistSearchInput.focus();
            });
        }

        // Like button (NetEase only)
        var btnLike = document.getElementById('btn-like');
        var iconHeart = document.getElementById('icon-heart');
        var iconHeartFilled = document.getElementById('icon-heart-filled');
        var likedSongIds = new Set();

        function updateLikeButton(track) {
            if (!btnLike) return;
            if (playbackSourceMode === 'netease' && track && track.neteaseId) {
                // Only show like button for daily recommend or liked songs playlist
                var folderName = els.folderName ? els.folderName.textContent : '';
                var isDaily = folderName.indexOf('每日推荐') >= 0;
                var isLikedPlaylist = (typeof NetEaseUI !== 'undefined' && NetEaseUI.getCurrentPlaylistId && NetEaseUI.getLikedSongsPlaylistId) &&
                    NetEaseUI.getCurrentPlaylistId() === NetEaseUI.getLikedSongsPlaylistId();
                if (isDaily || isLikedPlaylist) {
                    btnLike.classList.remove('hidden');
                    var isLiked = likedSongIds.has(track.neteaseId);
                    iconHeart.classList.toggle('hidden', isLiked);
                    iconHeartFilled.classList.toggle('hidden', !isLiked);
                } else {
                    btnLike.classList.add('hidden');
                }
            } else {
                btnLike.classList.add('hidden');
            }
        }

        if (btnLike) {
            btnLike.addEventListener('click', async function() {
                var track = PlaylistManager.getCurrentTrack();
                if (!track || !track.neteaseId) return;
                var isLiked = likedSongIds.has(track.neteaseId);
                try {
                    await NetEaseAPI.likeSong(track.neteaseId, !isLiked);
                    if (isLiked) {
                        likedSongIds.delete(track.neteaseId);
                    } else {
                        likedSongIds.add(track.neteaseId);
                    }
                    updateLikeButton(track);
                    showToast(isLiked ? '已取消喜欢' : '已添加到喜欢');
                } catch(e) {
                    showToast('操作失败');
                }
            });
        }

        // Load liked songs when switching to NetEase
        async function loadLikedSongs() {
            try {
                var accountData = await NetEaseAPI.getUserAccount();
                if (accountData && accountData.profile) {
                    var likelistData = await NetEaseAPI.getLikelist(accountData.profile.userId);
                    if (likelistData && likelistData.ids) {
                        likedSongIds = new Set(likelistData.ids);
                    }
                }
            } catch(e) {}
        }

        // Expose for external use
        window.loadLikedSongs = loadLikedSongs;
        window.updateLikeButton = updateLikeButton;

        // Double-click track info to copy song info
        var trackInfo = document.querySelector('.track-info');
        if (trackInfo) {
            trackInfo.addEventListener('dblclick', function() {
                copyTrackInfo();
            });
            // Right-click context menu
            trackInfo.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showTrackContextMenu(e.clientX, e.clientY);
            });
        }

        var speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        var btnSpeed = document.getElementById('btn-speed');
        btnSpeed.addEventListener('click', function() {
            var cur = AudioEngine.getRate();
            var next = speeds.find(function(s) { return s > cur + 0.001; }) || speeds[0];
            AudioEngine.setRate(next);
            btnSpeed.textContent = fmtRate(next);
            Settings.set('rate', next);
        });
        document.addEventListener('keyup', function(e) {
            if (e.code === 'KeyX' || e.code === 'KeyC') btnSpeed.textContent = fmtRate(AudioEngine.getRate());
        });

        AudioEngine.on('play', function() {
            UI.updatePlayButton(true);
            var t = PlaylistManager.getCurrentTrack();
            if (t) {
                UI.updateTrackInfo(t);
                UI.updateAlbumArt(t.coverUrl);
                // Update page title
                document.title = t.title + ' - ' + t.artist;
                // Update favicon to album cover
                updateFavicon(t.coverUrl);
                // Update Windows media controls
                updateMediaSession(t);
                // Sync state to mini mode
                postState();
            }
            // Update NetEase quality display
            if (sourceMode === 'netease' && typeof NetEaseUI !== 'undefined') {
                NetEaseUI.updateQualityDisplay(t);
            }
        });
        AudioEngine.on('pause', function() { UI.updatePlayButton(false); document.title = 'SaltPlayer'; updateFavicon(null); });
        AudioEngine.on('timeupdate', function(d) {
            UI.updateProgress(d.current, d.duration);
            LyricsEngine.update(d.current * 1000);
            // Throttle state updates to every 500ms
            if (Date.now() - lastStateUpdate > 500) {
                postState();
                lastStateUpdate = Date.now();
            }
        });
        AudioEngine.on('end', function() {
            if (PlaylistManager.next(false) === -1) UI.updatePlayButton(false);
        });
        AudioEngine.on('load', function(d) { UI.updateProgress(0, d.duration); });

        PlaylistManager.on('trackchange', function(track) {
            if (track) {
                Settings.set('lastTrackIndex', PlaylistManager.currentIndex);
                Settings.set('lastTrackName', track.title || track.name || '');
                loadAndPlayTrack(track);
            }
        });

        document.addEventListener('dragover', function(e) { e.preventDefault(); UI.showDropOverlay(); });
        document.addEventListener('dragleave', function(e) { if (!e.relatedTarget) UI.hideDropOverlay(); });
        document.addEventListener('drop', async function(e) {
            e.preventDefault(); UI.hideDropOverlay();
            var lrcs = [].filter.call(e.dataTransfer.files, function(f) { return MetadataReader.isLRCFile(f.name); });
            for (var k = 0; k < lrcs.length; k++) await loadLRCFile(lrcs[k]);
        });
    }

    function setupSlider(el, onChange) {
        var d = false;
        var p = function(e) { var r = el.getBoundingClientRect(); return Math.max(0, Math.min(1, ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width)); };
        el.addEventListener('mousedown', function(e) { d = true; onChange(p(e)); });
        el.addEventListener('touchstart', function(e) { d = true; onChange(p(e)); }, {passive:true});
        document.addEventListener('mousemove', function(e) { if (d) onChange(p(e)); });
        document.addEventListener('touchmove', function(e) { if (d) onChange(p(e)); }, {passive:true});
        document.addEventListener('mouseup', function() { d = false; });
        document.addEventListener('touchend', function() { d = false; });
    }

    function bindKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            var ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl && e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                var pct = parseInt(e.key) * 10;
                var dur = AudioEngine.getDuration();
                if (dur > 0) AudioEngine.seek(dur * pct / 100);
                return;
            }
            if (!ctrl && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); AudioEngine.seek(0); return; }
            if (!ctrl && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
                e.preventDefault();
                var v = AudioEngine.getVolume() + (e.code === 'ArrowUp' ? 0.1 : -0.1);
                v = Math.max(0, Math.min(1, v));
                AudioEngine.setVolume(v);
                UI.updateVolumeUI(v, false);
                Settings.set('volume', Math.round(v * 100));
                return;
            }
            if (ctrl && e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); return; }
            if (ctrl && e.code === 'ArrowRight') { e.preventDefault(); playNext(); return; }
            if (ctrl && e.code === 'ArrowDown') { e.preventDefault(); AudioEngine.togglePlay(); return; }
            if (!ctrl && e.code === 'ArrowLeft') { e.preventDefault(); AudioEngine.seek(AudioEngine.getPosition() - 5); return; }
            if (!ctrl && e.code === 'ArrowRight') { e.preventDefault(); AudioEngine.seek(AudioEngine.getPosition() + 5); return; }

            switch (e.code) {
                case 'KeyM': UI.updateVolumeUI(AudioEngine.getVolume(), AudioEngine.toggleMute()); Settings.set('volume', Math.round(AudioEngine.getVolume() * 100)); break;
                case 'KeyX': e.preventDefault(); var step = Settings.get('speedStep') || 0.05; var r = Math.max(0.5, AudioEngine.getRate() - step); AudioEngine.setRate(r); document.getElementById('btn-speed').textContent = fmtRate(r); Settings.set('rate', r); break;
                case 'KeyC': e.preventDefault(); var step2 = Settings.get('speedStep') || 0.05; var r2 = AudioEngine.getRate() + step2; if (r2 > 2) r2 = 0.5; AudioEngine.setRate(r2); document.getElementById('btn-speed').textContent = fmtRate(r2); Settings.set('rate', r2); break;
            }
        });
    }

    // ========== Source Management ==========

    async function loadDefaultSource() {
        sourceMode = 'default';
        currentSubfolder = '';
            currentLabel = 'SaltLink';
        UI.updateSourceLabel(currentLabel, 'default');
        // Don't auto-load tracks - wait for user to pick a folder
    }

    function setSourceMode(mode) {
        sourceMode = mode;
        Settings.set('lastSource', mode);
        UI.updateSourceTab(mode);
        if (mode === 'default') { loadDefaultSource(); }
        else if (mode === 'netease') {
            UI.updateSourceLabel('网易云音乐', 'netease');
            // Load liked songs when switching to NetEase
            if (typeof loadLikedSongs === 'function') loadLikedSongs();
        }
        else if (mode === 'local') { if (localDirHandle) renderLocalFolders(); }
    }

    function selectSubfolder(path, silent) {
        if (!silent) {
            Settings.set('lastSource', sourceMode);
            Settings.set('lastSubfolder', path || '');
        }
        if (sourceMode === 'default') {
            currentSubfolder = path || '';
        UI.updateSourceLabel('SaltLink', 'default');
            UI.updateFolderName(currentSubfolder || '全部歌曲');
            loadFromServer();
        } else if (sourceMode === 'local') {
            currentSubfolder = path || '';
            UI.updateFolderName(currentSubfolder || '全部歌曲');
            readLocalDir();
        }
    }

    async function loadFromServer() {
        try {
            var url = '/api/files';
            if (currentSubfolder) url += '?sub=' + encodeURIComponent(currentSubfolder);
            var resp = await fetch(url);
            var data = await resp.json();
            var dEl2 = document.getElementById('debug-log');
            if (dEl2 && dEl2.style.display !== 'none') {
                dEl2.textContent += '[loadFromServer] ' + url + ' -> ' + (Array.isArray(data) ? data.length + ' tracks' : typeof data) + '\n';
            }
            if (!Array.isArray(data) || !data.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }
            playbackSourceMode = 'default';
            populateTracks(data);
            UI.updateFolderName(currentSubfolder || '全部歌曲');
        } catch(e) {
            var dEl4 = document.getElementById('debug-log');
            if (dEl4 && dEl4.style.display !== 'none') {
                dEl4.textContent += '[loadFromServer] ERROR: ' + e.message + '\n';
            }
            console.error('Load error:', e); UI.els.folderName.textContent = '加载失败';
        }
    }

    function getSortGroup(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return 0;
        if (/[0-9]/.test(c)) return 1;
        return 0; // Chinese etc. sorts with A-Z by pinyin
    }

    function populateTracks(data) {
        var dEl = document.getElementById('debug-log');
        if (dEl && dEl.style.display !== 'none') {
            dEl.textContent += '[populateTracks] ' + data.length + ' tracks\n';
        }
        lrcFileMap = {};
        firstLoad = !AudioEngine.getIsPlaying();
        for (var i = 0; i < data.length; i++) {
            var t = data[i];
            if (t.lrcUrl) lrcFileMap[t.name] = t.lrcUrl;
            if (t.hasCover) t.coverUrl = '/api/cover?file=' + encodeURIComponent(t.url.replace('/music/', ''));
            else t.coverUrl = null;
        }
        data.sort(function(a, b) {
            var an = String(a.title || a.name || '');
            var bn = String(b.title || b.name || '');
            var ca = getSortGroup(an), cb = getSortGroup(bn);
            if (ca !== cb) return ca - cb;
            return an.localeCompare(bn, 'zh-CN');
        });
        PlaylistManager.setTracks(data);
        UI.showPlayer();
        UI.renderPlaylist(data, -1);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    function tryRestoreWebdav() {
        var activeUrl = Settings.get('lastWebdavUrl') || '';
        if (!activeUrl) return;
        var list = Settings.get('webdavConnections') || [];
        var lastSub = Settings.get('lastWebdavFolder') || Settings.get('lastSubfolder') || '';
        var lastIdx = Settings.get('lastTrackIndex');
        var lastTrackName = Settings.get('lastTrackName') || '';
        for (var i = 0; i < list.length; i++) {
            if (list[i].url === activeUrl) {
                var connName = list[i].name || activeUrl.replace(/https?:\/\//, '').split('/')[0];
                UI.updateSourceLabel(connName, 'webdav');
                UI.updateSourceTab('webdav');
                doWebdavConnect(list[i].url, list[i].username, list[i].password, list[i].name).then(function(ok) {
                    if (!ok) return;
                    // Load root folder first
                    loadWebdavFolder('');
                    // Poll for root to finish loading
                    var poll = setInterval(function() {
                        if (webdavRootData && webdavRootData.subfolders) {
                            clearInterval(poll);
                            // Wait 2s then restore subfolder
                            setTimeout(function() {
                                if (lastSub && lastSub !== webdavBasePath()) {
                                    currentSubfolder = lastSub;
                                    var folderName = 'WebDAV · ' + (lastSub.split('/').filter(Boolean).pop() || '全部歌曲');
                                    UI.updateFolderName(folderName);
                                    loadWebdavFolder(lastSub).then(function() {
                                        restoreWebdavTrack(lastTrackName, lastIdx);
                                    });
                                } else {
                                    UI.updateFolderName('全部歌曲');
                                    restoreWebdavTrack(lastTrackName, lastIdx);
                                }
                            }, 2000);
                        }
                    }, 200);
                    setTimeout(function() { clearInterval(poll); }, 30000);
                });
                return;
            }
        }
    }

    // ========== Local Folder Mode ==========

    var localFileCache = {};
    var localTracksCache = {};

    function getFolderDB() {
        return new Promise(function(resolve, reject) {
            var req = indexedDB.open('rlp-folders', 1);
            req.onupgradeneeded = function() { req.result.createObjectStore('handles'); };
            req.onsuccess = function() { resolve(req.result); };
            req.onerror = function() { reject(req.error); };
        });
    }

    async function saveFolderHandle(handle) {
        try {
            var db = await getFolderDB();
            var tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(handle, 'lastFolder');
            return new Promise(function(resolve) { tx.oncomplete = resolve; });
        } catch(e) {}
    }

    async function restoreFolderHandle() {
        try {
            var db = await getFolderDB();
            var tx = db.transaction('handles', 'readonly');
            var req = tx.objectStore('handles').get('lastFolder');
            return new Promise(function(resolve, reject) {
                req.onsuccess = function() { resolve(req.result); };
                req.onerror = reject;
            });
        } catch(e) { return null; }
    }

    async function openLocalFolder() {
        if (!('showDirectoryPicker' in window)) {
            // Fallback for HTTP (non-localhost): use input[webkitdirectory]
            tryLocalFolderFallback();
            return;
        }
        try {
            var h = await window.showDirectoryPicker({ mode: 'read' });
            saveFolderHandle(h);
            await scanLocalHandle(h, false);
            selectSubfolder('');
        } catch(e) { if (e.name !== 'AbortError') console.error('Local folder error:', e); }
    }

    function tryLocalFolderFallback() {
        var input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.style.display = 'none';
        input.onchange = async function() {
            var files = [];
            Array.prototype.push.apply(files, input.files);
            if (!files.length) return;
            // Group files by relative path for subfolder detection
            var rootName = '';
            var subFolders = {};
            for (var i = 0; i < files.length; i++) {
                var f = files[i];
                var path = f.webkitRelativePath || f.name;
                var slash = path.indexOf('/');
                if (slash > 0) {
                    var folder = path.substring(0, slash);
                    if (!subFolders[folder]) subFolders[folder] = { files: [], lrcs: [] };
                    if (MetadataReader.isAudioFile(f.name)) subFolders[folder].files.push(f);
                    else if (MetadataReader.isLRCFile(f.name)) subFolders[folder].lrcs.push(f);
                } else {
                    if (!rootName) rootName = f.name;
                    if (!subFolders['']) subFolders[''] = { files: [], lrcs: [] };
                    if (MetadataReader.isAudioFile(f.name)) subFolders[''].files.push(f);
                    else if (MetadataReader.isLRCFile(f.name)) subFolders[''].lrcs.push(f);
                }
            }
            if (rootName) currentLabel = rootName;
            UI.updateSourceLabel(rootName || '本地', 'local');
            sourceMode = 'local';
            currentSubfolder = '';
            localFileCache = {};
            localTracksCache = {};
            localSubfolders = [];
            for (var k in subFolders) {
                if (subFolders.hasOwnProperty(k)) {
                    var sd = subFolders[k];
                    if (k === '') {
                        localTracksCache[''] = { files: sd.files, lrcs: sd.lrcs };
                    } else {
                        localSubfolders.push({ name: k, path: k, count: sd.files.length });
                        localTracksCache[k] = { files: sd.files, lrcs: sd.lrcs };
                    }
                }
            }
            var rootCount = localTracksCache[''] ? localTracksCache[''].files.length : 0;
            UI.renderSourceFolders(localSubfolders, rootCount, '', document.getElementById('source-local-folders'));
            UI.toggleSourcePanel(true);
            selectSubfolder('');
        };
        input.click();
    }

    async function scanLocalHandle(h, silent) {
        localDirHandle = h;
        currentLabel = h.name;
        Settings.set('lastLocalFolder', h.name);
        if (!silent) {
            UI.updateSourceLabel(h.name, 'local');
            UI.updateFolderName('全部歌曲');
        }
        sourceMode = 'local';
        currentSubfolder = '';
        localFileCache = {};
        localTracksCache = {};
        localSubfolders = [];

        var rootHandles = [], rootLrcHandles = [], dirHandles = [];
        for await (var e of h.values()) {
            if (e.kind === 'directory') dirHandles.push(e);
            else if (e.kind === 'file') {
                if (MetadataReader.isAudioFile(e.name)) rootHandles.push(e);
                else if (MetadataReader.isLRCFile(e.name)) rootLrcHandles.push(e);
            }
        }
        localFileCache[''] = { handles: rootHandles, lrcHandles: rootLrcHandles };

        for (var di = 0; di < dirHandles.length; di++) {
            var d = dirHandles[di];
            var sh = [], slh = [];
            try {
                for await (var se of d.values()) {
                    if (se.kind === 'file') {
                        if (MetadataReader.isAudioFile(se.name)) sh.push(se);
                        else if (MetadataReader.isLRCFile(se.name)) slh.push(se);
                    }
                }
            } catch(ex) {}
            if (sh.length > 0) {
                localSubfolders.push({ name: d.name, path: d.name, handle: d, count: sh.length });
                localFileCache[d.name] = { handles: sh, lrcHandles: slh };
            }
        }
        UI.renderSourceFolders(localSubfolders, rootHandles.length, '', document.getElementById('source-local-folders'));
        // Don't auto-load tracks - wait for user to click
    }

    async function readLocalDir() {
        var key = currentSubfolder || '';

        // If already cached with metadata, use directly
        var cached = localTracksCache[key];
        if (cached && cached.tracks) {
            setTracksFromCache(cached.tracks, key || localDirHandle.name);
            return;
        }

        if (!key) {
            // "全部歌曲" - load all directories, read all metadata, cache individually
            var allFiles = [], allLrcs = [];
            var names = [''];
            for (var si = 0; si < localSubfolders.length; si++) names.push(localSubfolders[si].name);

            // Load all files from all directories
            UI.els.folderName.textContent = '加载文件...';
            var fileGroups = {}; // name -> { files, lrcs }
            for (var ni = 0; ni < names.length; ni++) {
                var r = await loadOneDirFiles(names[ni]);
                fileGroups[names[ni]] = r;
                allFiles.push.apply(allFiles, r.files);
                allLrcs.push.apply(allLrcs, r.lrcs);
            }
            if (!allFiles.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }

            // Read metadata for ALL files at once
            var combinedEntry = { files: allFiles, lrcs: allLrcs };
            await applyLocalTracks(combinedEntry);
            // Now combinedEntry.tracks has all tracks with metadata

            // Split tracks back into per-folder caches
            var offset = 0;
            for (var si2 = 0; si2 < names.length; si2++) {
                var n = names[si2];
                var count = fileGroups[n].files.length;
                if (count > 0) {
                    var folderTracks = combinedEntry.tracks.slice(offset, offset + count);
                    var folderCacheEntry = localTracksCache[n] || {};
                    folderCacheEntry.tracks = folderTracks;
                    folderCacheEntry.files = fileGroups[n].files;
                    folderCacheEntry.lrcs = fileGroups[n].lrcs;
                    localTracksCache[n] = folderCacheEntry;
                    offset += count;
                }
            }
            // combinedEntry IS the 'all' cache
            localTracksCache[''] = combinedEntry;

            UI.renderSourceFolders(localSubfolders, allFiles.length, '', document.getElementById('source-local-folders'));
            return;
        }

        // Subfolder not cached yet (should not happen if "全部歌曲" loaded first)
        var r2 = await loadOneDirFiles(key);
        if (!r2.files.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }
        localTracksCache[key] = r2;
        await applyLocalTracks(r2);
    }

    function setTracksFromCache(tracks, label) {
        lrcFileMap = {};
        var key = currentSubfolder || '';
        var entry = localTracksCache[key];
        var lrcSource = null;
        if (entry && entry.lrcMap) lrcSource = entry.lrcMap;
        else if (localTracksCache[''] && localTracksCache[''].lrcMap) lrcSource = localTracksCache[''].lrcMap;
        if (lrcSource) {
            for (var k in lrcSource) {
                if (lrcSource.hasOwnProperty(k)) lrcFileMap[k] = lrcSource[k];
            }
        }
        firstLoad = !AudioEngine.getIsPlaying();
        playbackSourceMode = 'local';
        PlaylistManager.setTracks(tracks);
        UI.showPlayer();
        UI.updateFolderName(currentSubfolder || '全部歌曲');
        UI.renderPlaylist(tracks, -1);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    async function loadOneDirFiles(dirKey) {
        if (localTracksCache[dirKey]) return localTracksCache[dirKey];
        var entry = localFileCache[dirKey];
        if (!entry) return { files: [], lrcs: [] };
        var files = [], lrcs = [];
        for (var i = 0; i < entry.handles.length; i++) {
            try { files.push(await entry.handles[i].getFile()); } catch(ex) {}
        }
        for (var j = 0; j < entry.lrcHandles.length; j++) {
            try { lrcs.push(await entry.lrcHandles[j].getFile()); } catch(ex) {}
        }
        var result = { files: files, lrcs: lrcs };
        localTracksCache[dirKey] = result;
        return result;
    }

    async function applyLocalTracks(cached) {
        var af = cached.files, lf = cached.lrcs;
        lrcFileMap = {};
        if (!af.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }
        af.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });

        UI.els.folderName.textContent = '载入中...';
        var concurrency = 8;
        var tracks = new Array(af.length);
        var completed = 0;
        var idx = 0;

        function processOne() {
            if (idx >= af.length) return Promise.resolve();
            var i = idx++;
            var file = af[i];
            return MetadataReader.readFromFile(file).then(function(meta) {
                meta.file = file;
                tracks[i] = meta;
                completed++;
                UI.els.folderName.textContent = '载入中...(' + completed + '/' + af.length + ')';
                return processOne();
            }).catch(function() {
                // Fallback if metadata read fails
                tracks[i] = { title: MetadataReader.cleanFilename(file.name), artist: '', album: '', coverUrl: null, track: '', year: '', genre: '', file: file };
                completed++;
                return processOne();
            });
        }

        var workers = [];
        for (var w = 0; w < Math.min(concurrency, af.length); w++) {
            workers.push(processOne());
        }
        await Promise.all(workers);

        // Sort tracks by name for consistent display order
        tracks.sort(function(a, b) {
            var an = String(a.title || (a.file ? a.file.name : ''));
            var bn = String(b.title || (b.file ? b.file.name : ''));
            var ca = getSortGroup(an), cb = getSortGroup(bn);
            if (ca !== cb) return ca - cb;
            return an.localeCompare(bn, 'zh-CN');
        });

        for (var i = 0; i < lf.length; i++) {
            var l = lf[i], lb = l.name.replace(/\.lrc$/i, '').toLowerCase();
            for (var j = 0; j < tracks.length; j++) {
                if (tracks[j] && tracks[j].file.name.replace(/\.[^.]+$/, '').toLowerCase() === lb) { lrcFileMap[tracks[j].file.name] = l; break; }
            }
        }
        var dEl6 = document.getElementById('debug-log');
        if (dEl6 && dEl6.style.display !== 'none') {
            dEl6.textContent += '[local] lrcFiles=' + lf.length + ' matched=' + Object.keys(lrcFileMap).length + ' tracks=' + tracks.length + '\n';
        }
        // Save metadata into cache for instant switching back
        cached.tracks = tracks;
        cached.lrcMap = lrcFileMap;
        cached.currentIndex = 0;

        firstLoad = !AudioEngine.getIsPlaying();
        playbackSourceMode = 'local';
        PlaylistManager.setTracks(tracks);
        UI.showPlayer();
        UI.updateFolderName(currentSubfolder || '全部歌曲');
        UI.renderPlaylist(tracks, -1);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    function scanLocalDirContents() { readLocalDir(); }

    function renderLocalFolders() {
        var fc = 0;
        for (var i = 0; i < localSubfolders.length; i++) fc += localSubfolders[i].count || 0;
        UI.renderSourceFolders(localSubfolders, fc, currentSubfolder, document.getElementById('source-local-folders'));
    }

    async function loadAllLocalMeta() {
        // Load all directory files, read metadata, cache per folder - all in background
        var names = [''];
        for (var si = 0; si < localSubfolders.length; si++) names.push(localSubfolders[si].name);
        var allFiles = [], allLrcs = [];
        var fileGroups = {};
        for (var ni = 0; ni < names.length; ni++) {
            var r = await loadOneDirFiles(names[ni]);
            fileGroups[names[ni]] = r;
            allFiles.push.apply(allFiles, r.files);
            allLrcs.push.apply(allLrcs, r.lrcs);
        }
        if (!allFiles.length) return;
        var combinedEntry = { files: allFiles, lrcs: allLrcs };
        await applyLocalTracksSilent(combinedEntry);
        // Split back into per-folder caches
        var offset = 0;
        for (var si2 = 0; si2 < names.length; si2++) {
            var n = names[si2];
            var count = fileGroups[n].files.length;
            if (count > 0) {
                var folderTracks = combinedEntry.tracks.slice(offset, offset + count);
                var fcEntry = localTracksCache[n] || {};
                fcEntry.tracks = folderTracks;
                fcEntry.files = fileGroups[n].files;
                fcEntry.lrcs = fileGroups[n].lrcs;
                localTracksCache[n] = fcEntry;
                offset += count;
            }
        }
        localTracksCache[''] = combinedEntry;
    }

    // Like applyLocalTracks but doesn't touch UI (runs in background)
    async function applyLocalTracksSilent(cached) {
        var af = cached.files;
        if (!af.length) return;
        af.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
        var concurrency = 8;
        var tracks = new Array(af.length);
        var completed = 0;
        var idx = 0;

        function processOne() {
            if (idx >= af.length) return Promise.resolve();
            var i = idx++;
            return MetadataReader.readFromFile(af[i]).then(function(meta) {
                meta.file = af[i];
                tracks[i] = meta;
                completed++;
                return processOne();
            }).catch(function() {
                tracks[i] = { title: MetadataReader.cleanFilename(af[i].name), artist: '', album: '', coverUrl: null, track: '', year: '', genre: '', file: af[i] };
                completed++;
                return processOne();
            });
        }
        var workers = [];
        for (var w = 0; w < Math.min(concurrency, af.length); w++) workers.push(processOne());
        await Promise.all(workers);
        // Sort tracks
        tracks.sort(function(a, b) {
            var an = String(a.title || (a.file ? a.file.name : ''));
            var bn = String(b.title || (b.file ? b.file.name : ''));
            var ca = getSortGroup(an), cb = getSortGroup(bn);
            if (ca !== cb) return ca - cb;
            return an.localeCompare(bn, 'zh-CN');
        });
        // Match LRC files
        var lf = cached.lrcs || [];
        var lrcMap = {};
        for (var i = 0; i < lf.length; i++) {
            var l = lf[i], lb = l.name.replace(/\.lrc$/i, '').toLowerCase();
            for (var j = 0; j < tracks.length; j++) {
                if (tracks[j] && tracks[j].file.name.replace(/\.[^.]+$/, '').toLowerCase() === lb) { lrcMap[tracks[j].file.name] = l; break; }
            }
        }
        cached.tracks = tracks;
        cached.lrcMap = lrcMap;
        cached.currentIndex = 0;
    }

    async function tryRestoreLocalFolder() {
        if (!('showDirectoryPicker' in window)) return;
        var handle = await restoreFolderHandle();
        if (!handle) return;
        var lastSrc = Settings.get('lastSource') || 'default';
        try {
            var perm = await handle.queryPermission({ mode: 'read' });
            if (perm === 'granted') {
                var prevSrc = sourceMode;
                var prevSub = currentSubfolder;
                var prevLabel = currentLabel;
                await scanLocalHandle(handle, lastSrc !== 'local');
                if (lastSrc === 'local') {
                    // Was in local mode - stay there and load tracks
                    var lastSub = Settings.get('lastSubfolder') || '';
                    var lastIdx = Settings.get('lastTrackIndex');
                    if (lastSub) currentSubfolder = lastSub;
                    UI.updateSourceLabel(handle.name, 'local');
                    UI.updateFolderName(currentSubfolder || '全部歌曲');
                    loadAllLocalMeta().then(function() {
                        selectSubfolder(currentSubfolder, true);
                        if (lastIdx >= 0 && lastIdx < PlaylistManager.length) {
                            PlaylistManager.setCurrentIndexSilent(lastIdx);
                        }
                    });
                } else {
                    // Restore default state
                    sourceMode = prevSrc;
                    currentSubfolder = prevSub;
                    currentLabel = prevLabel;
                    loadAllLocalMeta();
                }
                return;
            }
        } catch(e) {}
        // Need user gesture - show restore button
        var container = document.getElementById('source-local-folders');
        if (!container) return;
        var lastName = Settings.get('lastLocalFolder') || '';
        var btn = document.createElement('button');
        btn.className = 'source-local-btn';
        btn.style.marginTop = '8px';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 恢复: ' + (lastName || '未知文件夹');
        btn.addEventListener('click', async function() {
            try {
                var perm2 = await handle.queryPermission({ mode: 'read' });
                if (perm2 !== 'granted') perm2 = await handle.requestPermission({ mode: 'read' });
                if (perm2 === 'granted') await scanLocalHandle(handle, false);
            } catch(e) { console.error('Restore error:', e); }
        });
        container.appendChild(btn);
    }

    // ========== WebDAV Mode ==========

    var webdavSessionId = null;

    function loadWebdavSavedList() {
        var list = Settings.get('webdavConnections') || [];
        var container = document.getElementById('webdav-saved-list');
        if (!container) return;
        container.innerHTML = '';
        var countEl = document.getElementById('webdav-user-count');
        if (countEl) countEl.textContent = list.length;
        var activeUrl = Settings.get('lastWebdavUrl') || '';

        for (var i = 0; i < list.length; i++) {
            (function(idx) {
                var conn = list[idx];
                var item = document.createElement('div');
                item.className = 'webdav-saved-item' + (conn.url === activeUrl ? ' active-user' : '');
                var hostName = conn.url.replace(/https?:\/\//, '').split('/')[0];
                item.innerHTML =
                    '<div class="webdav-saved-item-header">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                        '<span class="webdav-saved-item-name">' + (conn.name || hostName) + '</span>' +
                        '<span class="webdav-saved-item-url">' + hostName + '</span>' +
                        '<div class="webdav-saved-item-actions">' +
                            '<button class="btn-edit" title="编辑">✎</button>' +
                            '<button class="btn-delete" title="删除">✕</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="webdav-saved-item-detail">' +
                        '<label>备注名</label><input class="edit-name" value="' + (conn.name || '') + '" placeholder="选填"/>' +
                        '<label>连接地址</label><input class="edit-url" value="' + conn.url + '" placeholder="例: https://127.0.0.1:233/dav/..."/>' +
                        '<label>用户名</label><input class="edit-user" value="' + conn.username + '" placeholder="用户名"/>' +
                        '<label>密码</label><input class="edit-pass" type="password" value="' + conn.password + '" placeholder="密码"/>' +
                        '<button class="webdav-detail-btn">保存并连接</button>' +
                    '</div>';

                // Click header → connect
                item.querySelector('.webdav-saved-item-header').addEventListener('click', function(e) {
                    if (e.target.tagName === 'BUTTON') return;
                    doWebdavConnect(conn.url, conn.username, conn.password, conn.name);
                });

                // Edit button → expand
                item.querySelector('.btn-edit').addEventListener('click', function(e) {
                    e.stopPropagation();
                    item.classList.toggle('expanded');
                });

                // Save and connect
                item.querySelector('.webdav-detail-btn').addEventListener('click', function() {
                    var newName = item.querySelector('.edit-name').value.trim();
                    var newUrl = item.querySelector('.edit-url').value.trim();
                    var newUser = item.querySelector('.edit-user').value.trim();
                    var newPass = item.querySelector('.edit-pass').value.trim();
                    list[idx] = { name: newName, url: newUrl, username: newUser, password: newPass };
                    Settings.set('webdavConnections', list);
                    doWebdavConnect(newUrl, newUser, newPass, newName);
                    item.classList.remove('expanded');
                    loadWebdavSavedList();
                });

                // Delete
                item.querySelector('.btn-delete').addEventListener('click', function(e) {
                    e.stopPropagation();
                    list.splice(idx, 1);
                    Settings.set('webdavConnections', list);
                    loadWebdavSavedList();
                });

                container.appendChild(item);
            })(i);
        }

        // "添加用户" button at the bottom
        var addBtn = document.createElement('div');
        addBtn.className = 'webdav-add-user';
        addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 添加用户';
        addBtn.addEventListener('click', function() {
            // Add empty user, expand it immediately
            list.unshift({ name: '', url: '', username: '', password: '' });
            Settings.set('webdavConnections', list);
            loadWebdavSavedList();
            // Expand the first item
            var first = container.querySelector('.webdav-saved-item');
            if (first) first.classList.add('expanded');
        });
        container.appendChild(addBtn);
    }

    async function doWebdavConnect(url, username, password, name) {
        if (!url) { alert('请输入 WebDAV 地址'); return false; }
        try {
            var resp = await fetch('/api/webdav/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, username: username, password: password })
            });
            var data = await resp.json();
            if (data.sessionId) {
                webdavSessionId = data.sessionId;
                sourceMode = 'webdav';
                currentSubfolder = '';
                webdavRootData = null;
                UI.updateSourceTab('webdav');
                var label = name || url.replace(/https?:\/\//, '').split('/')[0];
                UI.updateSourceLabel(label, 'webdav');
                Settings.set('lastSource', 'webdav');
                Settings.set('lastWebdavUrl', url);
                saveWebdavConnection(url, username, password, name);
                loadWebdavSavedList();
                loadWebdavFolder('');
                return true;
            } else {
                alert(data.error || '连接失败');
                return false;
            }
        } catch(e) { alert('连接失败: ' + e.message); return false; }
    }

    function saveWebdavConnection(url, username, password, name) {
        var list = Settings.get('webdavConnections') || [];
        var host = url.replace(/https?:\/\//, '').split('/')[0];
        // Check if already exists, update it
        for (var i = 0; i < list.length; i++) {
            if (list[i].url === url && list[i].username === username) {
                list[i].password = password;
                list[i].name = name || list[i].name;
                Settings.set('webdavConnections', list);
                return;
            }
        }
        list.unshift({ name: name || host, url: url, username: username, password: password });
        Settings.set('webdavConnections', list);
    }

    window.connectWebDAV = async function() {
        var nameEl = document.getElementById('webdav-name');
        var urlEl = document.getElementById('webdav-url');
        var userEl = document.getElementById('webdav-user');
        var passEl = document.getElementById('webdav-pass');
        var name = (nameEl ? nameEl.value : '').trim();
        var url = (urlEl.value || '').trim();
        var user = (userEl.value || '').trim();
        var pass = (passEl.value || '').trim();
        var ok = await doWebdavConnect(url, user, pass, name);
        if (ok) {
            // Collapse form and clear inputs
            var body = document.getElementById('webdav-config-body');
            if (body) body.classList.add('hidden');
            if (nameEl) nameEl.value = '';
            urlEl.value = '';
            userEl.value = '';
            passEl.value = '';
            loadWebdavSavedList();
        }
    };

    var webdavRootData = null; // { subfolders: [], rootAudio: [], rootLrc: [] }

    function webdavBasePath() {
        var activeUrl = Settings.get('lastWebdavUrl') || '';
        try {
            // Encode non-ASCII first, then parse
            var encoded = activeUrl.replace(/[^\x00-\x7F]+/g, function(m) { return encodeURIComponent(m); });
            var u = new URL(encoded);
            return decodeURIComponent(u.pathname).replace(/\/$/, '');
        } catch(e) { return ''; }
    }

    function restoreWebdavTrack(trackName, lastIdx) {
        if (trackName) {
            var foundIdx = -1;
            for (var ti = 0; ti < PlaylistManager.length; ti++) {
                var t = PlaylistManager.tracks[ti];
                if (t && (t.name === trackName || t.title === trackName)) {
                    foundIdx = ti; break;
                }
            }
            if (foundIdx >= 0) {
                PlaylistManager.setCurrentIndexSilent(foundIdx);
            } else if (lastIdx >= 0 && lastIdx < PlaylistManager.length) {
                PlaylistManager.setCurrentIndexSilent(lastIdx);
            }
        } else if (lastIdx >= 0 && lastIdx < PlaylistManager.length) {
            PlaylistManager.setCurrentIndexSilent(lastIdx);
        }
    }

    async function loadWebdavFolder(folderPath) {
        currentSubfolder = folderPath;
        Settings.set('lastWebdavFolder', folderPath);
        var displayName = folderPath ? (folderPath.split('/').filter(Boolean).pop() || '全部歌曲') : '全部歌曲';
        UI.els.folderName.textContent = '加载中...';
        try {
            // If clicking a subfolder (not root), load only that folder's tracks
            if (folderPath && folderPath !== '' && webdavRootData) {
                var resp = await fetch('/api/webdav/list?session=' + encodeURIComponent(webdavSessionId) + '&path=' + encodeURIComponent(folderPath));
                var entries = await resp.json();
                if (!Array.isArray(entries)) { UI.els.folderName.textContent = '加载失败'; return; }
                var af = entries.filter(function(e) { return !e.isDir && MetadataReader.isAudioFile(e.name); });
                var lf = entries.filter(function(e) { return !e.isDir && MetadataReader.isLRCFile(e.name); });
                // Highlight clicked subfolder
                var container = document.getElementById('webdav-folder-list');
                if (container) {
                    var items = container.querySelectorAll('.source-folder-item');
                    for (var k = 0; k < items.length; k++) { items[k].classList.remove('active'); }
                    for (var k2 = 0; k2 < items.length; k2++) {
                        var dp = items[k2].getAttribute('data-path');
                        if (dp === folderPath || (dp && folderPath && dp.replace(/\/$/, '') === folderPath.replace(/\/$/, ''))) {
                            items[k2].classList.add('active');
                            break;
                        }
                    }
                }
                loadWebdavTracks(folderPath, af, lf);
                return;
            }

            // Root load: PROPFIND root
            resp = await fetch('/api/webdav/list?session=' + encodeURIComponent(webdavSessionId) + '&path=' + encodeURIComponent(folderPath || ''));
            entries = await resp.json();
            if (!Array.isArray(entries)) { UI.els.folderName.textContent = '加载失败'; return; }

            var subfolders = entries.filter(function(e) { return e.isDir; });
            var rootAudio = entries.filter(function(e) { return !e.isDir && MetadataReader.isAudioFile(e.name); });
            var rootLrc = entries.filter(function(e) { return !e.isDir && MetadataReader.isLRCFile(e.name); });
            // Filter out the root directory itself - try both encoded and decoded paths
            var base = webdavBasePath();
            subfolders = subfolders.filter(function(e) {
                var ep = e.href.replace(/\/$/, '');
                if (ep === base) return false;
                // Also check if the last segment matches the current folder being queried
                if (folderPath && ep === (folderPath.replace(/\/$/, ''))) return false;
                return true;
            });
            webdavRootData = { subfolders: subfolders, rootAudio: rootAudio, rootLrc: rootLrc, folderPath: folderPath || '' };

            // Render subfolder list
            var container = document.getElementById('webdav-folder-list');
            container.innerHTML = '';
            container.classList.remove('hidden');

            // Calculate total songs: root + subfolder counts (we don't know subfolder counts yet, show root)
            var totalSongs = rootAudio.length;

            // "全部歌曲" item
            var allItem = document.createElement('div');
            allItem.className = 'source-folder-item active';
            allItem.setAttribute('data-path', '');
            allItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>全部歌曲</span><span class="source-folder-count">' + totalSongs + '</span>';
            allItem.addEventListener('click', function() {
                container.querySelectorAll('.source-folder-item').forEach(function(el) { el.classList.remove('active'); });
                allItem.classList.add('active');
                Settings.set('lastSubfolder', '');
                loadWebdavAllTracks();
            });
            container.appendChild(allItem);

            // Subfolders
            for (var i = 0; i < subfolders.length; i++) {
                var sf = subfolders[i];
                (function(fpath, fname) {
                    var item = document.createElement('div');
                    item.className = 'source-folder-item';
                    item.setAttribute('data-path', fpath);
                    item.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>' + (fname || '未知') + '</span><span class="source-folder-count">-</span>';
                    item.addEventListener('click', function() {
                        currentSubfolder = fpath;
                        Settings.set('lastSubfolder', fpath);
                        loadWebdavFolder(fpath);
                    });
                    container.appendChild(item);
                })(sf.href, sf.name);
            }

            // Load all tracks (root + subfolders)
            loadWebdavAllTracks();
        } catch(e) { UI.els.folderName.textContent = '加载失败'; }
    }

    async function loadWebdavAllTracks() {
        if (!webdavRootData) return;
        var allAudio = webdavRootData.rootAudio.slice();
        var allLrc = webdavRootData.rootLrc.slice();
        var subCounts = [];
        // Load tracks from all subfolders
        for (var i = 0; i < webdavRootData.subfolders.length; i++) {
            try {
                var resp = await fetch('/api/webdav/list?session=' + encodeURIComponent(webdavSessionId) + '&path=' + encodeURIComponent(webdavRootData.subfolders[i].href));
                var entries = await resp.json();
                if (Array.isArray(entries)) {
                    var af = entries.filter(function(e) { return !e.isDir && MetadataReader.isAudioFile(e.name); });
                    var lf = entries.filter(function(e) { return !e.isDir && MetadataReader.isLRCFile(e.name); });
                    allAudio.push.apply(allAudio, af);
                    allLrc.push.apply(allLrc, lf);
                    subCounts[i] = af.length;
                }
            } catch(e) { subCounts[i] = 0; }
        }
        UI.els.folderName.textContent = webdavRootData.folderPath || 'WebDAV';
        // Update subfolder counts in DOM
        var items = document.querySelectorAll('#webdav-folder-list .source-folder-item');
        var subIdx = 0;
        for (var j = 0; j < items.length; j++) {
            var countSpan = items[j].querySelector('.source-folder-count');
            if (!countSpan) continue;
            if (items[j].getAttribute('data-path') === '') {
                // "全部歌曲" item
                countSpan.textContent = allAudio.length;
            } else if (subIdx < subCounts.length) {
                countSpan.textContent = subCounts[subIdx];
                subIdx++;
            }
        }
        loadWebdavTracks('', allAudio, allLrc);
    }

    function loadWebdavTracks(folderPath, audioFiles, lrcFiles) {
        var base = window.location.origin;
        var tracks = audioFiles.map(function(f) {
            var streamUrl = base + '/api/webdav/stream?session=' + encodeURIComponent(webdavSessionId) + '&path=' + encodeURIComponent(f.href);
            var coverUrl = base + '/api/webdav/cover?session=' + encodeURIComponent(webdavSessionId) + '&path=' + encodeURIComponent(f.href);
            var title = MetadataReader.cleanFilename(f.name);
            var artist = '';
            var idx = title.indexOf(' - ');
            if (idx > 0) { artist = title.substring(0, idx); title = title.substring(idx + 3); }
            return { title: title, artist: artist, album: '', coverUrl: coverUrl, hasCover: true, track: '', year: '', genre: '', url: streamUrl, name: f.name };
        });

        lrcFileMap = {};
        for (var i = 0; i < lrcFiles.length; i++) {
            var lrcUrl = base + '/api/webdav/stream?session=' + encodeURIComponent(webdavSessionId) + '&path=' + encodeURIComponent(lrcFiles[i].href);
            var lb = lrcFiles[i].name.replace(/\.lrc$/i, '').toLowerCase();
            for (var j = 0; j < tracks.length; j++) {
                if ((tracks[j].name || '').replace(/\.[^.]+$/, '').toLowerCase() === lb) {
                    lrcFileMap[tracks[j].name] = lrcUrl;
                    break;
                }
            }
        }

        // Sort tracks by name for consistent order
        tracks.sort(function(a, b) {
            var an = String(a.title || a.name || '');
            var bn = String(b.title || b.name || '');
            var ca = getSortGroup(an), cb = getSortGroup(bn);
            if (ca !== cb) return ca - cb;
            return an.localeCompare(bn, 'zh-CN');
        });

        firstLoad = true;
        playbackSourceMode = 'webdav';
        PlaylistManager.setTracks(tracks);
        UI.showPlayer();
        var displayName = folderPath ? ('WebDAV · ' + folderPath.split('/').filter(Boolean).pop()) : '全部歌曲';
        UI.els.folderName.textContent = displayName;
        UI.renderPlaylist(tracks, -1, displayName);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    // ========== Track Loading ==========

    function loadAndPlayTrack(track) {
        UI.animateTrackChange();
        UI.updateTrackInfo(track);
        UI.updateAlbumArt(track.coverUrl);
        LyricsEngine.reset();
        // Update like button
        if (typeof updateLikeButton === 'function') updateLikeButton(track);

        // Update NetEase quality display and re-fetch URL if quality changed
        if (playbackSourceMode === 'netease' && typeof NetEaseAPI !== 'undefined' && typeof NetEaseUI !== 'undefined') {
            var currentQuality = Settings.get('neteaseQuality') || '320000';
            var needRefetch = !track._lastQuality || track._lastQuality !== currentQuality;
            if (needRefetch && track.neteaseId) {
                track._lastQuality = currentQuality;
                NetEaseAPI.getSongUrl(track.neteaseId).then(function(data) {
                    if (data && data.data && data.data[0]) {
                        var item = data.data[0];
                        if (item.url) {
                            track.url = item.url;
                            track.bitrate = item.br || 0;
                            // Log quality
                            var dEl = document.getElementById('debug-log');
                            if (dEl && dEl.style.display !== 'none') {
                                dEl.textContent += '[NetEase] ' + track.title + ' | 音质:' + (item.br || '?') + 'kbps | 类型:' + (item.type || '?') + ' | 试听:' + (item.freeTrialInfo ? '是' : '否') + '\n';
                                dEl.scrollTop = dEl.scrollHeight;
                            }
                            // Reload with new URL
                            AudioEngine.play(track.url);
                            NetEaseUI.updateQualityDisplay(track);
                        }
                    }
                });
            } else {
                NetEaseUI.updateQualityDisplay(track);
            }
        }

        // Load lyrics
        var lrcRef = null;
        if (playbackSourceMode === 'local') lrcRef = lrcFileMap[track.file ? track.file.name : track.name];
        else if (playbackSourceMode === 'webdav') lrcRef = lrcFileMap[track.name];
        else if (playbackSourceMode === 'netease') {
            // Load lyrics from NetEase API
            if (track.neteaseId && typeof NetEaseAPI !== 'undefined') {
                NetEaseAPI.getLyric(track.neteaseId).then(function(data) {
                    if (data && data.lrc && data.lrc.lyric) {
                        var parsed = LyricsEngine.parseLRC(data.lrc.lyric);
                        // Merge translation into lyrics
                        if (data.tlyric && data.tlyric.lyric) {
                            var transParsed = LyricsEngine.parseLRC(data.tlyric.lyric);
                            if (transParsed && transParsed.lyrics) {
                                transParsed.lyrics.forEach(function(t) {
                                    var match = parsed.lyrics.find(function(l) { return Math.abs(l.time - t.time) < 100; });
                                    if (match) match.translation = t.original;
                                });
                            }
                        }
                        LyricsEngine.setLyrics(parsed.lyrics);
                    }
                });
            }
        } else lrcRef = lrcFileMap[track.name];

        if (lrcRef) {
            if (lrcRef instanceof File) lrcRef.text().then(function(t) { LyricsEngine.setLyrics(LyricsEngine.parseLRC(t).lyrics); }).catch(function() {});
            else if (typeof lrcRef === 'string') fetch(lrcRef).then(function(r) { return r.text(); }).then(function(t) { LyricsEngine.setLyrics(LyricsEngine.parseLRC(t).lyrics); }).catch(function() {});
        }

        // Play track
        var src = track.url || track.file;
        if (firstLoad) { firstLoad = false; AudioEngine.load(src); }
        else AudioEngine.play(src);
        UI.renderPlaylist(PlaylistManager.tracks, PlaylistManager.currentIndex);
    }

    function playTrack(i) { PlaylistManager.setCurrentIndex(i); }
    function playNext() { if (PlaylistManager.next(true) === -1) UI.updatePlayButton(false); }
    function playPrev() { PlaylistManager.prev(true); }

    async function loadLRCFile(f) {
        try {
            LyricsEngine.setLyrics(LyricsEngine.parseLRC(await f.text()).lyrics);
            var t = PlaylistManager.getCurrentTrack();
            if (t) {
                if (playbackSourceMode === 'local' && t.file) lrcFileMap[t.file.name] = f;
                else lrcFileMap[t.name] = f;
            }
        } catch(e) {}
    }

    function copyTrackInfo() {
        var t = PlaylistManager.getCurrentTrack();
        if (!t) return;
        var text = t.title + ' - ' + t.artist;
        navigator.clipboard.writeText(text).then(function() {
            showToast('已复制: ' + text);
        }).catch(function() {
            showToast('复制失败');
        });
    }

    function showTrackContextMenu(x, y) {
        var t = PlaylistManager.getCurrentTrack();
        if (!t) return;
        var menu = document.getElementById('context-menu');
        if (!menu) return;
        var isNetEase = playbackSourceMode === 'netease' && t.neteaseId;
        var html = '<div class="context-menu-item" data-action="copy-track">复制歌曲信息</div>';
        if (isNetEase) {
            html += '<div class="context-menu-item" data-action="copy-share-link">复制分享链接</div>';
        }
        menu.innerHTML = html;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
        menu.querySelectorAll('.context-menu-item').forEach(function(item) {
            item.onclick = function() {
                if (item.dataset.action === 'copy-track') {
                    copyTrackInfo();
                } else if (item.dataset.action === 'copy-share-link') {
                    var link = 'https://music.163.com/song?id=' + t.neteaseId;
                    navigator.clipboard.writeText(link).then(function() {
                        showToast('已复制: ' + link);
                    });
                }
                menu.classList.add('hidden');
            };
        });
        setTimeout(function() {
            document.addEventListener('click', function hideMenu() {
                menu.classList.add('hidden');
                document.removeEventListener('click', hideMenu);
            });
        }, 0);
    }

    function showToast(msg) {
        var toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.classList.add('show'); }, 10);
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2000);
    }

    function updateFavicon(coverUrl) {
        var link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        if (coverUrl) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                var ctx = canvas.getContext('2d');
                // Draw rounded rectangle
                var r = 10;
                ctx.beginPath();
                ctx.moveTo(r, 0);
                ctx.lineTo(32 - r, 0);
                ctx.quadraticCurveTo(32, 0, 32, r);
                ctx.lineTo(32, 32 - r);
                ctx.quadraticCurveTo(32, 32, 32 - r, 32);
                ctx.lineTo(r, 32);
                ctx.quadraticCurveTo(0, 32, 0, 32 - r);
                ctx.lineTo(0, r);
                ctx.quadraticCurveTo(0, 0, r, 0);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, 0, 0, 32, 32);
                link.href = canvas.toDataURL('image/png');
            };
            img.onerror = function() {
                link.href = '/favicon.png';
            };
            img.src = coverUrl;
        } else {
            link.href = '/favicon.png';
        }
    }

    function updateMediaSession(track) {
        if (!('mediaSession' in navigator)) return;
        var metadata = {
            title: track.title || '未知曲目',
            artist: track.artist || '未知艺术家',
            album: track.album || ''
        };
        if (track.coverUrl) {
            metadata.artwork = [
                { src: track.coverUrl, sizes: '300x300', type: 'image/jpeg' }
            ];
        }
        navigator.mediaSession.metadata = new MediaMetadata(metadata);

        // Action handlers
        navigator.mediaSession.setActionHandler('play', function() { AudioEngine.resume(); });
        navigator.mediaSession.setActionHandler('pause', function() { AudioEngine.pause(); });
        navigator.mediaSession.setActionHandler('previoustrack', function() { playPrev(); });
        navigator.mediaSession.setActionHandler('nexttrack', function() { playNext(); });
        navigator.mediaSession.setActionHandler('seekbackward', function() { AudioEngine.seek(AudioEngine.getPosition() - 10); });
        navigator.mediaSession.setActionHandler('seekforward', function() { AudioEngine.seek(AudioEngine.getPosition() + 10); });
    }

    function autoConnectWebdav() {
        // Only auto-connect if there are saved connections and not already connected
        if (webdavSessionId) return;
        var list = Settings.get('webdavConnections') || [];
        if (list.length === 0) return;
        
        var activeUrl = Settings.get('lastWebdavUrl') || '';
        var connToConnect = null;
        
        // Find the last used connection
        if (activeUrl) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === activeUrl) {
                    connToConnect = list[i];
                    break;
                }
            }
        }
        
        // Fallback to first connection
        if (!connToConnect) {
            connToConnect = list[0];
        }
        
        if (connToConnect && connToConnect.url) {
            doWebdavConnect(connToConnect.url, connToConnect.username, connToConnect.password, connToConnect.name);
        }
    }

    function setPlaybackSource(mode) {
        playbackSourceMode = mode;
    }

    return {
        init: init,
        playTrack: playTrack,
        playNext: playNext,
        playPrev: playPrev,
        setSourceMode: setSourceMode,
        selectSubfolder: selectSubfolder,
        openLocalFolder: openLocalFolder,
        loadWebdavSavedList: loadWebdavSavedList,
        autoConnectWebdav: autoConnectWebdav,
        setPlaybackSource: setPlaybackSource,
        get sourceMode() { return sourceMode; },
        get playbackSourceMode() { return playbackSourceMode; },
        get currentSubfolder() { return currentSubfolder; }
    };
})();

document.addEventListener('DOMContentLoaded', function() { App.init(); });
