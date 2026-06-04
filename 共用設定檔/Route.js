/*
========================================
Route.gs
負責頁面路由
========================================
*/

var APP_REQUEST_ENV =
  APP_DEFAULT_ENV;

var APP_SCRIPT_PAGE_ROUTES = [
  {
    keys:['signmeeting'],
    handler:function(e){ return showSignMeetingPage(e); }
  },
  {
    keys:['signqr'],
    handler:function(){ return showSignQRGeneratorPage(); }
  },
  {
    keys:['hospitalsignin'],
    handler:function(){ return showHospitalSignInPage(); }
  },
  {
    keys:['dressingfront'],
    handler:function(){ return showDressingFrontPage(); }
  },
  {
    keys:['dressinguse', 'dressingUse'],
    handler:function(){ return showDressingUsePage(); }
  },
  {
    keys:['dressingDict'],
    handler:function(){ return showDressingDictPage(); }
  },
  {
    keys:['uitest'],
    handler:function(){
      return HtmlService
        .createTemplateFromFile('共用設定檔/UI設定/99_文件/skh-ui-test-page')
        .evaluate()
        .setTitle('SKH UI 測試中心');
    }
  }
];

var GITHUB_PAGE_ROUTES = {
  home:'科室系統用戶端/FrontIndex.html',
  frontIndex:'科室系統用戶端/FrontIndex.html',
  signMeeting:'科室系統用戶端/SignMeeting.html',
  signQR:'科室系統用戶端/SignQRGenerator.html',
  hospitalSignIn:'科室系統用戶端/HospitalSignIn.html',
  dressingFront:'敷料領用登錄系統/DressingFront.html',
  dressingInventory:'敷料領用登錄系統/DressingFront.html#inventory',
  dressingUse:'敷料領用登錄系統/DressingUse.html',
  dressingDict:'敷料領用登錄系統/DressingFront.html#dressingDict',
  uiTest:'共用設定檔/UI設定/99_文件/skh-ui-test-page.html'
};

function doGet(e){

  if(
    e &&
    e.parameter &&
    isFrontendApiAction_(
      e.parameter.action
    )
  ){
    try{
      return apiOutput_(
        handleFrontendApiAction_(e.parameter) ||
        { ok:false, message:'unknown frontend action' },
        e.parameter.callback
      );
    }
    catch(error){
      return apiOutput_(
        {
          ok:false,
          message:error && error.message ? error.message : String(error)
        },
        e.parameter.callback
      );
    }
  }

  if(
    e &&
    e.parameter &&
    isDressingInventoryAction_(
      e.parameter.action
    )
  ){
    try{
      const result =
        handleDressingInventoryAction_(e.parameter);

      return apiOutput_(
        result || { ok:false, message:'unknown inventory action' },
        e.parameter.callback
      );
    }
    catch(error){
      return apiOutput_(
        {
          ok:false,
          message:error && error.message ? error.message : String(error)
        },
        e.parameter.callback
      );
    }
  }

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

  if(page === adminPageKey){
    return showAdminIndexPage();
  }

  if(
    page === 'meeting'
    ||
    page === adminPageKey + 'meeting'
  ){
    return showAdminMeetingPage();
  }

  const route =
    resolveAppScriptPageRoute_(
      page
    );

  if(route){
    return route.handler(e);
  }

  /*
  ========================================
  預設首頁
  ========================================
  */

  return showFrontIndex();

}

function resolveAppScriptPageRoute_(page){

  const routeKey =
    page || '';

  for(
    let i = 0;
    i < APP_SCRIPT_PAGE_ROUTES.length;
    i++
  ){
    const route =
      APP_SCRIPT_PAGE_ROUTES[i];

    if(
      route.keys.indexOf(
        routeKey
      ) >= 0
    ){
      return route;
    }
  }

  return null;

}

function getGithubPageRoutes(){

  return Object.assign(
    {},
    GITHUB_PAGE_ROUTES
  );

}

function getGithubPageRoutesJson(){

  return JSON.stringify(
    getGithubPageRoutes()
  );

}

