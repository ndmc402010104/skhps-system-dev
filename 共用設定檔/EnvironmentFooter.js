/*
========================================
EnvironmentFooter.js
全站三段式環境頁尾
========================================
*/

(function(global){
  'use strict';

  if(!global || typeof global.document === 'undefined'){
    return;
  }

  var document =
    global.document;

  var runtime =
    global.SKH_RUNTIME ||
    {};

  var environments =
    global.SKH_ENVIRONMENTS ||
    {
      gasDev:{
        key:'gasDev',
        label:'app script測試版',
        url:'https://script.google.com/macros/s/AKfycbwySlDY2aAbYpy5OSi85vHz1pk5g1FQfopcaCfVneE/dev',
        version:'v2.31.0-202606051128',
        type:'gas'
      },
      webDev:{
        key:'webDev',
        label:'測試版',
        url:'https://dev-skhps.jonaminz.com',
        version:'v2.31.0-202606051128',
        type:'web'
      },
      webProd:{
        key:'webProd',
        label:'正式版',
        url:'https://skhps.jonaminz.com',
        version:'v2.30.0-202606050926',
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
      '.appVersionSegment{display:grid;grid-template-columns:minmax(260px,1.35fr) minmax(210px,1fr) minmax(220px,1fr);gap:4px;width:min(1120px,calc(100vw - 24px));padding:3px;border:1px solid rgba(148,163,184,.38);border-radius:999px;background:rgba(226,232,240,.65);}' +
      '.appVersionBadge{display:flex;align-items:center;justify-content:center;flex-wrap:nowrap;gap:7px;min-width:0;min-height:28px;padding:5px 12px;border:1px solid transparent;border-radius:999px;background:transparent;color:#475569;font-size:11px;font-weight:800;line-height:1.1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:color .16s ease,border-color .16s ease,background-color .16s ease,box-shadow .16s ease;}' +
      '.appVersionBadge:hover{color:#1d4ed8;background:rgba(255,255,255,.78);border-color:rgba(37,99,235,.25);}' +
      '.appVersionBadge.is-active{color:#ffffff;background:linear-gradient(135deg,#2563eb,#0f766e);border-color:transparent;box-shadow:0 8px 18px rgba(37,99,235,.20);cursor:default;}' +
      '.appVersionBadgeMode{flex:0 0 auto;font-weight:900;overflow:hidden;text-overflow:ellipsis;}' +
      '.appVersionText{flex:0 1 auto;font-weight:800;opacity:.9;overflow:hidden;text-overflow:ellipsis;}' +
      '@media(max-width:820px){.appVersionSegment{grid-template-columns:minmax(0,1.32fr) minmax(0,1fr) minmax(0,1fr);width:calc(100vw - 12px)}.appVersionBadge{font-size:10px;padding:5px 7px;gap:4px}}' +
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
    if(runtime.currentEnv && environments[runtime.currentEnv]){
      return runtime.currentEnv;
    }

    var hostname = String(location.hostname || '').toLowerCase();

    if(hostname.indexOf('script.google.com') >= 0){
      return 'gasDev';
    }

    if(hostname.indexOf('dev-skhps.jonaminz.com') >= 0){
      return 'webDev';
    }

    if(hostname.indexOf('skhps.jonaminz.com') >= 0){
      return 'webProd';
    }

    if(/[?&]appEnv=dev(?:&|#|$)/.test(location.search || '')){
      return 'gasDev';
    }

    return runtime.defaultEnv || 'webDev';
  }

  function buildTargetUrl(env){
    var url = String(env.url || '').trim();

    if(!url){
      return '#';
    }

    if(env.key === 'gasDev'){
      var gasUrl = appendParam(url, 'appEnv', 'dev');
      var page = getGasPageParam();

      if(page){
        gasUrl = appendParam(gasUrl, 'page', page);
      }

      return gasUrl + (location.hash || '');
    }

    return buildWebTargetUrl(url);
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

    if(path === '/' || path.indexOf('/macros/') >= 0){
      path = '/';
    }

    return origin.replace(/\/+$/, '') + path + (location.hash || '');
  }

  function getGasPageParam(){
    var path =
      String(location.pathname || '').toLowerCase();

    if(path.indexOf('dressingfront') >= 0){
      return 'dressingfront';
    }

    if(path.indexOf('dressinguse') >= 0){
      return 'dressinguse';
    }

    if(path.indexOf('dressingdict') >= 0){
      return 'dressingDict';
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

      item.className = 'appVersionBadge' + (isActive ? ' is-active' : '');
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', env.label + ' ' + normalizeVersion(env.version));

      if(!isActive){
        item.href = buildTargetUrl(env);
        item.target = '_top';

        item.addEventListener('click', function(event){
          if(key === 'webProd' && currentEnv !== 'webProd'){
            if(!global.confirm('即將前往正式版 skhps.jonaminz.com')){
              event.preventDefault();
            }
          }
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











