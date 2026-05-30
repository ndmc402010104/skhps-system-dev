/*
========================================
Route.gs
負責頁面路由
========================================
*/

var APP_REQUEST_ENV =
  APP_DEFAULT_ENV;

function doGet(e){

  if(
    e &&
    e.parameter &&
    isDressingBarcodeAction_(
      e.parameter.action
    )
  ){
    return handleDressingBarcodeGet(e);
  }

  APP_REQUEST_ENV =
    e &&
    e.parameter &&
    (
      e.parameter.appEnv === 'dev'
      ||
      e.parameter.appEnv === 'prod'
    )
    ? e.parameter.appEnv
    : APP_DEFAULT_ENV;

  let page = '';

  if(
    e &&
    e.parameter &&
    e.parameter.page
  ){
    page =
      e.parameter.page;
  }

  const adminPageKey =
    ADMIN_PAGE_PREFIX +
    ADMIN_ACCOUNT +
    ADMIN_PASSWORD;


  /*
  ========================================
  會議簽到
  ========================================
  */

  if(page === 'signmeeting'){
    return showSignMeetingPage(e);
  }


  /*
  ========================================
  QR產生
  ========================================
  */

  if(page === 'signqr'){
    return showSignQRGeneratorPage();
  }


  /*
  ========================================
  醫院系統登入
  ========================================
  */

  if(page === 'hospitalsignin'){
    return showHospitalSignInPage();
  }


  /*
  ========================================
  後台首頁
  ========================================
  */

  if(page === adminPageKey){
    return showAdminIndexPage();
  }


  /*
  ========================================
  敷料首頁
  ========================================
  */

  if(
    page ===
    'dressingfront'
  ){
    return showDressingFrontPage();
  }

    /*
  ========================================
  會議管理後台
  ========================================
  */

  if(
    page === 'meeting'
    ||
    page === adminPageKey + 'meeting'
  ){
    return showAdminMeetingPage();
  }

  //CSS模組化分支多出來的按鈕
  if (page === 'uitest') {
    return HtmlService.createTemplateFromFile('skh-ui-test-page')
      .evaluate()
      .setTitle('SKH UI 測試中心');
  }

  /*
  ========================================
  預設首頁
  ========================================
  */

  return showFrontIndex();

}

function doPost(e){

  let action = '';

  try{
    const data =
      JSON.parse(
        e &&
        e.postData &&
        e.postData.contents
        ? e.postData.contents
        : '{}'
      );

    action =
      data.action || '';
  }
  catch(error){
    action = '';
  }

  if(
    isDressingBarcodeAction_(action)
  ){
    return handleDressingBarcodePost(e);
  }

  return jsonOutput_({
    ok:false,
    message:'unknown post action'
  });

}

function isDressingBarcodeAction_(action){

  return [
    'lookupDressingBarcode',
    'saveDressingBarcode',
    'listDressingBarcode',
    'reorderDressingBarcode',
    'deleteDressingBarcode',
    'ping',
    'whoami'
  ].indexOf(action || '') >= 0;

}


// 從 html 調用其他 html/script
function include(filename, args){
  const template = HtmlService.createTemplateFromFile(filename);
  if(args){
    Object.assign(template, args);
  }
  return template.evaluate().getContent();
}


function getAppPageTitle(title){

  return title;

}


function getAppEntryUrl(){

  return APP_REQUEST_ENV === 'dev'
    ? APP_DEV_URL
    : APP_ENTRY_URL;

}


function getAppEnvUrl(url, env){

  const separator =
    url.indexOf('?') >= 0
    ? '&'
    : '?';

  return url +
    separator +
    'appEnv=' +
    env;

}


