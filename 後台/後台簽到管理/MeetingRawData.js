/*
========================================
MeetingRawData.gs
負責會議原始資料整併
========================================
*/


function copyRawData(course, date){

  const ss =
    SpreadsheetApp.openById(SHEET_ID);

  const formSheet =
    ss.getSheetByName(RESPONSE_SHEET_NAME);

  const backendSheet =
    ss.getSheetByName(BACKEND_STATUS_SHEET_NAME);

  const target =
    ss.getSheetByName(RAW_SHEET_NAME);

  const merged = {};

  const formValues =
    formSheet
      .getDataRange()
      .getValues();

  formValues
    .slice(1)
    .forEach(function(row){

      if(
        String(row[1]).trim() !== String(course).trim()
        ||
        String(row[2]).trim() !== String(date).trim()
      ){
        return;
      }

      const name =
        String(row[3] || '').trim();

      if(!name){
        return;
      }

      const signTime =
        new Date(row[0]);

      const courseName =
        String(row[1] || '').trim();

      const meetingTime =
        String(row[2] || '').trim();

      const submittedToken =
        String(row[4] || '').trim();

      const expectedToken =
        generateSignToken(
          courseName,
          meetingTime
        );

      const tokenValid =
        submittedToken === expectedToken;

      const timeValid =
        isSignTimeValid(
          signTime,
          courseName,
          meetingTime
        );

      let status =
        '簽到成功';

      const reasons =
        [];

      if(!tokenValid){
        status = '簽到失敗';
        reasons.push('驗證失敗');
      }

      if(!timeValid){
        status = '簽到失敗';
        reasons.push('未於課程時間內簽到');
      }

      merged[name] = {
        signTime:
          normalizeRawSignTime(
            row[0]
          ),
        course: row[1],
        date: row[2],
        name: row[3],
        emp: row[5],
        role: row[6],
        token: row[4],
        status: status,
        reason:
          reasons.includes('驗證失敗')
          ? '驗證失敗'
          : reasons.join('；'),
        recorder: false,
        updatedAt: 0,
        hasRawData: true,
        hasBackendData: false,
        rawData:
          buildRawDataSnapshot({
            signTime:
              normalizeRawSignTime(
                row[0]
              ),
            name:
              row[3],
            emp:
              row[5],
            role:
              row[6],
            status:
              status
          })
      };

    });


  if(backendSheet){

    const backendValues =
      backendSheet
        .getDataRange()
        .getValues();

    backendValues
      .slice(1)
      .forEach(function(row){

        const backendCourse =
          String(row[1] || '').trim();

        const backendDate =
          String(row[2] || '').trim();

        const name =
          String(row[3] || '').trim();

        if(!name){
          return;
        }

        if(
          normalizeRawCourse(backendCourse)
          !==
          normalizeRawCourse(course)
          ||
          normalizeRawMeetingTime(backendDate)
          !==
          normalizeRawMeetingTime(date)
        ){
          return;
        }

        const updatedAt =
          row[8] instanceof Date
          ? row[8].getTime()
          : new Date(row[8]).getTime();

        const current =
          merged[name];

        const recorder =
          row[9] === true
          ||
          String(row[9]).toUpperCase() === 'TRUE';

        if(
          current
          &&
          recorder
          &&
          String(current.emp || '').trim() === String(row[4] || '').trim()
          &&
          String(current.role || '').trim() === String(row[5] || '').trim()
          &&
          String(current.status || '').trim() === String(row[7] || '').trim()
        ){

          current.recorder =
            true;

          current.hasBackendData =
            true;

          current.rawData =
            current.rawData ||
            buildRawDataSnapshot(current);

          return;

        }

        if(
          current
          &&
          updatedAt < current.updatedAt
        ){
          return;
        }

        const rawData =
          current &&
          current.hasRawData
          ? (
              current.rawData ||
              buildRawDataSnapshot(current)
            )
          : null;

        merged[name] = {
          signTime:
            normalizeRawSignTime(
              row[0]
            ),
          course:
            course,
          date:
            date,
          name:
            row[3],
          emp:
            row[4],
          role:
            row[5],
          token:
            row[6] || '後台驗證',
          status:
            row[7],
          reason:
            row[7],
          recorder:
            recorder,
          updatedAt:
            updatedAt || Date.now(),
          hasRawData:
            Boolean(
              current &&
              current.hasRawData
            ),
          hasBackendData:
            true,
          rawData:
            rawData
        };

      });

  }


  const output = [[
    '簽到時間',
    '課程名稱',
    '會議時間',
    '姓名',
    '員工編號',
    '職級',
    '驗證碼',
    '狀態',
    '失敗原因',
    '紀錄者',
    '來源代碼(1原始資料2後台資料3都有)',
    '原始簽到時間',
    '原始姓名',
    '原始員工編號',
    '原始職級',
    '原始狀態'
  ]];

  Object
    .values(merged)
    .forEach(function(p){

      const rawData =
        p.rawData ||
        (
          p.hasRawData
          ? buildRawDataSnapshot(p)
          : null
        );

      output.push([
        p.signTime,
        p.course,
        p.date,
        p.name,
        p.emp,
        p.role,
        p.token,
        p.status,
        p.reason,
        p.recorder ? 'TRUE' : '',
        buildRawDataSourceCode(p),
        rawData ? rawData.time : '',
        rawData ? rawData.name : '',
        rawData ? rawData.emp : '',
        rawData ? rawData.role : '',
        rawData ? rawData.status : ''
      ]);

    });

  target.clear();

  if(
    target.getMaxColumns() <
    output[0].length
  ){

    target.insertColumnsAfter(
      target.getMaxColumns(),
      output[0].length - target.getMaxColumns()
    );

  }

  target
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(output);

  target.setFrozenRows(1);

  for(let c = 1; c <= 16; c++){
    target.setColumnWidth(c,150);
  }

  target.setColumnWidth(1,180);
  target.setColumnWidth(9,260);
  target.setColumnWidth(10,120);
  target.setColumnWidth(11,170);
  target.hideColumns(12,5);

  SpreadsheetApp.flush();

  return output.length > 1;

}


