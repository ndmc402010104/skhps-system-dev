/*
========================================
MeetingAdmin.gs
會議管理後台核心流程

負責：
① 準備指定會議的簽到單
② 設定簽到驗證目前會議
③ 重新整理原始資料與簽到單
④ 取得後台可選會議清單

會議來源：
- 表單回覆 1：已有人簽到的會議
- 後台人員狀態設定：已提前補登 / 請假的會議
- Google Calendar：未來 14 天尚未產生紀錄的會議

注意：
簽到驗證 A2 已改為程式控制欄位
不可再依賴 Google Sheet 的資料驗證下拉
========================================
*/


/*
========================================
準備簽到單

流程：
① 產生 / 更新原始資料
② 找到會議年份
③ 寫入簽到驗證 A2
④ 更新簽到單補人區
========================================
*/

function prepareSignSheet(course, date){

  copyRawData(
    course,
    date
  );

  const year =
    findMeetingYear(
      course,
      date
    );

  const verifyCourse =
    year +
    '/' +
    course;

  setVerifyMeetingValue(
    verifyCourse
  );

  addExtraPeopleToMeetingSignSheet();

  SpreadsheetApp.flush();

  return true;

}


/*
========================================
直接設定目前會議

目前較少使用
保留給舊流程或手動流程呼叫
========================================
*/

function setMeeting(course, date){

  setVerifyMeetingValue(
    course
  );

  SpreadsheetApp.flush();

  return true;

}


/*
========================================
設定簽到驗證 A2

用途：
統一管理「簽到驗證」目前會議

流程：
① 清除 A2 資料驗證
② 寫入目前會議

原因：
A2 現在由後台程式控制
未來會議可能尚未出現在下拉清單
如果保留資料驗證，setValue 會失敗
========================================
*/

function setVerifyMeetingValue(value){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const verifySheet =
    ss.getSheetByName(
      VERIFY_SHEET_NAME
    );

  const cell =
    verifySheet.getRange(
      'A2'
    );

  cell.clearDataValidations();

  cell.setValue(
    value
  );

}


/*
========================================
重新整理會議輸出

會更新：
- 原始資料
- 會議簽到單補人區
========================================
*/

function refreshMeetingOutput(course, date){

  copyRawData(
    course,
    date
  );

  addExtraPeopleToMeetingSignSheet();

  SpreadsheetApp.flush();

  return true;

}


/*
========================================
取得後台會議清單

來源順序：
① 表單回覆 1
② 後台人員狀態設定
③ 未來 14 天 Google Calendar

判斷邏輯：
表單或後台已有資料
→ 視為已有紀錄

Calendar 有會議但前兩者都沒有
→ 顯示「未產生紀錄」
========================================
*/

function getMeetingList(){

  const meetingMap =
    {};

  addResponseMeetingsToMap(
    meetingMap
  );

  addBackendStatusMeetingsToMap(
    meetingMap
  );

  addUpcomingCalendarMeetingsToMap(
    meetingMap
  );

  return Object
    .values(
      meetingMap
    )
    .sort(function(a,b){

      return b.sortTime - a.sortTime;

    });

}


/*
========================================
加入表單回覆中的會議

用途：
列出已有人簽到過的會議
========================================
*/

function addResponseMeetingsToMap(meetingMap){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const responseSheet =
    ss.getSheetByName(
      RESPONSE_SHEET_NAME
    );

  const values =
    responseSheet
      .getDataRange()
      .getValues();

  const range =
    getMeetingSearchDateRange();

  values
    .slice(1)
    .forEach(function(row){

      const item =
        buildMeetingListItemFromResponseRow(
          row,
          range
        );

      if(!item){
        return;
      }

      meetingMap[
        item.key
      ] =
        item;

    });

}


/*
========================================
加入後台人員狀態設定中的會議

用途：
讓提前補登 / 請假的會議也被視為已有紀錄

例如：
還沒有人簽到
但已經先幫某人設定請假
這場會議不應顯示「未產生紀錄」
========================================
*/

function addBackendStatusMeetingsToMap(meetingMap){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const backendSheet =
    ss.getSheetByName(
      BACKEND_STATUS_SHEET_NAME
    );

  if(
    !backendSheet ||
    backendSheet.getLastRow() < 2
  ){
    return;
  }

  const values =
    backendSheet
      .getRange(
        2,
        1,
        backendSheet.getLastRow() - 1,
        9
      )
      .getValues();

  values.forEach(function(row){

    const timestamp =
      row[0];

    const course =
      String(row[1] || '').trim();

    const date =
      String(row[2] || '').trim();

    if(
      !course ||
      !date
    ){
      return;
    }

    const key =
      buildMeetingKey(
        course,
        date
      );

    meetingMap[key] = {
      key: key,
      course: removeYearPrefix(course),
      date: date,
      fullCourse: ensureFullCourse(
        course,
        timestamp
      ),
      sortTime:
        getSortTimeFromMeeting(
          course,
          date,
          timestamp
        ),
      label:
        ensureFullCourse(
          course,
          timestamp
        )
        +
        '｜'
        +
        date
    };

  });

}


