/*
檔案位置：科室系統用戶端/QR.js
時間戳記：2026-06-04 19:41 UTC+8
用途：負責簽到 QR 頁面載入與會議清單 option 產生；修正 Apps Script template evaluate 與 GitHub / Apps Script 雙模式載入。
========================================
QR.gs / QR.js
負責簽到 QR 功能
包含：
- QR 頁面顯示
- 課程清單取得
- QR 會議 option 資料組裝
========================================
*/

function showSignQRGeneratorPage() {
  var template;
  var output;

  template = HtmlService.createTemplateFromFile('科室系統用戶端/SignQRGenerator');

  /*
   * 不在 render 前同步讀 Calendar。
   * 頁面先開，會議清單交給 SignQRGenerator.html：
   * - Apps Script 版用 google.script.run 讀 getSignQRMeetingOptions()
   * - 測試版用 JSONP API 讀 action=getSignQRMeetingOptions
   */
  template.options = '<option value="">會議清單載入中...</option>';
  template.appEntryUrl = getAppEntryUrlSafeForQR_();

  output = template.evaluate();
  output.setTitle('Sign QR Generator');

  return output;
}

function getAppEntryUrlSafeForQR_() {
  try {
    if (typeof getAppEntryUrl === 'function') {
      return getAppEntryUrl();
    }
  } catch (error) {
    Logger.log('getAppEntryUrlSafeForQR_ failed: ' + error);
  }

  return '';
}

function getSignQRMeetingOptions() {
  var now;
  var first;
  var last;
  var events;
  var options;

  now = new Date();

  first = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  first.setDate(
    first.getDate() - QR_EVENT_LOOKBACK_DAYS
  );

  last = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  last.setDate(
    last.getDate() + QR_EVENT_LOOKAHEAD_DAYS
  );

  events = getConfiguredCalendarEvents(
    first,
    last
  );

  events.sort(function(a, b) {
    return b.getStartTime() - a.getStartTime();
  });

  options = '';

  events.forEach(function(event) {
    var title;
    var date;
    var start;
    var end;
    var tokenCourse;
    var time;
    var startWindow;
    var endWindow;
    var isRunning;
    var displayTime;
    var token;
    var selectedText;
    var optionValue;
    var optionLabel;

    title = event.getTitle();

    date = Utilities.formatDate(
      event.getStartTime(),
      Session.getScriptTimeZone(),
      'M/d'
    );

    start = Utilities.formatDate(
      event.getStartTime(),
      Session.getScriptTimeZone(),
      'H:mm'
    );

    end = Utilities.formatDate(
      event.getEndTime(),
      Session.getScriptTimeZone(),
      'H:mm'
    );

    tokenCourse = date + ' ' + title;
    time = start + '-' + end;

    startWindow = new Date(
      event.getStartTime().getTime() -
      MEETING_RUNNING_BEFORE_MIN * 60000
    );

    endWindow = new Date(
      event.getEndTime().getTime() +
      MEETING_RUNNING_AFTER_MIN * 60000
    );

    isRunning =
      now >= startWindow &&
      now <= endWindow;

    displayTime =
      time +
      (
        isRunning
          ? '〈簽到開放中〉'
          : ''
      );

    token = generateSignToken(
      tokenCourse,
      time
    );

    selectedText =
      isRunning
        ? ' selected'
        : '';

    optionValue =
      encodeURIComponent(
        tokenCourse +
        '||' +
        time +
        '||' +
        token
      );

    optionLabel =
      escapeHtmlForQROption_(tokenCourse) +
      '｜' +
      escapeHtmlForQROption_(displayTime);

    options +=
      '<option' +
      selectedText +
      ' value="' +
      optionValue +
      '">' +
      optionLabel +
      '</option>';
  });

  if (!options) {
    options = '<option value="">目前沒有可用會議</option>';
  }

  return options;
}

function escapeHtmlForQROption_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

