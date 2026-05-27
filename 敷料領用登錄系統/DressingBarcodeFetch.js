const DRESSING_BARCODE_SHEET_ID =
'1SJIQGgViQo6AhSDvJTNcNDx_KNXEjgTMfJh4R9SIMvk';

const DRESSING_BARCODE_SHEET_NAME =
'工作表1';

const DRESSING_BARCODE_HEADERS = [
  'createdAt',
  'updatedAt',
  'barcode',
  'dressingName',
  'size',
  'sortOrder',
  'materialCode',
  'payType',
  'vendor',
  'note',
  'active',
  'updatedBy'
];

function handleDressingBarcodeGet(e){

  const data =
    e.parameter || {};

  const action =
    data.action || '';

  try{

  if(action === 'lookupDressingBarcode'){
    return apiOutput_(
      lookupDressingBarcode_(data.barcode),
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
      lookupDressingBarcode_(data.barcode)
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

function lookupDressingBarcode_(barcode){

  const code =
    String(barcode || '').trim();

  if(!code){
    return {
      ok:false,
      message:'empty barcode'
    };
  }

  const sheet =
    getDressingBarcodeSheet_();

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0];

  const barcodeCol =
    headers.indexOf('barcode');

  if(barcodeCol < 0){
    return {
      ok:false,
      message:'missing barcode header',
      headers:headers
    };
  }

  for(let i = 1; i < values.length; i++){

    if(String(values[i][barcodeCol]).trim() === code){

      return {
        ok:true,
        found:true,
        row:i + 1,
        data:rowToObject_(headers, values[i])
      };

    }

  }

  return {
    ok:true,
    found:false,
    data:{
      barcode:code,
      active:true
    }
  };

}

function saveDressingBarcode_(data){

  const sheet =
    getDressingBarcodeSheet_();

  const values =
    sheet.getDataRange().getValues();

  const headers =
    values[0];

  const barcode =
    String(data.barcode || '').trim();

  if(!barcode){
    return {
      ok:false,
      message:'empty barcode'
    };
  }

  const barcodeCol =
    headers.indexOf('barcode');

  if(barcodeCol < 0){
    return {
      ok:false,
      message:'missing barcode header',
      headers:headers
    };
  }

  let targetRow =
    -1;

  for(let i = 1; i < values.length; i++){

    if(String(values[i][barcodeCol]).trim() === barcode){
      targetRow = i + 1;
      break;
    }

  }

  const now =
    new Date();

  const rowData = {
    createdAt: now,
    updatedAt: now,
    barcode: barcode,
    dressingName: data.dressingName || '',
    size: data.size || '',
    materialCode: data.materialCode || '',
    payType: data.payType || '',
    vendor: data.vendor || '',
    note: data.note || '',
    active: data.active === false ? false : true,
    updatedBy: data.updatedBy || ''
  };

  if(targetRow > 0){

    const oldCreatedAt =
      sheet
        .getRange(targetRow, headers.indexOf('createdAt') + 1)
        .getValue();

    rowData.createdAt =
      oldCreatedAt || now;

    const row =
      headers.map(function(header){
        return rowData[header];
      });

    sheet
      .getRange(targetRow, 1, 1, headers.length)
      .setValues([row]);

    return {
      ok:true,
      mode:'updated',
      row:targetRow,
      data:rowData
    };

  }

  const newRow =
    headers.map(function(header){
      return rowData[header];
    });

  sheet.appendRow(newRow);

  return {
    ok:true,
    mode:'created',
    row:sheet.getLastRow(),
    data:rowData
  };

}

function listDressingBarcode_(){
  try{
    const sheet = getDressingBarcodeSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return { ok: true, data: [] };
    }
    const headers = values[0];
    const barcodeCol = headers.indexOf('barcode');
    if (barcodeCol < 0) throw new Error('missing barcode header');

    let list = [];
    for(let i = 1; i < values.length; i++){
      const bc = String(values[i][barcodeCol]).trim();
      if(bc){
        const obj = rowToObject_(headers, values[i]);
        obj.rowIndex = i + 1;
        // 如果沒有排序值，預設給一個很大的數字讓它排在最後面
        obj.sortOrderNum = obj.sortOrder !== '' && !isNaN(obj.sortOrder) ? Number(obj.sortOrder) : 999999 + i;
        list.push(obj);
      }
    }

    list.sort(function(a, b){
      return a.sortOrderNum - b.sortOrderNum;
    });

    const result = list.map(function(item){
      return {
        barcode: item.barcode,
        dressingName: item.dressingName,
        size: item.size
      };
    });

    return { ok: true, data: result };
  } catch(err) {
    return errorDressingBarcode_(err, 'listDressingBarcode');
  }
}

function reorderDressingBarcode_(data){
  try{
    const barcodesStr = data.barcodes || '';
    if(!barcodesStr) return { ok: false, message: '沒有提供排序資料' };
    
    const orderArray = barcodesStr.split(',').map(function(s){ return String(s).trim(); });
    const sheet = getDressingBarcodeSheet_();
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    
    const barcodeCol = headers.indexOf('barcode');
    const sortOrderCol = headers.indexOf('sortOrder');
    if (barcodeCol < 0 || sortOrderCol < 0) return { ok: false, message: '缺少對應欄位' };

    const sortOrderData = [[headers[sortOrderCol]]]; // 裝載新的排序陣列
    for(let i = 1; i < values.length; i++){
      const bc = String(values[i][barcodeCol]).trim();
      const idx = orderArray.indexOf(bc);
      sortOrderData.push([idx !== -1 ? idx + 1 : 999999]); // 更新排序數值
    }
    sheet.getRange(1, sortOrderCol + 1, sortOrderData.length, 1).setValues(sortOrderData);
    return { ok: true };
  } catch(err) {
    return errorDressingBarcode_(err, 'reorderDressingBarcode');
  }
}

function getDressingBarcodeSheet_(){

  const ss =
    SpreadsheetApp.openById(
      DRESSING_BARCODE_SHEET_ID
    );

  const sheet =
    ss.getSheetByName(
      DRESSING_BARCODE_SHEET_NAME
    );

  if(!sheet){
    throw new Error('找不到工作表：' + DRESSING_BARCODE_SHEET_NAME);
  }

  setupDressingBarcodeHeader_(sheet);

  return sheet;

}

function setupDressingBarcodeHeader_(sheet){

  const lastColumn =
    sheet.getLastColumn();

  const firstRow =
    lastColumn > 0
      ? sheet.getRange(1, 1, 1, Math.max(lastColumn, DRESSING_BARCODE_HEADERS.length)).getValues()[0]
      : [];

  const hasHeader =
    firstRow
      .map(String)
      .join('')
      .trim() !== '';

  if(!hasHeader){

    sheet
      .getRange(1, 1, 1, DRESSING_BARCODE_HEADERS.length)
      .setValues([DRESSING_BARCODE_HEADERS]);

    return;

  }

  const headers =
    firstRow.map(function(value){
      return String(value || '').trim();
    });

  const missingHeaders =
    DRESSING_BARCODE_HEADERS.filter(function(header){
      return headers.indexOf(header) < 0;
    });

  if(missingHeaders.length > 0){

    sheet
      .getRange(
        1,
        lastColumn + 1,
        1,
        missingHeaders.length
      )
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
    sheetName:DRESSING_BARCODE_SHEET_NAME
  };

}

function rowToObject_(headers, row){

  const obj = {};

  headers.forEach(function(header, index){
    obj[header] = row[index];
  });

  return obj;

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

function lookupDressingBarcode(barcode){

return lookupDressingBarcode_(barcode);

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
