/*
========================================
Sign.gs
負責會議簽到頁
========================================
*/

// 進到 Route.gs 查詢會議簽到位置
function showSignMeetingPage(e){

  const currentMeeting =
    getCurrentSignMeetingForPage();

  const template =
    HtmlService.createTemplateFromFile(
      SIGN_MEETING_PAGE_NAME
    );

  template.course =
    e.parameter.course ||
    currentMeeting.course ||
    '';

  template.date =
    e.parameter.date ||
    currentMeeting.date ||
    '';

  template.token =
    e.parameter.token ||
    currentMeeting.token ||
    '';

  template.expectedToken =
    generateSignToken(
      e.parameter.course
      ? template.course
      : currentMeeting.tokenCourse,
      template.date
    );

  template.formUrl =
    FORM_BASE_URL;

  template.courseId =
    COURSE_NAME_ENTRY_ID;

  template.dateId =
    DATE_ENTRY_ID;

  template.tokenId =
    TOKEN_ENTRY_ID;

  template.nameId =
    NAME_ENTRY_ID;

  template.employeeId =
    EMPLOYEE_ENTRY_ID;

  template.roleId =
    ROLE_ENTRY_ID;

  template.appEntryUrl =
    APP_ENTRY_URL;

  template.staffList =
    JSON.stringify(
      getDefaultStaffList()
    );

  return template
    .evaluate()
    .setTitle(
      getAppPageTitle(
        '會議簽到'
      )
    );

}


function getCurrentSignMeetingForPage(){

  const calendar =
    CalendarApp
      .getCalendarsByName(
        CALENDAR_NAME
      )[0];

  if(!calendar){

    return {
      course:'',
      tokenCourse:'',
      date:'',
      token:''
    };

  }

  const now =
    new Date();

  const rangeStart =
    new Date(
      now.getTime()
      -
      MEETING_RUNNING_BEFORE_MIN * 60000
    );

  const rangeEnd =
    new Date(
      now.getTime()
      +
      MEETING_RUNNING_AFTER_MIN * 60000
    );

  const events =
    calendar.getEvents(
      rangeStart,
      rangeEnd
    );

  if(events.length === 0){

    return {
      course:'',
      tokenCourse:'',
      date:'',
      token:''
    };

  }

  const event =
    events[0];

  const dateText =
    Utilities.formatDate(
      event.getStartTime(),
      TIME_ZONE,
      'M/d'
    );

  const startText =
    Utilities.formatDate(
      event.getStartTime(),
      TIME_ZONE,
      'H:mm'
    );

  const endText =
    Utilities.formatDate(
      event.getEndTime(),
      TIME_ZONE,
      'H:mm'
    );

  const tokenCourse =
    dateText +
    ' ' +
    event.getTitle();

  const course =
    tokenCourse;

  const date =
    startText +
    '-' +
    endText;

  const token =
    generateSignToken(
      tokenCourse,
      date
    );

  return {
    course:course,
    tokenCourse:tokenCourse,
    date:date,
    token:token
  };

}
