/*
========================================
Admin.gs
管理所有後台使用的程式
========================================
*/

//進到Route.gs查詢管理後台位置
function showAdminIndexPage(){

  const template =
  HtmlService.createTemplateFromFile(
  ADMIN_INDEX_PAGE_NAME
  );

  template.appEntryUrl =
  getAppEntryUrl();

  template.adminPageKey =
  ADMIN_PAGE_PREFIX
  +
  ADMIN_ACCOUNT
  +
  ADMIN_PASSWORD;

  return template
  .evaluate()
  .setTitle(
  getAppPageTitle(
  '管理後台'
  )
  );

}


//進到Route.gs查詢會議管理位置
function showAdminMeetingPage(){

  const template =
  HtmlService.createTemplateFromFile(
  ADMIN_MEETING_PAGE_NAME
  );

  template.appEntryUrl =
  getAppEntryUrl();

  template.adminPageKey =
  ADMIN_PAGE_PREFIX
  +
  ADMIN_ACCOUNT
  +
  ADMIN_PASSWORD;

  return template
  .evaluate()
  .setTitle(
  getAppPageTitle(
  '會議管理'
  )
  );

}