function getVersionBadgeHtml(options){

  const showCalendarSource =
    options === true ||
    (
      options &&
      options.showCalendarSource === true
    );

  const calendarSourceHtml =
    showCalendarSource
    ? [
        '<span class="appVersionBadgeSource">行事曆來源: ',
        escapeAppHtml(
          getCalendarSourceLabel()
        ),
        '</span>'
      ].join('')
    : '';

  return [
    '<style>',
    '.appVersionFooter{',
    'position:fixed;',
    'left:0;',
    'right:0;',
    'bottom:0;',
    'z-index:10000;',
    'height:42px;',
    'display:flex;',
    'align-items:center;',
    'justify-content:center;',
    'padding:0 16px;',
    'box-sizing:border-box;',
    'background:rgba(248,251,255,.94);',
    'border-top:1px solid rgba(148,163,184,.38);',
    'box-shadow:0 -8px 24px rgba(15,23,42,.08);',
    'backdrop-filter:blur(10px);',
    '}',
    '.appVersionBadge{',
    'display:inline-flex;',
    'align-items:center;',
    'gap:5px;',
    'font-size:11px;',
    'line-height:1.1;',
    'text-decoration:none;',
    'color:#475569;',
    'background:rgba(255,255,255,.72);',
    'border:1px solid rgba(148,163,184,.45);',
    'border-radius:8px;',
    'padding:6px 8px;',
    'max-width:100%;',
    'cursor:pointer;',
    'user-select:none;',
    'transition:color .16s ease,border-color .16s ease,background-color .16s ease,box-shadow .16s ease;',
    '}',
    '.appVersionBadge:hover{',
    'color:#1d4ed8;',
    'border-color:rgba(37,99,235,.45);',
    'background:rgba(255,255,255,.94);',
    '}',
    '.appVersionBadgeMode{',
    'font-weight:700;',
    '}',
    '.appVersionBadgeSource{',
    'font-weight:600;',
    'color:#64748b;',
    'transition:color .16s ease;',
    '}',
    '.appVersionBadge:hover .appVersionBadgeSource{',
    'color:#1d4ed8;',
    '}',
    '@media(max-width:600px){',
    '.appVersionFooter{',
    'height:38px;',
    '}',
    '.appVersionBadge{',
    'font-size:10px;',
    'padding:5px 7px;',
    '}',
    '}',
    '</style>',
    '<div class="appVersionFooter">',
    '<a class="appVersionBadge" href="',
    getAppEnvUrl(
      APP_DEV_URL,
      'dev'
    ),
    '" target="_top" data-dev-url="',
    APP_DEV_URL,
    '" data-prod-url="',
    APP_ENTRY_URL,
    '" data-version="',
    APP_VERSION,
    '" data-default-env="',
    APP_DEFAULT_ENV,
    '" title="切換到目前測試版">',
    '<span class="appVersionBadgeMode" data-version-mode>正式版</span>',
    '<span>v',
    APP_VERSION,
    '</span>',
    calendarSourceHtml,
    '</a>',
    '</div>',
    '<script>',
    '(function(){',
    'var badge=document.querySelector(".appVersionBadge");',
    'if(!badge){return;}',
    'var mode=badge.querySelector("[data-version-mode]");',
    'var devUrl=badge.getAttribute("data-dev-url");',
    'var prodUrl=badge.getAttribute("data-prod-url");',
    'var version=badge.getAttribute("data-version");',
    'var defaultEnv=badge.getAttribute("data-default-env")||"prod";',
    'var baseTitle=document.title.replace(/\\s*\\[(正式版|測試版) v\\.\\d{12}\\]\\s*$/,"");',
    'var appLocation=null;',
    'var sources=[window.location.href,document.referrer||""];',
    'try{sources.push(window.top.location.href);}catch(error){}',
    'function readEnvFromText(text){',
    'if(/[?&]appEnv=dev(?:&|#|$)/.test(text)||/\\/dev(?:[?#]|$)/.test(text)){return "dev";}',
    'if(/[?&]appEnv=prod(?:&|#|$)/.test(text)||/\\/exec(?:[?#]|$)/.test(text)){return "prod";}',
    'return "";',
    '}',
    'function detectEnv(){',
    'for(var i=0;i<sources.length;i++){',
    'var env=readEnvFromText(sources[i]||"");',
    'if(env){return env;}',
    '}',
    'return defaultEnv;',
    '}',
    'function setMode(env){',
    'var isDev=env==="dev";',
    'var label=isDev?"測試版":"正式版";',
    'if(mode){mode.textContent=label;}',
    'badge.href=buildTargetUrl(isDev?prodUrl:devUrl,getAppQuery(),isDev?"prod":"dev",window.location.hash||"");',
    'badge.title=isDev?"切換到正式版":"切換到目前測試版";',
    'document.title=baseTitle;',
    'badge.setAttribute("data-current-env",env);',
    '}',
    'function buildTargetUrl(baseUrl,query,env,hash){',
    'var hashIndex=baseUrl.indexOf("#");',
    'var baseHash=hashIndex>=0?baseUrl.slice(hashIndex):"";',
    'var baseNoHash=hashIndex>=0?baseUrl.slice(0,hashIndex):baseUrl;',
    'var queryIndex=baseNoHash.indexOf("?");',
    'var path=queryIndex>=0?baseNoHash.slice(0,queryIndex):baseNoHash;',
    'var params=new URLSearchParams(queryIndex>=0?baseNoHash.slice(queryIndex+1):"");',
    'var current=new URLSearchParams((query||"").replace(/^\\?/,""));',
    'current.forEach(function(value,key){',
    'if(key!=="appEnv"){params.set(key,value);}',
    '});',
    'params.set("appEnv",env);',
    'var text=params.toString();',
    'return path+(text?"?"+text:"")+(hash||baseHash||"");',
    '}',
    'function getAppQuery(){',
    'for(var i=0;i<sources.length;i++){',
    'var source=sources[i]||"";',
    'if(!/\\/(exec|dev)(?:[?#]|$)/.test(source)){continue;}',
    'var queryIndex=source.indexOf("?");',
    'if(queryIndex<0){continue;}',
    'var hashIndex=source.indexOf("#",queryIndex);',
    'return hashIndex>=0?source.slice(queryIndex,hashIndex):source.slice(queryIndex);',
    '}',
    'return getLocationQuery()||window.location.search||"";',
    '}',
    'function getLocationQuery(){',
    'if(!appLocation||!appLocation.parameters){return "";}',
    'var params=new URLSearchParams();',
    'Object.keys(appLocation.parameters).forEach(function(key){',
    'var values=appLocation.parameters[key]||[];',
    'values.forEach(function(value){params.append(key,value);});',
    '});',
    'var text=params.toString();',
    'return text?"?"+text:"";',
    '}',
    'setMode(detectEnv());',
    'if(window.google&&google.script&&google.script.url){',
    'google.script.url.getLocation(function(location){',
    'appLocation=location;',
    'var param=(location&&location.parameter)||{};',
    'if(param.appEnv==="dev"||param.appEnv==="prod"){setMode(param.appEnv);}',
    '});',
    '}',
    'badge.addEventListener("click",function(event){',
    'event.preventDefault();',
    'var currentEnv=badge.getAttribute("data-current-env")||detectEnv();',
    'var targetEnv=currentEnv==="dev"?"prod":"dev";',
    'var targetUrl=targetEnv==="dev"?devUrl:prodUrl;',
    'var query=getAppQuery()||getLocationQuery();',
    'var hash=window.location.hash||"";',
    'window.top.location.href=buildTargetUrl(targetUrl,query,targetEnv,hash);',
    '});',
    '})();',
    '</script>'
  ].join('');

}


function escapeAppHtml(value){

  return String(
    value || ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#39;'
    );

}
