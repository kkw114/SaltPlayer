/**
 * NetEase Cloud Music UI Module
 * Handles rendering of search, playlists, and login UI
 */

const NetEaseUI = (() => {
    let searchTimer = null;
    let currentSearchType = 1; // 1=songs, 1000=playlists
    let isLoggedIn = false;
    let userId = null;
    let currentContextLabel = '网易云音乐'; // Current context label for source display
    let userIsVip = false; // Whether user is VIP
    let likedSongIds = new Set(); // Liked song IDs
    let dailyTracksCache = null;
    let likedSongsPlaylistId = null; // 喜欢的音乐歌单ID
    let lastSearchKeywords = ''; // 上次搜索的关键词

    // User info cache
    function getCachedUserInfo() {
        try {
            var data = JSON.parse(localStorage.getItem('netease-user-info') || 'null');
            return data;
        } catch(e) { return null; }
    }
    function setCachedUserInfo(data) {
        try { localStorage.setItem('netease-user-info', JSON.stringify(data)); } catch(e) {}
    }

    // Notify all UI components when like state changes
    function notifyLikeChanged(songId, isLiked) {
        // Update source list like buttons
        var sourceBtns = document.querySelectorAll('.netease-like-btn[data-id="' + songId + '"]');
        sourceBtns.forEach(function(btn) {
            btn.classList.toggle('liked', isLiked);
            var svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        });
        // Update playlist like buttons using data-track-id
        var playlistBtns = document.querySelectorAll('.playlist-item-like[data-track-id="' + songId + '"]');
        playlistBtns.forEach(function(btn) {
            btn.classList.toggle('liked', isLiked);
            var svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        });
    }

    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // Initialize NetEase panel
    function init() {
        renderMainPanel();
        bindEvents();
    }

    // Render the main NetEase panel
    function renderMainPanel() {
        var container = document.getElementById('source-tab-netease');
        if (!container) return;
        container.innerHTML = '' +
            '<div class="netease-panel">' +
                '<div class="netease-login-bar" id="netease-login-bar">' +
                    '<div class="netease-user-info hidden" id="netease-user-info">' +
                        '<img id="netease-avatar" class="netease-avatar" src="" alt=""/>' +
                        '<span id="netease-username"></span>' +
                        '<button class="netease-logout-btn" id="netease-logout-btn">退出</button>' +
                    '</div>' +
                    '<button class="netease-login-btn" id="netease-login-btn">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                        ' 登录网易云' +
                    '</button>' +
                '</div>' +
                '<div class="netease-search-box">' +
                    '<div class="netease-search-input-wrapper">' +
                        '<input type="text" id="netease-search-input" class="netease-search-input" placeholder="搜索歌曲、歌手、歌单..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>' +
                    '</div>' +
                    '<div class="netease-search-tabs" id="netease-search-tabs">' +
                        '<button class="netease-search-tab active" data-type="1">单曲</button>' +
                        '<button class="netease-search-tab" data-type="1000">歌单</button>' +
                        '<button class="netease-search-tab" data-type="100">歌手</button>' +
                    '</div>' +
                '</div>' +
                '<div class="netease-content" id="netease-content">' +
                    '<div class="netease-section" id="netease-user-playlists-section">' +
                        '<div class="netease-section-title">我的歌单</div>' +
                        '<div class="netease-playlist-list" id="netease-user-playlists"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="netease-search-results hidden" id="netease-search-results">' +
                    '<div class="netease-results-list" id="netease-results-list"></div>' +
                '</div>' +
                '<div class="netease-playlist-detail hidden" id="netease-playlist-detail">' +
                    '<div class="netease-detail-header" id="netease-detail-header"></div>' +
                    '<div class="netease-detail-tracks" id="netease-detail-tracks"></div>' +
                '</div>' +
            '</div>';

        // Login modal
        var loginModal = document.createElement('div');
        loginModal.id = 'netease-login-modal';
        loginModal.className = 'netease-login-modal hidden';
        loginModal.innerHTML = '' +
            '<div class="netease-login-overlay" id="netease-login-overlay"></div>' +
            '<div class="netease-login-content">' +
                '<div class="netease-login-tabs">' +
                    '<button class="netease-login-tab active" data-method="qr">扫码登录</button>' +
                    '<button class="netease-login-tab" data-method="cookie">Cookie登录</button>' +
                    '<button class="netease-login-close" id="netease-login-close">✕</button>' +
                '</div>' +
                '<div class="netease-login-body" id="netease-login-body">' +
                    '<div id="netease-qr-section">' +
                        '<div class="netease-qr-wrapper">' +
                            '<canvas id="netease-qr-canvas"></canvas>' +
                            '<div class="netease-qr-status" id="netease-qr-status">打开网易云音乐APP扫码登录</div>' +
                        '</div>' +
                    '</div>' +
                    '<div id="netease-cookie-section" class="hidden">' +
                        '<textarea id="netease-cookie-input" class="netease-cookie-input" placeholder="粘贴从浏览器复制的Cookie，格式如：\nMUSIC_U=xxx; __csrf=xxx\n需包含MUSIC_U字段，否则无法登录" rows="3"></textarea>' +
                        '<button class="netease-phone-login-btn" id="netease-cookie-login-btn">登录</button>' +
                        '<div class="netease-cookie-help" id="netease-cookie-help-toggle">' +
                            '<span class="help-icon">?</span> 如何获取Cookie？' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="netease-help-modal hidden" id="netease-help-modal">' +
                '<div class="netease-help-overlay" id="netease-help-overlay"></div>' +
                '<div class="netease-help-content">' +
                    '<div class="netease-help-header">' +
                        '<span>Cookie获取说明</span>' +
                        '<button class="netease-help-close" id="netease-help-close">✕</button>' +
                    '</div>' +
                    '<div class="netease-help-body">' +
                        '<div class="help-step"><span class="step-num">1</span><span class="step-text">打开 <a href="https://music.163.com/#/login" target="_blank">music.163.com</a> 并选择任意方式登录</span></div>' +
                        '<div class="help-step"><span class="step-num">2</span><span class="step-text">按 <kbd>F12</kbd> 打开开发者工具</span></div>' +
                        '<div class="help-step"><span class="step-num">3</span><span class="step-text">点击 <b>Network（网络）</b> 标签</span></div>' +
                        '<div class="help-step"><span class="step-num">4</span><span class="step-text">刷新页面，点击任意一个请求 <span class="help-info-badge">{ i }</span></span></div>' +
                        '<div class="help-step"><span class="step-num">5</span><span class="step-text">选中 <b>标头</b> 并下滑找到 <b>请求标头</b> 分类里的 <code>cookie</code></span></div>' +
                        '<div class="help-step"><span class="step-num">6</span><span class="step-text">复制全部cookie内容</span></div>' +
                        '<div class="help-tip">💡 复制完整的cookie字符串粘贴到输入框即可</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
                '</div>' +
            '</div>';
        document.body.appendChild(loginModal);
    }

    // Bind events
    function bindEvents() {
        // Search input
        var searchInput = document.getElementById('netease-search-input');
        var searchTabs = document.getElementById('netease-search-tabs');
        if (searchInput) {
            // Hide tabs initially
            if (searchTabs) searchTabs.classList.add('hidden');

            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimer);
                var q = this.value.trim();
                if (!q) {
                    // 清空搜索 - 重新加载网易云主界面（与切换音源效果一致）
                    lastSearchKeywords = '';
                    if (searchTabs) searchTabs.classList.add('hidden');
                    hideSearchResults();
                    var contentEl = document.getElementById('netease-content');
                    var detailEl = document.getElementById('netease-playlist-detail');
                    if (contentEl) contentEl.classList.remove('hidden');
                    if (detailEl) detailEl.classList.add('hidden');
                    // 重新初始化网易云界面
                    init();
                    restoreLogin();
                    return;
                }
                // Has content - show tabs
                if (searchTabs) searchTabs.classList.remove('hidden');
                searchTimer = setTimeout(function() { doSearch(q); }, 400);
            });
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimer);
                    var q = this.value.trim();
                    if (q) doSearch(q);
                }
            });
        }

        // Search type tabs
        var tabsContainer = document.getElementById('netease-search-tabs');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', function(e) {
                var tab = e.target.closest('.netease-search-tab');
                if (!tab) return;
                tabsContainer.querySelectorAll('.netease-search-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                currentSearchType = parseInt(tab.dataset.type);
                var q = document.getElementById('netease-search-input').value.trim();
                if (q) doSearch(q);
            });
        }

        // Login button
        var loginBtn = document.getElementById('netease-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function() { showLoginModal(); });
        }

        // Logout button
        var logoutBtn = document.getElementById('netease-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() { doLogout(); });
        }

        // Login modal close
        var loginClose = document.getElementById('netease-login-close');
        if (loginClose) {
            loginClose.addEventListener('click', function() { hideLoginModal(); });
        }
        var loginOverlay = document.getElementById('netease-login-overlay');
        if (loginOverlay) {
            loginOverlay.addEventListener('click', function() { hideLoginModal(); });
        }

        // Login tabs
        var loginModal = document.getElementById('netease-login-modal');
        if (loginModal) {
            loginModal.addEventListener('click', function(e) {
                var tab = e.target.closest('.netease-login-tab');
                if (!tab) return;
                loginModal.querySelectorAll('.netease-login-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                var method = tab.dataset.method;
                document.getElementById('netease-qr-section').classList.toggle('hidden', method !== 'qr');
                document.getElementById('netease-cookie-section').classList.toggle('hidden', method !== 'cookie');
                if (method === 'qr') startQrLogin();
            });
        }

        // Cookie help toggle - 打开帮助弹窗
        document.addEventListener('click', function(e) {
            if (e.target.id === 'netease-cookie-help-toggle' || e.target.closest('#netease-cookie-help-toggle')) {
                var helpModal = document.getElementById('netease-help-modal');
                if (helpModal) helpModal.classList.remove('hidden');
            }
            if (e.target.id === 'netease-help-close' || e.target.id === 'netease-help-overlay') {
                var helpModal = document.getElementById('netease-help-modal');
                if (helpModal) helpModal.classList.add('hidden');
            }
        });

        // Cookie login button
        var cookieLoginBtn = document.getElementById('netease-cookie-login-btn');
        if (cookieLoginBtn) {
            cookieLoginBtn.addEventListener('click', function() {
                var cookieInput = document.getElementById('netease-cookie-input');
                var cookie = cookieInput ? cookieInput.value.trim() : '';
                if (!cookie) {
                    alert('请输入Cookie');
                    return;
                }
                NetEaseAPI.setCookie(cookie);
                localStorage.setItem('netease-cookie', cookie);
                isLoggedIn = true;
                updateLoginUI();
                hideLoginModal();
            });
        }
    }

    // Load user playlists
    async function loadUserPlaylists() {
        var container = document.getElementById('netease-user-playlists');
        if (!container) return;
        container.innerHTML = '<div class="netease-loading">加载中...</div>';

        var accountData = await NetEaseAPI.getUserAccount();
        if (!accountData || !accountData.profile) {
            container.innerHTML = '<div class="netease-empty">请先登录</div>';
            return;
        }

        var uid = accountData.profile.userId;
        var data = await NetEaseAPI.getUserPlaylist(uid, 100);
        if (!data || !data.playlist) {
            container.innerHTML = '<div class="netease-empty">加载失败</div>';
            return;
        }

        // Store liked songs playlist ID (first playlist)
        if (data.playlist.length > 0) {
            likedSongsPlaylistId = data.playlist[0].id;
        }

        container.innerHTML = '';

        // Fetch daily recommend for cover
        var dailyCoverHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
        try {
            var dailyData = await NetEaseAPI.getDailyRecommend();
            if (dailyData && dailyData.data && dailyData.data.dailySongs && dailyData.data.dailySongs.length > 0) {
                dailyTracksCache = dailyData.data.dailySongs;
                var firstTrack = dailyData.data.dailySongs[0];
                if (firstTrack.al && firstTrack.al.picUrl) {
                    dailyCoverHtml = '<img src="' + firstTrack.al.picUrl + '?param=100y100" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" loading="lazy" />';
                }
            }
        } catch(e) {}

        // Daily recommend button
        var dailyItem = document.createElement('div');
        dailyItem.className = 'netease-playlist-list-item netease-daily-item';
        dailyItem.innerHTML = '' +
            '<div class="netease-playlist-list-cover netease-daily-cover">' +
                dailyCoverHtml +
            '</div>' +
            '<div class="netease-playlist-list-info">' +
                '<div class="netease-playlist-list-name">每日推荐</div>' +
                '<div class="netease-playlist-list-count">根据你的口味生成</div>' +
            '</div>';
        dailyItem.addEventListener('click', function() { loadDailyRecommend(); });
        container.appendChild(dailyItem);

        var playlists = data.playlist;

        // Separate created and subscribed playlists
        var created = playlists.filter(function(p) { return p.creator && p.creator.userId === uid; });
        var subscribed = playlists.filter(function(p) { return !p.creator || p.creator.userId !== uid; });

        // Render created playlists
        if (created.length > 0) {
            var createdSection = document.createElement('div');
            createdSection.className = 'netease-playlist-group';
            created.forEach(function(pl) {
                createdSection.appendChild(createPlaylistItem(pl));
            });
            container.appendChild(createdSection);
        }

        // Render subscribed playlists
        if (subscribed.length > 0) {
            var subLabel = document.createElement('div');
            subLabel.className = 'netease-playlist-group-label';
            subLabel.textContent = '收藏歌单';
            container.appendChild(subLabel);
            var subSection = document.createElement('div');
            subSection.className = 'netease-playlist-group';
            subscribed.forEach(function(pl) {
                subSection.appendChild(createPlaylistItem(pl));
            });
            container.appendChild(subSection);
        }
    }

    function createPlaylistItem(pl) {
        var coverUrl = pl.coverImgUrl ? '/api/netease/cover?url=' + encodeURIComponent(pl.coverImgUrl + '?param=100y100') : '';
        var item = document.createElement('div');
        item.className = 'netease-playlist-list-item';
        item.innerHTML = '' +
            '<img class="netease-playlist-list-cover" src="' + coverUrl + '" alt="" loading="lazy"/>' +
            '<div class="netease-playlist-list-info">' +
                '<div class="netease-playlist-list-name">' + escapeHtml(pl.name) + '</div>' +
                '<div class="netease-playlist-list-count">' + pl.trackCount + ' 首</div>' +
            '</div>';
        item.addEventListener('click', function() { loadPlaylistDetail(pl.id); });
        return item;
    }

    // Load daily recommend
    async function loadDailyRecommend() {
        var detailPanel = document.getElementById('netease-playlist-detail');
        var headerEl = document.getElementById('netease-detail-header');
        var tracksEl = document.getElementById('netease-detail-tracks');
        var contentEl = document.getElementById('netease-content');
        var loginBar = document.getElementById('netease-login-bar');
        if (!detailPanel) return;

        detailPanel.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        if (loginBar) loginBar.classList.add('hidden');
        hideSearchResults();

        headerEl.innerHTML = '<div class="netease-loading">加载中...</div>';
        tracksEl.innerHTML = '';

        var data = null;
        for (var retry = 0; retry < 3; retry++) {
            data = await NetEaseAPI.getDailyRecommend();
            if (data && data.data && data.data.dailySongs) break;
            if (retry < 2) {
                headerEl.innerHTML = '<div class="netease-loading">加载中... (' + (retry + 2) + '/3)</div>';
                await new Promise(function(r) { setTimeout(r, 1000); });
            }
        }

        if (!data || !data.data || !data.data.dailySongs) {
            headerEl.innerHTML = '<div class="netease-empty">加载失败，请确认已登录 <button class="netease-retry-btn" onclick="NetEaseUI.loadDailyRecommend()">重试</button></div>';
            return;
        }

        var allTracks = data.data.dailySongs;
        var now = new Date();
        // Daily recommend changes at 6am: before 6am use yesterday's date
        if (now.getHours() < 6) now.setDate(now.getDate() - 1);
        var dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日';

        // Get cover from first track
        var dailyCoverHtml = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
        if (allTracks.length > 0 && allTracks[0].al && allTracks[0].al.picUrl) {
            dailyCoverHtml = '<img src="' + allTracks[0].al.picUrl + '?param=300y300" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" loading="lazy" />';
        }

        headerEl.innerHTML = '' +
            '<button class="netease-back-btn" id="netease-back-btn">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
                ' 返回' +
            '</button>' +
            '<div class="netease-detail-info">' +
                '<div class="netease-detail-cover netease-daily-cover-big">' +
                    dailyCoverHtml +
                '</div>' +
                '<div class="netease-detail-meta">' +
                    '<div class="netease-detail-name">每日推荐 · ' + dateStr + '</div>' +
                    '<div class="netease-detail-count">' + allTracks.length + ' 首歌曲</div>' +
                    '<button class="netease-play-all-btn" id="netease-play-all-btn">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                        ' 播放全部' +
                    '</button>' +
                '</div>' +
            '</div>';

        document.getElementById('netease-back-btn').addEventListener('click', function() {
            detailPanel.classList.add('hidden');
            var searchInput = document.getElementById('netease-search-input');
            var hasSearch = searchInput && searchInput.value.trim().length > 0;
            
            if (hasSearch) {
                var searchResults = document.getElementById('netease-search-results');
                var searchTabs = document.getElementById('netease-search-tabs');
                if (searchResults) searchResults.classList.remove('hidden');
                if (searchTabs) searchTabs.classList.remove('hidden');
            } else {
                if (contentEl) contentEl.classList.remove('hidden');
                if (loginBar) loginBar.classList.remove('hidden');
                if (isLoggedIn) loadUserPlaylists();
            }
        });

        document.getElementById('netease-play-all-btn').addEventListener('click', function() {
            playNeteaseTracks(allTracks, 0, '每日推荐 · ' + dateStr);
        });

        // Load liked songs for heart icon
        likedSongIds = new Set();
        try {
            var accountData = await NetEaseAPI.getUserAccount();
            if (accountData && accountData.profile) {
                var likelistData = await NetEaseAPI.getLikelist(accountData.profile.userId);
                if (likelistData && likelistData.ids) {
                    likedSongIds = new Set(likelistData.ids);
                }
            }
        } catch(e) {}

        tracksEl.innerHTML = '';
        allTracks.forEach(function(track, index) {
            var converted = NetEaseAPI.convertTrack(track);
            var isLiked = likedSongIds.has(track.id);
            var item = document.createElement('div');
            item.className = 'netease-track-item';
            item.innerHTML = '' +
                '<span class="netease-track-num">' + (index + 1) + '</span>' +
                '<div class="netease-track-info">' +
                    '<div class="netease-track-title">' + escapeHtml(converted.title) + '</div>' +
                    '<div class="netease-track-artist">' + escapeHtml(converted.artist) + '</div>' +
                '</div>';
            item.addEventListener('click', function(e) {
                playNeteaseTracks(allTracks, index, '每日推荐 · ' + dateStr);
            });
            tracksEl.appendChild(item);
        });
    }

    // Load playlist detail
    async function loadPlaylistDetail(id) {
        var detailPanel = document.getElementById('netease-playlist-detail');
        var headerEl = document.getElementById('netease-detail-header');
        var tracksEl = document.getElementById('netease-detail-tracks');
        var contentEl = document.getElementById('netease-content');
        var loginBar = document.getElementById('netease-login-bar');
        if (!detailPanel) return;

        detailPanel.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        if (loginBar) loginBar.classList.add('hidden');
        hideSearchResults();

        headerEl.innerHTML = '<div class="netease-loading">加载中...</div>';
        tracksEl.innerHTML = '';

        var data = null;
        for (var retry = 0; retry < 3; retry++) {
            data = await NetEaseAPI.getPlaylistDetail(id);
            if (data && data.playlist) break;
            if (retry < 2) {
                headerEl.innerHTML = '<div class="netease-loading">加载中... (' + (retry + 2) + '/3)</div>';
                await new Promise(function(r) { setTimeout(r, 1000); });
            }
        }

        if (!data || !data.playlist) {
            headerEl.innerHTML = '<div class="netease-empty">加载失败 <button class="netease-retry-btn" onclick="loadPlaylistDetail(' + id + ')">重试</button></div>';
            return;
        }

        var pl = data.playlist;
        var plCoverUrl = pl.coverImgUrl ? '/api/netease/cover?url=' + encodeURIComponent(pl.coverImgUrl + '?param=300y300') : '';
        headerEl.innerHTML = '' +
            '<button class="netease-back-btn" id="netease-back-btn">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
                ' 返回' +
            '</button>' +
            '<div class="netease-detail-info">' +
                '<img class="netease-detail-cover" src="' + plCoverUrl + '" alt=""/>' +
                '<div class="netease-detail-meta">' +
                    '<div class="netease-detail-name">' + escapeHtml(pl.name) + '</div>' +
                    '<div class="netease-detail-count">' + pl.trackCount + ' 首歌曲</div>' +
                    '<button class="netease-play-all-btn" id="netease-play-all-btn">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                        ' 播放全部' +
                    '</button>' +
                '</div>' +
            '</div>';

        // Back button - 从每日推荐返回
        document.getElementById('netease-back-btn').addEventListener('click', function() {
            detailPanel.classList.add('hidden');
            // 检查搜索框是否有内容
            var searchInput = document.getElementById('netease-search-input');
            var hasSearch = searchInput && searchInput.value.trim().length > 0;
            
            if (hasSearch) {
                // 有搜索内容，显示搜索结果
                var searchResults = document.getElementById('netease-search-results');
                var searchTabs = document.getElementById('netease-search-tabs');
                if (searchResults) searchResults.classList.remove('hidden');
                if (searchTabs) searchTabs.classList.remove('hidden');
            } else {
                // 无搜索内容，显示主界面
                var contentEl = document.getElementById('netease-content');
                var loginBar = document.getElementById('netease-login-bar');
                if (contentEl) contentEl.classList.remove('hidden');
                if (loginBar) loginBar.classList.remove('hidden');
                // 重新加载用户歌单
                if (isLoggedIn) loadUserPlaylists();
            }
        });

        document.getElementById('netease-play-all-btn').addEventListener('click', function() {
            playNeteaseTracks(allTracks, 0, '每日推荐 · ' + dateStr);
        });

        var allTracks = pl.tracks || [];
        console.log('[NetEase] Playlist tracks:', allTracks.length, allTracks[0]);

        // If tracks are incomplete (only have IDs or missing artist info), fetch full details
        var needFetch = allTracks.length > 0 && (
            !allTracks[0].ar && !allTracks[0].artists ||
            allTracks[0].id && !allTracks[0].name
        );
        console.log('[NetEase] Need fetch details:', needFetch);
        if (needFetch) {
            tracksEl.innerHTML = '<div class="netease-loading">加载歌曲详情...</div>';
            // Fetch in batches of 100
            var fetchedTracks = [];
            for (var i = 0; i < allTracks.length; i += 100) {
                var batch = allTracks.slice(i, i + 100);
                var trackIds = batch.map(function(t) { return t.id || t; }).join(',');
                console.log('[NetEase] Fetching batch:', i, '-', Math.min(i + 100, allTracks.length));
                var detailData = await NetEaseAPI.getSongDetail(trackIds);
                if (detailData && detailData.songs) {
                    fetchedTracks = fetchedTracks.concat(detailData.songs);
                }
            }
            console.log('[NetEase] Fetched tracks:', fetchedTracks.length);
            if (fetchedTracks.length > 0) {
                allTracks = fetchedTracks;
            }
        }

        // Play all button
        document.getElementById('netease-play-all-btn').addEventListener('click', function() {
            playNeteaseTracks(allTracks, 0, pl.name, pl.id);
        });

        // Render tracks
        tracksEl.innerHTML = '';
        allTracks.forEach(function(track, index) {
            var converted = NetEaseAPI.convertTrack(track);
            var item = document.createElement('div');
            item.className = 'netease-track-item';
            item.innerHTML = '' +
                '<span class="netease-track-num">' + (index + 1) + '</span>' +
                '<div class="netease-track-info">' +
                    '<div class="netease-track-title">' + escapeHtml(converted.title) + '</div>' +
                    '<div class="netease-track-artist">' + escapeHtml(converted.artist) + '</div>' +
                '</div>' +
                '<span class="netease-track-duration">' + formatDuration(converted.duration) + '</span>';
            item.addEventListener('click', function() { playNeteaseTracks(allTracks, index, pl.name, pl.id); });
            tracksEl.appendChild(item);
        });
    }

    // Search
    async function doSearch(keywords) {
        var resultsPanel = document.getElementById('netease-search-results');
        var resultsList = document.getElementById('netease-results-list');
        var contentEl = document.getElementById('netease-content');
        var detailPanel = document.getElementById('netease-playlist-detail');
        if (!resultsPanel) return;

        lastSearchKeywords = keywords;
        resultsPanel.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        if (detailPanel) detailPanel.classList.add('hidden');

        resultsList.innerHTML = '<div class="netease-loading">搜索中...</div>';

        var data = null;
        // Retry up to 3 times with 1s interval
        for (var retry = 0; retry < 3; retry++) {
            data = await NetEaseAPI.search(keywords, currentSearchType, 30, 0);
            if (data && data.result) break; // Success, stop retrying
            if (retry < 2) {
                resultsList.innerHTML = '<div class="netease-loading">搜索中... (' + (retry + 2) + '/3)</div>';
                await new Promise(function(r) { setTimeout(r, 1000); });
            }
        }

        if (!data || !data.result) {
            resultsList.innerHTML = '' +
                '<div class="netease-empty">搜索失败</div>' +
                '<button class="netease-retry-btn" id="netease-retry-btn">重试</button>';
            document.getElementById('netease-retry-btn').addEventListener('click', function() {
                doSearch(keywords);
            });
            return;
        }

        resultsList.innerHTML = '';

        if (currentSearchType === 1) {
            // Songs
            var songs = data.result.songs || [];
            if (!songs.length) { resultsList.innerHTML = '<div class="netease-empty">未找到歌曲</div>'; return; }
            var searchLabel = keywords + ' · 搜索';
            songs.forEach(function(track, index) {
                var converted = NetEaseAPI.convertTrack(track);
                var item = document.createElement('div');
                item.className = 'netease-track-item';
                item.innerHTML = '' +
                    '<span class="netease-track-num">' + (index + 1) + '</span>' +
                    '<div class="netease-track-info">' +
                        '<div class="netease-track-title">' + escapeHtml(converted.title) + '</div>' +
                        '<div class="netease-track-artist">' + escapeHtml(converted.artist) + ' · ' + escapeHtml(converted.album) + '</div>' +
                    '</div>';
                item.addEventListener('click', function() { playNeteaseTracks(songs, index, searchLabel); });
                resultsList.appendChild(item);
            });
        } else if (currentSearchType === 1000) {
            // Playlists
            var playlists = data.result.playlists || [];
            if (!playlists.length) { resultsList.innerHTML = '<div class="netease-empty">未找到歌单</div>'; return; }
            playlists.forEach(function(pl) {
                var item = document.createElement('div');
                item.className = 'netease-track-item netease-playlist-result';
                item.innerHTML = '' +
                    '<img class="netease-result-cover" src="' + (pl.coverImgUrl ? pl.coverImgUrl + '?param=100y100' : '') + '" alt=""/>' +
                    '<div class="netease-track-info">' +
                        '<div class="netease-track-title">' + escapeHtml(pl.name) + '</div>' +
                        '<div class="netease-track-artist">' + pl.trackCount + ' 首 · ' + formatCount(pl.playCount) + ' 次播放</div>' +
                    '</div>';
                item.addEventListener('click', function() { loadPlaylistDetail(pl.id); });
                resultsList.appendChild(item);
            });
        } else if (currentSearchType === 100) {
            // Artists
            var artists = data.result.artists || [];
            if (!artists.length) { resultsList.innerHTML = '<div class="netease-empty">未找到歌手</div>'; return; }
            artists.forEach(function(artist) {
                var item = document.createElement('div');
                item.className = 'netease-track-item netease-artist-result';
                item.innerHTML = '' +
                    '<img class="netease-result-cover netease-artist-cover" src="' + (artist.picUrl ? artist.picUrl + '?param=100y100' : '') + '" alt=""/>' +
                    '<div class="netease-track-info">' +
                        '<div class="netease-track-title">' + escapeHtml(artist.name) + '</div>' +
                        '<div class="netease-track-artist">' + (artist.alias && artist.alias.length ? artist.alias[0] : '歌手') + '</div>' +
                    '</div>';
                item.addEventListener('click', function() { loadArtistTracks(artist.id); });
                resultsList.appendChild(item);
            });
        }
    }

    // Load artist hot songs
    async function loadArtistTracks(id) {
        var detailPanel = document.getElementById('netease-playlist-detail');
        var headerEl = document.getElementById('netease-detail-header');
        var tracksEl = document.getElementById('netease-detail-tracks');
        var contentEl = document.getElementById('netease-content');
        var loginBar = document.getElementById('netease-login-bar');
        if (!detailPanel) return;

        detailPanel.classList.remove('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        if (loginBar) loginBar.classList.add('hidden');
        hideSearchResults();

        headerEl.innerHTML = '<div class="netease-loading">加载中...</div>';
        tracksEl.innerHTML = '';

        var data = null;
        for (var retry = 0; retry < 3; retry++) {
            data = await NetEaseAPI.getArtist(id);
            if (data && data.hotSongs) break;
            if (retry < 2) {
                headerEl.innerHTML = '<div class="netease-loading">加载中... (' + (retry + 2) + '/3)</div>';
                await new Promise(function(r) { setTimeout(r, 1000); });
            }
        }

        if (!data || !data.hotSongs) {
            headerEl.innerHTML = '<div class="netease-empty">加载失败 <button class="netease-retry-btn" onclick="loadArtistTracks(' + id + ')">重试</button></div>';
            return;
        }

        var artistCoverUrl = data.artist && data.artist.picUrl ? '/api/netease/cover?url=' + encodeURIComponent(data.artist.picUrl + '?param=300y300') : '';
        headerEl.innerHTML = '' +
            '<button class="netease-back-btn" id="netease-back-btn">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
                ' 返回' +
            '</button>' +
            '<div class="netease-detail-info">' +
                '<img class="netease-detail-cover" src="' + artistCoverUrl + '" alt=""/>' +
                '<div class="netease-detail-meta">' +
                    '<div class="netease-detail-name">' + (data.artist ? escapeHtml(data.artist.name) : '歌手') + '</div>' +
                    '<div class="netease-detail-count">' + data.hotSongs.length + ' 首热门歌曲</div>' +
                    '<button class="netease-play-all-btn" id="netease-play-all-btn">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                        ' 播放全部' +
                    '</button>' +
                '</div>' +
            '</div>';

        document.getElementById('netease-back-btn').addEventListener('click', function() {
            detailPanel.classList.add('hidden');
            var searchInput = document.getElementById('netease-search-input');
            var hasSearch = searchInput && searchInput.value.trim().length > 0;
            
            if (hasSearch) {
                var searchResults = document.getElementById('netease-search-results');
                var searchTabs = document.getElementById('netease-search-tabs');
                if (searchResults) searchResults.classList.remove('hidden');
                if (searchTabs) searchTabs.classList.remove('hidden');
            } else {
                if (contentEl) contentEl.classList.remove('hidden');
                if (loginBar) loginBar.classList.remove('hidden');
                if (isLoggedIn) loadUserPlaylists();
            }
        });

        var artistName = data.artist ? data.artist.name : '歌手';
        document.getElementById('netease-play-all-btn').addEventListener('click', function() {
            playNeteaseTracks(data.hotSongs, 0, artistName);
        });

        tracksEl.innerHTML = '';
        data.hotSongs.forEach(function(track, index) {
            var converted = NetEaseAPI.convertTrack(track);
            var item = document.createElement('div');
            item.className = 'netease-track-item';
            item.innerHTML = '' +
                '<span class="netease-track-num">' + (index + 1) + '</span>' +
                '<div class="netease-track-info">' +
                    '<div class="netease-track-title">' + escapeHtml(converted.title) + '</div>' +
                    '<div class="netease-track-artist">' + escapeHtml(converted.artist) + ' · ' + escapeHtml(converted.album) + '</div>' +
                '</div>' +
                '<span class="netease-track-duration">' + formatDuration(converted.duration) + '</span>';
            item.addEventListener('click', function() { playNeteaseTracks(data.hotSongs, index, artistName); });
            tracksEl.appendChild(item);
        });
    }

    function hideSearchResults() {
        var el = document.getElementById('netease-search-results');
        if (el) el.classList.add('hidden');
        // Also hide search tabs
        var tabs = document.getElementById('netease-search-tabs');
        if (tabs) tabs.classList.add('hidden');
    }

    // Play NetEase tracks
    var currentPlaylistId = null;
    async function playNeteaseTracks(tracks, startIndex, contextLabel, playlistId) {
        if (!tracks || !tracks.length) return;
        if (contextLabel) currentContextLabel = contextLabel;
        if (playlistId) currentPlaylistId = playlistId;
        var convertedTracks = tracks.map(function(t) { return NetEaseAPI.convertTrack(t); });

        // Get song URLs for all tracks
        var ids = tracks.map(function(t) { return t.id; }).join(',');
        var urlData = await NetEaseAPI.getSongUrl(ids);
        var qualityMap = {}; // trackId -> bitrate
        if (urlData && urlData.data) {
            urlData.data.forEach(function(item) {
                qualityMap[item.id] = item.br || 0;
                // Debug: log quality info
                var dEl = document.getElementById('debug-log');
                if (dEl && dEl.style.display !== 'none') {
                    var trackName = '';
                    for (var j = 0; j < tracks.length; j++) {
                        if (tracks[j].id === item.id) { trackName = tracks[j].name; break; }
                    }
                    dEl.textContent += '[NetEase] ' + trackName + ' | 音质:' + (item.br || '?') + 'kbps | 类型:' + (item.type || '?') + ' | 试听:' + (item.freeTrialInfo ? '是' : '否') + '\n';
                    dEl.scrollTop = dEl.scrollHeight;
                }
                for (var i = 0; i < convertedTracks.length; i++) {
                    if (convertedTracks[i].id === item.id && item.url) {
                        convertedTracks[i].url = item.url;
                        convertedTracks[i].bitrate = item.br || 0;
                    }
                }
            });
        }

        // Fetch song details for tracks without cover
        var tracksNeedingCover = convertedTracks.filter(function(t) { return !t.coverUrl && t.url; });
        if (tracksNeedingCover.length > 0) {
            var coverIds = tracksNeedingCover.map(function(t) { return t.id; }).join(',');
            var detailData = await NetEaseAPI.getSongDetail(coverIds);
            if (detailData && detailData.songs) {
                detailData.songs.forEach(function(song) {
                    var coverUrl = null;
                    if (song.al && song.al.picUrl) coverUrl = song.al.picUrl;
                    else if (song.album && song.album.picUrl) coverUrl = song.album.picUrl;
                    if (coverUrl) {
                        var proxyUrl = '/api/netease/cover?url=' + encodeURIComponent(coverUrl + '?param=300y300');
                        for (var i = 0; i < convertedTracks.length; i++) {
                            if (convertedTracks[i].id === song.id) {
                                convertedTracks[i].coverUrl = proxyUrl;
                                convertedTracks[i].hasCover = true;
                            }
                        }
                    }
                });
            }
        }

        // Filter out tracks without URLs
        var playableTracks = convertedTracks.filter(function(t) { return t.url; });
        if (!playableTracks.length) {
            alert('无法播放这些歌曲');
            return;
        }

        // Adjust startIndex
        var actualIndex = 0;
        if (startIndex > 0) {
            var targetId = tracks[startIndex].id;
            for (var i = 0; i < playableTracks.length; i++) {
                if (playableTracks[i].id === targetId) { actualIndex = i; break; }
            }
        }

        // Set tracks and play
        if (typeof PlaylistManager !== 'undefined') {
            PlaylistManager.setTracks(playableTracks);
            if (typeof App !== 'undefined') App.setPlaybackSource('netease');
            if (typeof UI !== 'undefined') {
                UI.showPlayer();
                // Update source label to username if logged in
                var userLabel = '网易云音乐';
                var usernameEl = document.getElementById('netease-username');
                if (isLoggedIn && usernameEl) {
                    // Get only text content without VIP badge
                    var nameText = usernameEl.textContent || '';
                    if (nameText && nameText !== '已登录') {
                        // Remove VIP/SVIP text if present
                        userLabel = nameText.replace(/\s*(VIP|SVIP)\s*$/, '').trim();
                    }
                }
                UI.updateSourceLabel(userLabel, 'netease');
                UI.updateFolderName(currentContextLabel);
                UI.renderPlaylist(playableTracks, actualIndex, currentContextLabel);
                // Update quality display
                updateQualityDisplay(playableTracks[actualIndex]);
            }
            PlaylistManager.setCurrentIndex(actualIndex);
        }
    }

    function updateQualityDisplay(track) {
        var el = document.getElementById('netease-quality');
        if (!el) return;
        if (!track || !track.url) { el.textContent = ''; return; }
        // Use actual bitrate from track if available
        if (track.bitrate) {
            var br = track.bitrate;
            if (br >= 999000) el.textContent = 'FLAC';
            else if (br >= 350000) el.textContent = 'HQ';
            else if (br >= 128000) el.textContent = 'LQ';
            else el.textContent = 'LQ';
        } else {
            // Fallback to settings
            var quality = 'HQ';
            if (typeof Settings !== 'undefined') {
                var q = Settings.get('neteaseQuality') || '320000';
                if (q === 'flac') quality = 'FLAC';
                else if (q === '320000') quality = 'HQ';
                else quality = 'LQ';
            }
            el.textContent = quality;
        }
    }

    // Get current context label
    function getContextLabel() { return currentContextLabel; }
    function getCurrentPlaylistId() { return currentPlaylistId; }
    function getLikedSongsPlaylistId() { return likedSongsPlaylistId; }

    // Login modal
    function showLoginModal() {
        var modal = document.getElementById('netease-login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            startQrLogin();
        }
    }

    function hideLoginModal() {
        var modal = document.getElementById('netease-login-modal');
        if (modal) modal.classList.add('hidden');
        stopQrPolling();
    }

    // QR code login
    let qrPollTimer = null;

    async function startQrLogin() {
        var statusEl = document.getElementById('netease-qr-status');
        if (statusEl) statusEl.textContent = '获取二维码...';

        var keyData = await NetEaseAPI.getQrKey();
        if (!keyData || !keyData.data || !keyData.data.unikey) {
            if (statusEl) statusEl.textContent = '获取二维码失败';
            return;
        }

        var key = keyData.data.unikey;
        var qrData = await NetEaseAPI.createQrCode(key);
        if (!qrData || !qrData.data || !qrData.data.qrimg) {
            if (statusEl) statusEl.textContent = '生成二维码失败';
            return;
        }

        // Draw QR code
        var canvas = document.getElementById('netease-qr-canvas');
        if (canvas) {
            var ctx = canvas.getContext('2d');
            var img = new Image();
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = qrData.data.qrimg;
        }

        if (statusEl) statusEl.textContent = '打开网易云音乐APP扫码登录';

        // Start polling
        stopQrPolling();
        qrPollTimer = setInterval(async function() {
            var checkData = await NetEaseAPI.checkQrStatus(key);
            if (!checkData) return;

            if (checkData.code === 800) {
                if (statusEl) statusEl.textContent = '二维码已过期，请刷新';
                stopQrPolling();
            } else if (checkData.code === 801) {
                if (statusEl) statusEl.textContent = '等待扫码...';
            } else if (checkData.code === 802) {
                if (statusEl) statusEl.textContent = '已扫码，等待确认...';
            } else if (checkData.code === 803) {
                if (statusEl) statusEl.textContent = '登录成功！';
                stopQrPolling();
                console.log('[NetEase] QR login cookie length:', checkData.cookie ? checkData.cookie.length : 0);
                if (checkData.cookie) {
                    NetEaseAPI.setCookie(checkData.cookie);
                    localStorage.setItem('netease-cookie', checkData.cookie);
                }
                isLoggedIn = true;
                updateLoginUI();
                setTimeout(hideLoginModal, 1000);
            }
        }, 2000);
    }

    function stopQrPolling() {
        if (qrPollTimer) {
            clearInterval(qrPollTimer);
            qrPollTimer = null;
        }
    }

    // Phone login
    async function doPhoneLogin() {
        var phone = document.getElementById('netease-phone-input').value.trim();
        var pass = document.getElementById('netease-pass-input').value.trim();
        if (!phone || !pass) { alert('请输入手机号和密码'); return; }

        var data = await NetEaseAPI.loginWithPhone(phone, pass);
        if (data && data.code === 200) {
            if (data.cookie) {
                NetEaseAPI.setCookie(data.cookie);
                localStorage.setItem('netease-cookie', data.cookie);
            }
            isLoggedIn = true;
            updateLoginUI();
            hideLoginModal();
        } else {
            alert(data && data.msg ? data.msg : '登录失败');
        }
    }

    // Logout
    function doLogout() {
        NetEaseAPI.setCookie('');
        localStorage.removeItem('netease-cookie');
        localStorage.removeItem('netease-music-u');
        localStorage.removeItem('netease-csrf');
        isLoggedIn = false;
        userId = null;
        userIsVip = false;
        likedSongIds = new Set();
        Settings.set('lastSource', 'default');
        Settings.set('neteaseDefaultDaily', false);
        updateLoginUI();
    }

    // Update login UI
    function updateLoginUI() {
        var loginBtn = document.getElementById('netease-login-btn');
        var userInfo = document.getElementById('netease-user-info');
        var username = document.getElementById('netease-username');
        var avatar = document.getElementById('netease-avatar');

        if (isLoggedIn) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.remove('hidden');

            // Try to use cached user info first
            var cached = getCachedUserInfo();
            if (cached && cached.nickname) {
                applyUserInfo(cached.nickname, cached.avatarUrl, cached.userId, cached.vipType);
            } else {
                if (username) username.textContent = '已登录';
            }

            // Always load playlists
            loadUserPlaylists();

            // Fetch fresh data from API in background
            NetEaseAPI.getUserAccount().then(function(data) {
                if (data && data.profile) {
                    var nickname = data.profile.nickname || '';
                    var avatarUrl = data.profile.avatarUrl || '';
                    var userId = data.profile.userId;
                    var vipType = data.profile.viptypeVersion || 0;

                    // Update cache
                    setCachedUserInfo({
                        nickname: nickname,
                        avatarUrl: avatarUrl,
                        userId: userId,
                        vipType: vipType
                    });

                    // Apply user info
                    applyUserInfo(nickname, avatarUrl, userId, vipType);
                }
            });
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userInfo) userInfo.classList.add('hidden');
            var container = document.getElementById('netease-user-playlists');
            if (container) container.innerHTML = '<div class="netease-empty">请先登录</div>';
            // Clear cache on logout
            localStorage.removeItem('netease-user-info');
            // Reset source label
            if (typeof UI !== 'undefined') {
                UI.updateSourceLabel('网易云音乐', 'netease');
            }
        }
    }

    // Apply user info to UI elements
    function applyUserInfo(nickname, avatarUrl, userId, vipType) {
        var username = document.getElementById('netease-username');
        var avatar = document.getElementById('netease-avatar');

        userIsVip = !!vipType;
        var vipTypeSetting = typeof Settings !== 'undefined' ? Settings.get('neteaseVipType') : 'auto';
        var displayType = vipTypeSetting;
        if (displayType === 'auto') {
            displayType = userIsVip ? 'vip' : 'none';
        }
        if (username) {
            username.innerHTML = escapeHtml(nickname);
            if (displayType === 'svip') {
                username.innerHTML += ' <span class="netease-vip-badge svip">SVIP</span>';
            } else if (displayType === 'vip') {
                username.innerHTML += ' <span class="netease-vip-badge">VIP</span>';
            }
        }
        if (avatar) avatar.src = avatarUrl ? avatarUrl + '?param=50y50' : '';
        if (typeof UI !== 'undefined') {
            UI.updateSourceLabel(nickname, 'netease');
        }
    }

    // Restore login state
    function restoreLogin() {
        var savedCookie = localStorage.getItem('netease-cookie');
        if (savedCookie) {
            NetEaseAPI.setCookie(savedCookie);
            isLoggedIn = true;
            updateLoginUI();
        }
    }

    // Format play count
    function formatCount(count) {
        if (!count) return '0';
        if (count >= 100000000) return (count / 100000000).toFixed(1) + '亿';
        if (count >= 10000) return (count / 10000).toFixed(1) + '万';
        return String(count);
    }

    // Format duration
    function formatDuration(ms) {
        if (!ms) return '';
        var sec = Math.floor(ms / 1000);
        var min = Math.floor(sec / 60);
        sec = sec % 60;
        return min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function isVipUser() { return userIsVip; }
    function getLikedSongs() { return likedSongIds; }

    return {
        init, hideSearchResults, restoreLogin, updateLoginUI,
        playNeteaseTracks, loadPlaylistDetail, loadDailyRecommend, doSearch, getContextLabel,
        updateQualityDisplay, isVipUser, getLikedSongs, notifyLikeChanged,
        getCurrentPlaylistId, getLikedSongsPlaylistId
    };
})();
