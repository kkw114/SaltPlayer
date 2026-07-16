/**
 * Settings Module
 * localStorage-backed settings for all customization features
 * Inspired by refined-now-playing-netease settings menu
 */

const Settings = (() => {
  const defaults = {
    // === 外观设置 ===
    textGlow: true,
    idleMode: false,
    idleTimeout: 1,
    progressBottom: false,

    // === 封面设置 ===
    rectangleCover: true,
    coverBlurryShadow: true,
    horizontalAlign: 'left',
    immersiveColor: 'primary',
    coverRotate: false,
    coverRotateSpeed: 13,
    coverSize: 306,

    // === 背景设置 ===
    bgType: 'solid',
    bgBlur: 50,
    bgDim: 55,
    bgOpacity: 100,
    blurDim: 50, blurOpacity: 100,
    fluidDim: 30, fluidOpacity: 100,
    gradientDim: 51, gradientOpacity: 100,
    solidDim: 50, solidOpacity: 100,
    noneDim: 55, noneOpacity: 100,
    dynamicGradientDim: 22, dynamicGradientOpacity: 100,
    dynamicGradientSpeed: 26,
    dynamicGradientBlur: 20,
    dynamicGradientDarken: 34,
    dynamicGradientFilterBright: true,
    solidColor: '#1a1a2e',
    solidFollowAccent: true,
    rotateBgSpeed: 10,
    rotateBgBlur: 65,
    rotateBgZoom: 185,
    fluidBgBlur: 30,
    fluidBgSpeed: 25,

    // === 歌词设置 ===
    lyricAlign: 'left',
    lyricFontSize: 28,
    lyricFontWeight: 500,
    transFontSize: 18,
    transFontWeight: 400,
    lyricFade: true,
    lyricZoom: true,
    lyricBlur: true,
    showTranslation: true,
    showRomaji: false,
    lyricAlignment: 45,
    lyricGlow: false,
    textShadow: false,
    customFontFamily: '',
    lyricFontFamily: '',
    transFontFamily: '',
    titleFontFamily: '',
    artistFontFamily: '',
    lyricLineSpacing: 17,
    titleFontSize: 22,
    titleFontWeight: 465,
    artistFontSize: 16,
    artistFontWeight: 407,
    karaokeLyrics: false,

    // === 元素辉光与阴影 ===
    lyricOrigGlow: true,
    lyricOrigShadow: true,
    lyricTransGlow: true,
    lyricTransShadow: false,
    trackTitleGlow: false,
    trackTitleShadow: false,
    trackArtistGlow: false,
    trackArtistShadow: true,

    // === 移动端歌词设置 ===
    mobileLyricSize: 27,
    mobileLyricWeight: 500,
    mobileTransSize: 17,
    mobileTransWeight: 400,
    mobileLineSpacing: 4,

    // === 播放设置 ===
    volume: 80,
    rate: 1,
    speedStep: 0.1,
    lastLocalFolder: '',
    lastSource: '',
    lastSubfolder: '',
    lastTrackIndex: -1,
    webdavConnections: [],
    cloudSync: false,

    // === 网易云设置 ===
    neteaseQuality: '192000',
    neteaseVipType: 'svip',
    neteaseDefaultDaily: false,
    neteaseLyrics: false,
    neteaseLyricsPriority: false,
  };

  let settings = {};
  let listeners = [];

  function init() {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('rnp-settings');
      if (saved) {
        settings = { ...defaults, ...JSON.parse(saved) };
      } else {
        settings = { ...defaults };
      }
    } catch (e) {
      settings = { ...defaults };
    }
    applyAll();
  }

  function get(key) {
    return settings[key] !== undefined ? settings[key] : defaults[key];
  }

  function set(key, value) {
    const old = settings[key];
    settings[key] = value;
    save();
    notify(key, value, old);
    return value;
  }

  function toggle(key) {
    return set(key, !get(key));
  }

  function save() {
    try {
      localStorage.setItem('rnp-settings', JSON.stringify(settings));
    } catch (e) {}
  }

  function reset(key) {
    if (key) {
      set(key, defaults[key]);
    } else {
      settings = { ...defaults };
      save();
      applyAll();
    }
  }

  function onChange(key, callback) {
    listeners.push({ key, callback });
  }

  function notify(key, value, old) {
    listeners.forEach(l => {
      if (!l.key || l.key === key) {
        l.callback(key, value, old);
      }
    });
  }

  function applyAll() {
    applyBodyClasses();
    applyCSSVariables();
  }

  function applyBodyClasses() {
    const b = document.body;
    // Appearance
    b.classList.toggle('progress-bottom', get('progressBottom'));

    // Background
        b.classList.remove('rnp-bg-blur', 'rnp-bg-gradient', 'rnp-bg-fluid', 'rnp-bg-solid', 'rnp-bg-none', 'rnp-bg-dynamic-gradient');
        b.classList.add(`rnp-bg-${get('bgType')}`);

    // Cover
    b.classList.toggle('rectangle-cover', get('rectangleCover'));
    b.classList.toggle('cover-blurry-shadow', get('coverBlurryShadow'));
    b.classList.toggle('cover-rotate', get('coverRotate'));
    b.classList.toggle('solid-follow-accent', get('solidFollowAccent'));
    b.classList.toggle('horizontal-align-center', get('horizontalAlign') === 'center');
    b.classList.toggle('horizontal-align-left', get('horizontalAlign') === 'left');
    b.classList.toggle('horizontal-align-right', get('horizontalAlign') === 'right');

    // Lyrics
    b.classList.toggle('lyric-fade', get('lyricFade'));
    b.classList.toggle('lyric-zoom', get('lyricZoom'));
    b.classList.toggle('lyric-blur', get('lyricBlur'));
    b.classList.toggle('rnp-lyric-glow', get('lyricGlow'));

    // Per-element glow/shadow
    b.classList.toggle('rnp-glow-lyric', get('lyricOrigGlow'));
    b.classList.toggle('rnp-shadow-lyric', get('lyricOrigShadow'));
    b.classList.toggle('rnp-glow-trans', get('lyricTransGlow'));
    b.classList.toggle('rnp-shadow-trans', get('lyricTransShadow'));
    b.classList.toggle('rnp-glow-title', get('trackTitleGlow'));
    b.classList.toggle('rnp-shadow-title', get('trackTitleShadow'));
    b.classList.toggle('rnp-glow-artist', get('trackArtistGlow'));
    b.classList.toggle('rnp-shadow-artist', get('trackArtistShadow'));

    // Translation
    b.classList.toggle('rnp-show-translation', get('showTranslation'));
  }

  function applyCSSVariables() {
    const root = document.documentElement;
    root.style.setProperty('--bg-blur', `${get('bgBlur')}px`);
    var t = get('bgType');
    root.style.setProperty('--bg-dim', get(t + 'Dim') / 100);
    root.style.setProperty('--bg-opacity', get(t + 'Opacity') / 100);
    root.style.setProperty('--accent-overlay', get(t + 'Accent') / 100);
    root.style.setProperty('--solid-bg-color', get('solidColor'));
    root.style.setProperty('--rotate-bg-speed', get('rotateBgSpeed') + 's');
    root.style.setProperty('--rotate-bg-blur', get('rotateBgBlur') + 'px');
    root.style.setProperty('--rotate-bg-zoom', (get('rotateBgZoom') / 100));
    root.style.setProperty('--fluid-bg-blur', get('fluidBgBlur') + 'px');
    root.style.setProperty('--fluid-bg-speed', get('fluidBgSpeed') + 's');
    root.style.setProperty('--cover-rotate-speed', get('coverRotateSpeed') + 's');
        root.style.setProperty('--dynamic-gradient-speed', get('dynamicGradientSpeed') + 's');
        root.style.setProperty('--dynamic-gradient-blur', get('dynamicGradientBlur') + 'px');
        root.style.setProperty('--dynamic-gradient-dim', get('dynamicGradientDim') / 100);
        root.style.setProperty('--dynamic-gradient-opacity', get('dynamicGradientOpacity') / 100);
        root.style.setProperty('--dynamic-gradient-darken', get('dynamicGradientDarken') / 100);
        root.style.setProperty('--cover-size', get('coverSize') + 'px');
        root.style.setProperty('--font-size-lyric', `${get('lyricFontSize')}px`);
    root.style.setProperty('--lyric-alignment', `${get('lyricAlignment')}%`);
    var lyricAlign = get('lyricAlign') || 'center';
    root.style.setProperty('--rnp-lyric-weight', get('lyricFontWeight'));
    root.style.setProperty('--font-size-trans', `${get('transFontSize')}px`);
    root.style.setProperty('--rnp-trans-weight', get('transFontWeight'));
    root.style.setProperty('--lyric-line-spacing', `${get('lyricLineSpacing')}px`);
    root.style.setProperty('--title-font-size', `${get('titleFontSize')}px`);
    root.style.setProperty('--title-font-weight', get('titleFontWeight'));
        root.style.setProperty('--artist-font-size', `${get('artistFontSize')}px`);
        root.style.setProperty('--artist-font-weight', get('artistFontWeight'));
        root.style.setProperty('--mobile-lyric-size', get('mobileLyricSize') + 'px');
        root.style.setProperty('--mobile-lyric-weight', get('mobileLyricWeight'));
        root.style.setProperty('--mobile-trans-size', get('mobileTransSize') + 'px');
        root.style.setProperty('--mobile-trans-weight', get('mobileTransWeight'));
        root.style.setProperty('--mobile-line-spacing', get('mobileLineSpacing') + 'px');
        var family = get('customFontFamily');
    if (family) {
      root.style.setProperty('--rnp-custom-font-family', family);
      document.body.classList.add('rnp-custom-font');
    } else {
      document.body.classList.remove('rnp-custom-font');
    }
  }

  return { init, get, set, toggle, reset, onChange, applyAll, applyCSSVariables, applyBodyClasses, get defaults() { return { ...defaults }; } };
})();
