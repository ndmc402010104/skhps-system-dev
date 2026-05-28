const DRESSING_BARCODE_SHEET_ID =
'1SJIQGgViQo6AhSDvJTNcNDx_KNXEjgTMfJh4R9SIMvk';

const DRESSING_MASTER_SHEET_NAME =
'敷料主檔'; // This remains the sheet name

// Internal keys for data objects (English names)
const DRESSING_MASTER_INTERNAL_KEYS = [
  'hospitalCode',  // 院內碼
  'dressingName',  // 敷料名稱
  'size',          // 規格描述
  'gtin',          // 單包GTIN
  'boxGtin',       // 包裝GTIN
  'boxQuantity',   // 一盒數量
  'category',      // 敷料分類
  'status'         // 狀態 (使用中, 試用, 停用)
];

// Display names for sheet headers (Chinese names)
const DRESSING_MASTER_DISPLAY_NAMES = [
  '院內碼',
  '敷料名稱',
  '規格描述',
  '單包GTIN',
  '包裝GTIN',
  '一盒數量',
  '敷料分類',
  '狀態'
];

// Mapping from internal key to display name
const DRESSING_KEY_TO_DISPLAY_MAP = {};
DRESSING_MASTER_INTERNAL_KEYS.forEach((key, index) => {
  DRESSING_KEY_TO_DISPLAY_MAP[key] = DRESSING_MASTER_DISPLAY_NAMES[index];
});

// Mapping from display name to internal key
const DRESSING_DISPLAY_TO_KEY_MAP = {};
DRESSING_MASTER_DISPLAY_NAMES.forEach((name, index) => {
  DRESSING_DISPLAY_TO_KEY_MAP[name] = DRESSING_MASTER_INTERNAL_KEYS[index];
});

// DRESSING_MASTER_HEADERS will now refer to the display names for sheet operations
// This is used in setupDressingBarcodeHeader_ for setting actual sheet headers
const DRESSING_MASTER_HEADERS = DRESSING_MASTER_DISPLAY_NAMES;

function handleDressingBarcodeGet(e){

  const data =
    e.parameter || {};

  const action =
    data.action || '';

  try{

    if(action === 'lookupDressingBarcode'){
      return apiOutput_(
        lookupDressingBarcode_(data.gtin),
        data.callback
      );
    }

    if(action === 'ping'){
      return apiOutput_(
        pingDressingBarcode_(),
        data.callback
      );
    }

    if(action === 'whoami'){
      return apiOutput_(
        whoamiDressingBarcode_(),
        data.callback
      );
    }

    if(action === 'saveDressingBarcode'){
      return apiOutput_(
        saveDressingBarcode_(data),
        data.callback
      );
    }

    if(action === 'listDressingBarcode'){
      return apiOutput_(
        listDressingBarcode_(),
        data.callback
      );
    }

    if(action === 'deleteDressingBarcode'){
      return apiOutput_(
        deleteDressingBarcode_(data),
        data.callback
      );
    }

    if(action === 'reorderDressingBarcode'){
      return apiOutput_(
        reorderDressingBarcode_(data),
        data.callback
      );
    }

    return apiOutput_(
      {
        ok:false,
        message:'unknown action'
      },
      data.callback
    );

  }
  catch(error){
    return apiOutput_(
      errorDressingBarcode_(error, action),
      data.callback
    );
  }

}

function handleDressingBarcodePost(e){

  const data =
    JSON.parse(e.postData.contents || '{}');

  const action =
    data.action || '';

  try{

    if(action === 'lookupDressingBarcode'){
      return jsonOutput_(
        lookupDressingBarcode_(data.gtin)
      );
    }

    if(action === 'ping'){
      return jsonOutput_(
        pingDressingBarcode_()
      );
    }

    if(action === 'whoami'){
      return jsonOutput_(
        whoamiDressingBarcode_()
      );
    }

    if(action === 'saveDressingBarcode'){
      return jsonOutput_(
        saveDressingBarcode_(data)
      );
    }

    if(action === 'listDressingBarcode'){
      return jsonOutput_(
        listDressingBarcode_()
      );
    }

    if(action === 'deleteDressingBarcode'){
      return jsonOutput_(
        deleteDressingBarcode_(data)
      );
    }

    if(action === 'reorderDressingBarcode'){
      return jsonOutput_(
        reorderDressingBarcode_(data)
      );
    }

    return jsonOutput_({
      ok:false,
      message:'unknown action'
    });

  }
  catch(error){
    return jsonOutput_(
      errorDressingBarcode_(error, action)
    );
  }

}