/*
========================================
加入未來 14 天行事曆會議

用途：
讓尚未簽到、尚未補登的未來會議
也可以提前進入後台設定請假

只有當 meetingMap 裡沒有同一場會議時
才標記為「未產生紀錄」
========================================
*/

function addUpcomingCalendarMeetingsToMap(meetingMap){

  const range =
    getUpcomingCalendarDateRange();

  const events =
    getConfiguredCalendarEvents(
      range.start,
      range.end
    );

  events.forEach(function(event){

    const item =
      buildMeetingListItemFromCalendarEvent(
        event
      );

    if(
      meetingMap[
        item.key
      ]
    ){
      return;
    }

    meetingMap[
      item.key
    ] =
      item;

  });

}


/*
========================================
尋找指定會議年份

優先順序：
① 表單回覆
② 後台人員狀態設定
③ 未來 14 天行事曆
④ 今年

用途：
產生簽到驗證 A2 的完整會議名稱
例如：
2026/5/25 Book reading
========================================
*/

function findMeetingYear(course, date){

  const responseYear =
    findMeetingYearFromResponse(
      course,
      date
    );

  if(responseYear){
    return responseYear;
  }

  const backendYear =
    findMeetingYearFromBackendStatus(
      course,
      date
    );

  if(backendYear){
    return backendYear;
  }

  const calendarYear =
    findMeetingYearFromCalendar(
      course,
      date
    );

  if(calendarYear){
    return calendarYear;
  }

  return new Date().getFullYear();

}


/*
========================================
從表單回覆找年份
========================================
*/

function findMeetingYearFromResponse(course, date){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const responseSheet =
    ss.getSheetByName(
      RESPONSE_SHEET_NAME
    );

  const values =
    responseSheet
      .getDataRange()
      .getValues();

  const row =
    findMeetingResponseRow(
      values,
      course,
      date
    );

  if(!row){
    return null;
  }

  return new Date(
    row[0]
  ).getFullYear();

}


/*
========================================
從後台人員狀態設定找年份
========================================
*/

function findMeetingYearFromBackendStatus(course, date){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const backendSheet =
    ss.getSheetByName(
      BACKEND_STATUS_SHEET_NAME
    );

  if(
    !backendSheet ||
    backendSheet.getLastRow() < 2
  ){
    return null;
  }

  const values =
    backendSheet
      .getRange(
        2,
        1,
        backendSheet.getLastRow() - 1,
        9
      )
      .getValues();

  for(let i = 0; i < values.length; i++){

    const row =
      values[i];

    const backendCourse =
      String(row[1] || '').trim();

    const backendDate =
      String(row[2] || '').trim();

    if(
      normalizeCourse(
        backendCourse
      )
      ===
      normalizeCourse(
        course
      )
      &&
      normalizeText(
        backendDate
      )
      ===
      normalizeText(
        date
      )
    ){

      const fullCourse =
        ensureFullCourse(
          backendCourse,
          row[0]
        );

      const yearMatch =
        String(fullCourse).match(
          /^(\d{4})\//
        );

      if(yearMatch){
        return Number(
          yearMatch[1]
        );
      }

    }

  }

  return null;

}


/*
========================================
從未來 14 天行事曆找年份
========================================
*/

function findMeetingYearFromCalendar(course, date){

  const range =
    getUpcomingCalendarDateRange();

  const events =
    getConfiguredCalendarEvents(
      range.start,
      range.end
    );

  for(let i = 0; i < events.length; i++){

    const item =
      buildMeetingListItemFromCalendarEvent(
        events[i]
      );

    if(
      normalizeCourse(
        item.course
      )
      ===
      normalizeCourse(
        course
      )
      &&
      normalizeText(
        item.date
      )
      ===
      normalizeText(
        date
      )
    ){
      return events[i]
        .getStartTime()
        .getFullYear();
    }

  }

  return null;

}


/*
========================================
尋找指定會議的第一筆表單資料
========================================
*/

function findMeetingResponseRow(values, course, date){

  return values
    .slice(1)
    .find(function(row){

      return (
        normalizeCourse(
          row[1]
        )
        ===
        normalizeCourse(
          course
        )

        &&

        normalizeText(
          row[2]
        )
        ===
        normalizeText(
          date
        )
      );

    });

}


/*
========================================
建立表單回覆會議選項
========================================
*/

function buildMeetingListItemFromResponseRow(row, range){

  const timestamp =
    row[0];

  const course =
    String(row[1] || '').trim();

  const date =
    String(row[2] || '').trim();

  if(
    !timestamp ||
    !course ||
    !date
  ){
    return null;
  }

  const responseDate =
    new Date(
      timestamp
    );

  if(
    responseDate < range.start ||
    responseDate > range.end
  ){
    return null;
  }

  const year =
    responseDate.getFullYear();

  const fullCourse =
    year +
    '/' +
    removeYearPrefix(
      course
    );

  const cleanCourse =
    removeYearPrefix(
      course
    );

  const key =
    buildMeetingKey(
      cleanCourse,
      date
    );

  return {
    key: key,
    course: cleanCourse,
    date: date,
    fullCourse: fullCourse,
    sortTime:
    getSortTimeFromMeeting(
      fullCourse,
      date,
      timestamp
    ),
    label:
      fullCourse +
      '｜' +
      date
  };

}


