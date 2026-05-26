/*
========================================
BackendPeople.gs
最簡版
========================================
*/


/*
========================================
取得會議人員
========================================
*/
function getMeetingPeopleStatus(course,date){

  refreshMeetingOutput(
    course,
    date
  );

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const raw =
    ss.getSheetByName(
      RAW_SHEET_NAME
    );

  if(
    !raw
    ||
    raw.getLastRow()<2
  ){
    return [];
  }

  const columnCount =
    Math.max(
      raw.getLastColumn(),
      16
    );

  return raw

    .getRange(
      2,
      1,
      raw.getLastRow()-1,
      columnCount
    )

    .getDisplayValues()

    .filter(
      row=>row[3]
    )

    .map(
      row=>{

        const sourceCode =
          String(row[10] || '');

        return {

        time:
          row[0],

        course:
          row[1],

        date:
          row[2],

        name:
          row[3],

        emp:
          row[4],

        role:
          row[5],

        status:
          row[8]
          ||
          row[7],

        recorder:
          String(
            row[9]
          )
          ===
          'TRUE',

        source:
          row[6]==='後台驗證'
          ? 'backend'
          : 'form',

        hasRawData:
          sourceCode === '1' ||
          sourceCode === '3',

        hasBackendData:
          sourceCode === '2' ||
          sourceCode === '3',

        rawDeleted:
          false,

        backendDeleted:
          false,

        rawData:
          (
            sourceCode === '1' ||
            sourceCode === '3'
          )
          ? {
              time:
                row[11] || row[0],
              name:
                row[12] || row[3],
              emp:
                row[13] || row[4],
              role:
                row[14] || row[5],
              status:
                row[15] || row[8] || row[7]
            }
          : null

        };

      }
    );

}



/*
========================================
儲存後台狀態
========================================
*/
function saveBackendPeopleStatus(
  course,
  date,
  people
){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      BACKEND_STATUS_SHEET_NAME
    );

  people.forEach(function(person){

    const values =
      sheet
        .getDataRange()
        .getValues();

    const lookupName =
      String(
        person.originalName ||
        person.name ||
        ''
      ).trim();

    let rowIndex =
      -1;

    values
      .slice(1)

      .forEach(function(row,i){

        if(

          String(
            row[1]
          ).trim()

          ===

          String(
            course
          ).trim()

          &&

          String(
            row[2]
          ).trim()

          ===

          String(
            date
          ).trim()

          &&

          String(
            row[3]
          ).trim()

          ===

          String(
            lookupName
          ).trim()

        ){

          rowIndex =
            i+2;

        }

      });

    let deleteRaw =
      person.deleteRaw === true;

    let deleteBackend =
      person.deleteBackend === true;

    if(
      person.delete &&
      !deleteRaw &&
      !deleteBackend
    ){

      if(
        person.source === 'form'
        ||
        rowIndex <= 0
      ){
        deleteRaw =
          true;
      }else{
        deleteBackend =
          true;
      }

    }

    if(deleteRaw){

        const deleted =
          deleteFormResponsePerson(
            course,
            date,
            person
          );

        if(!deleted){

          throw new Error(
            '找不到要刪除的表單回覆 1 資料：' +
            'course=' + course +
            ', date=' + date +
            ', name=' + person.name +
            ', emp=' + person.emp +
            ', source=' + person.source
          );

        }

    }

    if(
      deleteRaw &&
      !deleteBackend
    ){
      return;
    }

    if(deleteBackend){

      if(rowIndex > 0){

        sheet.deleteRow(
          rowIndex
        );

        rowIndex =
          -1;

      }

      return;

    }

    const signTime =
      person.signTime || '';



    if(

      rowIndex > 0

      &&

      person.source === 'form'

      &&

      person.recorder !== true

      &&

      backendRowSameAsPerson(
        values[rowIndex - 1],
        person
      )

    ){

      sheet.deleteRow(
        rowIndex
      );

      return;

    }



    const data=[

      signTime,

      course,

      date,

      person.name,

      person.emp,

      person.role,

      person.source === 'backend'
      ||
      (
        person.recorder
        &&
        rowIndex <= 0
      )
      ? '後台驗證'
      : '',

      person.status,

      new Date(),

      person.recorder === true
      ? 'TRUE'
      : ''

    ];



    if(
      rowIndex>0
    ){

      sheet

        .getRange(
          rowIndex,
          1,
          1,
          data.length
        )

        .setValues([
          data
        ]);

    }

    else{

      sheet.appendRow(
        data
      );

    }

  });



  SpreadsheetApp.flush();



  refreshMeetingOutput(
    course,
    date
  );



  updateSignUploadSheet(
    course,
    date
  );



  return true;

}



/*
========================================
刪除後台資料
========================================
*/
function deleteBackendPerson(
  course,
  date,
  name
){

  return saveBackendPeopleStatus(

    course,

    date,

    [

      {

        name:
          name,

        deleteBackend:
          true

      }

    ]

  );

}



function deleteFormResponsePerson(
  course,
  date,
  person
){

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      RESPONSE_SHEET_NAME
    );

  const values =
    sheet
      .getDataRange()
      .getValues();

  for(
    let i = values.length - 1;
    i >= 1;
    i--
  ){

    const row =
      values[i];

    if(
      normalizeCourse(row[1])
      ===
      normalizeCourse(course)
      &&
      normalizeText(row[2])
      ===
      normalizeText(date)
      &&
      String(row[3] || '').trim()
      ===
      String(person.name || '').trim()
      &&
      (
        !person.emp
        ||
        String(row[5] || '').trim()
        ===
        String(person.emp || '').trim()
      )
    ){

      sheet.deleteRow(
        i + 1
      );

      return true;

    }

  }

  return false;

}



function backendRowSameAsPerson(
  row,
  person
){

  return (

    String(row[3] || '').trim()
    ===
    String(person.name || '').trim()

    &&

    String(row[4] || '').trim()
    ===
    String(person.emp || '').trim()

    &&

    String(row[5] || '').trim()
    ===
    String(person.role || '').trim()

    &&

    String(row[7] || '').trim()
    ===
    String(person.status || '').trim()

  );

}