function errorDressingBarcode_(error, action){

  return {
    ok:false,
    action:action || '',
    message:error && error.message
      ? error.message
      : String(error),
    stack:error && error.stack
      ? String(error.stack).slice(0, 800)
      : ''
  };

}

function normalizeDressingCode_(value){
  return String(value || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

function addDressingAliases_(obj){
  obj.gtin = normalizeDressingCode_(obj.gtin);
  obj.singleGtin = obj.gtin;
  obj.boxGtin = normalizeDressingCode_(obj.boxGtin);
  obj.boxQuantity = obj.boxQuantity === undefined ? '' : obj.boxQuantity;
  return obj;
}

function getDressingRowKey_(obj){
  return normalizeDressingCode_(obj.gtin || obj.singleGtin || obj.boxGtin);
}

function lookupDressingBarcode_(gtin){

  const code =
    normalizeDressingCode_(gtin);

  if(!code){
    return {
      ok:false,
      message:'empty gtin'
    };
  }

  const sheet =
    getDressingBarcodeSheet_();

  const values =
    sheet.getDataRange().getValues();

  const emptyData = {
    gtin:'',
    singleGtin:'',
    hospitalCode:'',
    dressingName:'',
    size:'',
    category:'',
    boxGtin:'',
    boxQuantity:'',
    status:''
  };

  if(values.length <= 1){
    emptyData.gtin = code;
    emptyData.singleGtin = code;
    return {
      ok:true,
      found:false,
      data:emptyData
    };
  }

  const headers =
    values[0];

  const gtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.gtin);
  const boxGtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.boxGtin);

  if(gtinCol < 0){
    return {
      ok:false,
      message:'missing gtin header',
      headers:headers
    };
  }

  for(let i = 1; i < values.length; i++){

    const singleCode =
      normalizeDressingCode_(values[i][gtinCol]);

    const boxCode =
      boxGtinCol >= 0
        ? normalizeDressingCode_(values[i][boxGtinCol])
        : '';

    if(singleCode === code || boxCode === code){
      const obj =
        addDressingAliases_(
          rowToObject_(headers, values[i])
        );

      const isBox =
        boxCode === code && singleCode !== code;

      return {
        ok:true,
        found:true,
        row:i + 1,
        matchType:isBox ? 'boxGtin' : 'singleGtin',
        packageType:isBox ? 'box' : 'single',
        unitQuantity:isBox ? Number(obj.boxQuantity || 1) : 1,
        data:obj
      };
    }

  }

  emptyData.gtin = code;
  emptyData.singleGtin = code;

  return {
    ok:true,
    found:false,
    matchType:'',
    packageType:'unknown',
    unitQuantity:1,
    data:emptyData
  };

}