function getUiTestPageContent(pageName) {
  try {
    return HtmlService.createTemplateFromFile(pageName).evaluate().getContent();
  } catch (e) {
    return '<h3>找不到測試頁面：</h3><p></p>';
  }
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

  if(
    isDressingInventoryAction_(action)
  ){
    try{
      const data =
        JSON.parse(
          e &&
          e.postData &&
          e.postData.contents
          ? e.postData.contents
          : '{}'
        );

      return jsonOutput_(
        handleDressingInventoryAction_(data) ||
        { ok:false, message:'unknown inventory action' }
      );
    }
    catch(error){
      return jsonOutput_({
        ok:false,
        message:error && error.message ? error.message : String(error)
      });
    }
  }

  return jsonOutput_({
    ok:false,
    message:'unknown post action'
  });

}

function isDressingBarcodeAction_(action){

  return [
    'lookupDressingBarcode',
    'findDressingPairCandidates',
    'saveDressingBarcode',
    'listDressingBarcode',
    'reorderDressingBarcode',
    'deleteDressingBarcode',
    'ping',
    'whoami'
  ].indexOf(action || '') >= 0;

}

function isDressingInventoryAction_(action){

  return [
    'listDressingInventory',
    'addDressingInventoryStock',
    'updateDressingInventoryLotMetadata',
    'lookupDressingInventoryBarcode',
    'submitDressingUse'
  ].indexOf(action || '') >= 0;

}

function isFrontendApiAction_(action){

  return [
    'getFrontendBootstrap',
    'getHospitalSignInLists',
    'getSignQRMeetingOptions'
  ].indexOf(action || '') >= 0;

}

function handleFrontendApiAction_(params){

  params = params || {};
  const action =
    String(params.action || '').trim();

  if(action === 'getFrontendBootstrap'){
    return {
      ok:true,
      appEntryUrl:getAppEntryUrl(),
      appProdUrl:APP_ENTRY_URL,
      appDevUrl:APP_DEV_URL,
      appEnv:APP_REQUEST_ENV === 'dev' ? 'dev' : 'prod',
      githubRoutes:getGithubPageRoutes()
    };
  }

  if(action === 'getHospitalSignInLists'){
    return {
      ok:true,
      staffList:getDefaultStaffList(),
      extraList:EXTRA_HOSPITAL_LOGIN
    };
  }

  if(action === 'getSignQRMeetingOptions'){
    return {
      ok:true,
      options:getSignQRMeetingOptions()
    };
  }

  return null;

}


/*
========================================
敷料頁面
========================================
*/

function showDressingUsePage(){

  const template =
    HtmlService.createTemplateFromFile(
      '敷料領用登錄系統/DressingUse'
    );

  template.appEntryUrl =
    getAppEntryUrl();

  template.appProdUrl =
    APP_ENTRY_URL;

  template.versionBadgeHtml =
    getVersionBadgeHtml();

  return template
    .evaluate()
    .setTitle('敷料領用');

}


function showDressingDictPage(){

  const template =
    HtmlService.createTemplateFromFile(
      '敷料領用登錄系統/敷料建檔/DressingDict'
    );

  template.appEntryUrl =
    getAppEntryUrl();

  template.versionBadgeHtml =
    getVersionBadgeHtml();

  return template
    .evaluate()
    .setTitle('敷料建檔');

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

  const currentEnv =
    APP_REQUEST_ENV === 'dev'
    ? 'dev'
    : 'prod';

  const targetEnv =
    currentEnv === 'dev'
    ? 'prod'
    : 'dev';

  const targetUrl =
    targetEnv === 'dev'
    ? APP_DEV_URL
    : APP_ENTRY_URL;

  const currentLabel =
    currentEnv === 'dev'
    ? '測試版'
    : '正式版';

  const targetTitle =
    currentEnv === 'dev'
    ? '切換到正式版'
    : '切換到目前測試版';

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
      targetUrl,
      targetEnv
    ),
    '" target="_top" data-dev-url="',
    APP_DEV_URL,
    '" data-prod-url="',
    APP_ENTRY_URL,
    '" data-version="',
    APP_VERSION,
    '" data-default-env="',
    APP_DEFAULT_ENV,
    '" title="',
    targetTitle,
    '">',
    '<span class="appVersionBadgeMode" data-version-mode>',
    currentLabel,
    '</span>',
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
