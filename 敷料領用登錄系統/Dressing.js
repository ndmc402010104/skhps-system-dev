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
    getAppEntryUrl();

  //調用版本號
  template.versionBadgeHtml =
    getVersionBadgeHtml();

  return template
    .evaluate()
    .setTitle(
      '敷料領用'
    );

}