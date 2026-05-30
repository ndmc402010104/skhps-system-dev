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

  if(page === 'dressingfront'){
    return showDressingFrontPage();
  }

  /*
  ========================================
  敷料領用
  ========================================
  */

  if(page === 'dressingUse'){
    return showDressingUsePage();
  }

  /*
  ========================================
  敷料建檔
  ========================================
  */

  if(page === 'dressingDict'){
    return showDressingDictPage();
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
    'findDressingPairCandidates',
    'saveDressingBarcode',
    'listDressingBarcode',
    'reorderDressingBarcode',
    'deleteDressingBarcode',
    'ping',
    'whoami'
  ].indexOf(action || '') >= 0;

}

/*
========================================
敷料頁面
========================================
*/

function showDressingUsePage(){

  const template =
    HtmlService.createTemplateFromFile(
      '敷料領用登錄系統/敷料領用/DressingUse'
    );

  template.appEntryUrl =
    getAppEntryUrl();

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