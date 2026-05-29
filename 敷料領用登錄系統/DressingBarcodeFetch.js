const DRESSING_BARCODE_SHEET_ID =
'1SJIQGgViQo6AhSDvJTNcNDx_KNXEjgTMfJh4R9SIMvk';

const DRESSING_MASTER_SHEET_GID =
1319808727;

const DRESSING_MASTER_SHEET_NAME =
'敷料主檔';

const DRESSING_MASTER_INTERNAL_KEYS = [
  'hospitalCode',
  'dressingName',
  'size',
  'gtin',
  'boxGtin',
  'boxQuantity',
  'category',
  'status'
];

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

const DRESSING_KEY_TO_DISPLAY_MAP = {};
DRESSING_MASTER_INTERNAL_KEYS.forEach(function(key, index){
  DRESSING_KEY_TO_DISPLAY_MAP[key] =
    DRESSING_MASTER_DISPLAY_NAMES[index];
});

const DRESSING_DISPLAY_TO_KEY_MAP = {};
DRESSING_MASTER_DISPLAY_NAMES.forEach(function(name, index){
  DRESSING_DISPLAY_TO_KEY_MAP[name] =
    DRESSING_MASTER_INTERNAL_KEYS[index];
});

function handleDressingBarcodeGet(e){
  const data = e.parameter || {};
  const action = data.action || '';

  try{
    if(action === 'lookupDressingBarcode'){
      return apiOutput_(
        lookupDressingBarcode_(data.gtin || data.singleGtin || data.boxGtin),
        data.callback
      );
    }

    if(action === 'findDressingPairCandidates'){
      return apiOutput_(findDressingPairCandidates_(data), data.callback);
    }

    if(action === 'saveDressingBarcode'){
      return apiOutput_(saveDressingBarcode_(data), data.callback);
    }

    if(action === 'listDressingBarcode'){
      return apiOutput_(listDressingBarcode_(), data.callback);
    }

    if(action === 'deleteDressingBarcode'){
      return apiOutput_(deleteDressingBarcode_(data), data.callback);
    }

    if(action === 'reorderDressingBarcode'){
      return apiOutput_(reorderDressingBarcode_(data), data.callback);
    }

    if(action === 'ping'){
      return apiOutput_(pingDressingBarcode_(), data.callback);
    }

    if(action === 'whoami'){
      return apiOutput_(whoamiDressingBarcode_(), data.callback);
    }

    return apiOutput_({ ok:false, message:'unknown action' }, data.callback);

  } catch(error){
    return apiOutput_(errorDressingBarcode_(error, action), data.callback);
  }
}

function handleDressingBarcodePost(e){
  const data = JSON.parse(e.postData.contents || '{}');
  const action = data.action || '';

  try{
    if(action === 'lookupDressingBarcode'){
      return jsonOutput_(
        lookupDressingBarcode_(data.gtin || data.singleGtin || data.boxGtin)
      );
    }

    if(action === 'findDressingPairCandidates'){
      return jsonOutput_(findDressingPairCandidates_(data));
    }

    if(action === 'saveDressingBarcode'){
      return jsonOutput_(saveDressingBarcode_(data));
    }

    if(action === 'listDressingBarcode'){
      return jsonOutput_(listDressingBarcode_());
    }

    if(action === 'deleteDressingBarcode'){
      return jsonOutput_(deleteDressingBarcode_(data));
    }

    if(action === 'reorderDressingBarcode'){
      return jsonOutput_(reorderDressingBarcode_(data));
    }

    if(action === 'ping'){
      return jsonOutput_(pingDressingBarcode_());
    }

    if(action === 'whoami'){
      return jsonOutput_(whoamiDressingBarcode_());
    }

    return jsonOutput_({ ok:false, message:'unknown action' });

  } catch(error){
    return jsonOutput_(errorDressingBarcode_(error, action));
  }
}