function saveDressingBarcode_(data){

  const sheet =
    getDressingBarcodeSheet_();

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0];

  const gtin =
    normalizeDressingCode_(data.gtin || data.singleGtin);

  const boxGtin =
    normalizeDressingCode_(data.boxGtin);

  if (!gtin && !boxGtin) {
    return {
      ok:false,
      message:'empty gtin'
    };
  }

  const gtinCol =
    headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.gtin);

  const boxGtinCol =
    headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.boxGtin);

  if(gtinCol < 0){
    return {
      ok:false,
      message:'missing gtin header',
      headers:headers
    };
  }

  let targetRow = -1;

  for(let i = 1; i < values.length; i++){
    const rowSingle =
      normalizeDressingCode_(values[i][gtinCol]);

    const rowBox =
      boxGtinCol >= 0
        ? normalizeDressingCode_(values[i][boxGtinCol])
        : '';

    if(
      (gtin && rowSingle === gtin) ||
      (boxGtin && rowBox === boxGtin)
    ){
      targetRow = i + 1;
      break;
    }
  }

  const rowData = {
    gtin: gtin,
    hospitalCode: data.hospitalCode || '',
    dressingName: data.dressingName || '',
    size: data.size || '',
    category: data.category || '',
    boxGtin: boxGtin,
    boxQuantity: data.boxQuantity || '',
    status: data.status || '使用中'
  };

  const row = objectToRow_(rowData, headers);

  if(targetRow > 0){
    sheet
      .getRange(targetRow, 1, 1, headers.length)
      .setValues([row]);

    return {
      ok:true,
      mode:'updated',
      row:targetRow,
      data:addDressingAliases_(rowData)
    };
  }

  sheet.appendRow(row);

  return {
    ok:true,
    mode:'created',
    row:sheet.getLastRow(),
    data:addDressingAliases_(rowData)
  };

}

function listDressingBarcode_(){

  const sheet =
    getDressingBarcodeSheet_();

  const values =
    sheet.getDataRange().getValues();

  if(values.length <= 1){
    return {
      ok:true,
      data:[]
    };
  }

  const headers =
    values[0];

  const gtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.gtin);
  const boxGtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.boxGtin);

  if(gtinCol < 0){
    throw new Error('missing gtin header');
  }

  const data = [];

  for(let i = 1; i < values.length; i++){
    const row = values[i];
    const gtin = normalizeDressingCode_(row[gtinCol]);
    const boxGtin = boxGtinCol >= 0 ? normalizeDressingCode_(row[boxGtinCol]) : '';

    if(!gtin && !boxGtin){
      continue;
    }

    data.push(
      addDressingAliases_(
        rowToObject_(headers, row)
      )
    );
  }

  return {
    ok:true,
    data:data
  };

}

function deleteDressingBarcode_(data){

  const code = normalizeDressingCode_(data.gtin || data.singleGtin || data.boxGtin);

  if(!code){
    return { ok: false, message: 'empty gtin' };
  }

  const sheet = getDressingBarcodeSheet_();
  const values = sheet.getDataRange().getValues();

  if(values.length <= 1){
    return { ok: true, deleted: false, message: 'not found' };
  }

  const headers = values[0];
  const gtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.gtin);
  const boxGtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.boxGtin);

  for(let i = 1; i < values.length; i++){
    const rowSingle = gtinCol >= 0 ? normalizeDressingCode_(values[i][gtinCol]) : '';
    const rowBox = boxGtinCol >= 0 ? normalizeDressingCode_(values[i][boxGtinCol]) : '';

    if(rowSingle === code || rowBox === code){
      sheet.deleteRow(i + 1);
      return { ok: true, deleted: true, gtin: code };
    }
  }

  return { ok: true, deleted: false, message: 'not found' };

}

function reorderDressingBarcode_(data){

  const order =
    String(data.barcodes || '')
      .split(',')
      .map(function(item){
        return normalizeDressingCode_(item);
      })
      .filter(function(item){
        return item.length > 0;
      });

  if(order.length === 0){
    return {
      ok:false,
      message:'沒有提供排序資料'
    };
  }

  const sheet = getDressingBarcodeSheet_();
  const values = sheet.getDataRange().getValues();

  if(values.length <= 1){
    return { ok: true, ordered: order };
  }

  const headers = values[0];
  const gtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.gtin);
  const boxGtinCol = headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.boxGtin);

  if(gtinCol < 0){
    return { ok: false, message: 'missing gtin header' };
  }

  const dataRows = values.slice(1);
  const rowMap = {};

  dataRows.forEach(function(row){
    const singleCode = normalizeDressingCode_(row[gtinCol]);
    const boxCode = boxGtinCol >= 0 ? normalizeDressingCode_(row[boxGtinCol]) : '';
    const key = singleCode || boxCode;
    if(key){
      rowMap[key] = row;
    }
  });

  const newRows = [];
  order.forEach(function(code){
    if(rowMap[code]){
      newRows.push(rowMap[code]);
      delete rowMap[code];
    }
  });

  Object.keys(rowMap).forEach(function(code){
    newRows.push(rowMap[code]);
  });

  if(newRows.length > 0){
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
  }

  return {
    ok:true,
    ordered:order
  };

}

