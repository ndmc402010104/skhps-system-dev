/**
 * 檔案位置：數據網頁&參考系統/DressingInventory.js
 * 時間戳記：2026-06-02 00:36 UTC+8
 * 用途：敷料批號庫存 MVP 後端；讀取與寫入「批號庫存」Sheet，支援院內碼＋扣庫單位＋批號＋效期唯一鍵累加庫存。
 *
 * 對應前端：科室系統用戶端/DressingFront.html
 * 對應 Sheet gid：1869036956
 * 建議 Sheet 名稱：批號庫存
 * 欄位：院內碼｜扣庫單位｜批號｜效期｜庫存數量
 */

const DRESSING_INVENTORY_SPREADSHEET_ID = '1SJIQGgViQo6AhSDvJTNcNDx_KNXEjgTMfJh4R9SIMvk';
const DRESSING_INVENTORY_SHEET_ID = 1869036956;
const DRESSING_INVENTORY_SHEET_NAME = '批號庫存';
const DRESSING_INVENTORY_HEADERS = ['院內碼', '扣庫單位', '批號', '效期', '庫存數量'];

/**
 * 前端 google.script.run.listDressingInventory() 使用。
 */
function listDressingInventory() {
  try {
    const sheet = getDressingInventorySheet_();
    ensureDressingInventoryHeader_(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, data: [] };
    }

    const values = sheet.getRange(2, 1, lastRow - 1, DRESSING_INVENTORY_HEADERS.length).getValues();
    const data = values
      .filter(function(row) {
        return row.some(function(cell) { return String(cell || '').trim() !== ''; });
      })
      .map(function(row) {
        return {
          hospitalCode: String(row[0] || '').trim(),
          stockUnit: String(row[1] || '').trim(),
          lot: String(row[2] || '').trim(),
          exp: normalizeInventoryDateForClient_(row[3]),
          quantity: Number(row[4] || 0) || 0
        };
      })
      .filter(function(item) {
        return item.hospitalCode || item.stockUnit || item.lot || item.exp || item.quantity;
      });

    return { ok: true, data: data };
  } catch (error) {
    return { ok: false, message: error && error.message ? error.message : String(error) };
  }
}

/**
 * 前端 google.script.run.addDressingInventoryStock(payload) 使用。
 * 同一組：院內碼＋扣庫單位＋批號＋效期，直接累加庫存數量。
 */
function addDressingInventoryStock(payload) {
  try {
    payload = payload || {};

    const hospitalCode = String(payload.hospitalCode || '').trim();
    const stockUnit = String(payload.stockUnit || '').trim();
    let lot = String(payload.lot || '').trim();
    const exp = normalizeInventoryDateForClient_(payload.exp || '');
    const quantity = Number(payload.quantity || 0);

    if (!hospitalCode) throw new Error('缺少院內碼');
    if (!stockUnit) throw new Error('缺少扣庫單位');
    if (!lot) lot = buildDressingInventoryAutoLot_(hospitalCode);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('庫存數量必須大於 0');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getDressingInventorySheet_();
      ensureDressingInventoryHeader_(sheet);

      const lastRow = sheet.getLastRow();
      let targetRow = 0;
      let oldQuantity = 0;

      if (lastRow >= 2) {
        const values = sheet.getRange(2, 1, lastRow - 1, DRESSING_INVENTORY_HEADERS.length).getValues();

        for (let i = 0; i < values.length; i++) {
          const row = values[i];
          const rowHospitalCode = String(row[0] || '').trim();
          const rowStockUnit = String(row[1] || '').trim();
          const rowLot = String(row[2] || '').trim();
          const rowExp = normalizeInventoryDateForClient_(row[3]);

          if (
            rowHospitalCode === hospitalCode &&
            rowStockUnit === stockUnit &&
            rowLot === lot &&
            rowExp === exp
          ) {
            targetRow = i + 2;
            oldQuantity = Number(row[4] || 0) || 0;
            break;
          }
        }
      }

      if (targetRow) {
        const newQuantity = oldQuantity + quantity;
        sheet.getRange(targetRow, 5).setValue(newQuantity);
        return {
          ok: true,
          merged: true,
          row: targetRow,
          oldQuantity: oldQuantity,
          addedQuantity: quantity,
          newQuantity: newQuantity
        };
      }

      const appendRow = [hospitalCode, stockUnit, lot, exp, quantity];
      sheet.appendRow(appendRow);

      return {
        ok: true,
        merged: false,
        row: sheet.getLastRow(),
        oldQuantity: 0,
        addedQuantity: quantity,
        newQuantity: quantity
      };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { ok: false, message: error && error.message ? error.message : String(error) };
  }
}