function normalizeDressingCode_(value){

  let code =
    String(value || '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\s+/g, '')
      .trim();

  /*
    GTIN 常見：
    13碼 EAN
    14碼 GTIN

    前面補0視為同一碼
  */

  if(/^\d+$/.test(code)){

    /*
      全部左補到14碼
    */

    code =
      code.padStart(14, '0');

  }

  return code;

}


function normalizeDressingOrderKey_(value){
  const raw = String(value || '').trim();
  const code = normalizeDressingCode_(raw);

  if(/^\d+$/.test(raw.replace(/\s+/g, ''))){
    return code;
  }

  return raw;
}

function normalizeDressingText_(value){
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[×Xx＊]/g, '*')
    .toLowerCase();
}

function addDressingAliases_(obj){
  obj.gtin = normalizeDressingCode_(obj.gtin);
  obj.singleGtin = obj.gtin;
  obj.boxGtin = normalizeDressingCode_(obj.boxGtin);
  obj.boxQuantity = obj.boxQuantity === undefined ? '' : obj.boxQuantity;
  obj.status = obj.status || '使用中';
  return obj;
}

function getDressingBarcodeSheet_(){
  const ss = SpreadsheetApp.openById(DRESSING_BARCODE_SHEET_ID);
  const sheets = ss.getSheets();

  for(let i = 0; i < sheets.length; i++){
    if(sheets[i].getSheetId() === DRESSING_MASTER_SHEET_GID){
      setupDressingBarcodeHeader_(sheets[i]);
      return sheets[i];
    }
  }

  throw new Error(
    '找不到指定的敷料主檔 sheet，gid=' + DRESSING_MASTER_SHEET_GID
  );
}

function getDressingTable_(){
  const sheet = getDressingBarcodeSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];

  return {
    sheet: sheet,
    values: values,
    headers: headers,
    gtinCol: headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.gtin),
    boxGtinCol: headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.boxGtin),
    nameCol: headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.dressingName),
    sizeCol: headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.size)
  };
}

