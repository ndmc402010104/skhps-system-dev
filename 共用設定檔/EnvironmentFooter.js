/*
檔案位置：共用設定檔/EnvironmentFooter.js
時間戳記：2026-06-06 11:24 UTC+8
用途：全站三段式環境頁尾；提供三段式環境切換、集中 API URL 設定與 GitHub Pages 跨環境版本摘要。
*/

(function(global){
  'use strict';

  if(!global || typeof global.document === 'undefined'){
    return;
  }

  var document = global.document;
  var runtime = global.SKH_RUNTIME || {};

  if(global.__SKH_ENVIRONMENT_FOOTER_SCRIPT_LOADED__ && global.renderEnvironmentFooter){
    global.__SKH_ENVIRONMENT_FOOTER_LOADING__ = false;
    try {
      global.renderEnvironmentFooter();
    }
    catch(error){
      if(global.console && typeof global.console.warn === 'function'){
        global.console.warn('[environment-footer] duplicate render skipped', error);
      }
    }
    return;
  }

  global.__SKH_ENVIRONMENT_FOOTER_SCRIPT_LOADED__ = true;
  global.__SKH_ENVIRONMENT_FOOTER_LOADING__ = false;

  var environments = global.SKH_ENVIRONMENTS || {
    gasDev:{
      key:'gasDev',
      label:'app script測試版',
      shortLabel:'AS 測試',
      url:'https://script.google.com/macros/s/AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE/dev',
      apiUrl:'https://script.google.com/macros/s/AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE/dev',
      version:'v2.37.0-202606061132',
      type:'gas'
    },
    webDev:{
      key:'webDev',
      label:'測試版',
      shortLabel:'測試版',
      url:'https://dev-skhps.jonaminz.com',
      apiUrl:'https://script.google.com/macros/s/AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE/dev',
      version:'v2.37.0-202606061132',
      type:'web'
    },
    webProd:{
      key:'webProd',
      label:'正式版',
      shortLabel:'正式版',
      url:'https://skhps.jonaminz.com',
      apiUrl:'https://script.google.com/macros/s/AKfycbwbz8pXfU68j2aFeF_AaDmmG6Vco3JsPSw-PGyYeLu0AF3vCfzaZJQFOjORnwSw8Xp4/exec',
      version:'v2.37.0-202606061128',
      type:'web'
    }
  };

  var order = ['gasDev', 'webDev', 'webProd'];
  var manifestPromise = null;
  var manifestData = null;
  var manifestApplied = false;

  function ensureStyle(){
    if(document.getElementById('skhEnvironmentFooterStyle')){
      return;
    }

    var style = document.createElement('style');
    style.id = 'skhEnvironmentFooterStyle';
    style.textContent =
      '.appVersionFooter{position:fixed;left:0;right:0;bottom:0;z-index:10000;min-height:42px;display:flex;align-items:center;justify-content:center;padding:6px 12px;box-sizing:border-box;background:rgba(248,251,255,.94);border-top:1px solid rgba(148,163,184,.38);box-shadow:0 -8px 24px rgba(15,23,42,.08);backdrop-filter:blur(10px);}' +
      '.appVersionSegment{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;width:min(1120px,calc(100vw - 24px));min-width:0;padding:3px;border:1px solid rgba(148,163,184,.38);border-radius:999px;background:rgba(226,232,240,.65);}' +
      '.appVersionBadge{display:flex;align-items:center;justify-content:center;flex-wrap:nowrap;gap:7px;min-width:0;max-width:100%;min-height:28px;padding:5px 12px;border:1px solid transparent;border-radius:999px;background:transparent;color:#475569;font-size:11px;font-weight:800;line-height:1.1;text-align:center;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;transition:color .16s ease,border-color .16s ease,background-color .16s ease,box-shadow .16s ease;}' +
      '.appVersionBadge:hover{color:#1d4ed8;background:rgba(255,255,255,.78);border-color:rgba(37,99,235,.25);}' +
      '.appVersionBadge.is-active{color:#ffffff;background:linear-gradient(135deg,#2563eb,#0f766e);border-color:transparent;box-shadow:0 8px 18px rgba(37,99,235,.20);cursor:default;}' +
      '.appVersionBadgeMode{flex:0 1 auto;min-width:0;max-width:100%;font-weight:900;overflow:hidden;text-overflow:ellipsis;}' +
      '.appVersionText{flex:0 1 auto;min-width:0;max-width:100%;font-weight:800;opacity:.9;overflow:hidden;text-overflow:ellipsis;}' +
      '.appVersionText:empty{display:none;}' +
      '@media(max-width:820px){.appVersionSegment{grid-template-columns:repeat(3,minmax(0,1fr));width:calc(100vw - 12px)}.appVersionBadge{font-size:10px;padding:5px 7px;gap:4px}}' +
      '@media(max-width:600px){.appVersionFooter{min-height:38px;padding:4px 4px}.appVersionSegment{gap:2px;padding:2px;width:calc(100vw - 8px)}.appVersionBadge{min-height:28px;padding:4px 4px;font-size:8.5px;gap:3px}.appVersionBadgeMode,.appVersionText{max-width:100%}}';
    document.head.appendChild(style);
  }

  function normalizeVersion(version){
    var text = String(version || '').trim();
    if(!text){
      return 'v未設定';
    }
    return /^v/i.test(text) ? text : 'v' + text;
  }

  function getCompactVersionText(version){
    var text = normalizeVersion(version);
    var timestampMatch = text.match(/-(\d{8})(\d{4})$/);

    if(timestampMatch){
      return timestampMatch[1].slice(4) + timestampMatch[2];
    }

    return text.replace(/^v/i, '');
  }

  function hasValue(value){
    return String(value || '').trim() !== '';
  }

  function getManifestSection(manifest, key){
    if(!manifest){
      return null;
    }

    if(key === 'webDev'){
      return manifest.dev || manifest.webDev || null;
    }

    if(key === 'webProd'){
      return manifest.prod || manifest.webProd || null;
    }

    if(key === 'gasDev'){
      return manifest.gasDev || null;
    }

    return manifest[key] || null;
  }

  function applyVersionManifest(manifest){
    if(!manifest || typeof manifest !== 'object'){
      return;
    }

    manifestData = manifest;
    manifestApplied = true;
    global.__SKH_ENVIRONMENT_FOOTER_MANIFEST_LOADED__ = true;

    order.forEach(function(key){
      var section = getManifestSection(manifest, key);
      var env = environments[key];

      if(!section || !env){
        return;
      }

      if(hasValue(section.version)){
        env.version = normalizeVersion(section.version);
        env.versionSource = 'manifest';
      }

      if(hasValue(section.updatedAt)){
        env.updatedAt = String(section.updatedAt).trim();
      }

      if(hasValue(section.url)){
        env.manifestUrl = String(section.url).trim();
      }

      if(hasValue(section.env)){
        env.manifestEnv = String(section.env).trim();
      }
    });
  }

  function getGithubRepoBasePath(){
    var path = String(location.pathname || '/');
    var parts;

    if(String(location.hostname || '').toLowerCase().indexOf('github.io') < 0){
      return '/';
    }

    parts = path.split('/').filter(Boolean);
    return parts.length ? '/' + parts[0] + '/' : '/';
  }

  function getVersionManifestUrls(){
    var hostname = String(location.hostname || '').toLowerCase();
    var urls = [];

    if(hostname === 'dev-skhps.jonaminz.com'){
      urls.push('https://dev-skhps.jonaminz.com/version.json');
      urls.push('https://skhps.jonaminz.com/version.json');
      return urls;
    }

    if(hostname === 'skhps.jonaminz.com'){
      urls.push('https://skhps.jonaminz.com/version.json');
      urls.push('https://dev-skhps.jonaminz.com/version.json');
      return urls;
    }

    if(hostname.indexOf('github.io') >= 0){
      urls.push(location.origin + getGithubRepoBasePath() + 'version.json');
      urls.push('https://dev-skhps.jonaminz.com/version.json');
      urls.push('https://skhps.jonaminz.com/version.json');
      return urls;
    }

    if(hostname.indexOf('script.google.com') >= 0 || String(location.href || '').indexOf('/macros/s/') >= 0){
      urls.push('https://dev-skhps.jonaminz.com/version.json');
      urls.push('https://skhps.jonaminz.com/version.json');
      return urls;
    }

    urls.push('/version.json');
    urls.push('https://dev-skhps.jonaminz.com/version.json');
    urls.push('https://skhps.jonaminz.com/version.json');
    return urls;
  }

  function fetchManifestFromUrls(urls, index){
    var url = urls[index];

    if(!url){
      return Promise.reject(new Error('version.json load failed: no manifest url available'));
    }

    return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now(), { cache:'no-store' })
      .then(function(res){
        if(!res.ok){
          throw new Error('version.json load failed: ' + res.status + ' ' + url);
        }
        return res.json();
      })
      .then(function(manifest){
        if(manifest && typeof manifest === 'object'){
          manifest.__manifestSourceUrl = url;
        }
        return manifest;
      })
      .catch(function(error){
        if(index + 1 < urls.length){
          return fetchManifestFromUrls(urls, index + 1);
        }
        throw error;
      });
  }

  function detectCurrentEnv(){
    var hostname = String(location.hostname || '').toLowerCase();
    var href = String(location.href || '').toLowerCase();

    // 先看實際網址，不先相信 runtime.currentEnv，避免 Config 被部署時寫死造成環境誤判。
    if(hostname.indexOf('script.google.com') >= 0 && (href.indexOf('/dev') >= 0 || /[?&]appEnv=dev(?:&|#|$)/.test(location.search || ''))){
      return 'gasDev';
    }

    if(hostname.indexOf('script.google.com') >= 0 || href.indexOf('/macros/s/') >= 0){
      return 'gasExec';
    }

    if(hostname === 'dev-skhps.jonaminz.com' || hostname.indexOf('dev-skhps.jonaminz.com') >= 0){
      return 'webDev';
    }

    if(hostname === 'skhps.jonaminz.com' || hostname.indexOf('skhps.jonaminz.com') >= 0){
      return 'webProd';
    }

    if(/[?&]appEnv=dev(?:&|#|$)/.test(location.search || '')){
      return 'gasDev';
    }

    if(runtime.currentEnv && environments[runtime.currentEnv]){
      return runtime.currentEnv;
    }

    return runtime.defaultEnv || 'webDev';
  }

  function buildTargetUrl(env){
    var url = String(env.url || '').trim();

    if(!url){
      return '#';
    }

    if(env.key === 'gasDev'){
      return buildGasTargetUrl(url);
    }

    return buildWebTargetUrl(url);
  }

  function buildGasTargetUrl(url){
    var gasUrl = appendParam(url, 'appEnv', 'dev');
    var page = getGasPageParam();

    if(page){
      gasUrl = appendParam(gasUrl, 'page', page);
    }

    gasUrl = appendCurrentSearchParams(gasUrl, {
      appEnv:true,
      page:true
    });

    return gasUrl + (location.hash || '');
  }

  function appendParam(url, key, value){
    var hash = '';
    var hashIndex = url.indexOf('#');

    if(hashIndex >= 0){
      hash = url.slice(hashIndex);
      url = url.slice(0, hashIndex);
    }

    var joiner = url.indexOf('?') >= 0 ? '&' : '?';
    return url + joiner + encodeURIComponent(key) + '=' + encodeURIComponent(value) + hash;
  }

  function buildWebTargetUrl(origin){
    var path = String(location.pathname || '/');
    var repoPrefix = '/plastic-surgery-department-system';

    if(path.indexOf(repoPrefix + '/') === 0){
      path = path.slice(repoPrefix.length);
    }

    // Apps Script Web App 的 pathname 是 /macros/s/.../dev；不能直接拿來組 GitHub Pages 路徑。
    if(path === '/' || path.indexOf('/macros/') >= 0){
      path = getWebPathForGasPage(getGasPageParam()) || '/';
    }

    return composeWebTargetUrl(
      origin,
      path,
      getCurrentSearchString({
        appEnv:true,
        page:true
      })
    );
  }

  function composeWebTargetUrl(origin, path, search){
    var routeHash = '';
    var hashIndex = path.indexOf('#');

    if(hashIndex >= 0){
      routeHash = path.slice(hashIndex);
      path = path.slice(0, hashIndex);
    }

    if(!path){
      path = '/';
    }

    if(path.charAt(0) !== '/'){
      path = '/' + path;
    }

    return origin.replace(/\/+$/, '') +
      path +
      (search || '') +
      (routeHash || location.hash || '');
  }

  function getCurrentSearchString(excludedKeys){
    var search = String(location.search || '');

    if(!search || typeof URLSearchParams === 'undefined'){
      return '';
    }

    var params = new URLSearchParams(search);
    var parts = [];

    params.forEach(function(value, key){
      if(excludedKeys && excludedKeys[key]){
        return;
      }

      parts.push(
        encodeURIComponent(key) + '=' + encodeURIComponent(value)
      );
    });

    return parts.length ? '?' + parts.join('&') : '';
  }

  function appendCurrentSearchParams(url, excludedKeys){
    var search = getCurrentSearchString(excludedKeys);

    if(!search){
      return url;
    }

    return url + (url.indexOf('?') >= 0 ? '&' : '?') + search.slice(1);
  }

  function getSearchPageParam(){
    var search = String(location.search || '');

    if(!search || typeof URLSearchParams === 'undefined'){
      return '';
    }

    return String(new URLSearchParams(search).get('page') || '');
  }

  function getWebPathForGasPage(page){
    var key = String(page || '').toLowerCase();
    var routes = {
      signmeeting:'/科室系統用戶端/SignMeeting.html',
      signqr:'/科室系統用戶端/SignQRGenerator.html',
      hospitalsignin:'/科室系統用戶端/HospitalSignIn.html',
      dressingfront:'/敷料領用登錄系統/DressingFront.html',
      dressinguse:'/敷料領用登錄系統/DressingUse.html',
      dressingdict:'/敷料領用登錄系統/DressingFront.html#dressingDict',
      uitest:'/共用設定檔/UI設定/99_文件/skh-ui-test-page.html',
      hisconnect:'/HisConnect/HisConnectPage.html'
    };

    return routes[key] || '';
  }

  function getGasPageParam(){
    var pageParam = getSearchPageParam();

    if(pageParam){
      return pageParam;
    }

    var hash = String(location.hash || '').toLowerCase();

    if(hash.indexOf('dressingdict') >= 0){
      return 'dressingdict';
    }

    var path = String(location.pathname || '').toLowerCase();

    if(path.indexOf('dressingfront') >= 0){
      return 'dressingfront';
    }

    if(path.indexOf('dressinguse') >= 0){
      return 'dressinguse';
    }

    if(path.indexOf('dressingdict') >= 0){
      return 'dressingdict';
    }

    if(path.indexOf('signqrgenerator') >= 0){
      return 'signqr';
    }

    if(path.indexOf('hospitalsignin') >= 0){
      return 'hospitalsignin';
    }

    if(path.indexOf('signmeeting') >= 0){
      return 'signmeeting';
    }

    if(path.indexOf('skh-ui-test-page') >= 0){
      return 'uitest';
    }

    if(path.indexOf('hisconnectpage') >= 0 || path.indexOf('hisconnect') >= 0){
      return 'hisconnect';
    }

    return '';
  }

  function navigateTop(url){
    if(!url || url === '#'){
      return;
    }

    try {
      if(global.top && global.top !== global.self){
        global.top.location.href = url;
        return;
      }
    }
    catch(error){
      // Apps Script iframe 有時禁止直接碰 top；下面退回 location.assign。
    }

    try {
      global.location.assign(url);
    }
    catch(error2){
      global.location.href = url;
    }
  }

  function normalizeRuntimeEnv(env){
    env = String(env || '').trim();
    if(env === 'webDev'){
      return 'dev';
    }
    if(env === 'webProd'){
      return 'prod';
    }
    return env || 'unknown';
  }

  function getCurrentRuntimeInfo(){
    var currentEnv = detectCurrentEnv();
    var runtimeEnv =
      runtime.env ||
      runtime.currentEnv ||
      global.SKH_ENV ||
      '';
    var env = normalizeRuntimeEnv(
      currentEnv === 'webDev'
        ? 'dev'
        : (
          currentEnv === 'webProd'
            ? 'prod'
            : (
              currentEnv === 'gasDev'
                ? 'gasDev'
                : (
                  currentEnv === 'gasExec'
                    ? 'gasExec'
                    : runtimeEnv
                )
            )
        )
    );
    var mode =
      runtime.mode ||
      global.SKH_MODE ||
      (
        currentEnv === 'gasDev' || currentEnv === 'gasExec'
          ? 'gas'
          : 'github'
      );
    var envKey =
      currentEnv === 'webDev'
        ? 'webDev'
        : (
          currentEnv === 'webProd'
            ? 'webProd'
            : (
              currentEnv === 'gasExec'
                ? 'gasExec'
                : 'gasDev'
            )
        );
    var pageVersion =
      runtime.version ||
      global.APP_VERSION ||
      global.VERSION ||
      global.BUILD_VERSION ||
      (
        environments[envKey] && environments[envKey].version
          ? environments[envKey].version
          : 'unknown'
      );

    return {
      mode:mode,
      env:env,
      version:normalizeVersion(pageVersion)
    };
  }

  function loadVersionManifest(){
    if(manifestPromise){
      return manifestPromise;
    }

    manifestPromise = fetchManifestFromUrls(getVersionManifestUrls(), 0).then(function(manifest){
      applyVersionManifest(manifest);
      return manifest;
    }).catch(function(error){
      global.__SKH_ENVIRONMENT_FOOTER_MANIFEST_LOADED__ = false;
      manifestPromise = null;
      throw error;
    });

    global.__SKH_ENVIRONMENT_FOOTER_MANIFEST_PROMISE__ = manifestPromise;
    return manifestPromise;
  }

  function renderVersionFooter(){
    var footer = document.querySelector('[data-skh-version-footer]');
    if(!footer){
      return;
    }

    var info = getCurrentRuntimeInfo();
    var mode = info.mode;
    var env = info.env;
    var pageVersion = info.version;

    if(env === 'gasExec'){
      footer.textContent = 'Apps Script /exec 入口｜本頁 ' + pageVersion + '｜請改用 app script測試版 /dev';
      return;
    }

    if(mode === 'gas' || env === 'gasDev'){
      footer.textContent = 'Apps Script 測試版｜本頁 ' + pageVersion;
      return;
    }

    loadVersionManifest().then(function(manifest){
      applyVersionManifest(manifest);
      if(env === 'prod'){
        footer.textContent =
          '正式版｜本頁 ' +
          pageVersion +
          '｜測試版最新版 ' +
          normalizeVersion(getManifestSection(manifest, 'webDev') && getManifestSection(manifest, 'webDev').version ? getManifestSection(manifest, 'webDev').version : environments.webDev.version);
        return;
      }

      if(env === 'dev'){
        footer.textContent =
          '測試版｜本頁 ' +
          pageVersion +
          '｜正式版最新版 ' +
          normalizeVersion(getManifestSection(manifest, 'webProd') && getManifestSection(manifest, 'webProd').version ? getManifestSection(manifest, 'webProd').version : environments.webProd.version);
        return;
      }

      footer.textContent = '目前環境 ' + env + '｜本頁 ' + pageVersion;
    }).catch(function(error){
      if(global.console && typeof global.console.warn === 'function'){
        global.console.warn('[version-footer] version manifest load failed', error);
      }
      footer.textContent = '目前環境 ' + env + '｜本頁 ' + pageVersion + '｜版本資訊讀取失敗';
    });
  }

  var envNavigation = {
    detectCurrentEnv:detectCurrentEnv,
    buildTargetUrl:function(key){
      return buildTargetUrl(environments[key] || {});
    },
    navigateToKey:function(key, event){
      if(event && typeof event.preventDefault === 'function'){
        event.preventDefault();
      }
      navigateTop(this.buildTargetUrl(key));
      return false;
    }
  };

  function renderEnvironmentFooter(options){
    options = options || {};
    ensureStyle();

    var currentEnv = options.currentEnv || detectCurrentEnv();
    var footer =
      document.querySelector('[data-skh-environment-footer="true"]') ||
      document.querySelector('[data-app-footer="1"]') ||
      document.querySelector('.appVersionFooter') ||
      document.createElement('div');

    footer.className = 'appVersionFooter';
    footer.dataset.appFooter = '1';
    footer.dataset.skhEnvironmentFooter = 'true';
    footer.innerHTML = '';

    var segment = document.createElement('div');
    segment.className = 'appVersionSegment';
    segment.setAttribute('role', 'list');

    order.forEach(function(key){
      var env = environments[key];
      var isActive = key === currentEnv;
      var item = document.createElement(isActive ? 'span' : 'a');
      var targetUrl = isActive ? '' : buildTargetUrl(env);
      var fullVersion = normalizeVersion(env.version);
      var compactVersion = getCompactVersionText(env.version);
      var displayLabel = String(env.shortLabel || env.label || '').trim();

      item.className = 'appVersionBadge' + (isActive ? ' is-active' : '');
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', env.label + ' ' + fullVersion);
      item.dataset.skhEnvironmentKey = key;
      item.dataset.skhVersionSource = env.versionSource || 'fallback';
      item.dataset.version = fullVersion;
      item.dataset.environmentVersion = fullVersion;

      if(env.updatedAt){
        item.dataset.skhVersionUpdatedAt = env.updatedAt;
      }

      if(env.manifestUrl){
        item.dataset.skhManifestUrl = env.manifestUrl;
      }

      item.title =
        env.label +
        ' ' +
        fullVersion +
        (env.updatedAt ? '｜更新 ' + env.updatedAt : '') +
        (env.versionSource === 'manifest' ? '｜version.json' : '｜fallback');

      if(!isActive){
        item.href = targetUrl;
        item.dataset.targetUrl = targetUrl;
        item.target = '_top';
        item.rel = 'noopener';
        item.addEventListener('click', function(event){
          envNavigation.navigateToKey(key, event);
        });
      }

      item.innerHTML =
        '<span class="appVersionBadgeMode"></span>' +
        '<span class="appVersionText"></span>';
      item.querySelector('.appVersionBadgeMode').textContent = displayLabel || env.label;
      item.querySelector('.appVersionText').textContent = compactVersion;
      segment.appendChild(item);
    });

    footer.appendChild(segment);

    if(!footer.parentNode){
      document.body.appendChild(footer);
    }

    global.__SKH_ENVIRONMENT_FOOTER_RENDERED__ = true;

    if(!manifestApplied && !options.skipManifestLoad && typeof fetch === 'function'){
      loadVersionManifest().then(function(manifest){
        applyVersionManifest(manifest);
        renderEnvironmentFooter(Object.assign({}, options, {
          skipManifestLoad:true
        }));
        renderVersionFooter();
      }).catch(function(error){
        if(global.console && typeof global.console.warn === 'function'){
          global.console.warn('[environment-footer] version manifest load failed', error);
        }
      });
    }

    return footer;
  }

  global.SKH_ENVIRONMENTS = environments;
  global.SKH_RUNTIME = runtime;
  global.SKH_ENV_NAVIGATION = envNavigation;
  global.getCurrentRuntimeInfo = global.getCurrentRuntimeInfo || getCurrentRuntimeInfo;
  global.loadVersionManifest = global.loadVersionManifest || loadVersionManifest;
  global.renderVersionFooter = global.renderVersionFooter || renderVersionFooter;
  global.renderEnvironmentFooter = renderEnvironmentFooter;

  if(document.readyState === 'loading'){
    if(!global.__SKH_ENVIRONMENT_FOOTER_DOM_READY_LISTENER__){
      global.__SKH_ENVIRONMENT_FOOTER_DOM_READY_LISTENER__ = true;
    document.addEventListener('DOMContentLoaded', function(){
      renderEnvironmentFooter();
    });
    }
  }
  else {
    renderEnvironmentFooter();
  }
})(typeof window !== 'undefined' ? window : this);


























