/*
檔案位置：共用設定檔/EnvironmentFooter.js
時間戳記：2026-06-05 15:39 UTC+8
用途：全站三段式環境頁尾；修正 Apps Script 測試版切換到 dev-skhps 測試版時，路徑組合與 _top 導頁失敗問題。
*/

(function(global){
  'use strict';

  if(!global || typeof global.document === 'undefined'){
    return;
  }

  var document = global.document;
  var runtime = global.SKH_RUNTIME || {};

  var environments = global.SKH_ENVIRONMENTS || {
    gasDev:{
      key:'gasDev',
      label:'app script測試版',
      url:'https://script.google.com/macros/s/AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE/dev',
      version:'v2.37.0-202606051546',
      type:'gas'
    },
    webDev:{
      key:'webDev',
      label:'測試版',
      url:'https://dev-skhps.jonaminz.com',
      version:'v2.37.0-202606051546',
      type:'web'
    },
    webProd:{
      key:'webProd',
      label:'正式版',
      url:'https://skhps.jonaminz.com',
      version:'v2.37.0-202606051528',
      type:'web'
    }
  };

  var order = ['gasDev', 'webDev', 'webProd'];

  function ensureStyle(){
    if(document.getElementById('skhEnvironmentFooterStyle')){
      return;
    }

    var style = document.createElement('style');
    style.id = 'skhEnvironmentFooterStyle';
    style.textContent =
      '.appVersionFooter{position:fixed;left:0;right:0;bottom:0;z-index:10000;min-height:42px;display:flex;align-items:center;justify-content:center;padding:6px 12px;box-sizing:border-box;background:rgba(248,251,255,.94);border-top:1px solid rgba(148,163,184,.38);box-shadow:0 -8px 24px rgba(15,23,42,.08);backdrop-filter:blur(10px);}' +
      '.appVersionSegment{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;width:min(1120px,calc(100vw - 24px));min-width:0;padding:3px;border:1px solid rgba(148,163,184,.38);border-radius:999px;background:rgba(226,232,240,.65);}' +
      '.appVersionBadge{display:flex;align-items:center;justify-content:center;flex-wrap:nowrap;gap:7px;min-width:0;min-height:28px;padding:5px 12px;border:1px solid transparent;border-radius:999px;background:transparent;color:#475569;font-size:11px;font-weight:800;line-height:1.1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:color .16s ease,border-color .16s ease,background-color .16s ease,box-shadow .16s ease;}' +
      '.appVersionBadge:hover{color:#1d4ed8;background:rgba(255,255,255,.78);border-color:rgba(37,99,235,.25);}' +
      '.appVersionBadge.is-active{color:#ffffff;background:linear-gradient(135deg,#2563eb,#0f766e);border-color:transparent;box-shadow:0 8px 18px rgba(37,99,235,.20);cursor:default;}' +
      '.appVersionBadgeMode{flex:0 0 auto;font-weight:900;overflow:hidden;text-overflow:ellipsis;}' +
      '.appVersionText{flex:0 1 auto;font-weight:800;opacity:.9;overflow:hidden;text-overflow:ellipsis;}' +
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

  function detectCurrentEnv(){
    var hostname = String(location.hostname || '').toLowerCase();
    var href = String(location.href || '').toLowerCase();

    // 先看實際網址，不先相信 runtime.currentEnv，避免 Config 被部署時寫死造成環境誤判。
    if(hostname.indexOf('script.google.com') >= 0 || href.indexOf('/macros/s/') >= 0){
      return 'gasDev';
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
      uitest:'/共用設定檔/UI設定/99_文件/skh-ui-test-page.html'
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

  function renderEnvironmentFooter(options){
    options = options || {};
    ensureStyle();

    var currentEnv = options.currentEnv || detectCurrentEnv();
    var footer =
      document.querySelector('[data-app-footer="1"]') ||
      document.querySelector('.appVersionFooter') ||
      document.createElement('div');

    footer.className = 'appVersionFooter';
    footer.dataset.appFooter = '1';
    footer.innerHTML = '';

    var segment = document.createElement('div');
    segment.className = 'appVersionSegment';
    segment.setAttribute('role', 'list');

    order.forEach(function(key){
      var env = environments[key];
      var isActive = key === currentEnv;
      var item = document.createElement(isActive ? 'span' : 'a');
      var targetUrl = isActive ? '' : buildTargetUrl(env);

      item.className = 'appVersionBadge' + (isActive ? ' is-active' : '');
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', env.label + ' ' + normalizeVersion(env.version));

      if(!isActive){
        item.href = targetUrl;
        item.dataset.targetUrl = targetUrl;
        item.target = '_top';
        item.rel = 'noopener';
        item.addEventListener('click', function(event){
          event.preventDefault();
          navigateTop(targetUrl);
        });
      }

      item.innerHTML =
        '<span class="appVersionBadgeMode"></span>' +
        '<span class="appVersionText"></span>';
      item.querySelector('.appVersionBadgeMode').textContent = env.label;
      item.querySelector('.appVersionText').textContent = normalizeVersion(env.version);
      segment.appendChild(item);
    });

    footer.appendChild(segment);

    if(!footer.parentNode){
      document.body.appendChild(footer);
    }

    return footer;
  }

  global.SKH_ENVIRONMENTS = environments;
  global.SKH_RUNTIME = runtime;
  global.renderEnvironmentFooter = renderEnvironmentFooter;

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      renderEnvironmentFooter();
    });
  }
  else {
    renderEnvironmentFooter();
  }
})(typeof window !== 'undefined' ? window : this);

