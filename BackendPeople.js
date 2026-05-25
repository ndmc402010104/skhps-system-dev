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

  return raw

    .getRange(
      2,
      1,
      raw.getLastRow()-1,
      9
    )

    .getDisplayValues()

    .filter(
      row=>row[3]
    )

    .map(
      row=>({

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

        source:
          row[6]==='後台驗證'
          ? 'backend'
          : 'form'

      })
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

  const values =
    sheet
      .getDataRange()
      .getValues();

  const deleteRowIndexes =
    people
      .filter(function(person){
        return person.delete;
      })
      .map(function(person){
        return findBackendPersonRowIndex(
          values,
          course,
          date,
          getBackendPersonLookupName(
            person
          )
        );
      })
      .filter(function(rowIndex){
        return rowIndex > 0;
      })
      .sort(function(a,b){
        return b - a;
      });

  deleteRowIndexes
    .forEach(function(rowIndex,index){

      if(
        index > 0
        &&
        rowIndex === deleteRowIndexes[index - 1]
      ){
        return;
      }

      sheet.deleteRow(
        rowIndex
      );

    });

  people
    .filter(function(person){
      return !person.delete;
    })
    .forEach(function(person){

    const currentValues =
      sheet
        .getDataRange()
        .getValues();

    const rowIndex =
      findBackendPersonRowIndex(
        currentValues,
        course,
        date,
        getBackendPersonLookupName(
          person
        )
      );


    const signTime =
      person.signTime || '';



    const data=[

      signTime,

      course,

      date,

      person.name,

      person.emp,

      person.role,

      '後台驗證',

      person.status,

      new Date()

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



function findBackendPersonRowIndex(
  values,
  course,
  date,
  name
){

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
          name
        ).trim()

      ){

        rowIndex =
          i+2;

      }

    });

  return rowIndex;

}



function getBackendPersonLookupName(person){

  return String(
    person.originalName ||
    person.name ||
    ''
  ).trim();

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

        delete:
          true

      }

    ]

  );

}