function getDressingBarcodeSheet_(){

  const ss =
    SpreadsheetApp.openById(
      DRESSING_BARCODE_SHEET_ID
    );

  let sheet =
    ss.getSheetByName(DRESSING_MASTER_SHEET_NAME);

  if(!sheet){
    // If not found at all, create it
    sheet = ss.insertSheet(DRESSING_MASTER_SHEET_NAME);
  }

  setupDressingBarcodeHeader_(sheet);

  return sheet;

}

function setupDressingBarcodeHeader_(sheet){

  const lastColumn =
    sheet.getLastColumn();

  const firstRow =
    lastColumn > 0
      ? sheet.getRange(1, 1, 1, Math.max(lastColumn, DRESSING_MASTER_DISPLAY_NAMES.length)).getValues()[0] // Use DISPLAY_NAMES length
      : [];

  const hasHeader =
    firstRow
      .map(String)
      .join('')
      .trim() !== '';

  if(!hasHeader){
    sheet
      .getRange(1, 1, 1, DRESSING_MASTER_DISPLAY_NAMES.length) // Use DISPLAY_NAMES length
      .setValues([DRESSING_MASTER_DISPLAY_NAMES]); // Set Chinese display names
    return;
  }

  const headers =
    firstRow.map(function(value){
      return String(value || '').trim();
    });

  // Compare actual headers with desired display names
  const missingHeaders =
    DRESSING_MASTER_DISPLAY_NAMES.filter(function(header){
      return headers.indexOf(header) < 0;
    });

  if(missingHeaders.length > 0){
    sheet
      .getRange(1, lastColumn + 1, 1, missingHeaders.length)
      .setValues([missingHeaders]);
  }

}

function pingDressingBarcode_(){

  const sheet =
    getDressingBarcodeSheet_();

  return {
    ok:true,
    sheetName:sheet.getName(),
    lastRow:sheet.getLastRow(),
    lastColumn:sheet.getLastColumn(),
    headers:sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
  };

}

function whoamiDressingBarcode_(){

  return {
    ok:true,
    effectiveUser:Session.getEffectiveUser().getEmail(),
    activeUser:Session.getActiveUser().getEmail(),
    scriptTimeZone:Session.getScriptTimeZone(),
    spreadsheetId:DRESSING_BARCODE_SHEET_ID,
    sheetName:DRESSING_MASTER_SHEET_NAME
  };

}

function rowToObject_(headers, row){

  const obj = {};

  headers.forEach(function(header, index){
    const key = DRESSING_DISPLAY_TO_KEY_MAP[header];
    if (key) {
      obj[key] = row[index];
    }
  });

  return addDressingAliases_(obj);

}



// New helper function to convert an object with English keys to a row array with Chinese headers
function objectToRow_(obj, displayHeaders){
  return displayHeaders.map(function(displayHeader){
    const key = DRESSING_DISPLAY_TO_KEY_MAP[displayHeader]; // Get English key from Chinese display name
    return obj[key] !== undefined ? obj[key] : ''; // Use English key to get value from obj
  });
}

function jsonOutput_(obj){

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}

/**
 * 從包含 GS1 Application Identifiers (AI) 的條碼字串中提取純 GTIN。
 * 優先尋找 (01) AI。如果沒有 (01)，則移除 FNC1 和其他非數字字元。
 * @param {string} barcodeString 原始條碼字串。
 * @returns {string} 提取出的純 GTIN。
 */
