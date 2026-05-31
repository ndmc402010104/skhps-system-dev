const CSS_DB_SPREADSHEET_ID = '1Kd2T_XhkeAUyDzmdXvDUBcHKbmGII-7sky5nfJ8PY50';

const CSS_SHEETS = {
  BUTTON: '01_按鈕'
};

function setupCssDb_01Button(){

  const ss = SpreadsheetApp.openById(CSS_DB_SPREADSHEET_ID);

  let sh = ss.getSheetByName(CSS_SHEETS.BUTTON);

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
    ['button','base','bg','#ffffff','Base 背景',''],
    ['button','base','text','#172033','Base 文字',''],
    ['button','base','border','#cbd5e1','Base 邊框',''],
    ['button','base','radius','10','Base 圓角 px',''],
    ['button','base','paddingY','10','Base 上下 padding px',''],
    ['button','base','paddingX','16','Base 左右 padding px',''],
    ['button','base','fontSize','14','Base 字體 px',''],
    ['button','base','fontWeight','700','Base 字重',''],

    ['button','primary','bg','#344f9f','Primary 背景',''],
    ['button','primary','text','#ffffff','Primary 文字',''],
    ['button','primary','border','#344f9f','Primary 邊框',''],

    ['button','secondary','bg','#ffffff','Secondary 背景',''],
    ['button','secondary','text','#475569','Secondary 文字',''],
    ['button','secondary','border','#cbd5e1','Secondary 邊框',''],

    ['button','danger','bg','#fff7f7','Danger 背景',''],
    ['button','danger','text','#b42318','Danger 文字',''],
    ['button','danger','border','#f4b4ae','Danger 邊框',''],

    ['button','camera','bg','#eef6ff','Camera 背景',''],
    ['button','camera','text','#1d4ed8','Camera 文字',''],
    ['button','camera','border','#bfdbfe','Camera 邊框','']
  ];

  sh.getRange(2,1,rows.length,6).setValues(rows);

  sh.setFrozenRows(1);
  sh.autoResizeColumns(1,6);
}
function getButtonCssSettings(){

  const ss =
    SpreadsheetApp.openById(CSS_DB_SPREADSHEET_ID);

  const sh =
    ss.getSheetByName(CSS_SHEETS.BUTTON);

  if(!sh){
    throw new Error('找不到工作表：' + CSS_SHEETS.BUTTON);
  }

  const values =
    sh.getDataRange().getValues();

  values.shift();

  const data = {};

  values.forEach(function(row){

    const component =
      row[0];

    const className =
      row[1];

    const property =
      row[2];

    const value =
      row[3];

    if(component !== 'button'){
      return;
    }

    if(!data[className]){
      data[className] = {};
    }

    data[className][property] =
      value;

  });

  return data;

}


function test_getButtonCssSettings(){

  const data =
    getButtonCssSettings();

  Logger.log(
    JSON.stringify(data,null,2)
  );

}