/*
========================================
建立行事曆會議選項
========================================
*/

function buildMeetingListItemFromCalendarEvent(event){

  const course =
    Utilities.formatDate(
      event.getStartTime(),
      TIME_ZONE,
      'M/d'
    )
    +
    ' '
    +
    event.getTitle();

  const date =
    Utilities.formatDate(
      event.getStartTime(),
      TIME_ZONE,
      'H:mm'
    )
    +
    '-'
    +
    Utilities.formatDate(
      event.getEndTime(),
      TIME_ZONE,
      'H:mm'
    );

  const fullCourse =
    event.getStartTime().getFullYear()
    +
    '/'
    +
    course;

  const key =
    buildMeetingKey(
      course,
      date
    );

  return {
    key: key,
    course: course,
    date: date,
    fullCourse: fullCourse,
    sortTime: event.getStartTime().getTime(),
    label:
      fullCourse +
      '｜' +
      date +
      '（未產生紀錄）'
  };

}


/*
========================================
建立會議查詢時間範圍

表單回覆：
前後三個月
========================================
*/

function getMeetingSearchDateRange(){

  const now =
    new Date();

  const start =
    new Date();

  start.setMonth(
    now.getMonth() - 3
  );

  const end =
    new Date();

  end.setMonth(
    now.getMonth() + 3
  );

  return {
    start: start,
    end: end
  };

}


/*
========================================
建立未來行事曆查詢範圍

行事曆：
今天起 14 天
========================================
*/

function getUpcomingCalendarDateRange(){

  const now =
    new Date();

  const start =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const end =
    new Date(
      start
    );

  end.setDate(
    end.getDate() +
    ADMIN_EVENT_LOOKAHEAD_DAYS
  );

  return {
    start: start,
    end: end
  };

}


/*
========================================
建立會議唯一 key

用途：
避免同一場會議因來源不同被視為兩筆

規則：
- 移除年份前綴
- 統一空白
- 統一時間格式
========================================
*/

function buildMeetingKey(course, date){

  return normalizeCourse(
    course
  )
  +
  '||'
  +
  normalizeText(
    date
  );

}


/*
========================================
標準化會議名稱
========================================
*/

function normalizeCourse(course){

  return normalizeText(
    removeYearPrefix(
      course
    )
  );

}


/*
========================================
移除會議名稱前方年份

範例：
2026/5/25 Book reading
→
5/25 Book reading
========================================
*/

function removeYearPrefix(course){

  return String(
    course || ''
  )
    .trim()
    .replace(
      /^\d{4}\//,
      ''
    );

}


/*
========================================
統一文字格式
========================================
*/

function normalizeText(text){

  return String(
    text || ''
  )
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .replace(
      /^0(?=\d:)/,
      ''
    )
    .replace(
      /-0(?=\d:)/g,
      '-'
    );

}


/*
========================================
確保會議名稱有年份前綴
========================================
*/

function ensureFullCourse(course, timestamp){

  const text =
    String(
      course || ''
    ).trim();

  if(
    /^\d{4}\//.test(
      text
    )
  ){
    return text;
  }

  const year =
    timestamp
    ? new Date(
        timestamp
      ).getFullYear()
    : new Date()
        .getFullYear();

  return year +
    '/' +
    text;

}


/*
========================================
取得後台紀錄排序時間
========================================
*/

function getSortTimeFromBackendRow(course, date, timestamp){

  const yearMatch =
    String(course || '').match(
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})/
    );

  const timeMatch =
    String(date || '').match(
      /^(\d{1,2}):(\d{2})/
    );

  if(
    yearMatch &&
    timeMatch
  ){

    return new Date(
      Number(yearMatch[1]),
      Number(yearMatch[2]) - 1,
      Number(yearMatch[3]),
      Number(timeMatch[1]),
      Number(timeMatch[2])
    ).getTime();

  }

  if(timestamp){
    return new Date(
      timestamp
    ).getTime();
  }

  return 0;

}

/*
========================================
用 course + date 產生排序時間

course 範例：
5/25 Book reading
2026/5/25 Book reading

date 範例：
7:30-8:30
========================================
*/

function getSortTimeFromMeeting(
  course,
  date,
  fallbackTimestamp
){

  const fullCourse =
    ensureFullCourse(
      course,
      fallbackTimestamp
    );

  const dateMatch =
    String(fullCourse).match(
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})/
    );

  const timeMatch =
    String(date || '').match(
      /^(\d{1,2}):(\d{2})/
    );

  if(dateMatch && timeMatch){

    return new Date(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
      Number(timeMatch[1]),
      Number(timeMatch[2])
    ).getTime();

  }

  if(fallbackTimestamp){
    return new Date(
      fallbackTimestamp
    ).getTime();
  }

  return 0;

}
