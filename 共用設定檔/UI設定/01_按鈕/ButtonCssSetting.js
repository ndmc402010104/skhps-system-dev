const CSS_DB_SPREADSHEET_ID =
  '1Kd2T_XhkeAUyDzmdXvDUBcHKbmGII-7sky5nfJ8PY50';

const CSS_SHEETS = {
  BUTTON: '01_按鈕'
};

const DEFAULT_MARK =
  'default';

const CSS_DB_HEADER = [
  'component',
  'className',
  'property',
  'value',
  'description',
  'updatedAt'
];


/* =========================================================
   01 Button CSS DB
   功能：
   1. 第一次讀取時，如果沒有 01_按鈕 Sheet，會自動建立
   2. 如果 Sheet 已存在但缺 token，會自動補齊
   3. 不會清掉既有設定
   4. setupCssDb_01Button() 仍保留為「手動重建」用
========================================================= */


/* 手動重建：會清空 01_按鈕，重新寫入全部 default + current */
function setupCssDb_01Button(){

  const ss =
    SpreadsheetApp.openById(CSS_DB_SPREADSHEET_ID);

  const sh =
    getOrCreateCssSheet_(
      ss,
      CSS_SHEETS.BUTTON
    );

  sh.clear();

  writeCssDbHeader_(
    sh
  );

  const rows =
    buildButtonRows_(
      true
    );

  sh
    .getRange(
      2,
      1,
      rows.length,
      CSS_DB_HEADER.length
    )
    .setValues(
      rows
    );

  formatCssDbSheet_(
    sh
  );

}


/* 讀目前系統設定：updatedAt 不是 default 的最新值 */
function getButtonCssSettings(){

  const sh =
    getOrCreateButtonSheet_();

  ensureButtonRows_(
    sh
  );

  return getButtonCssSettingsByDefaultMark_(
    false
  );

}


/* 讀 default：updatedAt 是 default */
function getButtonDefaultCssSettings(){

  const sh =
    getOrCreateButtonSheet_();

  ensureButtonRows_(
    sh
  );

  return getButtonCssSettingsByDefaultMark_(
    true
  );

}


function getButtonCssSettingsByDefaultMark_(
  wantDefault
){

  const sh =
    getOrCreateButtonSheet_();

  ensureButtonRows_(
    sh
  );

  const values =
    sh
      .getDataRange()
      .getValues();

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

    const key =
      className + '|' + property;

    /*
      default 理論上一筆。
      current 如果歷史上有重複列，吃最後一筆。
    */
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
function saveButtonCssSetting(
  className,
  property,
  value
){

  const sh =
    getOrCreateButtonSheet_();

  ensureButtonRows_(
    sh
  );

  return saveButtonCssSetting_(
    className,
    property,
    value,
    new Date()
  );

}


/* 設為新 default */
function saveButtonDefaultCssSetting(
  className,
  property,
  value
){

  const sh =
    getOrCreateButtonSheet_();

  ensureButtonRows_(
    sh
  );

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
    getOrCreateButtonSheet_();

  ensureButtonRows_(
    sh
  );

  const values =
    sh
      .getDataRange()
      .getValues();

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

      sh
        .getRange(i + 1,4)
        .setValue(value);

      sh
        .getRange(i + 1,6)
        .setValue(updatedAtValue);

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
    getButtonDescription_(
      className,
      property
    ),
    updatedAtValue
  ]);

  formatCssDbSheet_(
    sh
  );

  return {
    ok:true,
    inserted:true
  };

}


/* =========================================================
   Sheet 建立 / 補齊
========================================================= */


function getOrCreateButtonSheet_(){

  const ss =
    SpreadsheetApp.openById(CSS_DB_SPREADSHEET_ID);

  const sh =
    getOrCreateCssSheet_(
      ss,
      CSS_SHEETS.BUTTON
    );

  ensureCssDbHeader_(
    sh
  );

  return sh;

}


function getOrCreateCssSheet_(
  ss,
  sheetName
){

  let sh =
    ss.getSheetByName(
      sheetName
    );

  if(sh){
    return sh;
  }

  sh =
    ss.insertSheet(
      sheetName
    );

  writeCssDbHeader_(
    sh
  );

  formatCssDbSheet_(
    sh
  );

  return sh;

}