function extractGtinFromBarcodeString(barcodeString) {
  const raw = String(barcodeString || '');
  const cleaned = raw
    .replace(/[()]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();

  const match01 = cleaned.match(/01(\d{14})/);
  if (match01 && match01[1]) {
    return match01[1];
  }

  return cleaned;
}

/**
 * 輔助函數：將硬編碼的敷料資料匯入「敷料主檔」工作表。
 * 此函數應在 Apps Script 編輯器中手動執行一次。
 * 它會解析每行資料，並呼叫 saveDressingBarcode_ 函數進行儲存。
 * 儲存結果會被記錄到 Stackdriver Logging。
 */
function importDressingData() {
  const rawData = `(01)04900070187549(17)280400(10)50502515	SI-AID	20*30	9590548
0104049500586436104001061111124020617270201	Atrauman	10*20	9590544
768455132034	Aquacel Ag+	15*15	9590563
5701780205092	Biatain foam	17.5*17.5	9590506
7332430941381	Mepilex Ag	17.5*17.5	9590559
5000223416799	Allevyn	22.5*22.5	9590533
0104052199256405112502071728020110500106158	Hydroclean cavity	4*8	9590661
0104052199255484112503241728030110500113156	Hydroclean cavity	5*5	9590662
4713680390120	Framycin	10*10	1EWF16
01108845210797241730123110D6A4124FY2001	Nylon	3-0	9200431
0104052199255675112409231727090110400339151	Hydroclean cavity	10*10	9590663
0104052199285078112406141727060110400324157	Hydroclean	8*14	9590664
768455132041	Aquacel Ag+	20*30	9590561
(01)14900070187522(17)280200(10)503133319	SI-AID	10*10	9590554
0100707387804701112410311729103010343FAP	美容膠	粗	9442104
768455174843	Duoderm	厚	9590501
010076845517484317300501105E02821	Duoderm	厚	9590501
0105708932709767172804281010318359	Comfeel	10*10	9617513
768455150922	Duoderm	薄	9590511
010076845515092217300101105A02267	Duoderm	薄	9590511
0104064035142742172809091125091010108597294	OP site	中、無邊	9442502`;

  const lines = rawData.split('\n');
  const results = [];

  lines.forEach((line, index) => {
    const parts = line.split('\t'); // 使用 Tab 字元分割資料
    if (parts.length === 4) {
      const rawGtin = parts[0].trim(); // 捕獲原始的 GTIN 字串
      const dressingName = parts[1].trim();
      const size = parts[2].trim();
      const hospitalCode = parts[3].trim();

      const gtin = extractGtinFromBarcodeString(rawGtin); // 提取乾淨的 GTIN

      const dataToSave = {
        gtin: gtin,
        hospitalCode: hospitalCode,
        dressingName: dressingName,
        size: size,
        category: '', // 其他欄位預設為空
        boxGtin: '',
        boxQuantity: '',
        status: '使用中'
      };

      try {
        const result = saveDressingBarcode_(dataToSave);
        results.push({ lineNum: index + 1, data: dataToSave, result: result });
      } catch (error) {
        results.push({ lineNum: index + 1, data: dataToSave, result: { ok: false, message: error.message, stack: error.stack } });
      }
    } else {
      results.push({ lineNum: index + 1, line: line, result: { ok: false, message: 'Invalid number of fields (expected 4, got ' + parts.length + ')' } });
    }
  });

  Logger.log(JSON.stringify(results, null, 2)); // 將結果記錄到 Stackdriver Logging
  return results;
}

function lookupDressingBarcode(gtin){
  return lookupDressingBarcode_(gtin);
}

function saveDressingBarcode(data){
  return saveDressingBarcode_(data);
}

function listDressingBarcode(){
  return listDressingBarcode_();
}

function reorderDressingBarcode(data){
  return reorderDressingBarcode_(data);
}

function deleteDressingBarcode(data){
  return deleteDressingBarcode_(data);
}

function apiOutput_(obj, callback){

  const callbackName =
    String(callback || '').trim();

  if(
    callbackName &&
    /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callbackName)
  ){
    return ContentService
      .createTextOutput(
        callbackName + '(' + JSON.stringify(obj) + ');'
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return jsonOutput_(obj);

}