/**
 * 保留給前端 wrapper；目前查主檔仍走 lookupDressingBarcode，這支先做簡單相容。
 */
function lookupDressingInventoryBarcode(code) {
  try {
    if (typeof lookupDressingBarcode === 'function') {
      return lookupDressingBarcode(code);
    }

    return {
      ok: false,
      found: false,
      message: 'lookupDressingBarcode 不存在，請確認 Dressing.js 已載入。'
    };
  } catch (error) {
    return { ok: false, found: false, message: error && error.message ? error.message : String(error) };
  }
}

/**
 * 如果你的 JSONP action router 是集中式，可以在 doGet 裡呼叫這支。
 * 例如：
 * const inv = handleDressingInventoryAction_(e.parameter);
 * if (inv) return outputJsonp_(inv, e.parameter.callback);
 */
function handleDressingInventoryAction_(params) {
  params = params || {};
  const action = String(params.action || '').trim();

  if (action === 'listDressingInventory') {
    return listDressingInventory();
  }

  if (action === 'addDressingInventoryStock') {
    return addDressingInventoryStock({
      hospitalCode: params.hospitalCode || '',
      stockUnit: params.stockUnit || '',
      lot: params.lot || '',
      exp: params.exp || '',
      quantity: params.quantity || ''
    });
  }

  if (action === 'lookupDressingInventoryBarcode') {
    return lookupDressingInventoryBarcode(params.code || params.gtin || '');
  }

  return null;
}

function buildDressingInventoryAutoLot_(hospitalCode) {
  const code = String(hospitalCode || '').replace(/[^A-Za-z0-9]/g, '').trim() || 'UNKNOWN';
  const now = new Date();
  return code + Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMddHHmm');
}

function getDressingInventorySheet_() {
  const ss = SpreadsheetApp.openById(DRESSING_INVENTORY_SPREADSHEET_ID);
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === DRESSING_INVENTORY_SHEET_ID) {
      return sheets[i];
    }
  }

  const byName = ss.getSheetByName(DRESSING_INVENTORY_SHEET_NAME);
  if (byName) return byName;

  throw new Error('找不到批號庫存 Sheet：gid=' + DRESSING_INVENTORY_SHEET_ID + '，名稱=' + DRESSING_INVENTORY_SHEET_NAME);
}

function ensureDressingInventoryHeader_(sheet) {
  const range = sheet.getRange(1, 1, 1, DRESSING_INVENTORY_HEADERS.length);
  const current = range.getValues()[0].map(function(v) { return String(v || '').trim(); });
  const same = DRESSING_INVENTORY_HEADERS.every(function(header, index) {
    return current[index] === header;
  });

  if (!same) {
    range.setValues([DRESSING_INVENTORY_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function normalizeInventoryDateForClient_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy-MM-dd');
  }

  const text = String(value || '').trim();
  if (!text) return '';

  const slashMatch = text.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (slashMatch) {
    return [
      slashMatch[1],
      String(slashMatch[2]).padStart(2, '0'),
      String(slashMatch[3]).padStart(2, '0')
    ].join('-');
  }

  const dashMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    return [
      dashMatch[1],
      String(dashMatch[2]).padStart(2, '0'),
      String(dashMatch[3]).padStart(2, '0')
    ].join('-');
  }

  return text;
}
