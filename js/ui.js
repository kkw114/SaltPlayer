/**
 * UI Module
 * Handles all rendering, animations, and visual effects
 * Inspired by refined-now-playing-netease
 */

// showToast 备用函数（如果 app.js 还没加载）
if (typeof window.showToast !== 'function') {
    window.showToast = function(msg) {
        var toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.classList.add('show'); }, 10);
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2000);
    };
}

const UI = (() => {
    const els = {};

    function init() {
        try {
        // Cache DOM elements
        els.welcomeScreen = document.getElementById('welcome-screen');
        els.playerContainer = document.getElementById('player-container');
        els.bgBlur = document.getElementById('bg-blur');
        els.bgContainer = document.getElementById('bg-container');
        els.albumArt = document.getElementById('album-art');
        els.albumGlow = document.getElementById('album-glow');
        els.trackTitle = document.getElementById('track-title');
        els.trackArtist = document.getElementById('track-artist');
        els.trackAlbum = document.getElementById('track-album');
        els.folderName = document.getElementById('folder-name');
        els.lyricsPanel = document.getElementById('lyrics-panel');
        els.lyricsContainer = document.getElementById('lyrics-container');
        els.lyricsContent = document.getElementById('lyrics-content');
        els.playlistPanel = document.getElementById('playlist-panel');
        els.playlistList = document.getElementById('playlist-list');
        els.playlistCount = document.getElementById('playlist-count');
        els.progressFill = document.getElementById('progress-fill');
        els.progressThumb = document.getElementById('progress-thumb');
        els.progressBar = document.getElementById('progress-bar');
        els.timeCurrent = document.getElementById('time-current');
        els.timeDuration = document.getElementById('time-duration');
        els.btnPlay = document.getElementById('btn-play');
        els.iconPlay = document.getElementById('icon-play');
        els.iconPause = document.getElementById('icon-pause');
        els.btnPrev = document.getElementById('btn-prev');
        
        // Touch event handler - remove focus from buttons after tap
        document.addEventListener('touchend', function(e) {
            var btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
            if (btn) {
                setTimeout(function() { btn.blur(); }, 50);
            }
        }, { passive: true });
        els.btnNext = document.getElementById('btn-next');
        els.btnMute = document.getElementById('btn-mute');
        els.iconVolume = document.getElementById('icon-volume');
        els.iconMuted = document.getElementById('icon-muted');
        els.volumePct = document.getElementById('volume-pct');
        els.btnOpenFolder = document.getElementById('btn-open-folder');
        els.btnSource = document.getElementById('btn-source');
        els.sourceLabel = document.getElementById('source-label');
        els.sourceIcon = document.getElementById('source-icon');
        els.btnTogglePlaylist = document.getElementById('btn-toggle-playlist');
        els.dropOverlay = document.getElementById('drop-overlay');

        // New elements
        els.btnPlaymode = document.getElementById('btn-playmode');
        els.iconSeq = document.getElementById('icon-seq');
        els.iconRepeat = document.getElementById('icon-repeat');
        els.iconShuffle = document.getElementById('icon-shuffle');
        els.btnToggleSettings = document.getElementById('btn-toggle-settings');
        els.settingsPanel = document.getElementById('settings-panel');
        els.settingsOverlay = document.getElementById('settings-overlay');
        els.settingsContent = document.getElementById('settings-content');
        els.settingsTabs = document.getElementById('settings-tabs');
        els.contextMenu = document.getElementById('context-menu');
        els.sourcePanel = document.getElementById('source-panel');
        els.sourceOverlay = document.getElementById('source-overlay');
        els.sourceContent = document.getElementById('source-content');
        els.sourceTabs = document.getElementById('source-tabs');
        els.playlistIndex = document.getElementById('playlist-index');

        // Initialize settings
        Settings.init();
        initIdleDetection();
        initContextMenu();
        renderSettingsPanel('appearance');

        // Initialize lyrics engine
        LyricsEngine.init(els.lyricsContainer, els.lyricsContent);

        // Set overridable animation functions for settings support
        LyricsEngine.overrides.scale = getScaleForOffset;
        LyricsEngine.overrides.opacity = getOpacityForOffset;
        LyricsEngine.overrides.blur = getBlurForOffset;
        } catch(e) {
            console.error('UI init error:', e);
        }
    }

    // Dynamic functions using settings
    function getScaleForOffset(offset) {
        if (!Settings.get('lyricZoom')) return 1;
        offset = Math.abs(offset);
        if (offset === 0) return 1;
        return Math.max(1 - offset * 0.1, 0.65);
    }

    function getOpacityForOffset(offset) {
        if (!Settings.get('lyricFade')) return 1;
        offset = Math.abs(offset);
        if (offset === 0) return 1;
        return Math.max(0.5 - (offset - 1) * 0.15, 0.12);
    }

    function getBlurForOffset(offset) {
        if (!Settings.get('lyricBlur')) return 0;
        offset = Math.abs(offset);
        if (offset === 0) return 0;
        return Math.min(1 + offset * 0.7, 4.5);
    }

    function updateLyricLayout() {
        const fs = Settings.get('lyricFontSize');
        document.documentElement.style.setProperty('--font-size-lyric', `${fs}px`);
        document.documentElement.style.setProperty('--lyric-alignment', `${Settings.get('lyricAlignment')}%`);
    }

    // Show player, hide welcome
    function showPlayer() {
        if (els.welcomeScreen) els.welcomeScreen.classList.add('hidden');
        if (els.playerContainer) els.playerContainer.classList.remove('hidden');
    }

    function showWelcome() {
        els.welcomeScreen.classList.remove('hidden');
        els.playerContainer.classList.add('hidden');
    }

    // Update background with album art
    function updateBackground(imageUrl, gradientColors) {
        var bgType = Settings.get('bgType');

        // Remove existing fluid layer
        var oldFluid = document.getElementById('bg-fluid');
        if (oldFluid) oldFluid.remove();

        // Crossfade only when image actually changes (not on bg type switch)
        var lastBgUrl = els.bgBlur._lastUrl;
        var sameImage = lastBgUrl === imageUrl && imageUrl != null;
        if (bgType === 'blur' && imageUrl && !sameImage) {
            els.bgBlur.style.opacity = '0';
            setTimeout(function() {
                els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
                els.bgBlur.style.backgroundSize = 'cover';
                els.bgBlur.style.opacity = '1';
            }, 200);
            els.bgBlur._lastUrl = imageUrl;
        } else if (!sameImage) {
            els.bgBlur.style.opacity = '1';
            els.bgBlur._lastUrl = imageUrl;
        }

        // Reset styles
        els.bgBlur.style.backgroundSize = '';
        els.bgBlur.style.animation = '';
        els.bgBlur.style.filter = '';
        els.bgBlur.style.backgroundColor = '';
        els.bgBlur.style.transform = '';
        els.bgContainer.style.opacity = bgType === 'none' ? '0' : String(Settings.get(bgType + 'Opacity') / 100);

        if (bgType === 'none') {
            els.bgBlur.style.backgroundImage = 'none';
        } else if (bgType === 'solid') {
            els.bgBlur.style.backgroundImage = 'none';
            if (Settings.get('solidFollowAccent')) {
                // Use current accent color directly
                var accent = getComputedStyle(document.documentElement).getPropertyValue('--rnp-accent-color').trim();
                els.bgBlur.style.backgroundColor = accent || 'rgb(120,120,120)';
            } else {
                els.bgBlur.style.backgroundColor = Settings.get('solidColor');
            }
        } else if (bgType === 'gradient' && imageUrl) {
            els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
            els.bgBlur.style.backgroundSize = 'cover';
        } else if (bgType === 'dynamic-gradient' && imageUrl) {
            // Dynamic gradient: use stored palette with optional bright color filter
            var palette = window._rnpPalette;
            if (palette && palette.length >= 2) {
                var filterBright = typeof Settings !== 'undefined' && Settings.get('dynamicGradientFilterBright');
                var filteredPalette = palette;
                if (filterBright) {
                    filteredPalette = palette.filter(function(c) {
                        var lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
                        return lum < 200 && lum > 30;
                    });
                    if (filteredPalette.length < 2) filteredPalette = palette;
                }
                var gradient = ColorUtils.getGradientFromPalette(filteredPalette);
                els.bgBlur.style.backgroundImage = gradient;
                els.bgBlur.style.backgroundSize = '400% 400%';
            } else {
                els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
                els.bgBlur.style.backgroundSize = 'cover';
            }
        } else if (bgType === 'fluid' && imageUrl) {
            els.bgBlur.style.backgroundImage = 'none';
            var fluid = document.createElement('div');
            fluid.id = 'bg-fluid';
            fluid.className = 'rnp-bg-fluid';
            fluid.style.backgroundImage = 'url(' + imageUrl + ')';
            els.bgContainer.appendChild(fluid);
        } else if (imageUrl) {
            els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
            els.bgBlur.style.backgroundSize = 'cover';
        } else {
            els.bgBlur.style.backgroundImage = 'none';
        }
    }

    // Update album art
    function updateAlbumArt(coverUrl) {
        if (coverUrl) {
            var img = els.albumArt;
            img.onload = function() {
                extractColorsAndUpdate(img);
            };
            img.onerror = function() {
                img.onload = null;
                els.albumGlow.style.background = 'none';
                updateBackground(null);
            };
            img.src = coverUrl;
            img.style.display = 'block';
            // If already loaded (cached), call immediately
            if (img.complete && img.naturalWidth > 0) {
                extractColorsAndUpdate(img);
            }
        } else {
            els.albumArt.src = '';
            els.albumArt.onload = null;
            els.albumGlow.style.background = 'none';
            updateBackground(null);
            ColorUtils.applyAccentColor(120, 120, 120);
        }
    }

    function extractColorsAndUpdate(img) {
        try {
            var colors = ColorUtils.getAccentColor(img);
            ColorUtils.applyAccentColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            if (Settings.get('coverBlurryShadow')) {
                els.albumGlow.style.background = ColorUtils.getGradientFromPalette(colors.palette);
            } else {
                els.albumGlow.style.background = 'none';
            }
            // Store palette for dynamic gradient
            window._rnpPalette = colors.palette;
            updateBackground(img.src, colors.palette);
            updateTitleSize();
        } catch(ex) {
            els.albumGlow.style.background = 'none';
            updateBackground(img.src);
        }
    }

    // Update track info with dynamic title sizing
    function updateTrackInfo(track) {
        if (track) {
            els.trackTitle.textContent = track.title || '未知曲目';
            els.trackArtist.textContent = track.artist || '未知艺术家';
            els.trackAlbum.textContent = '';
            updateTitleSize();
        } else {
            els.trackTitle.textContent = '未在播放';
            els.trackArtist.textContent = '选择一首歌曲开始';
            els.trackAlbum.textContent = '';
        }
    }

    // Dynamic title font sizing
    let lastTitle = '';
    function updateTitleSize() {
        const title = els.trackTitle;
        const text = title.textContent;
        if (text === lastTitle && title.style.fontSize) return;
        lastTitle = text;

        const container = title.parentElement;
        const maxWidth = container ? container.clientWidth * 0.95 : 320;
        if (maxWidth < 100) return;

        const test = document.createElement('span');
        test.style.cssText = 'position:fixed;left:-9999px;top:-9999px;white-space:nowrap;font-family:inherit;font-weight:600;';
        test.textContent = text;
        document.body.appendChild(test);

        let lo = 16, hi = 48, best = 22;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            test.style.fontSize = `${mid}px`;
            if (test.offsetWidth <= maxWidth) { best = mid; lo = mid + 1; }
            else { hi = mid - 1; }
        }
        test.remove();
        title.style.fontSize = `${Math.min(best, 40)}px`;
    }

    // Update play/pause button
    function updatePlayButton(playing) {
        if (playing) {
            els.iconPlay.classList.add('hidden');
            els.iconPause.classList.remove('hidden');
        } else {
            els.iconPlay.classList.remove('hidden');
            els.iconPause.classList.add('hidden');
        }
    }

    // Update progress bar
    function updateProgress(current, duration) {
        if (!duration || duration === Infinity) return;
        const percent = (current / duration) * 100;
        els.progressFill.style.width = `${percent}%`;
        els.progressThumb.style.left = `${percent}%`;
        els.timeCurrent.textContent = formatTime(current);
        els.timeDuration.textContent = formatTime(duration);
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function updateVolumeUI(volume, muted) {
        var pct = muted ? 0 : volume;
        els.volumePct.textContent = Math.round(pct * 100) + '%';
        var fillEl = document.getElementById('volume-bar-fill');
        if (fillEl) fillEl.style.height = Math.round(pct * 100) + '%';
        if (muted || volume === 0) {
            els.iconVolume.classList.add('hidden');
            els.iconMuted.classList.remove('hidden');
        } else {
            els.iconVolume.classList.remove('hidden');
            els.iconMuted.classList.add('hidden');
        }
    }

    function initVolumeUI() {
        updateVolumeUI(0.8, false);
        // Volume bar click handler
        var barTrack = document.querySelector('.volume-bar-track');
        if (barTrack) {
            barTrack.addEventListener('click', function(e) {
                var rect = barTrack.getBoundingClientRect();
                var pct = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                AudioEngine.setVolume(pct);
                updateVolumeUI(pct, false);
                Settings.set('volume', Math.round(pct * 100));
            });

            // Touch: swipe up to increase, down to decrease
            var touchStartY = 0;
            var touchStartVol = 0;
            barTrack.addEventListener('touchstart', function(e) {
                touchStartY = e.touches[0].clientY;
                touchStartVol = AudioEngine.getVolume();
            }, { passive: true });
            barTrack.addEventListener('touchmove', function(e) {
                e.preventDefault();
                var rect = barTrack.getBoundingClientRect();
                var deltaY = touchStartY - e.touches[0].clientY;
                var pct = Math.max(0, Math.min(1, touchStartVol + deltaY / rect.height));
                AudioEngine.setVolume(pct);
                updateVolumeUI(pct, false);
            }, { passive: false });
        }

        // Volume button touch: swipe up to increase, down to decrease
        var btnMute = document.getElementById('btn-mute');
        if (btnMute) {
            var touchStartY = 0;
            var touchStartVol = 0;
            btnMute.addEventListener('touchstart', function(e) {
                touchStartY = e.touches[0].clientY;
                touchStartVol = AudioEngine.getVolume();
            }, { passive: true });
            btnMute.addEventListener('touchmove', function(e) {
                e.preventDefault();
                var deltaY = touchStartY - e.touches[0].clientY;
                var pct = Math.max(0, Math.min(1, touchStartVol + deltaY / 200));
                AudioEngine.setVolume(pct);
                updateVolumeUI(pct, false);
            }, { passive: false });
            btnMute.addEventListener('touchend', function() {
                Settings.set('volume', Math.round(AudioEngine.getVolume() * 100));
            });
        }
    }

    // Render playlist
    var playlistTracks = [];
    var playlistOrigTracks = [];
    var playlistCurrentIndex = -1;

    function getSortGroup(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return 0;
        if (/[0-9]/.test(c)) return 1;
        return 0;
    }

    function renderPlaylist(tracks, currentIndex, customLabel) {
        playlistOrigTracks = tracks || [];
        // Don't sort for NetEase mode - keep original order
        var isNetEase = typeof App !== 'undefined' && App.playbackSourceMode === 'netease';
        if (isNetEase) {
            playlistTracks = playlistOrigTracks.slice();
        } else {
            playlistTracks = playlistOrigTracks.slice().sort(function(a, b) {
                var an = String(a.title || a.name || '');
                var bn = String(b.title || b.name || '');
                var ca = getSortGroup(an), cb = getSortGroup(bn);
                if (ca !== cb) return ca - cb;
                return an.localeCompare(bn, 'zh-CN');
            });
        }
        playlistCurrentIndex = (currentIndex >= 0 && tracks) ? playlistTracks.indexOf(tracks[currentIndex]) : -1;
        var label = customLabel || '';
        if (!label) {
            // Use folder-name as label source
            label = els.folderName.textContent || '全部歌曲';
        }
        els.playlistCount.textContent = label + ' · ' + playlistTracks.length + ' 首';
        renderPlaylistItems();
        // Only show index for name sort mode
        if (!isNetEase && currentSortMode === 'name') {
            renderPlaylistIndex();
        } else {
            if (els.playlistIndex) els.playlistIndex.innerHTML = '';
        }
    }

    function renderPlaylistItems() {
        els.playlistList.innerHTML = '';
        if (!playlistTracks.length) {
            els.playlistList.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">无匹配结果</div>';
            return;
        }
        var isNetEase = typeof App !== 'undefined' && App.playbackSourceMode === 'netease';
        var folderName = els.folderName ? els.folderName.textContent : '';
        var isDaily = folderName.indexOf('每日推荐') >= 0;

        // Get liked songs for daily recommend
        var likedSet = new Set();
        if (isNetEase && isDaily && typeof NetEaseUI !== 'undefined') {
            likedSet = NetEaseUI.getLikedSongs();
        }

        // Filter by search query
        var filteredTracks = playlistTracks;
        if (playlistSearchQuery) {
            filteredTracks = playlistTracks.filter(function(track) {
                var title = (track.title || track.name || '').toLowerCase();
                var artist = (track.artist || '').toLowerCase();
                return title.indexOf(playlistSearchQuery) >= 0 || artist.indexOf(playlistSearchQuery) >= 0;
            });
        }

        if (!filteredTracks.length) {
            els.playlistList.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">无匹配结果</div>';
            return;
        }

        for (var i = 0; i < filteredTracks.length; i++) {
            var track = filteredTracks[i];
            var origIdx = playlistTracks.indexOf(track);
            var item = document.createElement('div');
            item.className = 'playlist-item' + (origIdx === playlistCurrentIndex ? ' active' : '');

            var actionBtn = '';
            if (!isNetEase) {
                // Non-NetEase: show download button
                actionBtn = '<button class="playlist-item-download" title="下载">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                    '</button>';
            }

            // Highlight search query
            var title = track.title || '未知曲目';
            var artist = track.artist || '未知艺术家';
            if (playlistSearchQuery) {
                title = highlightText(title, playlistSearchQuery);
                artist = highlightText(artist, playlistSearchQuery);
            } else {
                title = escapeHtml(title);
                artist = escapeHtml(artist);
            }

            item.innerHTML =
                '<span class="playlist-item-number">' + (origIdx === playlistCurrentIndex ? '\u25B6' : (origIdx + 1)) + '</span>' +
                '<div class="playlist-item-info">' +
                    '<div class="playlist-item-title">' + title + '</div>' +
                    '<div class="playlist-item-artist">' + artist + '</div>' +
                '</div>' +
                actionBtn;
            (function(trackObj, displayIdx) {
                item.addEventListener('click', function(e) {
                    if (e.target.closest('.playlist-item-download') || e.target.closest('.playlist-item-like')) return;
                    var origIdx = playlistOrigTracks.indexOf(trackObj);
                    if (origIdx >= 0 && typeof App !== 'undefined') App.playTrack(origIdx);
                });
                var dlBtn = item.querySelector('.playlist-item-download');
                if (dlBtn) {
                    dlBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        downloadTrack(trackObj);
                    });
                }
            })(track, i);
            els.playlistList.appendChild(item);
        }
        var activeItem = els.playlistList.querySelector('.playlist-item.active');
        if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function renderPlaylistIndex() {
        if (!els.playlistIndex) return;
        els.playlistIndex.innerHTML = '';
        var seen = {};
        var items = [];
        var order = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#';
        for (var i = 0; i < playlistTracks.length; i++) {
            var title = (playlistTracks[i].title || '');
            var ch = getPinyinInitial(title);
            if (!seen[ch]) {
                seen[ch] = true;
                items.push({ char: ch, index: i });
            }
        }
        if (items.length <= 1) return;
        items.sort(function(a, b) { return order.indexOf(a.char) - order.indexOf(b.char); });
        items.forEach(function(entry) {
            var el = document.createElement('div');
            el.className = 'playlist-index-item';
            el.textContent = entry.char;
            el.setAttribute('data-char', entry.char);
            el.addEventListener('click', function() {
                var allItems = els.playlistList.querySelectorAll('.playlist-item');
                for (var j = 0; j < allItems.length; j++) {
                    var itemTitle = (allItems[j].querySelector('.playlist-item-title') || {}).textContent || '';
                    if (getPinyinInitial(itemTitle) === entry.char) {
                        allItems[j].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        break;
                    }
                }
            });
            els.playlistIndex.appendChild(el);
        });
    }

    function getPinyinInitial(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return c.toUpperCase();
        if (/[0-9]/.test(c)) return '#';
        if (!/[\u4e00-\u9fff]/.test(c)) return '#';
        // Chinese: determine pinyin initial via localeCompare
        var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        try {
            for (var i = 0; i < alpha.length; i++) {
                if (c.localeCompare(alpha[i], 'zh-CN') < 0) {
                    return i > 0 ? alpha[i - 1] : alpha[0];
                }
            }
        } catch(e) {}
        return '#';
    }

    function initPlaylistEvents() {}

    function togglePlaylistPanel() {
        var isOpen = !els.playlistPanel.classList.contains('hidden') && !els.playlistPanel.classList.contains('closing');
        var isMobile = window.innerWidth <= 768;
        if (isOpen) {
            // Close with animation
            els.playlistPanel.classList.add('closing');
            els.btnTogglePlaylist.classList.remove('active');
            els.btnToggleSettings.style.visibility = '';
            setTimeout(function() {
                els.playlistPanel.classList.add('hidden');
                els.playlistPanel.classList.remove('closing');
            }, 250);
        } else {
            // Close other panels
            els.settingsPanel.classList.add('hidden');
            var sourcePanel = document.getElementById('source-panel');
            if (sourcePanel) sourcePanel.classList.add('hidden');
            // Open
            els.playlistPanel.classList.remove('hidden', 'closing');
            els.btnTogglePlaylist.classList.add('active');
            if (!isMobile) els.btnToggleSettings.style.visibility = 'hidden';
        }
    }

    function showLyricsPanel() {
        els.lyricsPanel.classList.remove('hidden');
    }

    function updatePlaymodeUI(mode) {
        els.iconSeq.classList.toggle('hidden', mode !== 'sequential');
        els.iconRepeat.classList.toggle('hidden', mode !== 'repeat');
        els.iconShuffle.classList.toggle('hidden', mode !== 'shuffle');
        els.btnPlaymode.classList.toggle('active', mode !== 'sequential');
        els.btnPlaymode.title = mode === 'sequential' ? '顺序播放' : mode === 'repeat' ? '单曲循环' : '随机播放';
        els.btnPlaymode.style.background = mode === 'sequential' ? 'transparent' : '';
    }

    function animateTrackChange() {
        els.albumArt.style.opacity = '0';
        els.albumArt.style.transform = 'scale(0.95)';
        setTimeout(() => {
            els.albumArt.style.opacity = '1';
            els.albumArt.style.transform = 'scale(1)';
        }, 50);
    }

    function showDropOverlay() { els.dropOverlay.classList.remove('hidden'); }
    function hideDropOverlay() { els.dropOverlay.classList.add('hidden'); }

    // ========== Source Panel ==========

    var sourceTabActive = 'default';

    function initSourceEvents() {
        els.btnSource.addEventListener('click', () => toggleSourcePanel());
        els.sourceOverlay.addEventListener('click', () => toggleSourcePanel(false));
        var sourceCloseBtn = document.getElementById('source-close-btn');
        if (sourceCloseBtn) sourceCloseBtn.addEventListener('click', () => toggleSourcePanel(false));

        els.sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                var mode = tab.dataset.tab;
                if (mode === sourceTabActive) return;
                sourceTabActive = mode;
                updateSourceTabUI(mode);
                showSourceTabContent(mode);
                if (typeof App !== 'undefined') App.setSourceMode(mode);
            });
        });

        var allItem = document.querySelector('#source-tab-default .source-folder-item[data-path=""]');
        if (allItem) {
            allItem.addEventListener('click', () => {
                selectSourceFolder(allItem, '');
            });
        }

        var btnLocal = document.getElementById('btn-local-folder');
        if (btnLocal) {
            btnLocal.addEventListener('click', () => {
                if (typeof App !== 'undefined') App.openLocalFolder();
            });
        }
        var webdavBarHeader = document.getElementById('webdav-user-bar-header');
        if (webdavBarHeader) {
            webdavBarHeader.addEventListener('click', function() {
                document.getElementById('webdav-user-bar').classList.toggle('open');
                document.getElementById('webdav-saved-list').classList.toggle('hidden');
            });
        }
    }

    function toggleSourcePanel(force) {
        var isOpen = !els.sourcePanel.classList.contains('hidden');
        var open = typeof force === 'boolean' ? force : !isOpen;
        if (open) {
            // Close other panels
            els.settingsPanel.classList.add('hidden');
            els.playlistPanel.classList.add('hidden');
            els.playlistPanel.classList.remove('closing');
            els.btnTogglePlaylist.classList.remove('active');
            els.btnToggleSettings.style.visibility = '';
            // Open
            els.sourcePanel.classList.remove('hidden');
            els.btnSource.classList.add('open');
            renderDefaultFolders();
        } else {
            els.sourcePanel.classList.add('hidden');
            els.btnSource.classList.remove('open');
        }
    }

    var sourceIcons = {
        default: '<path d="M480 224c43 0 84.7 11.6 120.6 33.5 34.6 21.1 62.5 50.9 80.6 86 10.4 20.1 30.6 33.3 53.2 34.6C796 381.6 853 407 895.2 449.7c41.7 42.1 64.6 97.2 64.6 155 0 30.8-5.9 60.6-17.7 88.7-11.3 27.1-27.5 51.4-48.2 72.3-42.3 42.8-98.4 66.3-158 66.3h-478c-53.3-3.1-102.6-24-139-58.8-35.3-33.6-54.7-77.2-54.7-122.5 0-38.5 13.7-75.3 39.7-106.4 12.9-15.5 28.5-29.1 46.3-40.3 18.3-11.6 38.4-20.4 59.9-26.3 26.1-7.1 44.9-29.9 47-56.9 4-52.9 28.6-102.1 69.4-138.7C368.1 244.6 422.6 224 480 224m0-64c-139.2 0-255.2 94.9-281.9 220.8-4.4 20.8-18.5 38.3-38.2 46.3C65.8 465.6 0.2 551.2 0.2 650.7 0.2 781.3 113.4 888.6 256.1 896H736c158.9 0 287.9-130.5 287.9-291.3 0-145.4-111.1-265.5-256.2-287.4-18.1-2.7-34.1-13-44.2-28.2C672.5 211.6 582.7 160 480 160z" stroke="currentColor" stroke-width="40" stroke-linejoin="round"/>',
        netease: '<path d="M623.61751703 18.30760297c26.82121482-7.73082075 55.55996445-7.34245925 82.64817779-1.11653927 31.10532741 7.39100445 60.53584592 21.67542518 85.86429629 41.14204445 9.24785778 7.02691555 17.59762963 15.76504889 21.84533334 26.76053333 6.57787259 16.26263703 4.81810963 35.7049837-4.89092742 50.35349334-8.47113482 13.15574518-22.87691852 22.31864889-38.39924148 24.28472888-12.40329482 1.69908148-25.40126815-0.93449482-36.0569363-7.5245037-6.00746667-3.53166222-10.58285037-8.98085925-16.61458962-12.47611259-16.17768297-10.26730667-34.80689778-18.35008-54.28565333-17.88890074-13.71401482 0.15777185-25.77749333 8.192-35.0738963 17.63403851-8.70172445 8.98085925-13.13147259 22.22155852-10.25517037 34.53989927 6.68709925 25.17067852 13.33778963 50.34135703 20.01275259 75.51203555 47.98691555 2.46366815 95.94955852 15.15823408 137.20082963 40.20754963 40.09832297 24.80658963 76.32516741 56.26386963 105.05178074 93.75288889 24.38181925 31.7728237 42.86539852 68.06034963 54.17642666 106.4838637 12.24552297 41.40904297 16.21409185 85.07543703 13.02224593 128.08647111-2.65784889 35.48653037-9.63621925 70.7667437-21.67542518 104.29933037-31.1296 81.65300148-88.7891437 153.24501333-163.00259555 199.64207408-54.43128889 34.38212741-116.94535111 55.12305778-180.69731556 63.03592297-44.00621037 5.49774222-88.84982518 5.52201482-132.63758222-1.9782163-89.97850075-14.86696297-174.30148741-59.71057778-238.29617778-124.48199112-63.59419259-63.71555555-107.85526518-146.41227852-125.75630222-234.6310163-13.20429037-64.33450667-12.60961185-131.50890667 2.03889778-195.55214221 17.90103703-78.97088 57.46536297-152.84451555 113.08600888-211.66914371 45.36547555-48.30245925 101.39875555-86.5196563 162.90550519-111.19274666 6.33514667-2.41512297 12.57320297-5.27928889 19.3209837-6.34728297 14.4057837-2.52434963 29.79460741 0.88594963 41.59108741 9.57553777 15.97136592 11.27461925 24.75804445 31.72427852 22.10019555 51.06953483-2.19666963 19.74575408-16.21409185 37.54970075-34.89185185 44.30961777-62.13783703 23.22887111-117.23662222 64.73500445-156.89803851 117.87984593-35.45012148 47.16164741-58.58190222 103.49833482-66.33699557 162.00741925-7.82791111 57.91440592-0.86167703 117.72207408 19.89138964 172.33540742 29.97665185 79.84469333 89.57800297 148.54826667 165.56335408 187.65141333 45.75383703 23.70218667 97.26027852 36.08120889 148.77885628 35.7292563 42.37994667-0.54613333 84.89339259-7.35459555 124.72471705-22.08805926 35.02535111-13.01010963 67.85403259-32.22186667 95.76751407-57.12554667 26.02021925-23.05896297 47.67137185-50.92389925 64.18887111-81.49522963 8.27695408-15.59514075 15.92282075-31.65146075 20.59529482-48.72722963 13.78683259-48.8121837 16.17768297-101.71429925 1.43208295-150.59930074-12.19697778-40.99640889-37.29483852-77.53879703-69.34679703-105.61005037-14.17519408-12.40329482-29.32129185-23.77500445-45.5596563-33.33840593-14.34510222-8.05850075-30.01306075-13.54410667-45.99656295-17.29422222 11.14112 43.5693037 23.05896297 86.95656297 34.35785481 130.48945778 1.91753482 10.43721482 3.83506963 20.87442963 5.63124147 31.33591704 1.6505363 44.91643259-14.1023763 90.16054518-43.07171555 124.5184-26.99112297 32.37963852-65.31754667 55.15946667-106.77513481 62.98737777-44.68584297 8.90804148-92.73344 0.49758815-131.10840889-24.27259259-36.63947852-23.22887111-63.70341925-60.01398518-77.9757037-100.73125926-8.08277333-22.77982815-12.1120237-46.8703763-12.91301927-70.99733334-2.45153185-52.48948148 11.27461925-106.11977482 41.2998163-149.53130666 35.28021333-51.80984889 90.90085925-87.42987852 150.53861926-104.80905482-4.39333925-16.79663408-8.88376889-33.56899555-13.32565334-50.36562963-11.51734518-36.25111703-9.06581333-76.95625482 8.11918223-111.03497481 9.27213037-19.0175763 23.05896297-35.58362075 39.0060563-49.35831703 17.75540148-15.18250667 38.48419555-27.17316741 61.08197925-33.38695111M481.22235259 413.16200297c-15.99563852 16.79663408-27.2095763 38.03515259-32.03982222 60.70575406-4.34479408 20.58315852-4.36906667 42.04013037-0.46117926 62.68397038 4.76956445 22.80410075 16.54177185 45.11061333 36.0569363 58.56976592 15.14609778 10.75275852 34.86757925 14.01742222 52.93852444 10.48576 33.4354963-5.87396741 60.71789037-36.63947852 61.65238518-70.68178963-1.27431111-8.43472592-2.66998518-16.86945185-5.04869925-25.07358815-12.48824889-47.23446518-25.08572445-94.43252148-37.50115556-141.69125925-28.25329778 8.71386075-55.14733037 23.39877925-75.59698963 45.00138667z"/>',
        webdav: '<path d="M895.8 592.1a32.2 32.1 0 1 0 64.4 0 32.2 32.1 0 1 0-64.4 0Z"/><path d="M928 687.9c-17.8 0-32.2 14.4-32.2 32.1v80.7c0 35.3-28.7 64-64 64H192.5c-35.3 0-64-28.7-64-64V225c0-35.3 28.7-64 64-64H415l82.7 143.3c6.6 11.4 19.2 17.2 31.5 15.8h302.5c35.3 0 64 28.7 64 64v80c0 17.7 14.4 32.1 32.2 32.1s32.2-14.4 32.2-32.1c0-0.8 0-1.6-0.1-2.4v-77.5C960 329 925.1 282 876.1 264v-1c0-68.2-55.8-124-124-124H476.2l-14.8-25.7c-7.4-12.9-18-16.2-27.3-16l-0.1-0.1H192.1c-70.7 0-128 57.3-128 128v574.1c0 70.7 57.3 128 128 128h640c70.7 0 128-57.3 128-128v-76.9c0.1-0.8 0.1-1.6 0.1-2.4 0-17.7-14.4-32.1-32.2-32.1zM747.1 202.8c31.6 0 58 23.2 63.1 53.4H543.9l-30.8-53.4h234z"/><text x="512" y="560" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="currentColor" text-anchor="middle" dominant-baseline="middle">DAV</text>',
        local: '<path d="M895.8 592.1a32.2 32.1 0 1 0 64.4 0 32.2 32.1 0 1 0-64.4 0Z"/><path d="M928 687.9c-17.8 0-32.2 14.4-32.2 32.1v80.7c0 35.3-28.7 64-64 64H192.5c-35.3 0-64-28.7-64-64V225c0-35.3 28.7-64 64-64H415l82.7 143.3c6.6 11.4 19.2 17.2 31.5 15.8h302.5c35.3 0 64 28.7 64 64v80c0 17.7 14.4 32.1 32.2 32.1s32.2-14.4 32.2-32.1c0-0.8 0-1.6-0.1-2.4v-77.5C960 329 925.1 282 876.1 264v-1c0-68.2-55.8-124-124-124H476.2l-14.8-25.7c-7.4-12.9-18-16.2-27.3-16l-0.1-0.1H192.1c-70.7 0-128 57.3-128 128v574.1c0 70.7 57.3 128 128 128h640c70.7 0 128-57.3 128-128v-76.9c0.1-0.8 0.1-1.6 0.1-2.4 0-17.7-14.4-32.1-32.2-32.1zM747.1 202.8c31.6 0 58 23.2 63.1 53.4H543.9l-30.8-53.4h234z"/>'
    };

    function updateSourceIcon(type) {
        if (!els.sourceIcon) return;
        var icon = sourceIcons[type] || sourceIcons.default;
        els.sourceIcon.innerHTML = icon;
    }

    function updateSourceLabel(text, sourceType) {
        els.sourceLabel.textContent = text || 'SaltWeb';
        if (sourceType) {
            updateSourceIcon(sourceType);
        }
    }

    function updateFolderName(text) {
        // Extract folder name from path
        if (text && text.indexOf('/') !== -1) {
            var parts = text.split('/').filter(Boolean);
            text = parts[parts.length - 1] || '全部歌曲';
        }
        els.folderName.textContent = text || '';
    }

    function updateSourceTab(mode) {
        sourceTabActive = mode;
        updateSourceTabUI(mode);
        showSourceTabContent(mode);
    }

    var cachedDefaultFolders = null;

    function renderDefaultFolders() {
        if (cachedDefaultFolders) {
            renderSourceFolders(cachedDefaultFolders.subfolders, cachedDefaultFolders.totalCount, App ? App.currentSubfolder || '' : '');
            return;
        }
        cachedDefaultFolders = { subfolders: [], totalCount: 0 };
        fetch('/api/folders').then(r => r.json()).then(data => {
            cachedDefaultFolders = data;
            renderSourceFolders(data.subfolders, data.totalCount, App ? App.currentSubfolder || '' : '');
        }).catch(() => {});
    }

    function renderSourceFolders(subfolders, totalCount, activePath, target) {
        var container = target || document.querySelector('#source-tab-default .source-folder-list');
        if (!container || typeof container === 'string') container = document.getElementById(container);
        if (!container) container = document.getElementById('source-tab-default');
        if (!container) return;

        // Update cache for default tab
        if (!target && subfolders) {
            cachedDefaultFolders = { subfolders: subfolders, totalCount: totalCount || 0 };
        }

        container.innerHTML = '';

        var allItem = document.createElement('div');
        allItem.className = 'source-folder-item' + (!activePath ? ' active' : '');
        allItem.setAttribute('data-path', '');
        allItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>全部歌曲</span><span class="source-folder-count">' + (totalCount || 0) + '</span>';
        allItem.addEventListener('click', function() { selectSourceFolder(allItem, ''); });
        container.appendChild(allItem);

        if (subfolders && subfolders.length) {
            for (var idx = 0; idx < subfolders.length; idx++) {
                var sf = subfolders[idx];
                var sfPath = sf.path || sf.name || '';
                var item = document.createElement('div');
                item.className = 'source-folder-item' + (activePath === sfPath ? ' active' : '');
                item.setAttribute('data-path', sfPath);
                item.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>' + escapeHtml(sf.name) + '</span><span class="source-folder-count">' + (sf.count || 0) + '</span>';
                (function(el, p) {
                    el.addEventListener('click', function() { selectSourceFolder(el, p); });
                })(item, sfPath);
                container.appendChild(item);
            }
        }
    }

    function selectSourceFolder(item, path) {
        var container = item.parentElement;
        if (container) {
            container.querySelectorAll('.source-folder-item').forEach(el => el.classList.remove('active'));
        }
        item.classList.add('active');
        if (typeof App !== 'undefined') App.selectSubfolder(path);
    }

    function updateSourceTabUI(mode) {
        els.sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === mode);
        });
    }

    function showSourceTabContent(mode) {
        document.getElementById('source-tab-default').classList.toggle('hidden', mode !== 'default');
        document.getElementById('source-tab-netease').classList.toggle('hidden', mode !== 'netease');
        document.getElementById('source-tab-webdav').classList.toggle('hidden', mode !== 'webdav');
        document.getElementById('source-tab-local').classList.toggle('hidden', mode !== 'local');
        if (mode === 'webdav') {
            if (typeof App !== 'undefined' && App.loadWebdavSavedList) App.loadWebdavSavedList();
            // Auto-connect if there are saved connections and not already connected
            if (typeof App !== 'undefined' && App.autoConnectWebdav) App.autoConnectWebdav();
        }
        if (mode === 'netease' && typeof NetEaseUI !== 'undefined') { NetEaseUI.init(); NetEaseUI.restoreLogin(); }
    }

    // ==================== Idle Detection ====================
    function initIdleDetection() {
        let idleTimer;
        function resetIdle() {
            document.body.classList.remove('rnp-idle');
            clearTimeout(idleTimer);
            if (Settings.get('idleMode')) {
                idleTimer = setTimeout(function() {
                    // First fade out
                    document.body.classList.add('rnp-idle');
                    // Then after transition, retract panels
                    setTimeout(function() {
                        if (!document.body.classList.contains('rnp-idle')) return;
                        if (els.sourcePanel) els.sourcePanel.classList.add('hidden');
                        if (els.btnSource) els.btnSource.classList.remove('open');
                        if (els.settingsPanel) els.settingsPanel.classList.add('hidden');
                        if (els.playlistPanel) els.playlistPanel.classList.add('hidden');
                        if (els.btnTogglePlaylist) els.btnTogglePlaylist.classList.remove('active');
                        if (els.btnToggleSettings) els.btnToggleSettings.style.visibility = '';
                    }, 550);
                }, Settings.get('idleTimeout') * 1000);
            }
        }
        document.addEventListener('mousemove', resetIdle);
        document.addEventListener('mousedown', resetIdle);
        document.addEventListener('keydown', resetIdle);
        document.addEventListener('wheel', resetIdle);
        resetIdle();
        Settings.onChange(null, () => {
            clearTimeout(idleTimer);
            document.body.classList.remove('rnp-idle');
            resetIdle();
        });
    }

    // ==================== Context Menu ====================
    function initContextMenu() {
        // Block default context menu everywhere except context-menu itself
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('.context-menu')) {
                e.preventDefault();
            }
        });

        // Close on click outside
        document.addEventListener('click', () => els.contextMenu.classList.add('hidden'));
        els.contextMenu.addEventListener('click', (e) => e.stopPropagation());

        // Album art context menu
        els.albumArt.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const src = els.albumArt.src;
            if (!src) return;
            els.contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="copy-cover">复制封面地址</div>
                <div class="context-menu-item" data-action="open-cover">在浏览器中打开</div>
                <div class="context-menu-item" data-action="download-cover">下载封面</div>
            `;
            els.contextMenu.style.left = `${e.clientX}px`;
            els.contextMenu.style.top = `${e.clientY}px`;
            els.contextMenu.classList.remove('hidden');

            els.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                item.onclick = () => {
                    if (item.dataset.action === 'copy-cover') {
                        navigator.clipboard.writeText(src).catch(() => {});
                    } else if (item.dataset.action === 'open-cover') {
                        window.open(src, '_blank');
                    } else if (item.dataset.action === 'download-cover') {
                        var t = typeof PlaylistManager !== 'undefined' ? PlaylistManager.getCurrentTrack() : null;
                        var coverName = 'cover.jpg';
                        var downloadSrc = src;
                        if (t) {
                            var artist = t.artist || '';
                            var title = t.title || '';
                            coverName = artist ? artist + ' - ' + title + '.jpg' : title + '.jpg';
                            // Use high quality cover if available
                            if (t.hqCoverUrl) downloadSrc = t.hqCoverUrl;
                        }
                        downloadFile(downloadSrc, coverName);
                    }
                    els.contextMenu.classList.add('hidden');
                };
            });
        });

        // Lyrics context menu
        els.lyricsContent.addEventListener('contextmenu', (e) => {
            const line = e.target.closest('.lyrics-line');
            if (!line || line.classList.contains('interlude')) return;
            e.preventDefault();

            const original = line.querySelector('.lyric-original')?.textContent || '';
            const translation = line.querySelector('.lyric-translation')?.textContent || '';
            const fullText = translation ? `${original}\n${translation}` : original;

            els.contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="copy-lyric">复制当前歌词</div>
                <div class="context-menu-item" data-action="copy-all-lyrics">复制全部歌词</div>
                <div class="context-menu-item" data-action="download-lyrics">下载歌词(txt)</div>
                <div class="context-menu-item" data-action="download-lyrics-lrc">下载歌词(lrc)</div>
            `;
            els.contextMenu.style.left = `${e.clientX}px`;
            els.contextMenu.style.top = `${e.clientY}px`;
            els.contextMenu.classList.remove('hidden');

            els.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                item.onclick = () => {
                    if (item.dataset.action === 'copy-lyric') {
                        navigator.clipboard.writeText(fullText).catch(() => {});
                    } else if (item.dataset.action === 'copy-all-lyrics') {
                        copyAllLyrics();
                    } else if (item.dataset.action === 'download-lyrics') {
                        downloadLyrics();
                    } else if (item.dataset.action === 'download-lyrics-lrc') {
                        downloadLyricsWithTimestamp();
                    }
                    els.contextMenu.classList.add('hidden');
                };
            });
        });

        // Mobile lyrics context menu
        var mobileLyrics = document.getElementById('mobile-lyrics');
        if (mobileLyrics) {
            mobileLyrics.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                els.contextMenu.innerHTML = `
                    <div class="context-menu-item" data-action="copy-all-lyrics">复制全部歌词</div>
                    <div class="context-menu-item" data-action="download-lyrics">下载歌词(txt)</div>
                    <div class="context-menu-item" data-action="download-lyrics-lrc">下载歌词(lrc)</div>
                `;
                els.contextMenu.style.left = `${e.clientX}px`;
                els.contextMenu.style.top = `${e.clientY}px`;
                els.contextMenu.classList.remove('hidden');

                els.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                    item.onclick = () => {
                        if (item.dataset.action === 'copy-all-lyrics') {
                            copyAllLyrics();
                        } else if (item.dataset.action === 'download-lyrics') {
                            downloadLyrics();
                        } else if (item.dataset.action === 'download-lyrics-lrc') {
                            downloadLyricsWithTimestamp();
                        }
                        els.contextMenu.classList.add('hidden');
                    };
                });
            });
        }
    }

    function downloadFile(url, filename) {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function copyAllLyrics() {
        var lines = els.lyricsContent.querySelectorAll('.lyrics-line');
        var text = '';
        lines.forEach(function(line) {
            var original = line.querySelector('.lyric-original');
            var translation = line.querySelector('.lyric-translation');
            if (original && original.textContent.trim()) {
                text += original.textContent.trim();
                if (translation && translation.textContent.trim()) {
                    text += '\n' + translation.textContent.trim();
                }
                text += '\n';
            }
        });
        navigator.clipboard.writeText(text.trim()).catch(function() {});
    }

    function downloadTrack(track) {
        var sourceMode = typeof App !== 'undefined' ? App.playbackSourceMode : 'default';
        if (sourceMode === 'local') {
            showToast('你der啊！本地文件你下什么');
            return;
        }
        if (sourceMode === 'netease') {
            downloadNeteaseTrack(track);
        } else {
            downloadDefaultTrack(track);
        }
    }

    async function downloadNeteaseTrack(track) {
        var id = track.neteaseId || track.id;
        if (!id) { showToast('无法获取歌曲ID'); return; }
        showToast('获取下载链接...');
        var quality = typeof Settings !== 'undefined' ? Settings.get('neteaseQuality') || '320000' : '320000';
        if (quality === 'flac') quality = '350000';
        var urlData = await NetEaseAPI.getSongUrl(id, quality);
        if (urlData && urlData.data && urlData.data[0] && urlData.data[0].url) {
            var url = urlData.data[0].url;
            var ext = urlData.data[0].type || 'mp3';
            var filename = (track.artist || '') + ' - ' + (track.title || 'track') + '.' + ext;
            var proxyUrl = '/api/netease/download?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename);
            // Use fetch to get blob then trigger download
            try {
                showToast('下载中...');
                var resp = await fetch(proxyUrl);
                var blob = await resp.blob();
                var blobUrl = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 10000);
                showToast('下载完成');
            } catch(e) {
                console.error('Download error:', e);
                showToast('下载失败');
            }
        } else {
            showToast('无法获取下载链接');
        }
    }

    function downloadDefaultTrack(track) {
        if (!track.url) { showToast('无下载地址'); return; }
        var filename = (track.artist || '') + ' - ' + (track.title || 'track');
        var ext = track.url.split('.').pop().split('?')[0] || 'mp3';
        downloadFile(track.url, filename + '.' + ext);
        showToast('开始下载');
    }

    function downloadLyrics() {
        var t = typeof PlaylistManager !== 'undefined' ? PlaylistManager.getCurrentTrack() : null;
        var title = t ? (t.title || 'lyrics') : 'lyrics';
        var artist = t ? (t.artist || '') : '';
        var filename = artist ? artist + ' - ' + title + '.txt' : title + '.txt';

        var lines = els.lyricsContent.querySelectorAll('.lyrics-line');
        var text = '';
        lines.forEach(function(line) {
            var original = line.querySelector('.lyric-original');
            var translation = line.querySelector('.lyric-translation');
            if (original && original.textContent.trim()) {
                text += original.textContent.trim();
                if (translation && translation.textContent.trim()) {
                    text += '\n' + translation.textContent.trim();
                }
                text += '\n';
            }
        });

        var blob = new Blob([text.trim()], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        downloadFile(url, filename);
        URL.revokeObjectURL(url);
    }

    function downloadLyricsWithTimestamp() {
        var t = typeof PlaylistManager !== 'undefined' ? PlaylistManager.getCurrentTrack() : null;
        var title = t ? (t.title || 'lyrics') : 'lyrics';
        var artist = t ? (t.artist || '') : '';
        var filename = artist ? artist + ' - ' + title + '.lrc' : title + '.lrc';

        // Get lyrics from LyricsEngine
        var lyrics = typeof LyricsEngine !== 'undefined' ? LyricsEngine.lyrics : [];
        if (!lyrics.length) return;

        var text = '';
        lyrics.forEach(function(line) {
            var time = line.time || 0;
            var min = Math.floor(time / 60000);
            var sec = Math.floor((time % 60000) / 1000);
            var ms = Math.floor((time % 1000) / 10);
            var timeStr = '[' + String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + '.' + String(ms).padStart(2, '0') + ']';
            text += timeStr + (line.original || '') + '\n';
            if (line.translation) {
                text += timeStr + line.translation + '\n';
            }
        });

        var blob = new Blob([text.trim()], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        downloadFile(url, filename);
        URL.revokeObjectURL(url);
    }

    // 需要排除的敏感配置项（cookie、token等）
    var sensitiveKeys = ['_neteaseCookie', '_neteaseMusicU', '_neteaseCsrf', '_neteaseUserInfo'];
    var sensitivelocalStorageKeys = ['netease-cookie', 'netease-music-u', 'netease-csrf', 'netease-user-info'];

    function exportSettings() {
        var data = {};
        try { data = JSON.parse(localStorage.getItem('rnp-settings') || '{}'); } catch(e) {}

        // 手动构建带注释的配置文件
        var lines = [];
        lines.push('{');

        // === 外观设置 ===
        lines.push('  // === 外观设置 ===');
        lines.push('  "textGlow": ' + !!data.textGlow + ',                       // 文字辉光效果');
        lines.push('  "idleMode": ' + !!data.idleMode + ',                       // 沉浸模式（自动隐藏UI）');
        lines.push('  "idleTimeout": ' + (data.idleTimeout || 3) + ',                       // 沉浸模式等待时间（秒）');
        lines.push('  "progressBottom": ' + !!data.progressBottom + ',           // 进度条贴底模式');
        lines.push('');

        // === 封面设置 ===
        lines.push('  // === 封面设置 ===');
        lines.push('  "rectangleCover": ' + !!data.rectangleCover + ',           // 方形封面（关闭为圆形）');
        lines.push('  "coverBlurryShadow": ' + !!data.coverBlurryShadow + ',    // 封面发光效果');
        lines.push('  "horizontalAlign": "' + (data.horizontalAlign || 'center') + '",        // 封面水平对齐（left/center/right）');
        lines.push('  "immersiveColor": "' + (data.immersiveColor || 'off') + '",          // 沉浸主题色（off/primary/secondary/tertiary）');
        lines.push('  "coverRotate": ' + !!data.coverRotate + ',                 // 封面旋转动画');
        lines.push('  "coverRotateSpeed": ' + (data.coverRotateSpeed || 20) + ',       // 封面旋转速度（秒）');
        lines.push('  "coverSize": ' + (data.coverSize || 350) + ',                     // 封面大小（像素）');
        lines.push('');

        // === 背景设置 ===
        lines.push('  // === 背景设置 ===');
        lines.push('  "bgType": "' + (data.bgType || 'blur') + '",                          // 背景类型（blur/rotate/gradient/dynamic/solid/none/fluid）');
        lines.push('  "bgBlur": ' + (data.bgBlur || 40) + ',                          // 背景模糊度（像素）');
        lines.push('  "bgDim": ' + (data.bgDim || 55) + ',                            // 背景暗化程度（%）');
        lines.push('  "bgOpacity": ' + (data.bgOpacity || 100) + ',                    // 背景透明度（%）');
        lines.push('  "blurDim": ' + (data.blurDim || 55) + ',                        // 模糊背景暗化（%）');
        lines.push('  "blurOpacity": ' + (data.blurOpacity || 100) + ',                // 模糊背景透明度（%）');
        lines.push('  "fluidDim": ' + (data.fluidDim || 55) + ',                      // 流体背景暗化（%）');
        lines.push('  "fluidOpacity": ' + (data.fluidOpacity || 100) + ',              // 流体背景透明度（%）');
        lines.push('  "gradientDim": ' + (data.gradientDim || 55) + ',                // 渐变背景暗化（%）');
        lines.push('  "gradientOpacity": ' + (data.gradientOpacity || 100) + ',        // 渐变背景透明度（%）');
        lines.push('  "solidDim": ' + (data.solidDim || 55) + ',                      // 纯色背景暗化（%）');
        lines.push('  "solidOpacity": ' + (data.solidOpacity || 100) + ',              // 纯色背景透明度（%）');
        lines.push('  "noneDim": ' + (data.noneDim || 55) + ',                        // 无背景暗化（%）');
        lines.push('  "noneOpacity": ' + (data.noneOpacity || 100) + ',                // 无背景透明度（%）');
        lines.push('  "dynamicGradientDim": ' + (data.dynamicGradientDim || 40) + ',  // 渐变暗化（%）');
        lines.push('  "dynamicGradientOpacity": ' + (data.dynamicGradientOpacity || 100) + ', // 渐变透明度（%）');
        lines.push('  "dynamicGradientSpeed": ' + (data.dynamicGradientSpeed || 15) + ',     // 渐变速度（秒）');
        lines.push('  "dynamicGradientBlur": ' + (data.dynamicGradientBlur || 20) + ',       // 渐变模糊度（像素）');
        lines.push('  "dynamicGradientDarken": ' + (data.dynamicGradientDarken || 30) + ',   // 渐变加深（%）');
        lines.push('  "dynamicGradientFilterBright": ' + !!data.dynamicGradientFilterBright + ', // 渐变过滤亮色');
        lines.push('  "solidColor": "' + (data.solidColor || '#1a1a2e') + '",                  // 纯色背景颜色（HEX）');
        lines.push('  "solidFollowAccent": ' + !!data.solidFollowAccent + ',            // 纯色跟随主题色');
        lines.push('  "rotateBgSpeed": ' + (data.rotateBgSpeed || 15) + ',            // 旋转背景速度（秒）');
        lines.push('  "rotateBgBlur": ' + (data.rotateBgBlur || 30) + ',              // 旋转背景模糊度（像素）');
        lines.push('  "rotateBgZoom": ' + (data.rotateBgZoom || 185) + ',             // 旋转背景缩放（%）');
        lines.push('  "fluidBgBlur": ' + (data.fluidBgBlur || 10) + ',                // 流体背景模糊度（像素）');
        lines.push('  "fluidBgSpeed": ' + (data.fluidBgSpeed || 25) + ',              // 流体背景速度（秒）');
        lines.push('');

        // === 歌词设置 ===
        lines.push('  // === 歌词设置 ===');
        lines.push('  "lyricAlign": "' + (data.lyricAlign || 'center') + '",              // 歌词对齐方式（left/center/right）');
        lines.push('  "lyricFontSize": ' + (data.lyricFontSize || 28) + ',            // 原文歌词字号（像素）');
        lines.push('  "lyricFontWeight": ' + (data.lyricFontWeight || 500) + ',        // 原文歌词字重（100-900）');
        lines.push('  "transFontSize": ' + (data.transFontSize || 18) + ',            // 翻译歌词字号（像素）');
        lines.push('  "transFontWeight": ' + (data.transFontWeight || 400) + ',        // 翻译歌词字重（100-900）');
        lines.push('  "lyricFade": ' + !!data.lyricFade + ',                    // 歌词淡出效果');
        lines.push('  "lyricZoom": ' + !!data.lyricZoom + ',                    // 歌词缩放效果');
        lines.push('  "lyricBlur": ' + !!data.lyricBlur + ',                    // 歌词模糊效果');
        lines.push('  "showTranslation": ' + !!data.showTranslation + ',        // 显示翻译歌词');
        lines.push('  "showRomaji": ' + !!data.showRomaji + ',                  // 显示罗马音');
        lines.push('  "lyricAlignment": ' + (data.lyricAlignment || 45) + ',          // 歌词对齐位置（%）');
        lines.push('  "lyricGlow": ' + !!data.lyricGlow + ',                    // 歌词整体辉光');
        lines.push('  "textShadow": ' + !!data.textShadow + ',                  // 文字阴影效果');
        lines.push('  "customFontFamily": "' + (data.customFontFamily || '') + '",      // 自定义全局字体');
        lines.push('  "lyricFontFamily": "' + (data.lyricFontFamily || '') + '",        // 歌词专用字体');
        lines.push('  "transFontFamily": "' + (data.transFontFamily || '') + '",        // 翻译专用字体');
        lines.push('  "titleFontFamily": "' + (data.titleFontFamily || '') + '",        // 标题专用字体');
        lines.push('  "artistFontFamily": "' + (data.artistFontFamily || '') + '",      // 艺术家专用字体');
        lines.push('  "lyricLineSpacing": ' + (data.lyricLineSpacing || 8) + ',      // 歌词行间距（像素）');
        lines.push('  "titleFontSize": ' + (data.titleFontSize || 22) + ',            // 标题字号（像素）');
        lines.push('  "titleFontWeight": ' + (data.titleFontWeight || 600) + ',        // 标题字重（100-900）');
        lines.push('  "artistFontSize": ' + (data.artistFontSize || 16) + ',          // 艺术家字号（像素）');
        lines.push('  "artistFontWeight": ' + (data.artistFontWeight || 400) + ',      // 艺术家字重（100-900）');
        lines.push('');

        // === 元素辉光/阴影 ===
        lines.push('  // === 元素辉光与阴影 ===');
        lines.push('  "lyricOrigGlow": ' + !!data.lyricOrigGlow + ',            // 原文歌词辉光');
        lines.push('  "lyricOrigShadow": ' + !!data.lyricOrigShadow + ',        // 原文歌词阴影');
        lines.push('  "lyricTransGlow": ' + !!data.lyricTransGlow + ',          // 翻译歌词辉光');
        lines.push('  "lyricTransShadow": ' + !!data.lyricTransShadow + ',      // 翻译歌词阴影');
        lines.push('  "trackTitleGlow": ' + !!data.trackTitleGlow + ',          // 曲目标题辉光');
        lines.push('  "trackTitleShadow": ' + !!data.trackTitleShadow + ',      // 曲目标题阴影');
        lines.push('  "trackArtistGlow": ' + !!data.trackArtistGlow + ',        // 艺术家名称辉光');
        lines.push('  "trackArtistShadow": ' + !!data.trackArtistShadow + ',    // 艺术家名称阴影');
        lines.push('');

        // === 移动端歌词设置 ===
        lines.push('  // === 移动端歌词设置 ===');
        lines.push('  "mobileLyricSize": ' + (data.mobileLyricSize || 13) + ',        // 移动端歌词字号（像素）');
        lines.push('  "mobileLyricWeight": ' + (data.mobileLyricWeight || 500) + ',    // 移动端歌词字重（100-900）');
        lines.push('  "mobileTransSize": ' + (data.mobileTransSize || 10) + ',        // 移动端翻译字号（像素）');
        lines.push('  "mobileTransWeight": ' + (data.mobileTransWeight || 400) + ',    // 移动端翻译字重（100-900）');
        lines.push('  "mobileLineSpacing": ' + (data.mobileLineSpacing || 4) + ',    // 移动端行间距（像素）');
        lines.push('');

        // === 播放设置 ===
        lines.push('  // === 播放设置 ===');
        lines.push('  "volume": ' + (data.volume || 80) + ',                          // 音量（0-100%）');
        lines.push('  "rate": ' + (data.rate || 1) + ',                              // 播放倍速（0.5-2.0）');
        lines.push('  "speedStep": ' + (data.speedStep || 0.1) + ',                    // 倍速调节步进（0.05-0.5）');
        lines.push('');

        // === 网易云设置 ===
        lines.push('  // === 网易云设置 ===');
        lines.push('  "neteaseQuality": "' + (data.neteaseQuality || '320000') + '",          // 音质（192000/标准LQ, 320000/极高HQ, flac/FLAC）');
        lines.push('  "neteaseVipType": "' + (data.neteaseVipType || 'auto') + '",          // VIP类型显示（auto/vip/svip）');
        lines.push('  "neteaseDefaultDaily": ' + !!data.neteaseDefaultDaily + ',// 每日推荐作为默认首页');
        lines.push('');

        lines.push('}');

        var json = lines.join('\n');
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'saltmusic-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('配置已导出（已排除敏感信息）');
    }

    function importSettings() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var text = ev.target.result;
                    // 去除 // 注释
                    text = text.replace(/\/\/.*$/gm, '');
                    // 去除尾随逗号
                    text = text.replace(/,\s*([\]}])/g, '$1');
                    var importData = JSON.parse(text);
                    // 过滤掉注释字段（以 _comment 开头）
                    var data = {};
                    Object.keys(importData).forEach(function(key) {
                        if (!key.startsWith('_comment')) {
                            data[key] = importData[key];
                        }
                    });
                    // 确保敏感信息不被导入（即使文件中包含）
                    sensitiveKeys.forEach(function(k) { delete data[k]; });
                    // 不导入WebDAV信息
                    delete data.webdavConnections;
                    // 合并到现有设置（保留未导出的字段）
                    var current = {};
                    try { current = JSON.parse(localStorage.getItem('rnp-settings') || '{}'); } catch(e) {}
                    Object.assign(current, data);
                    localStorage.setItem('rnp-settings', JSON.stringify(current));
                    showToast('配置已导入，刷新页面生效');
                } catch(e) {
                    showToast('导入失败：文件格式错误');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ==================== Settings Panel ====================
    function toggleSettingsPanel() {
        var isOpen = !els.settingsPanel.classList.contains('hidden');
        if (!isOpen) {
            // Close other panels
            els.sourcePanel.classList.add('hidden');
            els.btnSource.classList.remove('open');
            els.playlistPanel.classList.add('hidden');
            els.playlistPanel.classList.remove('closing');
            els.btnTogglePlaylist.classList.remove('active');
        }
        els.settingsPanel.classList.toggle('hidden');
    }

    function initSettingsEvents() {
        els.btnToggleSettings.addEventListener('click', toggleSettingsPanel);
        els.settingsOverlay.addEventListener('click', toggleSettingsPanel);
        var settingsCloseBtn = document.getElementById('settings-close-btn');
        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', toggleSettingsPanel);

        // Tab switching
        els.settingsTabs.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                renderSettingsPanel(tab.dataset.tab);
            });
        });

        // React to settings changes
        Settings.onChange(null, (key) => {
            Settings.applyBodyClasses();
            Settings.applyCSSVariables();
            LyricsEngine.updateLayout();
            // Re-apply accent color when immersive color changes
            if (key === 'immersiveColor') {
                var img = els.albumArt;
                if (img && img.complete && img.naturalWidth > 0) {
                    extractColorsAndUpdate(img);
                }
            }
            // Re-apply dynamic gradient when filter setting changes
            if (key === 'dynamicGradientFilterBright') {
                var img = els.albumArt;
                if (img && img.complete && img.naturalWidth > 0) {
                    updateBackground(img.src);
                }
            }
        });

        // Handle debug switch via event delegation
        els.settingsContent.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'debug-switch-settings') {
                var panel = document.getElementById('debug-log-panel');
                if (panel) panel.style.display = e.target.checked ? 'block' : 'none';
                var ws = document.getElementById('debug-switch');
                if (ws) ws.checked = e.target.checked;
            }
        });
    }

    function renderSettingsPanel(tabName) {
        // Update tabs
        els.settingsTabs.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        const s = Settings;
        let html = '';

        if (tabName === 'appearance') {
            html += toggle('idleMode', '沉浸模式', s.get('idleMode'));
            if (s.get('idleMode')) {
                html += slider('idleTimeout', '等待时长', 1, 10, s.get('idleTimeout'), 's');
            }
            html += toggle('progressBottom', '进度条贴底', s.get('progressBottom')) +
                '<div class="settings-sep"></div>' +
                group('倍速') +
                '<div class="settings-row desktop-hide-speed-slider"><span class="settings-label">当前倍速</span><input type="range" class="settings-slider" data-key="rate" id="speed-slider" min="0.5" max="2" step="' + (s.get('speedStep') || 0.1) + '" value="' + (typeof AudioEngine !== 'undefined' ? AudioEngine.getRate() : s.get('rate') || 1) + '"><span id="speed-slider-value" style="font-size:11px;color:rgba(255,255,255,0.3);min-width:30px;text-align:right">' + (function() { var r = typeof AudioEngine !== 'undefined' ? AudioEngine.getRate() : s.get('rate') || 1; var fmt = r.toFixed(2); if (fmt.endsWith('00')) fmt = fmt.slice(0, -3); else if (fmt.endsWith('0')) fmt = fmt.slice(0, -1); return fmt + 'x'; })() + '</span></div>' +
                '<div class="settings-row mobile-hide-speed-step"><span class="settings-label">快捷键梯度</span><input type="text" id="speed-step-input" class="settings-select" style="width:60px;text-align:center" value="' + s.get('speedStep') + '"></div>' +
                '<div class="settings-sep"></div>' +
                group('快捷键') +
                '<div class="elem-group"><div class="elem-group-header"><span>快捷键说明</span><svg class="elem-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div class="elem-group-body hidden">' +
                '<div class="settings-shortcut-list">' +
                '<div class="settings-shortcut-title">播放控制</div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Space</span><span>播放/暂停</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Ctrl + ←</span><span>上一首</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Ctrl + →</span><span>下一首</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Ctrl + ↓</span><span>播放/暂停</span></div>' +
                '<div class="settings-shortcut-title">进度与音量</div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">←</span><span>后退 5 秒</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">→</span><span>前进 5 秒</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">0-9</span><span>跳转到 0%-90%</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">B</span><span>回到开头</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">↑</span><span>音量 +10%</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">↓</span><span>音量 -10%</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">M</span><span>静音/取消静音</span></div>' +
                '<div class="settings-shortcut-title">倍速调节</div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">X</span><span class="speed-step-desc">减速 (-' + s.get('speedStep') + 'x)</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">C</span><span class="speed-step-desc">加速 (+' + s.get('speedStep') + 'x)</span></div>' +
                '</div>' +
                '</div></div>' +
                '<div class="settings-sep"></div>' +
                group('字体') +
                customFontRow(s.get('customFontFamily')) +
                '<div class="settings-sep"></div>' +
                group('网易云') +
                toggle('neteaseDefaultDaily', '每日推荐为默认页', s.get('neteaseDefaultDaily')) +
                toggle('neteaseLyrics', '网易云歌词（无本地歌词时自动获取）', s.get('neteaseLyrics')) +
                (s.get('neteaseLyrics') ? toggle('neteaseLyricsPriority', '网易云歌词优先（优先于本地歌词）', s.get('neteaseLyricsPriority')) : '') +
                '<div class="settings-sep"></div>' +
                selectGroup('neteaseQuality', [
                    { value: '192000', label: '标准' },
                    { value: '320000', label: '极高' },
                    { value: 'flac', label: '无损' },
                ], s.get('neteaseQuality'), '播放音质') +
                '<div class="settings-hint">更高音质需要VIP权益，且消耗更多流量</div>' +
                (typeof NetEaseUI !== 'undefined' && NetEaseUI.isVipUser() ?
                    '<div class="settings-sep"></div>' +
                    selectGroup('neteaseVipType', [
                        { value: 'auto', label: '自动检测' },
                        { value: 'none', label: '普通' },
                        { value: 'vip', label: 'VIP' },
                        { value: 'svip', label: 'SVIP' },
                    ], s.get('neteaseVipType'), 'VIP状态修正') : '') +
                '<div class="settings-sep"></div>' +
                group('配置') +
                toggle('cloudSync', '云端同步（跨设备迷你模式）', s.get('cloudSync')) +
                '<div class="settings-hint">开启后迷你模式可从其他设备获取播放状态</div>' +
                '<div class="settings-row" style="gap:8px"><button class="settings-btn" onclick="typeof UI!==\'undefined\'&&UI.exportSettings()">导出配置</button><button class="settings-btn" onclick="typeof UI!==\'undefined\'&&UI.importSettings()">导入配置</button></div>' +
                '<div class="settings-sep"></div>' +
                group('调试') +
                '<div class="settings-row"><span class="settings-label">调试日志</span><input type="checkbox" class="settings-checkbox" id="debug-switch-settings"></div>';
        }

        if (tabName === 'cover') {
            html += selectGroup('horizontalAlign', [
                    { value: 'left', label: '靠左' },
                    { value: 'center', label: '居中' },
                    { value: 'right', label: '靠右' },
            ], s.get('horizontalAlign'), '对齐方式') +
                slider('coverSize', '封面大小', 120, 500, s.get('coverSize'), 'px', null, 'mobile-hide-cover-size') +
                selectGroup('rectangleCover', [
                    { value: 'true', label: '矩形' },
                    { value: 'false', label: '圆形' },
            ], String(s.get('rectangleCover')), '封面样式') +
                toggle('coverBlurryShadow', '封面发光', s.get('coverBlurryShadow'));
            if (!s.get('rectangleCover')) {
                html += toggle('coverRotate', '封面旋转', s.get('coverRotate'));
                if (s.get('coverRotate')) {
                    html += slider('coverRotateSpeed', '旋转速度', 2, 30, s.get('coverRotateSpeed'), 's');
                }
            }
        }

        if (tabName === 'background') {
            html += selectGroup('immersiveColor', [
                    { value: 'off', label: '关' },
                    { value: 'primary', label: '鲜艳' },
                    { value: 'secondary', label: '柔和' },
                    { value: 'tertiary', label: '偏色' },
                ], s.get('immersiveColor'), '沉浸主题色') +
                '<div class="settings-sep"></div>' +
                group('背景类型') +
                selectGroup('bgType', [
                    { value: 'blur', label: '模糊' },
                    { value: 'fluid', label: '动态' },
                    { value: 'gradient', label: '旋转' },
                    { value: 'dynamic-gradient', label: '渐变' },
                    { value: 'solid', label: '纯色' },
                    { value: 'none', label: '无' },
                ], s.get('bgType'));
            if (s.get('bgType') === 'blur') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">模糊设置</div>' +
                    slider('blurDim', '压暗程度', 0, 100, s.get('blurDim'), '%') +
                    slider('blurOpacity', '不透明度', 0, 100, s.get('blurOpacity'), '%') +
                    slider('bgBlur', '模糊强度', 0, 100, s.get('bgBlur'), 'px');
            }
            if (s.get('bgType') === 'fluid') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">动态设置</div>' +
                    slider('fluidDim', '压暗程度', 0, 100, s.get('fluidDim'), '%') +
                    slider('fluidOpacity', '不透明度', 0, 100, s.get('fluidOpacity'), '%') +
                    slider('fluidBgBlur', '动态模糊', 0, 40, s.get('fluidBgBlur'), 'px');
            }
            if (s.get('bgType') === 'gradient') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">旋转设置</div>' +
                    slider('gradientDim', '压暗程度', 0, 100, s.get('gradientDim'), '%') +
                    slider('gradientOpacity', '不透明度', 0, 100, s.get('gradientOpacity'), '%') +
                    slider('rotateBgSpeed', '旋转速度', 1, 30, s.get('rotateBgSpeed'), 's') +
                    slider('rotateBgBlur', '旋转模糊', 0, 80, s.get('rotateBgBlur'), 'px') +
                    slider('rotateBgZoom', '封面放大', 100, 300, s.get('rotateBgZoom') - 85, '%', function(v) { return v + 85; }) +
                    slider('gradientAccent', '强调色蒙版', 0, 80, s.get('gradientAccent'), '%');
            }
            if (s.get('bgType') === 'dynamic-gradient') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">渐变设置</div>' +
                    slider('dynamicGradientDarken', '压暗程度', 0, 80, s.get('dynamicGradientDarken'), '%') +
                    slider('dynamicGradientOpacity', '不透明度', 0, 100, s.get('dynamicGradientOpacity'), '%') +
                    slider('dynamicGradientSpeed', '动画速度', 5, 60, s.get('dynamicGradientSpeed'), 's') +
                    slider('dynamicGradientDim', '强调色蒙版', 0, 100, s.get('dynamicGradientDim'), '%') +
                    toggle('dynamicGradientFilterBright', '屏蔽高亮色', s.get('dynamicGradientFilterBright'));
            }
            if (s.get('bgType') === 'solid') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">纯色设置</div>' +
                    slider('solidDim', '压暗程度', 0, 100, s.get('solidDim'), '%') +
                    slider('solidOpacity', '不透明度', 0, 100, s.get('solidOpacity'), '%') +
                    toggle('solidFollowAccent', '跟随强调色', s.get('solidFollowAccent'));
                if (!s.get('solidFollowAccent')) {
                    html += '<div class="settings-row"><span class="settings-label">自定义背景色</span><input type="color" id="solid-color-picker" value="' + s.get('solidColor') + '" style="width:40px;height:28px;border:none;border-radius:4px;cursor:pointer"></div>';
                }
            }
        }

        if (tabName === 'lyrics') {
            html += group('效果') +
                toggle('lyricFade', '淡出效果', s.get('lyricFade')) +
                toggle('lyricZoom', '缩放效果', s.get('lyricZoom')) +
                toggle('lyricBlur', '模糊效果', s.get('lyricBlur')) +
                toggle('showTranslation', '显示翻译', s.get('showTranslation')) +
                toggle('karaokeLyrics', '逐字歌词', s.get('karaokeLyrics')) +
                '<div class="settings-sep"></div>' + group('位置') +
                selectGroup('lyricAlign', [
                    { value: 'left', label: '居左' },
                    { value: 'center', label: '居中' },
                    { value: 'right', label: '居右' },
                ], s.get('lyricAlign') || 'center', '对齐方式') +
                slider('lyricAlignment', '歌词位置', 10, 90, s.get('lyricAlignment'), '%') +
                slider('lyricLineSpacing', '行距', 2, 40, s.get('lyricLineSpacing'), 'px') +
                '<div class="settings-sep"></div>' +
                '<div class="mobile-lyric-group">' + group('文字效果设置') + '</div>' +
                '<div class="mobile-lyric-settings">' +
                slider('mobileLyricSize', '歌词字号', 8, 40, s.get('mobileLyricSize'), 'px') +
                slider('mobileLyricWeight', '歌词粗细', 300, 700, s.get('mobileLyricWeight'), '') +
                slider('mobileTransSize', '翻译字号', 6, 30, s.get('mobileTransSize'), 'px') +
                slider('mobileTransWeight', '翻译粗细', 300, 500, s.get('mobileTransWeight'), '') +
                slider('mobileLineSpacing', '歌词行距', 0, 12, s.get('mobileLineSpacing'), 'px') +
                '</div>' +
                // Parent collapsible: 文字效果
                '<div class="elem-group"><div class="elem-group-header"><span>文字效果</span><svg class="elem-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div class="elem-group-body hidden">' +
                elemSection('歌词原文', 'lyricOrig', s, 'lyricFontFamily', 'lyricFontSize', 'lyricFontWeight') +
                '<div class="settings-sep"></div>' +
                elemSection('歌词翻译', 'lyricTrans', s, 'transFontFamily', 'transFontSize', 'transFontWeight') +
                '<div class="settings-sep"></div>' +
                elemSection('曲名', 'trackTitle', s, 'titleFontFamily', 'titleFontSize', 'titleFontWeight') +
                '<div class="settings-sep"></div>' +
                elemSection('歌手', 'trackArtist', s, 'artistFontFamily', 'artistFontSize', 'artistFontWeight') +
                '</div></div>';
        }

        els.settingsContent.innerHTML = html;
        // Collapsible element groups
        els.settingsContent.querySelectorAll('.elem-group-header, .elem-subgroup-header').forEach(function(h) {
            h.addEventListener('click', function() {
                var parent = this.parentElement;
                parent.classList.toggle('open');
                var body = parent.querySelector('.elem-group-body, .elem-subgroup-body');
                if (body) body.classList.toggle('hidden');
            });
        });
        bindSettingsControls();
    }

    function bindSettingsControls() {
        els.settingsContent.querySelectorAll('.settings-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const key = cb.dataset.key;
                const val = cb.checked;
                Settings.set(key, val);
                // Special handling
                if (key === 'lyricFade' || key === 'lyricZoom' || key === 'lyricBlur') {
                    LyricsEngine.updateLayout();
                }
                if (key === 'textGlow') {
                    document.body.classList.toggle('rnp-text-glow', val);
                }
                if (key === 'textShadow') {
                    document.body.classList.toggle('rnp-shadow', val);
                }
                // Per-element glow/shadow
                if (key === 'lyricOrigGlow') document.body.classList.toggle('rnp-glow-lyric', val);
                if (key === 'lyricOrigShadow') document.body.classList.toggle('rnp-shadow-lyric', val);
                if (key === 'lyricTransGlow') document.body.classList.toggle('rnp-glow-trans', val);
                if (key === 'lyricTransShadow') document.body.classList.toggle('rnp-shadow-trans', val);
                if (key === 'trackTitleGlow') document.body.classList.toggle('rnp-glow-title', val);
                if (key === 'trackTitleShadow') document.body.classList.toggle('rnp-shadow-title', val);
                if (key === 'trackArtistGlow') document.body.classList.toggle('rnp-glow-artist', val);
                if (key === 'trackArtistShadow') document.body.classList.toggle('rnp-shadow-artist', val);
                if (key === 'coverBlurryShadow') {
                    if (!val) { els.albumGlow.style.display = 'none'; }
                    else { els.albumGlow.style.display = ''; }
                }
                if (key === 'showTranslation') {
                    document.body.classList.toggle('rnp-show-translation', val);
                    renderSettingsPanel('lyrics');
                }
                if (key === 'coverRotate') {
                    renderSettingsPanel('cover');
                }
                if (key === 'idleMode') {
                    renderSettingsPanel('appearance');
                }
                if (key === 'solidFollowAccent') {
                    document.body.classList.toggle('solid-follow-accent', val);
                    renderSettingsPanel('background');
                    if (Settings.get('bgType') === 'solid') {
                        if (val) {
                            var a = getComputedStyle(document.documentElement).getPropertyValue('--rnp-accent-color').trim();
                            els.bgBlur.style.backgroundColor = a || 'rgb(120,120,120)';
                        } else {
                            els.bgBlur.style.backgroundColor = Settings.get('solidColor');
                        }
                    }
                }
                    if (key === 'rectangleCover') {
                        renderSettingsPanel('cover');
                    }
                    // VIP type change: update UI immediately
                    if (key === 'neteaseVipType' && typeof NetEaseUI !== 'undefined') {
                        NetEaseUI.updateLoginUI();
                    }
                });
        });

        els.settingsContent.querySelectorAll('.settings-slider').forEach(sl => {
            const updateVal = () => {
                const display = sl.parentElement.querySelector('span:last-child');
                if (display) display.textContent = sl.value + (sl.dataset.unit || '');
            };
            sl.addEventListener('input', () => {
                const key = sl.dataset.key;
                if (!key) return;
                var val = parseInt(sl.value);
                // rotateBgZoom: 显示100-300，实际值+85
                if (key === 'rotateBgZoom') val = val + 85;
                Settings.set(key, val);
                // 更新显示值
                const display = sl.parentElement.querySelector('span:last-child');
                if (display) display.textContent = parseInt(sl.value) + (sl.dataset.unit || '');
                if (key === 'lyricFontSize' || key === 'lyricAlignment' || key === 'lyricFontWeight' || key === 'transFontSize' || key === 'transFontWeight' || key === 'lyricLineSpacing' || key === 'titleFontSize' || key === 'titleFontWeight') {
                    var cssKey = key === 'lyricFontSize' ? '--font-size-lyric' :
                                 key === 'lyricAlignment' ? '--lyric-alignment' :
                                 key === 'lyricFontWeight' ? '--rnp-lyric-weight' :
                                 key === 'titleFontSize' ? '--title-font-size' :
                                 key === 'titleFontWeight' ? '--title-font-weight' :
                                 key === 'lyricLineSpacing' ? '--lyric-line-spacing' :
                                 key === 'transFontSize' ? '--font-size-trans' : '--rnp-trans-weight';
                    document.documentElement.style.setProperty(cssKey, val + (key === 'lyricAlignment' ? '%' : (key === 'lyricLineSpacing' || key === 'titleFontSize' ? 'px' : '')));
                    LyricsEngine.updateLayout();
                }
                if (key === 'bgBlur' || key === 'rotateBgSpeed' || key === 'rotateBgBlur' || key === 'rotateBgZoom' || key === 'fluidBgBlur' || key === 'fluidBgSpeed' || key === 'coverRotateSpeed' || key.endsWith('Dim') || key.endsWith('Opacity')) {
                    Settings.applyCSSVariables();
                    if (key.endsWith('Opacity')) {
                        els.bgContainer.style.opacity = String(val / 100);
                    }
                }
                // Re-render background tab when type changes to show/hide sub-settings
                if (key === 'bgType') {
                    renderSettingsPanel('background');
                    var src = els.albumArt.src;
                    if (src) updateBackground(src, null);
                }
            });
        });

        els.settingsContent.querySelectorAll('.settings-select-group').forEach(group => {
            group.querySelectorAll('.settings-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    var key = group.dataset.key;
                    var val = btn.dataset.value;
                    if (key === 'rectangleCover') val = val === 'true';
                    Settings.set(key, val);
                    group.querySelectorAll('.settings-select-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    if (key === 'bgType') {
                        renderSettingsPanel('background');
                        var src = els.albumArt.src;
                        if (src) updateBackground(src, null);
                    }
                    if (key === 'rectangleCover') {
                        renderSettingsPanel('cover');
                    }
                    if (key === 'neteaseVipType') {
                        if (typeof NetEaseUI !== 'undefined') NetEaseUI.updateLoginUI();
                    }
                    if (key === 'lyricAlign') {
                        document.querySelectorAll('.lyrics-line').forEach(function(el) {
                            el.style.textAlign = val;
                            el.style.transformOrigin = val === 'left' ? 'left center' : val === 'right' ? 'right center' : 'center center';
                        });
                    }
                });
            });
        });

        // Solid color picker
        var cp = document.getElementById('solid-color-picker');
        if (cp) cp.addEventListener('input', () => {
            Settings.set('solidColor', cp.value);
            document.documentElement.style.setProperty('--solid-bg-color', cp.value);
            if (Settings.get('bgType') === 'solid' && !Settings.get('solidFollowAccent')) {
                els.bgBlur.style.backgroundColor = cp.value;
            }
        });

        // Custom font
        var fontSelect = document.getElementById('custom-font-select');
        var fontFile = document.getElementById('custom-font-file');
        var btnUploadFont = document.getElementById('btn-upload-font');

        function loadFontList() {
            fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                var allSelects = document.querySelectorAll('.custom-font-select');
                for (var s = 0; s < allSelects.length; s++) {
                    var sel = allSelects[s];
                    var cur = sel.value;
                    var firstOpt = sel.querySelector('option[value=""]');
                    sel.innerHTML = firstOpt ? firstOpt.outerHTML : '<option value="">默认</option>';
                    for (var f = 0; f < fonts.length; f++) {
                        var fn = fonts[f].replace(/\.[^.]+$/, '');
                        var opt = '<option value="' + fn + '"' + (fn === cur ? ' selected' : '') + '>' + fn + '</option>';
                        sel.innerHTML += opt;
                    }
                    if (cur) sel.value = cur;
                }
            });
        }
        setTimeout(loadFontList, 100);

        // Handle all font selects (global + per-element)
        if (els.settingsContent) {
            els.settingsContent.addEventListener('change', function(e) {
            var t = e.target;
            if (!t.classList.contains('custom-font-select')) return;
            var fontKey = t.getAttribute('data-font') || 'customFontFamily';
            var name = t.value;
            Settings.set(fontKey, name);
            if (fontKey === 'customFontFamily') {
                if (name) {
                    applyFontByName(name);
                } else {
                    var s2 = document.getElementById('custom-font-style');
                    if (s2) s2.remove();
                    document.body.classList.remove('rnp-custom-font');
                    document.documentElement.style.removeProperty('--rnp-custom-font-family');
                }
            } else {
                // Per-element font - set CSS variable
                var varMap = { lyricFontFamily: '--font-lyric', transFontFamily: '--font-trans', titleFontFamily: '--font-title', artistFontFamily: '--font-artist' };
                var cssVar = varMap[fontKey];
                if (name) {
                    document.documentElement.style.setProperty(cssVar, '"' + name + '", "Inter", sans-serif');
                    applyFontByNameIfNeeded(name);
                    var dEl = document.getElementById('debug-log');
                    if (dEl && dEl.style.display !== 'none') dEl.textContent += '[font] set ' + cssVar + '=' + name + '\n';
                } else {
                    document.documentElement.style.removeProperty(cssVar);
                }
            }
        });
        }

        function applyFontByNameIfNeeded(fontName) {
            var existing = document.getElementById('custom-font-' + fontName.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (existing) return;
            var dEl = document.getElementById('debug-log');
            fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                var found = null;
                for (var i = 0; i < fonts.length; i++) {
                    if (fonts[i].replace(/\.[^.]+$/, '') === fontName) { found = fonts[i]; break; }
                }
                if (dEl && dEl.style.display !== 'none') dEl.textContent += '[font-face] ' + fontName + ' found=' + (found || 'NO') + '\n';
                if (!found) return;
                var ext = found.split('.').pop().toLowerCase();
                var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                var s2 = document.createElement('style');
                s2.id = 'custom-font-' + fontName.toLowerCase().replace(/[^a-z0-9]/g, '');
                s2.textContent = '@font-face { font-family: "' + fontName + '"; src: url("/fonts/' + found + '") format("' + fmt + '"); }';
                document.head.appendChild(s2);
            });
        }

        function applyFontByName(fontName) {
            fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                var found = null;
                for (var i = 0; i < fonts.length; i++) {
                    if (fonts[i].replace(/\.[^.]+$/, '') === fontName) { found = fonts[i]; break; }
                }
                if (!found) return;
                var ext = found.split('.').pop().toLowerCase();
                var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                var style = document.getElementById('custom-font-style');
                if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
                style.textContent = '@font-face { font-family: "' + fontName + '"; src: url("/fonts/' + found + '") format("' + fmt + '"); }';
                document.body.classList.add('rnp-custom-font');
                document.documentElement.style.setProperty('--rnp-custom-font-family', '"' + fontName + '", "Inter", sans-serif');
            });
        }

        if (btnUploadFont) btnUploadFont.addEventListener('click', function() { fontFile.click(); });
        if (fontFile) fontFile.addEventListener('change', function() {
            var file = fontFile.files[0];
            if (!file) return;
            var fd = new FormData();
            fd.append('font', file);
            fetch('/api/fonts/upload', { method: 'POST', body: fd }).then(function(r) { return r.json(); }).then(function(d) {
                var name = (d.name || file.name).replace(/\.[^.]+$/, '');
                var ext = (d.name || file.name).split('.').pop().toLowerCase();
                var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                var style = document.getElementById('custom-font-style');
                if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
                style.textContent = '@font-face { font-family: "' + name + '"; src: url("/fonts/' + (d.name || file.name) + '") format("' + fmt + '"); }';
                Settings.set('customFontFamily', name);
                document.body.classList.add('rnp-custom-font');
                document.documentElement.style.setProperty('--rnp-custom-font-family', '"' + name + '", "Inter", sans-serif');
                loadFontList();
                if (fontSelect) fontSelect.value = name;
                fontFile.value = '';
            }).catch(function() {});
        });

        // Speed step input (live update)
        var speedStepInput = document.getElementById('speed-step-input');
        if (speedStepInput) speedStepInput.addEventListener('input', () => {
            var v = parseFloat(speedStepInput.value);
            if (!isNaN(v) && v > 0 && v <= 1) {
                Settings.set('speedStep', v);
                // Update shortcut description in real-time
                document.querySelectorAll('.speed-step-desc').forEach(el => {
                    var text = el.textContent;
                    if (text.startsWith('减速')) el.textContent = '减速 (-' + v + 'x)';
                    else if (text.startsWith('加速')) el.textContent = '加速 (+' + v + 'x)';
                });
                // Update speed slider step
                var speedSlider = document.getElementById('speed-slider');
                if (speedSlider) speedSlider.step = v;
            }
        });

        // Speed slider (mobile settings)
        var speedSlider = document.getElementById('speed-slider');
        if (speedSlider) speedSlider.addEventListener('input', () => {
            var v = parseFloat(speedSlider.value);
            if (!isNaN(v)) {
                AudioEngine.setRate(v);
                Settings.set('rate', v);
                // Format rate: remove trailing zeros
                var fmt = v.toFixed(2);
                if (fmt.endsWith('00')) fmt = fmt.slice(0, -3);
                else if (fmt.endsWith('0')) fmt = fmt.slice(0, -1);
                // Update button text
                var btnSpeed = document.getElementById('btn-speed');
                if (btnSpeed) btnSpeed.textContent = fmt + 'x';
                // Update display
                var display = document.getElementById('speed-slider-value');
                if (display) display.textContent = fmt + 'x';
            }
        });
    }

    // HTML helpers
    function elemSection(label, prefix, s, fontKey, sizeKey, weightKey) {
        var glowKey = prefix + 'Glow';
        var shadowKey = prefix + 'Shadow';
        return '<div class="elem-subgroup">' +
            '<div class="elem-subgroup-header" style="cursor:pointer"><span>' + label + '</span><svg class="elem-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>' +
            '<div class="elem-subgroup-body hidden">' +
            slider(sizeKey, '字号', 10, 56, s.get(sizeKey), 'px') +
            slider(weightKey, '粗细', 100, 900, s.get(weightKey), '') +
            toggle(glowKey, '文字发光', s.get(glowKey)) +
            toggle(shadowKey, '文字阴影', s.get(shadowKey)) +
            '<div class="settings-row" style="flex-wrap:wrap;padding-top:4px"><span class="settings-label" style="flex:1 0 100%;margin-bottom:2px;font-size:11px;color:rgba(255,255,255,0.4)">字体</span>' +
            '<select class="custom-font-select settings-select" data-font="' + fontKey + '" style="flex:1;font-size:11px"><option value="">跟随全局</option>' +
            (s.get(fontKey) ? '<option value="' + s.get(fontKey) + '" selected>' + s.get(fontKey) + '</option>' : '') +
            '</select></div></div></div>';
    }
    // HTML helpers
    function group(title) {
        return `<div class="settings-group"><div class="settings-group-title">${title}</div>`;
    }
    function toggle(key, label, checked) {
        return `<div class="settings-row"><span class="settings-label">${label}</span><input type="checkbox" class="settings-checkbox" data-key="${key}" ${checked ? 'checked' : ''}></div>`;
    }
    function slider(key, label, min, max, val, unit, transform, extraClass) {
        var displayUnit = unit || '';
        var displayVal = transform ? transform(val) : val;
        var cls = extraClass ? ' ' + extraClass : '';
        return `<div class="settings-row${cls}"><span class="settings-label">${label}</span><input type="range" class="settings-slider" data-key="${key}" data-unit="${displayUnit}" data-transform="${transform ? '1' : ''}" min="${min}" max="${max}" value="${val}"><span style="font-size:11px;color:rgba(255,255,255,0.3);min-width:30px;text-align:right">${displayVal}${displayUnit}</span></div>`;
    }
    function selectGroup(key, options, current, customLabel) {
        const labelMap = { bgType: '类型', horizontalAlign: '曲名对齐' };
        const label = customLabel || labelMap[key] || '';
        const btns = options.map(o =>
            `<button class="settings-select-btn ${o.value === current ? 'selected' : ''}" data-value="${o.value}">${o.label}</button>`
        ).join('');
        return `<div class="settings-row"><span class="settings-label">${label}</span><div class="settings-select-group" data-key="${key}">${btns}</div></div>`;
    }

    function customFontRow(currentFamily) {
        return '<div class="settings-row" style="flex-wrap:wrap">' +
            '<span class="settings-label" style="flex:1 0 100%;margin-bottom:4px">全局字体</span>' +
            '<select id="custom-font-select" class="custom-font-select settings-select" style="flex:1;font-size:11px">' +
                '<option value="">默认</option>' +
                (currentFamily ? '<option value="' + currentFamily + '" selected>' + currentFamily + '</option>' : '') +
            '</select>' +
            '<button class="settings-select-btn" id="btn-upload-font" style="margin-left:4px">上传</button>' +
            '<input type="file" id="custom-font-file" accept=".ttf,.otf,.woff,.woff2" style="display:none">' +
        '</div>';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function highlightText(text, query) {
        if (!query) return escapeHtml(text);
        var escaped = escapeHtml(text);
        var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(regex, '<span class="search-highlight">$1</span>');
    }

    // Sort playlist
    var currentSortMode = 'original';
    function sortPlaylist(mode) {
        currentSortMode = mode;
        if (mode === 'original') {
            playlistTracks = playlistOrigTracks.slice();
        } else if (mode === 'name') {
            playlistTracks = playlistOrigTracks.slice().sort(function(a, b) {
                var an = String(a.title || a.name || '');
                var bn = String(b.title || b.name || '');
                var ca = getSortGroup(an), cb = getSortGroup(bn);
                if (ca !== cb) return ca - cb;
                return an.localeCompare(bn, 'zh-CN');
            });
        } else if (mode === 'shuffle') {
            playlistTracks = playlistOrigTracks.slice();
            for (var i = playlistTracks.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = playlistTracks[i];
                playlistTracks[i] = playlistTracks[j];
                playlistTracks[j] = temp;
            }
        }
        // Update current index
        var currentTrack = playlistOrigTracks[playlistCurrentIndex];
        playlistCurrentIndex = currentTrack ? playlistTracks.indexOf(currentTrack) : -1;
        renderPlaylistItems();
        // Update index visibility based on sort mode
        if (currentSortMode === 'name') {
            renderPlaylistIndex();
        } else {
            if (els.playlistIndex) els.playlistIndex.innerHTML = '';
        }
    }

    // Filter playlist by search query
    var playlistSearchQuery = '';
    function filterPlaylist(query) {
        playlistSearchQuery = query.toLowerCase().trim();
        renderPlaylistItems();
    }

    return {
        init,
        initSettingsEvents,
        showPlayer,
        showWelcome,
        updateBackground,
        updateAlbumArt,
        updateTrackInfo,
        updatePlayButton,
        updateProgress,
        updateVolumeUI,
        initVolumeUI,
        renderPlaylist,
        togglePlaylistPanel,
        toggleSettingsPanel,
        showLyricsPanel,
        updatePlaymodeUI,
        animateTrackChange,
        showDropOverlay,
        hideDropOverlay,
        initSourceEvents,
        toggleSourcePanel,
        updateSourceLabel,
        updateFolderName,
        updateSourceTab,
        renderSourceFolders,
        updateTitleSize,
        exportSettings,
        importSettings,
        sortPlaylist,
        filterPlaylist,
        get els() { return els; }
    };
})();