function ensureCssDbHeader_(
  sh
){

  const lastColumn =
    Math.max(
      sh.getLastColumn(),
      CSS_DB_HEADER.length
    );

  const firstRow =
    sh
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];

  const headerIsValid =
    CSS_DB_HEADER.every(function(name,index){
      return firstRow[index] === name;
    });

  if(headerIsValid){
    return;
  }

  writeCssDbHeader_(
    sh
  );

  formatCssDbSheet_(
    sh
  );

}


function writeCssDbHeader_(
  sh
){

  sh
    .getRange(
      1,
      1,
      1,
      CSS_DB_HEADER.length
    )
    .setValues([
      CSS_DB_HEADER
    ]);

}


function ensureButtonRows_(
  sh
){

  ensureCssDbHeader_(
    sh
  );

  const values =
    sh
      .getDataRange()
      .getValues();

  const existing = {};

  for(let i = 1; i < values.length; i++){

    const row =
      values[i];

    if(row[0] !== 'button'){
      continue;
    }

    const isDefault =
      String(row[5]).trim() === DEFAULT_MARK;

    const mode =
      isDefault
      ? 'default'
      : 'current';

    const key =
      mode + '|' + row[1] + '|' + row[2];

    existing[key] =
      true;

  }

  const missingRows = [];

  getButtonDefaultTokens_().forEach(function(item){

    const defaultKey =
      'default|' +
      item.className +
      '|' +
      item.property;

    if(!existing[defaultKey]){

      missingRows.push([
        'button',
        item.className,
        item.property,
        item.value,
        item.description,
        DEFAULT_MARK
      ]);

    }

    const currentKey =
      'current|' +
      item.className +
      '|' +
      item.property;

    if(!existing[currentKey]){

      missingRows.push([
        'button',
        item.className,
        item.property,
        item.value,
        item.description,
        new Date()
      ]);

    }

  });

  if(missingRows.length > 0){

    sh
      .getRange(
        sh.getLastRow() + 1,
        1,
        missingRows.length,
        CSS_DB_HEADER.length
      )
      .setValues(
        missingRows
      );

    formatCssDbSheet_(
      sh
    );

  }

}


function formatCssDbSheet_(
  sh
){

  sh.setFrozenRows(1);

  sh
    .getRange(
      1,
      1,
      1,
      CSS_DB_HEADER.length
    )
    .setFontWeight('bold');

  sh.autoResizeColumns(
    1,
    CSS_DB_HEADER.length
  );

}


/* =========================================================
   Button 預設 token
========================================================= */


function buildButtonRows_(
  includeCurrent
){

  const rows = [];

  getButtonDefaultTokens_().forEach(function(item){

    rows.push([
      'button',
      item.className,
      item.property,
      item.value,
      item.description,
      DEFAULT_MARK
    ]);

    if(includeCurrent){

      rows.push([
        'button',
        item.className,
        item.property,
        item.value,
        item.description,
        new Date()
      ]);

    }

  });

  return rows;

}


function getButtonDescription_(
  className,
  property
){

  const found =
    getButtonDefaultTokens_().find(function(item){
      return (
        item.className === className &&
        item.property === property
      );
    });

  return found
    ? found.description
    : className + ' ' + property;

}


