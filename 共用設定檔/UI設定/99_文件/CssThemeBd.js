const CSS_DB_SPREADSHEET_ID =
  '1Kd2T_XhkeAUyDzmdXvDUBcHKbmGII-7sky5nfJ8PY50';

const CSS_SHEETS = {
  BUTTON: '01_按鈕'
};

const DEFAULT_MARK =
  'default';


function setupCssDb_01Button(){

  const ss =
    SpreadsheetApp.openById(CSS_DB_SPREADSHEET_ID);

  let sh =
    ss.getSheetByName(CSS_SHEETS.BUTTON);

  if(!sh){
    sh = ss.getSheets()[0];
    sh.setName(CSS_SHEETS.BUTTON);
  }

  sh.clear();

  sh.getRange(1,1,1,6).setValues([[
    'component',
    'className',
    'property',
    'value',
    'description',
    'updatedAt'
  ]]);

  const rows = [
    ['button','primary','bg','#344f9f','Primary 背景',DEFAULT_MARK],
    ['button','primary','text','#ffffff','Primary 文字',DEFAULT_MARK],
    ['button','primary','border','#344f9f','Primary 邊框',DEFAULT_MARK],

    ['button','primary','bg','#344f9f','Primary 背景',new Date()],
    ['button','primary','text','#ffffff','Primary 文字',new Date()],
    ['button','primary','border','#344f9f','Primary 邊框',new Date()]
  ];

  sh.getRange(2,1,rows.length,6).setValues(rows);

  sh.setFrozenRows(1);
  sh.autoResizeColumns(1,6);
}


/* 讀目前系統設定：updatedAt 不是 default 的最新值 */
function getButtonCssSettings(){
  return getButtonCssSettingsByDefaultMark_(false);
}


/* 讀 default：updatedAt 是 default */
function getButtonDefaultCssSettings(){
  return getButtonCssSettingsByDefaultMark_(true);
}


function getButtonCssSettingsByDefaultMark_(wantDefault){

  const sh =
    SpreadsheetApp
      .openById(CSS_DB_SPREADSHEET_ID)
      .getSheetByName(CSS_SHEETS.BUTTON);

  const values =
    sh.getDataRange().getValues();

  const result = {};
  const latestMap = {};

  for(let i = 1; i < values.length; i++){

    const row =
      values[i];

    const component =
      row[0];

    const className =
      row[1];

    const property =
      row[2];

    const value =
      row[3];

    const updatedAt =
      row[5];

    const isDefault =
      String(updatedAt).trim() === DEFAULT_MARK;

    if(component !== 'button'){
      continue;
    }

    if(wantDefault !== isDefault){
      continue;
    }

    if(!result[className]){
      result[className] = {};
    }

    /*
      default 只會有一筆，直接吃。
      current 可能有多筆，吃最後一筆。
    */
    const key =
      className + '|' + property;

    latestMap[key] = {
      className:className,
      property:property,
      value:value,
      rowIndex:i
    };

  }

  Object.keys(latestMap).forEach(function(key){

    const item =
      latestMap[key];

    if(!result[item.className]){
      result[item.className] = {};
    }

    result[item.className][item.property] =
      item.value;

  });

  return result;

}


/* 儲存目前系統設定 */
function saveButtonCssSetting(className, property, value){

  return saveButtonCssSetting_(
    className,
    property,
    value,
    new Date()
  );

}


/* 設為新 default */
function saveButtonDefaultCssSetting(className, property, value){

  return saveButtonCssSetting_(
    className,
    property,
    value,
    DEFAULT_MARK
  );

}


function saveButtonCssSetting_(
  className,
  property,
  value,
  updatedAtValue
){

  const sh =
    SpreadsheetApp
      .openById(CSS_DB_SPREADSHEET_ID)
      .getSheetByName(CSS_SHEETS.BUTTON);

  const values =
    sh.getDataRange().getValues();

  const wantDefault =
    String(updatedAtValue).trim() === DEFAULT_MARK;

  for(let i = 1; i < values.length; i++){

    const row =
      values[i];

    const isDefaultRow =
      String(row[5]).trim() === DEFAULT_MARK;

    if(
      row[0] === 'button' &&
      row[1] === className &&
      row[2] === property &&
      isDefaultRow === wantDefault
    ){

      sh.getRange(i + 1,4).setValue(value);
      sh.getRange(i + 1,6).setValue(updatedAtValue);

      return {
        ok:true,
        updated:true
      };

    }

  }

  sh.appendRow([
    'button',
    className,
    property,
    value,
    className + ' ' + property,
    updatedAtValue
  ]);

  return {
    ok:true,
    inserted:true
  };

}