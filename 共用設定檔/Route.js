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

  return getSharedEnvironmentFooterHtml_(showCalendarSource);
}

function getSharedEnvironmentFooterHtml_(showCalendarSource){
  const footerEnv =
    APP_REQUEST_ENV === 'dev'
    ? 'gasDev'
    : 'webProd';

  const footerMode =
    APP_REQUEST_ENV === 'dev'
    ? 'gas'
    : 'github';

  const footerScriptUrl =
    (
      APP_REQUEST_ENV === 'dev'
        ? 'https://dev-skhps.jonaminz.com'
        : 'https://skhps.jonaminz.com'
    ) +
    '/%E5%85%B1%E7%94%A8%E8%A8%AD%E5%AE%9A%E6%AA%94/EnvironmentFooter.js?v=' +
    encodeURIComponent(APP_VERSION || '');

  const calendarSourceScript =
    showCalendarSource
    ? [
        '<script>',
        'window.SKH_CALENDAR_SOURCE_LABEL=',
        JSON.stringify(getCalendarSourceLabel()),
        ';',
        '</script>'
      ].join('')
    : '';

  return [
    calendarSourceScript,
    '<script>',
    'window.SKH_ENVIRONMENTS=Object.assign({},window.SKH_ENVIRONMENTS||{},',
    JSON.stringify({
      gasDev:{
        key:'gasDev',
        label:'app script測試版',
        shortLabel:'AS 測試',
        url:APP_DEV_URL,
        apiUrl:APP_DEV_URL,
        version:SKH_GAS_DEV_VERSION,
        type:'gas'
      },
      webDev:{
        key:'webDev',
        label:'測試版',
        shortLabel:'測試版',
        url:'https://dev-skhps.jonaminz.com',
        apiUrl:APP_DEV_URL,
        version:SKH_WEB_DEV_VERSION,
        type:'web'
      },
      webProd:{
        key:'webProd',
        label:'正式版',
        shortLabel:'正式版',
        url:'https://skhps.jonaminz.com',
        apiUrl:APP_ENTRY_URL,
        version:SKH_WEB_PROD_VERSION,
        type:'web'
      }
    }),
    ');',
    '</script>',
    '<script>',
    'window.SKH_RUNTIME=Object.assign({},window.SKH_RUNTIME||{},',
    JSON.stringify({
      currentEnv: footerEnv,
      defaultEnv: footerEnv,
      env: APP_REQUEST_ENV,
      mode: footerMode,
      version: APP_VERSION
    }),
    ');',
    '</script>',
    '<script src="',
    escapeAppHtml(footerScriptUrl),
    '" data-skh-environment-footer-script="true" data-skh-environment-footer="1" defer></script>'
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