function lookupDressingBarcode_(gtin){
  const code = normalizeDressingCode_(gtin);

  if(!code){
    return { ok:false, message:'empty gtin' };
  }

  const table = getDressingTable_();

  const emptyData = addDressingAliases_({
    gtin: code,
    hospitalCode: '',
    dressingName: '',
    size: '',
    category: '',
    boxGtin: '',
    boxQuantity: '',
    status: '使用中'
  });

  if(table.values.length <= 1){
    return {
      ok:true,
      found:false,
      matchType:'',
      packageType:'unknown',
      unitQuantity:1,
      data:emptyData
    };
  }

  if(table.gtinCol < 0){
    return {
      ok:false,
      message:'missing gtin header',
      headers:table.headers
    };
  }

  for(let i = 1; i < table.values.length; i++){
    const row = table.values[i];

    const singleCode =
      normalizeDressingCode_(row[table.gtinCol]);

    const boxCode =
      table.boxGtinCol >= 0
        ? normalizeDressingCode_(row[table.boxGtinCol])
        : '';

    if(singleCode === code || boxCode === code){
      const obj = addDressingAliases_(
        rowToObject_(table.headers, row)
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

  return {
    ok:true,
    found:false,
    matchType:'',
    packageType:'unknown',
    unitQuantity:1,
    data:emptyData
  };
}

function findDressingPairCandidates_(data){
  const nameKey = normalizeDressingText_(data.dressingName);
  const sizeKey = normalizeDressingText_(data.size);
  const targetType = String(data.targetType || '').trim();

  if(!nameKey || !sizeKey){
    return {
      ok:true,
      candidates:[]
    };
  }

  const table = getDressingTable_();

  if(table.values.length <= 1){
    return {
      ok:true,
      candidates:[]
    };
  }

  const candidates = [];

  for(let i = 1; i < table.values.length; i++){
    const row = table.values[i];
    const obj = addDressingAliases_(
      rowToObject_(table.headers, row)
    );

    const sameName =
      normalizeDressingText_(obj.dressingName) === nameKey;

    const sameSize =
      normalizeDressingText_(obj.size) === sizeKey;

    if(!sameName || !sameSize){
      continue;
    }

    if(targetType === 'box' && obj.boxGtin){
      continue;
    }

    if(targetType === 'single' && obj.gtin){
      continue;
    }

    candidates.push({
      row:i + 1,
      data:obj
    });
  }

  return {
    ok:true,
    candidates:candidates
  };
}

function saveDressingBarcode_(data){
  const table = getDressingTable_();

  const originalGtin = normalizeDressingCode_(data.originalGtin);
  const originalBoxGtin = normalizeDressingCode_(data.originalBoxGtin);

  const gtin =
    normalizeDressingCode_(data.gtin || data.singleGtin);

  const boxGtin =
    normalizeDressingCode_(data.boxGtin);

  const hospitalCode = String(data.hospitalCode || '').trim();
  const hospitalCodeCol = table.headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.hospitalCode);

  const hasKeyField =
    hospitalCode ||
    gtin ||
    boxGtin;

  if(!hasKeyField){
    return {
      ok:false,
      message:'院內碼、單包GTIN、包裝GTIN至少填一項'
    };
  }

  if(table.gtinCol < 0){
    return {
      ok:false,
      message:'missing gtin header',
      headers:table.headers
    };
  }

  let targetRow = -1;
  let targetReason = '';

  if(originalGtin || originalBoxGtin){
    for(let i = 1; i < table.values.length; i++){
      const rowSingle = normalizeDressingCode_(table.values[i][table.gtinCol]);
      const rowBox = table.boxGtinCol >= 0 ? normalizeDressingCode_(table.values[i][table.boxGtinCol]) : '';

      if((originalGtin && rowSingle === originalGtin) || (originalBoxGtin && rowBox === originalBoxGtin)){
        targetRow = i + 1;
        targetReason = 'original_gtin';
        break;
      }
    }
  }

  if(targetRow < 0 && hospitalCode && hospitalCodeCol >= 0){
    for(let i = 1; i < table.values.length; i++){
      const rowHospitalCode = String(table.values[i][hospitalCodeCol] || '').trim();
      if(rowHospitalCode === hospitalCode){
        targetRow = i + 1;
        targetReason = 'hospitalCode';
        break;
      }
    }
  }

  if(targetRow < 0){
    for(let i = 1; i < table.values.length; i++){
      const rowSingle = normalizeDressingCode_(table.values[i][table.gtinCol]);
      const rowBox = table.boxGtinCol >= 0 ? normalizeDressingCode_(table.values[i][table.boxGtinCol]) : '';

      if(
        (gtin && rowSingle === gtin) ||
        (boxGtin && rowBox === boxGtin)
      ){
        targetRow = i + 1;
        targetReason = 'gtin';
        break;
      }
    }
  }

  if(targetRow < 0){
    const nameKey = normalizeDressingText_(data.dressingName);
    const sizeKey = normalizeDressingText_(data.size);

    if(nameKey && sizeKey){
      const pairCandidates = [];

      for(let i = 1; i < table.values.length; i++){
        const row = table.values[i];
        const obj = addDressingAliases_(
          rowToObject_(table.headers, row)
        );

        const sameName =
          normalizeDressingText_(obj.dressingName) === nameKey;

        const sameSize =
          normalizeDressingText_(obj.size) === sizeKey;

        if(!sameName || !sameSize){
          continue;
        }

        const canMergeBox =
          boxGtin && !obj.boxGtin;

        const canMergeSingle =
          gtin && !obj.gtin;

        if(canMergeBox || canMergeSingle){
          pairCandidates.push({
            row:i + 1,
            data:obj
          });
        }
      }

      if(pairCandidates.length === 1){
        targetRow = pairCandidates[0].row;
        targetReason = 'name_size_pair';
      }

      if(pairCandidates.length > 1){
        return {
          ok:false,
          message:'找到多筆同名同規格資料，請先在前端明確選擇要合併哪一筆',
          candidates:pairCandidates
        };
      }
    }
  }

  let existingObj = null;

  if(targetRow > 0){
    existingObj = addDressingAliases_(
      rowToObject_(
        table.headers,
        table.values[targetRow - 1]
      )
    );
  }

  const rowData = {
    hospitalCode:
      data.hospitalCode ||
      (existingObj ? existingObj.hospitalCode : '') ||
      '',
    dressingName:
      data.dressingName ||
      (existingObj ? existingObj.dressingName : '') ||
      '',
    size:
      data.size ||
      (existingObj ? existingObj.size : '') ||
      '',
    gtin:
      gtin ||
      (existingObj ? existingObj.gtin : '') ||
      '',
    boxGtin:
      boxGtin ||
      (existingObj ? existingObj.boxGtin : '') ||
      '',
    boxQuantity:
      data.boxQuantity ||
      (existingObj ? existingObj.boxQuantity : '') ||
      '',
    category:
      data.category ||
      (existingObj ? existingObj.category : '') ||
      '',
    status:
      data.status ||
      (existingObj ? existingObj.status : '') ||
      '使用中'
  };

  const row =
    objectToRow_(rowData, table.headers);

  if(targetRow > 0){
    table.sheet
      .getRange(targetRow, 1, 1, table.headers.length)
      .setValues([row]);

    return {
      ok:true,
      mode:'updated',
      mergeReason:targetReason,
      row:targetRow,
      data:addDressingAliases_(rowData)
    };
  }

  table.sheet.appendRow(row);

  return {
    ok:true,
    mode:'created',
    mergeReason:'',
    row:table.sheet.getLastRow(),
    data:addDressingAliases_(rowData)
  };
}

function listDressingBarcode_(){
  const table = getDressingTable_();

  if(table.values.length <= 1){
    return {
      ok:true,
      data:[]
    };
  }

  if(table.gtinCol < 0){
    throw new Error('missing gtin header');
  }

  const hospitalCodeCol =
    table.headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.hospitalCode);

  const data = [];

  for(let i = 1; i < table.values.length; i++){
    const row = table.values[i];

    const gtin =
      normalizeDressingCode_(row[table.gtinCol]);

    const boxGtin =
      table.boxGtinCol >= 0
        ? normalizeDressingCode_(row[table.boxGtinCol])
        : '';

    const hospitalCode =
      hospitalCodeCol >= 0
        ? String(row[hospitalCodeCol] || '').trim()
        : '';

    if(!hospitalCode && !gtin && !boxGtin){
      continue;
    }

    data.push(
      addDressingAliases_(
        rowToObject_(table.headers, row)
      )
    );
  }

  return {
    ok:true,
    data:data
  };
}

function deleteDressingBarcode_(data){
  const code =
    normalizeDressingCode_(
      data.gtin ||
      data.singleGtin ||
      data.boxGtin
    );

  const hospitalCode =
    String(data.hospitalCode || '').trim();

  if(!code && !hospitalCode){
    return {
      ok:false,
      message:'empty key'
    };
  }

  const table = getDressingTable_();
  const hospitalCodeCol =
    table.headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.hospitalCode);

  if(table.values.length <= 1){
    return {
      ok:true,
      deleted:false,
      message:'not found'
    };
  }

  for(let i = 1; i < table.values.length; i++){
    const rowSingle =
      table.gtinCol >= 0
        ? normalizeDressingCode_(table.values[i][table.gtinCol])
        : '';

    const rowBox =
      table.boxGtinCol >= 0
        ? normalizeDressingCode_(table.values[i][table.boxGtinCol])
        : '';

    const rowHospitalCode =
      hospitalCodeCol >= 0
        ? String(table.values[i][hospitalCodeCol] || '').trim()
        : '';

    if(
      (code && (rowSingle === code || rowBox === code)) ||
      (!code && hospitalCode && rowHospitalCode === hospitalCode)
    ){
      table.sheet.deleteRow(i + 1);
      return {
        ok:true,
        deleted:true,
        gtin:code,
        hospitalCode:hospitalCode
      };
    }
  }

  return {
    ok:true,
    deleted:false,
    message:'not found'
  };
}

