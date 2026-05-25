/*
========================================
Route.gs
負責頁面路由
========================================
*/

function doGet(e){

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
  會議管理後台
  ========================================
  */

  if(
    page ===
    adminPageKey + 'meeting'
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


// 從 html 調用其他 html/script
function include(filename){

  return HtmlService
    .createHtmlOutputFromFile(
      filename
    )
    .getContent();

}


function getVersionBadgeHtml(){

  return [
    '<style>',
    '.appVersionBadge{',
    'position:fixed;',
    'right:12px;',
    'bottom:10px;',
    'z-index:9999;',
    'font-size:11px;',
    'line-height:1;',
    'color:#6b7280;',
    'background:rgba(255,255,255,.82);',
    'border:1px solid rgba(148,163,184,.45);',
    'border-radius:6px;',
    'padding:6px 8px;',
    'box-shadow:0 2px 10px rgba(15,23,42,.08);',
    'pointer-events:none;',
    '}',
    '@media(max-width:600px){',
    '.appVersionBadge{',
    'right:8px;',
    'bottom:8px;',
    'font-size:10px;',
    'padding:5px 7px;',
    '}',
    '}',
    '</style>',
    '<div class="appVersionBadge">version ',
    APP_VERSION,
    '</div>'
  ].join('');

}
