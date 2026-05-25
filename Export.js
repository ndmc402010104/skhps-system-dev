/*
========================================
Export.gs
負責 Excel 匯出與簽到上傳 Sheet 更新
========================================
*/


/*
========================================
下載簽到上傳檔
流程：
1. 更新簽到上傳 Sheet
2. 從簽到上傳 Sheet 讀資料
3. 回傳給前端下載 Excel
========================================
*/

function exportSignUploadData(course, date){

  const ok =
    updateSignUploadSheet(
      course,
      date
    );

  if(!ok){

    return {
      ok:false,
      message:'找不到這場會議資料'
    };

  }

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const uploadSheet =
    ss.getSheetByName(
      UPLOAD_SHEET_NAME
    );

  const verifySheet =
    ss.getSheetByName(
      VERIFY_SHEET_NAME
    );

  const values =
    uploadSheet
      .getDataRange()
      .getDisplayValues();

  const meeting =
    verifySheet
      .getRange('A2')
      .getDisplayValue();

  const filename =
    meeting
      .replace(/\//g,'')
      .replace(/\s/g,'')
    +
    '課程簽到上傳.xlsx';

  return {
    ok:true,
    filename:filename,
    values:values
  };

}


/*
========================================
更新簽到上傳 Sheet
只寫入 Sheet，不下載

給兩種情境使用：
- 後台按儲存
- 按下載簽到上傳
========================================
*/

function updateSignUploadSheet(course, date){

  const ok =
    prepareSignSheet(
      course,
      date
    );

  if(!ok){
    return false;
  }

  SpreadsheetApp.flush();

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const rawSheet =
    ss.getSheetByName(
      RAW_SHEET_NAME
    );

  const uploadSheet =
    ss.getSheetByName(
      UPLOAD_SHEET_NAME
    );

  const rawValues =
    rawSheet
      .getDataRange()
      .getDisplayValues();

  const uploadValues =
    buildUploadDataFromRawValues(
      rawValues
    );

  writeSignUploadSheet(
    uploadSheet,
    uploadValues
  );

  SpreadsheetApp.flush();

  return true;

}


/*
========================================
由原始資料產生簽到上傳資料

規則：
簽到成功 → 出席
其他 → 缺席
========================================
*/

function buildUploadDataFromRawValues(rawValues){

  const output = [[
    '員工編號',
    '身份証字號',
    '姓名',
    '簽到時間',
    '簽退時間',
    '狀態'
  ]];

  rawValues
    .slice(1)
    .forEach(function(row){

      const rawSignTime =
        row[0];

      const name =
        row[3];

      const emp =
        row[4];

      const status =
        row[7];

      if(!name){
        return;
      }

      const signTime =
        rawSignTime
        ? rawSignTime
        : '';

      let uploadStatus =
        '缺席';

      if(
        status === '簽到成功'
      ){

        uploadStatus =
          '出席';

      }
      else if(
        status === '請假'
      ){

        uploadStatus =
          '請假';

      }

      output.push([
        emp,
        '',
        name,
        signTime,
        '',
        uploadStatus
      ]);

    });

  return output;

}


/*
========================================
寫入簽到上傳 Sheet
========================================
*/

function writeSignUploadSheet(sheet, values){

  sheet.clear();

  sheet
    .getRange(
      1,
      1,
      values.length,
      values[0].length
    )
    .setValues(
      values
    );

  sheet.setFrozenRows(
    1
  );

  sheet
    .getRange(
      1,
      1,
      1,
      values[0].length
    )
    .setFontWeight(
      'bold'
    );

  if(values.length > 1){

    sheet
      .getRange(
        2,
        4,
        values.length - 1,
        1
      )
      .setNumberFormat(
        'yyyy/m/d hh:mm:ss'
      );

  }

  for(let c = 1; c <= values[0].length; c++){

    sheet.setColumnWidth(
      c,
      140
    );

  }

  sheet.setColumnWidth(1,120);
  sheet.setColumnWidth(2,140);
  sheet.setColumnWidth(3,120);
  sheet.setColumnWidth(4,180);
  sheet.setColumnWidth(5,120);
  sheet.setColumnWidth(6,100);

}


/*
========================================
下載會議簽到單
========================================
*/

function exportMeetingSignSheet(course, date){

  const ok =
    prepareSignSheet(
      course,
      date
    );

  if(!ok){

    return {
      ok:false,
      message:'找不到會議'
    };

  }

  SpreadsheetApp.flush();

  Utilities.sleep(
    1500
  );

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      SIGN_SHEET_NAME
    );

  const values =
    sheet
      .getDataRange()
      .getDisplayValues();

  const meeting =
    ss
      .getSheetByName(
        VERIFY_SHEET_NAME
      )
      .getRange('A2')
      .getDisplayValue();

  const filename =
    meeting
      .replace(/\//g,'')
      .replace(/\s/g,'')
    +
    '課程簽到單.xlsx';

  return {
    ok:true,
    filename:filename,
    values:values
  };

}


/*
========================================
下載簽到原始檔
========================================
*/

function exportRawSignData(course, date){

  const ok =
    prepareSignSheet(
      course,
      date
    );

  if(!ok){

    return {
      ok:false,
      message:'找不到這場會議資料'
    };

  }

  copyRawData(
    course,
    date
  );

  SpreadsheetApp.flush();

  Utilities.sleep(
    500
  );

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const rawSheet =
    ss.getSheetByName(
      RAW_SHEET_NAME
    );

  const values =
    rawSheet
      .getDataRange()
      .getDisplayValues()
      .map(function(row){

      return row.filter(function(cell,index){

        return ![
          6, // 驗證碼
          7, // 狀態
          9  // 紀錄者
        ].includes(index);

      });

      });

  const meeting =
    ss
      .getSheetByName(
        VERIFY_SHEET_NAME
      )
      .getRange('A2')
      .getDisplayValue();

  const filename =
    meeting
      .replace(/\//g,'')
      .replace(/\s/g,'')
    +
    '簽到原始檔.xlsx';

  return {
    ok:true,
    filename:filename,
    values:values
  };

}

//產生PDF
function exportMeetingSignSheetPdf(course, date){

  const ok =
    prepareSignSheet(
      course,
      date
    );

  if(!ok){

    return {
      ok:false,
      message:'找不到會議'
    };

  }

  SpreadsheetApp.flush();

  Utilities.sleep(
    1500
  );

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      SIGN_SHEET_NAME
    );

  const meeting =
    ss
      .getSheetByName(
        VERIFY_SHEET_NAME
      )
      .getRange('A2')
      .getDisplayValue();

  const filename =
    meeting
      .replace(/\//g,'')
      .replace(/\s/g,'')
    +
    '課程簽到單.pdf';

  const url =
    'https://docs.google.com/spreadsheets/d/' +
    SHEET_ID +
    '/export?' +
    'format=pdf' +
    '&gid=' + sheet.getSheetId() +
    '&size=A4' +
    '&portrait=true' +
    '&fitw=true' +
    '&sheetnames=false' +
    '&printtitle=false' +
    '&pagenumbers=false' +
    '&gridlines=false' +
    '&fzr=false';

  const token =
    ScriptApp.getOAuthToken();

  const response =
    UrlFetchApp.fetch(
      url,
      {
        headers:{
          Authorization:
            'Bearer ' + token
        }
      }
    );

  return {
    ok:true,
    filename:filename,
    base64:
      Utilities.base64Encode(
        response.getBlob().getBytes()
      )
  };

}