function getButtonDefaultTokens_(){

  return [

    /* Base */
    token_('base','borderWidth','1px','Base 邊框粗細'),
    token_('base','borderStyle','solid','Base 邊框樣式'),
    token_('base','borderColor','transparent','Base 邊框顏色'),
    token_('base','radius','var(--skh-radius)','Base 圓角'),
    token_('base','paddingY','10px','Base 垂直 padding'),
    token_('base','paddingX','16px','Base 水平 padding'),
    token_('base','fontSize','14px','Base 字級'),
    token_('base','fontWeight','700','Base 字重'),
    token_('base','gap','6px','Base icon 與文字間距'),
    token_('base','lineHeight','1.2','Base 行高'),
    token_('base','hoverShadow','0 8px 20px rgba(15,23,42,.08)','Hover 陰影'),
    token_('base','activeShadow','0 3px 10px rgba(15,23,42,.06)','Active 陰影'),
    token_('base','focusOutline','3px solid rgba(37,99,235,.25)','Focus outline'),
    token_('base','focusOutlineOffset','2px','Focus outline offset'),

    /* Primary */
    token_('primary','bg','#344f9f','Primary 背景'),
    token_('primary','text','#ffffff','Primary 文字'),
    token_('primary','border','#344f9f','Primary 邊框'),
    token_('primary','hoverBg','#344f9f','Primary hover 背景'),
    token_('primary','hoverBorder','#344f9f','Primary hover 邊框'),

    /* Secondary */
    token_('secondary','bg','#ffffff','Secondary 背景'),
    token_('secondary','text','#475569','Secondary 文字'),
    token_('secondary','border','#cbd5e1','Secondary 邊框'),
    token_('secondary','hoverBg','#f8fafc','Secondary hover 背景'),
    token_('secondary','hoverBorder','#94a3b8','Secondary hover 邊框'),

    /* Danger */
    token_('danger','bg','#fff7f7','Danger 背景'),
    token_('danger','text','#b42318','Danger 文字'),
    token_('danger','border','#f4b4ae','Danger 邊框'),
    token_('danger','hoverBg','#feeceb','Danger hover 背景'),
    token_('danger','hoverBorder','#e98078','Danger hover 邊框'),

    /* Ghost */
    token_('ghost','bg','transparent','Ghost 背景'),
    token_('ghost','text','#344f9f','Ghost 文字'),
    token_('ghost','border','transparent','Ghost 邊框'),
    token_('ghost','hoverBg','#eef3ff','Ghost hover 背景'),
    token_('ghost','hoverBorder','transparent','Ghost hover 邊框'),

    /* Camera */
    token_('camera','bg','#eef6ff','Camera 背景'),
    token_('camera','text','#1d4ed8','Camera 文字'),
    token_('camera','border','#bfdbfe','Camera 邊框'),
    token_('camera','hoverBg','#dbeafe','Camera hover 背景'),
    token_('camera','hoverBorder','#93c5fd','Camera hover 邊框'),

    /* Size */
    token_('sm','paddingY','6px','Small 垂直 padding'),
    token_('sm','paddingX','10px','Small 水平 padding'),
    token_('sm','fontSize','13px','Small 字級'),

    token_('lg','paddingY','14px','Large 垂直 padding'),
    token_('lg','paddingX','20px','Large 水平 padding'),
    token_('lg','fontSize','16px','Large 字級'),

    token_('full','width','100%','Full width 寬度'),

    /* Shape */
    token_('icon','width','36px','Icon 寬度'),
    token_('icon','height','36px','Icon 高度'),
    token_('icon','padding','0px','Icon padding'),

    token_('pill','radius','999px','Pill 圓角'),

    /* State */
    token_('selected','bg','var(--skh-primary)','Selected 背景'),
    token_('selected','text','#ffffff','Selected 文字'),
    token_('selected','border','var(--skh-primary)','Selected 邊框'),

    token_('loading','opacity','.85','Loading 透明度'),
    token_('loading','spinnerSize','14px','Loading spinner 大小'),
    token_('loading','spinnerBorderWidth','2px','Loading spinner 邊框粗細'),
    token_('loading','spinnerBorderColor','rgba(255,255,255,.35)','Loading spinner 邊框顏色'),
    token_('loading','spinnerTopColor','currentColor','Loading spinner top 顏色'),

    token_('disabled','opacity','.5','Disabled 透明度'),

    /* Group */
    token_('group','gap','8px','Button group gap'),
    token_('toolbar','gap','10px','Button toolbar gap'),

    /* Mobile */
    token_('mobile','minHeight','44px','Mobile button min-height'),
    token_('iconMobile','width','44px','Mobile icon 寬度'),
    token_('iconMobile','height','44px','Mobile icon 高度')

  ];

}


function token_(
  className,
  property,
  value,
  description
){

  return {
    className:className,
    property:property,
    value:value,
    description:description
  };

}
