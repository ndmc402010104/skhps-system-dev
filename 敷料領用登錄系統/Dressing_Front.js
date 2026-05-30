/*
========================================
敷料領用系統
首頁
========================================
*/

function showDressingFrontPage(){

  const template =
    HtmlService
      .createTemplateFromFile(
        '敷料領用登錄系統/DressingFront'
      );

  template.appEntryUrl =
    APP_REQUEST_ENV === 'dev'
      ? APP_DEV_URL
      : APP_ENTRY_URL;

  template.versionBadgeHtml =
    getVersionBadgeHtml();

  return template
    .evaluate()
    .setTitle(
      '敷料領用登錄系統'
    );

}