function buildRawDataSnapshot(person){

  return {
    time:
      person.signTime || person.time || '',
    name:
      person.name || '',
    emp:
      person.emp || '',
    role:
      person.role || '',
    status:
      (
        person.status === '簽到成功'
        ? person.status
        : (
            person.reason ||
            person.status ||
            ''
          )
      )
  };

}


function buildRawDataSourceCode(person){

  if(
    person.hasRawData &&
    person.hasBackendData
  ){
    return 3;
  }

  if(person.hasBackendData){
    return 2;
  }

  if(person.hasRawData){
    return 1;
  }

  return '';

}


function getBackendRawSignTime(
  meetingTime,
  token,
  status
){

  if(
    token !== '後台驗證'
    ||
    status !== '簽到成功'
  ){
    return '';
  }

  return normalizeRawTimeText(
    String(meetingTime || '').split('-')[1]
  );

}


function normalizeRawTimeText(value){

  const text =
    String(value || '').trim();

  const match =
    text.match(/^(\d{1,2}):(\d{2})$/);

  if(!match){
    return text;
  }

  return (
    String(match[1]).padStart(2,'0')
    +
    ':'
    +
    match[2]
  );

}


function normalizeRawCourse(value){

  return String(value || '')
    .trim()
    .replace(/^\d{4}\//,'')
    .replace(/\s+/g,' ');

}


function normalizeRawMeetingTime(value){

  return String(value || '')
    .trim()
    .replace(/\s+/g,'')
    .replace(/^0(?=\d:)/,'')
    .replace(/-0(?=\d:)/g,'');

}


function isSignTimeValid(
  signTime,
  courseName,
  meetingTime
){

  const courseDate =
    courseName.split(' ')[0];

  const startText =
    meetingTime.split('-')[0];

  const endText =
    meetingTime.split('-')[1];

  const md =
    courseDate.split('/');

  const s =
    startText.split(':');

  const e =
    endText.split(':');

  const start =
    new Date(
      signTime.getFullYear(),
      Number(md[0]) - 1,
      Number(md[1]),
      Number(s[0]),
      Number(s[1])
    );

  const end =
    new Date(
      signTime.getFullYear(),
      Number(md[0]) - 1,
      Number(md[1]),
      Number(e[0]),
      Number(e[1])
    );

  return (
    signTime >= new Date(
      start.getTime()
      -
      MEETING_RUNNING_BEFORE_MIN * 60 * 1000
    )
    &&
    signTime <= new Date(
      end.getTime()
      +
      MEETING_RUNNING_AFTER_MIN * 60 * 1000
    )
  );

}

function normalizeRawSignTime(value){

  if(value instanceof Date){

    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm:ss'
    );

  }

  const text =
    String(value || '').trim();

  const dt =
    new Date(text);

  if(!isNaN(dt)){

    return Utilities.formatDate(
      dt,
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm:ss'
    );

  }

  const match =
    text.match(
      /^(\d{1,2}):(\d{2})(:\d{2})?$/
    );

  if(match){

    return (
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        'yyyy/MM/dd'
      )
      +
      ' '
      +
      String(match[1]).padStart(2,'0')
      +
      ':'
      +
      match[2]
      +
      (
        match[3]
        || ':00'
      )
    );

  }

  return text;

}
