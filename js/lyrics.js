/**
 * Lyrics Module
 * LRC parser + synced lyrics display
 * Based on refined-now-playing-netease
 */

const LyricsEngine = (() => {
    let lyrics = [];
    let currentLine = 0;
    let containerEl = null;
    let contentEl = null;
    let isUnsynced = false;
    let shouldTransit = false;

    const overrides = {
        scale: (offset) => { offset = Math.abs(offset); if (offset === 0) return 1; return Math.max(1 - offset * 0.08, 0.7); },
        opacity: (offset) => { offset = Math.abs(offset); if (offset === 0) return 1; if (offset === 1) return 0.6; return Math.max(0.4 - (offset - 1) * 0.1, 0.15); },
        blur: (offset) => { offset = Math.abs(offset); if (offset === 0) return 0; if (offset <= 1) return 0.3; return Math.min(0.3 + (offset - 1) * 0.5, 3); }
    };

    function parseLRC(text) {
        if (!text) return { lyrics: [] };
        const lines = text.split('\n');
        const result = [];
        let offset = 0;

        const extractLrcRegex = /^(?:\[([^\]]+)\])+(?!\[)(.+)$/gm;
        const extractTimestampRegex = /\[(\d+):(\d+)(?:\.|:)*(\d+)*\]/g;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const metaMatch = trimmed.match(/^\[(ti|ar|al|by|offset):(.*)\]$/i);
            if (metaMatch) {
                if (metaMatch[1].toLowerCase() === 'offset') offset = parseInt(metaMatch[2].trim()) || 0;
                continue;
            }

            // Extract timestamps and content
            const lrcMatch = trimmed.match(/^(?<timestamps>(?:\[.+?\])+)(?!\[)(?<content>.+)$/);
            if (!lrcMatch) continue;

            const timestampsStr = lrcMatch.groups.timestamps;
            const content = lrcMatch.groups.content.trim();
            const isInterlude = !content || /^[.…・]+$/.test(content);

            // Parse word-by-word (karaoke) format: <00:01.00>word<00:01.50>word
            var wordRegex = /<(\d+):(\d+)\.(\d+)>([^<]*)/g;
            var words = [];
            var wordMatch;
            while ((wordMatch = wordRegex.exec(content)) !== null) {
                var wMin = parseInt(wordMatch[1]);
                var wSec = parseInt(wordMatch[2]);
                var wMs = parseInt(wordMatch[3].padEnd(2, '0').slice(0, 2)) * 10;
                words.push({ time: wMin * 60000 + wSec * 1000 + wMs + offset, text: wordMatch[4] });
            }

            // Parse all timestamps
            let timestampMatch;
            const timestampRegex = /\[(\d+):(\d+)(?:\.|:)*(\d+)*\]/g;
            while ((timestampMatch = timestampRegex.exec(timestampsStr)) !== null) {
                const min = parseInt(timestampMatch[1]);
                const sec = parseInt(timestampMatch[2]);
                const ms = timestampMatch[3] ? parseInt(timestampMatch[3].slice(0, 2).padEnd(2, '0')) * 10 : 0;
                const time = min * 60000 + sec * 1000 + ms + offset;
                var entry = { time, original: content, translation: '', isInterlude };
                if (words.length > 0) entry.words = words;
                result.push(entry);
            }
        }

        result.sort((a, b) => a.time - b.time);

        // Merge duplicate timestamps
        const merged = [];
        for (let i = 0; i < result.length; i++) {
            if (i > 0 && Math.abs(result[i].time - result[i - 1].time) < 50) {
                var prev = merged.length > 0 ? merged[merged.length - 1] : null;
                if (prev && !prev.translation && result[i].original) {
                    prev.translation = result[i].original;
                } else if (prev && prev.original && !result[i].original) {
                    // Skip empty duplicate
                } else {
                    merged.push({ ...result[i] });
                }
            } else {
                merged.push({ ...result[i] });
            }
        }

        return { lyrics: merged };
    }

    function setLyrics(parsedLyrics, translationLyrics) {
        lyrics = parsedLyrics || [];
        currentLine = 0;
        shouldTransit = false;
        if (translationLyrics && translationLyrics.length > 0) {
            for (const trans of translationLyrics) {
                const match = lyrics.find(l => Math.abs(l.time - trans.time) < 100);
                if (match) match.translation = trans.original;
            }
        }
        isUnsynced = lyrics.length > 0 && lyrics.every(l => l.time === 0);
        if (isUnsynced) lyrics.forEach((l, i) => l.time = i * 5000);
        renderLyrics();
        return lyrics;
    }

    function showStatus(text, duration) {
        if (!contentEl) return;
        contentEl.innerHTML = '';
        var el = document.createElement('div');
        el.className = 'lyrics-placeholder';
        el.textContent = text;
        el.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;color:rgba(255,255,255,0.3);';
        contentEl.appendChild(el);
        if (duration) setTimeout(function() { if (el.parentNode) el.textContent = '暂无歌词'; }, duration);
    }

    function renderLyrics() {
        if (!contentEl) return;
        contentEl.innerHTML = '';
        if (!lyrics.length) {
            var ph = document.createElement('div');
            ph.className = 'lyrics-placeholder';
            ph.textContent = '';
            ph.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;color:rgba(255,255,255,0.3);';
            contentEl.appendChild(ph);
            return;
        }
        var lyricAlign = (typeof Settings !== 'undefined') ? (Settings.get('lyricAlign') || 'center') : 'center';
        var karaoke = (typeof Settings !== 'undefined') && Settings.get('karaokeLyrics');
        lyrics.forEach((line, index) => {
            if (line.isInterlude) return;
            var el = document.createElement('div');
            el.className = 'lyrics-line';
            el.dataset.index = index;
            el.setAttribute('offset', '1');
            el.style.textAlign = lyricAlign;
            el.style.transformOrigin = lyricAlign === 'left' ? 'left center' : lyricAlign === 'right' ? 'right center' : 'center center';
            var html = '';
            if (karaoke && line.words && line.words.length > 0) {
                html += '<div class="lyric-original">';
                line.words.forEach(function(w, wi) {
                    html += '<span class="karaoke-word" data-time="' + w.time + '">' + esc(w.text) + '</span>';
                });
                html += '</div>';
            } else {
                html += '<div class="lyric-original">' + esc(line.original) + '</div>';
            }
            if (line.translation) html += '<div class="lyric-translation">' + esc(line.translation) + '</div>';
            el.innerHTML = html;
            el.addEventListener('click', () => {
                if (!line.isInterlude && typeof AudioEngine !== 'undefined') AudioEngine.seek(line.time / 1000);
            });
            contentEl.appendChild(el);
        });
        updateLayout(true);
    }

    function esc(text) { var div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

    function update(timeMs) {
        if (!lyrics.length) return;
        var found = 0;
        for (var i = 0; i < lyrics.length; i++) {
            if (lyrics[i].time <= timeMs) found = i; else break;
        }
        if (found !== currentLine) {
            currentLine = found;
            if (!userScrolling) updateLayout(false);
        }
        // Karaoke word highlighting
        var karaoke = (typeof Settings !== 'undefined') && Settings.get('karaokeLyrics');
        if (karaoke) {
            var line = lyrics[currentLine];
            if (line && line.words && line.words.length > 0) {
                var lineEl = contentEl.querySelector('[data-index="' + currentLine + '"]');
                if (lineEl) {
                    var wordEls = lineEl.querySelectorAll('.karaoke-word');
                    wordEls.forEach(function(wEl) {
                        var wTime = parseInt(wEl.dataset.time);
                        if (wTime <= timeMs) wEl.classList.add('active');
                        else wEl.classList.remove('active');
                    });
                }
            }
        }
        updateMobileLyrics(found);
    }

    function escapeHtml(text) {
        var d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function updateMobileLyrics(idx) {
        var prev3El = document.getElementById('mobile-lyric-prev3');
        var prev2El = document.getElementById('mobile-lyric-prev2');
        var prevEl = document.getElementById('mobile-lyric-prev');
        var currEl = document.getElementById('mobile-lyric-current');
        var nextEl = document.getElementById('mobile-lyric-next');
        var next2El = document.getElementById('mobile-lyric-next2');
        var next3El = document.getElementById('mobile-lyric-next3');
        if (!currEl) return;

        if (!lyrics.length) {
            if (prev3El) prev3El.textContent = '';
            if (prev2El) prev2El.textContent = '';
            if (prevEl) prevEl.textContent = '';
            currEl.textContent = '. . .';
            if (nextEl) nextEl.textContent = '';
            if (next2El) next2El.textContent = '';
            if (next3El) next3El.textContent = '';
            return;
        }

        var curr = lyrics[idx];
        var hasTranslation = curr && curr.translation;

        if (hasTranslation) {
            if (prev3El) prev3El.style.display = 'none';
            if (prev2El) prev2El.style.display = 'none';
            if (next2El) next2El.style.display = 'none';
            if (next3El) next3El.style.display = 'none';
        } else {
            if (prev3El) prev3El.style.display = '';
            if (prev2El) prev2El.style.display = '';
            if (next2El) next2El.style.display = '';
            if (next3El) next3El.style.display = '';
        }

        var prev3 = idx > 2 ? lyrics[idx - 3] : null;
        var prev2 = idx > 1 ? lyrics[idx - 2] : null;
        var prev = idx > 0 ? lyrics[idx - 1] : null;
        var next = idx < lyrics.length - 1 ? lyrics[idx + 1] : null;
        var next2 = idx < lyrics.length - 2 ? lyrics[idx + 2] : null;
        var next3 = idx < lyrics.length - 3 ? lyrics[idx + 3] : null;

        if (prev3El) prev3El.textContent = (prev3 && prev3.original && !prev3.isInterlude) ? prev3.original : '';
        if (prev2El) prev2El.textContent = (prev2 && prev2.original && !prev2.isInterlude) ? prev2.original : '';
        if (prevEl) {
            if (hasTranslation && prev && prev.original && !prev.isInterlude) {
                prevEl.innerHTML = escapeHtml(prev.original) + (prev.translation ? '<div class="mobile-lyric-trans">' + escapeHtml(prev.translation) + '</div>' : '');
            } else {
                prevEl.textContent = (prev && prev.original && !prev.isInterlude) ? prev.original : '';
            }
        }
        if (curr) {
            if (curr.isInterlude || !curr.original) {
                currEl.textContent = '';
            } else {
                var html = escapeHtml(curr.original);
                if (curr.translation) {
                    html += '<div class="mobile-lyric-trans">' + escapeHtml(curr.translation) + '</div>';
                }
                currEl.innerHTML = html;
            }
        } else {
            currEl.textContent = '';
        }
        if (nextEl) {
            if (hasTranslation && next && next.original && !next.isInterlude) {
                nextEl.innerHTML = escapeHtml(next.original) + (next.translation ? '<div class="mobile-lyric-trans">' + escapeHtml(next.translation) + '</div>' : '');
            } else {
                nextEl.textContent = (next && next.original && !next.isInterlude) ? next.original : '';
            }
        }
        if (next2El) next2El.textContent = (next2 && next2.original && !next2.isInterlude) ? next2.original : '';
        if (next3El) next3El.textContent = (next3 && next3.original && !next3.isInterlude) ? next3.original : '';
    }

    function getLineSpacing() { return typeof Settings !== 'undefined' ? Settings.get('lyricLineSpacing') : 8; }

    function updateLayout(initialRender) {
        if (!contentEl || !containerEl) return;
        if (typeof Settings !== 'undefined') {
            var r = document.documentElement;
            r.style.setProperty('--font-size-lyric', Settings.get('lyricFontSize') + 'px');
            r.style.setProperty('--lyric-alignment', Settings.get('lyricAlignment') + '%');
            r.style.setProperty('--rnp-lyric-weight', Settings.get('lyricFontWeight'));
            r.style.setProperty('--font-size-trans', Settings.get('transFontSize') + 'px');
            r.style.setProperty('--rnp-trans-weight', Settings.get('transFontWeight'));
        }
        var lines = contentEl.children, containerH = containerEl.clientHeight;
        if (!containerH) return;
        var alignPct = (typeof Settings !== 'undefined' ? Settings.get('lyricAlignment') : 45) / 100;
        var idx = Math.max(0, currentLine);
        if (initialRender || !shouldTransit) {
            for (var c of lines) c.style.transition = 'none';
            requestAnimationFrame(() => requestAnimationFrame(() => { for (var c of lines) c.style.transition = ''; }));
        }
        shouldTransit = true;
        for (var i = 0; i < lines.length; i++) {
            var el = lines[i], offset = i - idx;
            el.setAttribute('offset', offset === 0 ? '0' : (offset > 0 ? '1' : '-1'));
            var yPos;
            if (i === idx) yPos = containerH * alignPct;
            else if (i < idx) {
                var y = containerH * alignPct;
                for (var j = idx - 1; j >= i; j--) { var s = overrides.scale(j - idx); y -= (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            } else {
                var y = containerH * alignPct;
                for (var j = idx; j < i; j++) { var s = overrides.scale(j - idx); y += (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            }
            var scale = overrides.scale(offset), opacity = overrides.opacity(offset), blur = overrides.blur(offset);
            el.style.transform = 'translateY(' + yPos + 'px) scale(' + scale + ')';
            el.style.opacity = opacity;
            el.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : 'none';
        }
    }

    var wheelTimer = null, visualLine = -1, userScrolling = false;

    function highlightVisual(lineIdx, slow) {
        if (!contentEl || !containerEl) return;
        var lines = contentEl.children, containerH = containerEl.clientHeight;
        var alignPct = (typeof Settings !== 'undefined' ? Settings.get('lyricAlignment') : 45) / 100;
        for (var i = 0; i < lines.length; i++) {
            var el = lines[i], offset = i - lineIdx;
            el.setAttribute('offset', offset === 0 ? '0' : (offset > 0 ? '1' : '-1'));
            var yPos;
            if (i === lineIdx) yPos = containerH * alignPct;
            else if (i < lineIdx) {
                var y = containerH * alignPct;
                for (var j = lineIdx - 1; j >= i; j--) { var s = overrides.scale(j - lineIdx); y -= (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            } else {
                var y = containerH * alignPct;
                for (var j = lineIdx; j < i; j++) { var s = overrides.scale(j - lineIdx); y += (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            }
            var scale = overrides.scale(offset), opacity = overrides.opacity(offset), blur = overrides.blur(offset);
            if (slow) el.style.transition = 'transform 0.8s cubic-bezier(0.25,0.1,0.25,1), filter 0.8s ease, opacity 0.8s ease';
            el.style.transform = 'translateY(' + yPos + 'px) scale(' + scale + ')';
            el.style.opacity = opacity;
            el.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : 'none';
        }
    }

    function init(container, content) {
        containerEl = container; contentEl = content;
        var ro = new ResizeObserver(() => { shouldTransit = false; updateLayout(false); });
        ro.observe(containerEl);
        // Apply initial lyric alignment
        var lyricAlign = (typeof Settings !== 'undefined') ? (Settings.get('lyricAlign') || 'center') : 'center';
        setTimeout(function() {
            document.querySelectorAll('.lyrics-line').forEach(function(el) {
                el.style.textAlign = lyricAlign;
                el.style.transformOrigin = lyricAlign === 'left' ? 'left center' : lyricAlign === 'right' ? 'right center' : 'center center';
            });
        }, 100);
        
        // 鼠标滚轮支持
        containerEl.addEventListener('wheel', function(e) {
            e.preventDefault();
            userScrolling = true;
            if (!lyrics.length) return;
            var ni = [];
            for (var i = 0; i < lyrics.length; i++) if (!lyrics[i].isInterlude) ni.push(i);
            if (!ni.length) return;
            if (visualLine < 0) visualLine = currentLine;
            var cur = 0;
            for (var i = 0; i < ni.length; i++) if (ni[i] <= visualLine) cur = i;
            var dir = e.deltaY > 0 ? 1 : -1, next = Math.max(0, Math.min(ni.length - 1, cur + dir));
            visualLine = ni[next];
            highlightVisual(visualLine);
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(function() { visualLine = -1; userScrolling = false; highlightVisual(currentLine, true); }, 3000);
        }, { passive: false });
        
        // ponytail: touch events removed per request
        
        containerEl.addEventListener('mouseleave', function() { clearTimeout(wheelTimer); if (visualLine >= 0) { visualLine = -1; highlightVisual(currentLine, true); } });
    }

    function reset() {
        lyrics = [];
        currentLine = 0;
        visualLine = -1;
        userScrolling = false;
        clearTimeout(wheelTimer);
        if (contentEl) contentEl.innerHTML = '';
    }
    function getLyricAtTime(timeMs) { for (var i = lyrics.length - 1; i >= 0; i--) if (lyrics[i].time <= timeMs) return i; return 0; }

    return { init, parseLRC, setLyrics, showStatus, update, reset, getLyricAtTime, updateLayout, get currentLine() { return currentLine; }, get lyrics() { return lyrics; }, get isUnsynced() { return isUnsynced; }, overrides };
})();