function reorderDressingBarcode_(data){
  const order =
    String(data.barcodes || '')
      .split(',')
      .map(function(item){
        return normalizeDressingOrderKey_(item);
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

  const table = getDressingTable_();

  if(table.values.length <= 1){
    return {
      ok:true,
      ordered:order
    };
  }

  if(table.gtinCol < 0){
    return {
      ok:false,
      message:'missing gtin header'
    };
  }

  const dataRows =
    table.values.slice(1);

  const rowMap = {};
  const hospitalCodeCol =
    table.headers.indexOf(DRESSING_KEY_TO_DISPLAY_MAP.hospitalCode);

  dataRows.forEach(function(row){
    const singleCode =
      normalizeDressingCode_(row[table.gtinCol]);

    const boxCode =
      table.boxGtinCol >= 0
        ? normalizeDressingCode_(row[table.boxGtinCol])
        : '';

    const hospitalCode =
      hospitalCodeCol >= 0
        ? String(row[hospitalCodeCol] || '').trim()
        : '';

    const key =
      singleCode || boxCode || hospitalCode;

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
    table.sheet
      .getRange(2, 1, table.sheet.getLastRow() - 1, table.sheet.getLastColumn())
      .clearContent();

    table.sheet
      .getRange(2, 1, newRows.length, table.headers.length)
      .setValues(newRows);
  }

  return {
    ok:true,
    ordered:order
  };
}

function setupDressingBarcodeHeader_(sheet){
  const lastColumn =
    sheet.getLastColumn();

  const firstRow =
    lastColumn > 0
      ? sheet
        .getRange(
          1,
          1,
          1,
          Math.max(lastColumn, DRESSING_MASTER_DISPLAY_NAMES.length)
        )
        .getValues()[0]
      : [];

  const hasHeader =
    firstRow
      .map(String)
      .join('')
      .trim() !== '';

  if(!hasHeader){
    sheet
      .getRange(1, 1, 1, DRESSING_MASTER_DISPLAY_NAMES.length)
      .setValues([DRESSING_MASTER_DISPLAY_NAMES]);
    return;
  }

  const headers =
    firstRow.map(function(value){
      return String(value || '').trim();
    });

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

function rowToObject_(headers, row){
  const obj = {};

  headers.forEach(function(header, index){
    const key =
      DRESSING_DISPLAY_TO_KEY_MAP[header];

    if(key){
      obj[key] = row[index];
    }
  });

  return addDressingAliases_(obj);
}

function objectToRow_(obj, displayHeaders){
  return displayHeaders.map(function(displayHeader){
    const key =
      DRESSING_DISPLAY_TO_KEY_MAP[displayHeader];

    return obj[key] !== undefined
      ? obj[key]
      : '';
  });
}

function pingDressingBarcode_(){
  const sheet = getDressingBarcodeSheet_();

  return {
    ok:true,
    sheetName:sheet.getName(),
    sheetId:sheet.getSheetId(),
    expectedSheetId:DRESSING_MASTER_SHEET_GID,
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
    sheetName:DRESSING_MASTER_SHEET_NAME,
    sheetGid:DRESSING_MASTER_SHEET_GID
  };
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

function jsonOutput_(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return jsonOutput_(obj);
}

function extractGtinFromBarcodeString(barcodeString){
  const raw =
    String(barcodeString || '');

  const cleaned =
    raw
      .replace(/[()]/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();

  const match01 =
    cleaned.match(/01(\d{14})/);

  if(match01 && match01[1]){
    return match01[1];
  }

  return cleaned;
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