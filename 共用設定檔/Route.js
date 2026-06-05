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
  },
  {
    keys:['hisconnect'],
    handler:function(){ return showHisConnectPage(); }
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
  uiTest:'共用設定檔/UI設定/99_文件/skh-ui-test-page.html',
  hisConnect:'HisConnect/HisConnectPage.html'
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

  if(
    isHisBridgeAction_(action)
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
        handleHisBridgeAction_(data) ||
        { ok:false, message:'unknown HIS bridge action' }
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
    'getSignQRMeetingOptions',
    'buildHisBridge',
    'buildHisExcelBridge'
  ].indexOf(action || '') >= 0;

}

function isHisBridgeAction_(action){

  return [
    'buildHisBridge',
    'buildHisExcelBridge'
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
    return getHospitalSignInLists();
  }

  if(action === 'getSignQRMeetingOptions'){
    return {
      ok:true,
      options:getSignQRMeetingOptions()
    };
  }

  if(isHisBridgeAction_(action)){
    return handleHisBridgeAction_(params);
  }

  return null;

}

function handleHisBridgeAction_(params){

  params = params || {};
  const action =
    String(params.action || '').trim();

  let payload =
    params.payload || {};

  if(typeof payload === 'string'){
    try{
      payload = JSON.parse(payload || '{}');
    }
    catch(error){
      payload = {};
    }
  }

  if(action === 'buildHisExcelBridge'){
    return buildHisExcelBridge(payload);
  }

  if(action === 'buildHisBridge'){
    return buildHisBridge(payload);
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
    ? 'gasDev'
    : 'webProd';

  return [
    '<style>',
    '.appVersionFooter{',
    'position:fixed;',
    'left:0;',
    'right:0;',
    'bottom:0;',
    'z-index:10000;',
    'min-height:42px;',
    'display:flex;',
    'align-items:center;',
    'justify-content:center;',
    'padding:6px 12px;',
    'box-sizing:border-box;',
    'background:rgba(248,251,255,.94);',
    'border-top:1px solid rgba(148,163,184,.38);',
    'box-shadow:0 -8px 24px rgba(15,23,42,.08);',
    'backdrop-filter:blur(10px);',
    '}',
    '.appVersionSegment{',
    'display:grid;',
    'grid-template-columns:repeat(3,minmax(0,1fr));',
    'gap:4px;',
    'width:min(1120px,calc(100vw - 24px));',
    'min-width:0;',
    'padding:3px;',
    'border:1px solid rgba(148,163,184,.38);',
    'border-radius:999px;',
    'background:rgba(226,232,240,.65);',
    '}',
    '.appVersionBadge{',
    'display:flex;',
    'align-items:center;',
    'justify-content:center;',
    'flex-wrap:nowrap;',
    'gap:7px;',
    'min-width:0;',
    'min-height:28px;',
    'font-size:11px;',
    'line-height:1.1;',
    'text-decoration:none;',
    'color:#475569;',
    'background:transparent;',
    'border:1px solid transparent;',
    'border-radius:999px;',
    'padding:5px 12px;',
    'cursor:pointer;',
    'user-select:none;',
    'transition:color .16s ease,border-color .16s ease,background-color .16s ease,box-shadow .16s ease;',
    '}',
    '.appVersionBadge:hover{',
    'color:#1d4ed8;',
    'border-color:rgba(37,99,235,.25);',
    'background:rgba(255,255,255,.78);',
    '}',
    '.appVersionBadge.is-active{',
    'color:#ffffff;',
    'background:linear-gradient(135deg,#2563eb,#0f766e);',
    'border-color:transparent;',
    'box-shadow:0 8px 18px rgba(37,99,235,.20);',
    'cursor:default;',
    '}',
    '.appVersionBadgeMode{',
    'flex:0 0 auto;',
    'font-weight:900;',
    'overflow:hidden;',
    'text-overflow:ellipsis;',
    '}',
    '.appVersionText{',
    'flex:0 1 auto;',
    'font-weight:800;',
    'opacity:.9;',
    'overflow:hidden;',
    'text-overflow:ellipsis;',
    '}',
    '.appVersionBadgeSource{',
    'position:absolute;',
    'right:14px;',
    'bottom:3px;',
    'max-width:min(38vw,420px);',
    'box-sizing:border-box;',
    'font-size:11px;',
    'line-height:1;',
    'font-weight:800;',
    'color:#64748b;',
    'text-align:right;',
    'white-space:nowrap;',
    'overflow:hidden;',
    'text-overflow:ellipsis;',
    'transition:color .16s ease;',
    '}',
    '.appVersionBadge:hover .appVersionBadgeSource{',
    'color:#1d4ed8;',
    '}',
    '@media(max-width:820px){',
    '.appVersionSegment{',
    'width:calc(100vw - 12px);',
    '}',
    '.appVersionBadge{',
    'font-size:10px;',
    'padding:5px 7px;',
    'gap:4px;',
    '}',
    '.appVersionBadgeSource{',
    'right:8px;',
    'bottom:2px;',
    'max-width:calc(100vw - 16px);',
    'font-size:10px;',
    '}',
    '}',
    '@media(max-width:600px){',
    '.appVersionFooter{',
    'min-height:38px;',
    'padding:4px 4px;',
    '}',
    '.appVersionSegment{',
    'gap:2px;',
    'padding:2px;',
    'width:calc(100vw - 8px);',
    '}',
    '.appVersionBadge{',
    'font-size:8.5px;',
    'padding:4px 4px;',
    'gap:3px;',
    '}',
    '.appVersionBadgeSource{',
    'font-size:8.5px;',
    '}',
    '}',
    '</style>',
    '<script>',
    'function skhBuildFooterWebTarget_(origin){',
    'var routes={',
    'signmeeting:"科室系統用戶端/SignMeeting.html",',
    'signqr:"科室系統用戶端/SignQRGenerator.html",',
    'hospitalsignin:"科室系統用戶端/HospitalSignIn.html",',
    'dressingfront:"敷料領用登錄系統/DressingFront.html",',
    'dressinguse:"敷料領用登錄系統/DressingUse.html",',
    'dressingdict:"敷料領用登錄系統/DressingFront.html#dressingDict",',
    'uitest:"共用設定檔/UI設定/99_文件/skh-ui-test-page.html"',
    '};',
    'var params=new URLSearchParams(location.search||"");',
    'var page=String(params.get("page")||"").toLowerCase();',
    'var path=routes[page]||"科室系統用戶端/FrontIndex.html";',
    'params.delete("page");',
    'params.delete("appEnv");',
    'var hash="";',
    'var hashIndex=path.indexOf("#");',
    'if(hashIndex>=0){hash=path.slice(hashIndex);path=path.slice(0,hashIndex);}',
    'var query=params.toString();',
    'return String(origin||"").replace(/\\/+$/,"")+"/"+path+(query?"?"+query:"")+(hash||location.hash||"");',
    '}',
    'function skhNavigateFooterWebTarget_(origin){',
    'location.href=skhBuildFooterWebTarget_(origin);',
    'return false;',
    '}',
    '</script>',
    '<div class="appVersionFooter" data-app-footer="1">',
    '<div class="appVersionSegment" role="list">',
    getEnvironmentFooterItemHtml_(
      'gasDev',
      'app script測試版',
      getAppEnvUrl(APP_DEV_URL, 'dev'),
      SKH_GAS_DEV_VERSION,
      currentEnv,
      ''
    ),
    getEnvironmentFooterItemHtml_(
      'webDev',
      '測試版',
      'https://dev-skhps.jonaminz.com',
      SKH_WEB_DEV_VERSION,
      currentEnv,
      'return skhNavigateFooterWebTarget_("https://dev-skhps.jonaminz.com");'
    ),
    getEnvironmentFooterItemHtml_(
      'webProd',
      '正式版',
      'https://skhps.jonaminz.com',
      SKH_WEB_PROD_VERSION,
      currentEnv,
      'return skhNavigateFooterWebTarget_("https://skhps.jonaminz.com");'
    ),
    '</div>',
    calendarSourceHtml,
    '</div>'
  ].join('');

}

function getEnvironmentFooterItemHtml_(key, label, url, version, currentEnv, onclick){
  const active =
    key === currentEnv;

  const tag =
    active
    ? 'span'
    : 'a';

  const versionText =
    String(version || '').match(/^v/i)
    ? String(version || '')
    : 'v' + String(version || '');

  return [
    '<',
    tag,
    ' class="appVersionBadge',
    active ? ' is-active' : '',
    '" role="listitem"',
    active ? '' : ' href="' + escapeAppHtml(url) + '" target="_top"',
    onclick && !active ? ' onclick="' + escapeAppHtml(onclick) + '"' : '',
    ' aria-label="',
    escapeAppHtml(label + ' ' + versionText),
    '">',
    '<span class="appVersionBadgeMode">',
    escapeAppHtml(label),
    '</span>',
    '<span class="appVersionText">',
    escapeAppHtml(versionText),
    '</span>',
    '</',
    tag,
    '>'
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
