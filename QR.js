/*
========================================
QR.gs
負責簽到 QR 功能
包含：
- 課程清單取得
- 驗證碼建立
- QR 資料組裝
- QR 頁面顯示
========================================
*/

//進到Route.gs查詢會議 QR 產生位置，開啟getSignQRMeetingOptions()
function showSignQRGeneratorPage(){

  const template =
    HtmlService.createTemplateFromFile(
      QR_PAGE_NAME
    );

  template.options =
    //進網頁先跑QR.gs裡面的這個函數
    getSignQRMeetingOptions();

  template.appEntryUrl =
    APP_ENTRY_URL;

  return template
    .evaluate()
    .setTitle(
      getAppPageTitle(
        '會議 QR 產生'
      )
    );

}

//叫出calendar裡面前後Config.gs裡面設定的天數的會議
function getSignQRMeetingOptions() {

  const calendar =
    CalendarApp
      .getCalendarsByName(
        CALENDAR_NAME
      )[0];

  if (!calendar) {
    return '';
  }

  const now =
    new Date();

  const first =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  first.setDate(
    first.getDate()
    -
    QR_EVENT_LOOKBACK_DAYS
  );

  const last =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  last.setDate(
    last.getDate()
    +
    QR_EVENT_LOOKAHEAD_DAYS
  );

  const events =
    calendar.getEvents(
      first,
      last
    );

  events.sort(function(a,b){

    return b.getStartTime() - a.getStartTime();

  });

  let options =
    '';

  events.forEach(function(event) {

    const title =
      event.getTitle();

    const date =
      Utilities.formatDate(
        event.getStartTime(),
        Session.getScriptTimeZone(),
        'M/d'
      );

    const start =
      Utilities.formatDate(
        event.getStartTime(),
        Session.getScriptTimeZone(),
        'H:mm'
      );

    const end =
      Utilities.formatDate(
        event.getEndTime(),
        Session.getScriptTimeZone(),
        'H:mm'
      );

    const tokenCourse =
      date +
      ' ' +
      title;

    const time =
      start +
      '-' +
      end;

    const startWindow =
    new Date(
    event.getStartTime()
    .getTime()
    -
    MEETING_RUNNING_BEFORE_MIN
    *
    60000
    );

    const endWindow =
    new Date(
    event.getEndTime()
    .getTime()
    +
    MEETING_RUNNING_AFTER_MIN
    *
    60000
    );

    const isRunning =
    now >= startWindow
    &&
    now <= endWindow;

    const displayTime =
      time +
      (
        isRunning
        ? (
          '〈簽到開放中〉'
        )
        : ''
      );

    const token =
      generateSignToken(
        tokenCourse,
        time
      );

    options +=
      '<option ' +
      (
        isRunning
        ? 'selected '
        : ''
      ) +
      'value="' +
      encodeURIComponent(
        tokenCourse +
        '||' +
        time +
        '||' +
        token
      ) +
      '">' +
      tokenCourse +
      '｜' +
      displayTime +
      '</option>';

  });

  return options;

}
