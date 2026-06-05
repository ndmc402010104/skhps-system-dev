/**
 * 檔案位置：數據網頁&參考系統/DressingInventory.js
 * 時間戳記：2026-06-02 19:05 UTC+8
 * 用途：敷料批號庫存 MVP 後端；讀取與寫入「批號庫存」Sheet，並同步寫入「庫存交易紀錄」。
 *
 * 對應前端：科室系統用戶端/DressingFront.html
 * 對應 Sheet gid：1869036956
 * 建議 Sheet 名稱：批號庫存
 * 欄位：院內碼｜扣庫單位｜批號｜效期｜庫存數量
 */

const DRESSING_INVENTORY_SPREADSHEET_ID = DRESSING_SHEET_ID;
const DRESSING_INVENTORY_SHEET_ID = 1869036956;
const DRESSING_INVENTORY_SHEET_NAME = '批號庫存';
const DRESSING_INVENTORY_HEADERS = ['院內碼', '扣庫單位', '批號', '效期', '庫存數量'];
const DRESSING_USE_RECORD_SHEET_ID = 1534829930;
const DRESSING_USE_RECORD_SHEET_NAME = '領用紀錄';
const DRESSING_USE_RECORD_HEADERS = [
  '領用ID',
  '交易ID',
  '領用時間',
  '領用病歷號',
  'HIS計價狀態',
  '領用主治醫師',
  '領用人',
  '領用單位',
  '備註'
];
const DRESSING_INVENTORY_TRANSACTION_SHEET_ID = 2104684585;
const DRESSING_INVENTORY_TRANSACTION_SHEET_NAME = '庫存交易紀錄';
const DRESSING_INVENTORY_TRANSACTION_HEADERS = [
  '交易ID',
  '交易時間',
  '作業類型',
  '敷料ID',
  '院內碼快照',
  '單包GTIN快照',
  '庫存位置',
  '批號',
  '效期',
  '異動前數量',
  '異動數量',
  '異動後數量',
  '操作者',
  '備註'
];

/**
 * 前端 google.script.run.listDressingInventory() 使用。
 */
function listDressingInventory() {
  try {
    const sheet = getDressingInventorySheet_();
    if (getSkhRuntimeEnv_() !== 'dev') {
      ensureDressingInventoryHeader_(sheet);
    }

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
          exp: readInventoryExpText_(row[3]),
          quantity: Number(row[4] || 0) || 0
        };
      })
      .filter(function(item) {
        return item.hospitalCode || item.stockUnit || item.lot || item.exp || item.quantity;
      });

    return { ok: true, data: data };
  } catch (error) {
    return errorDressingInventory_(error);
  }
}

/**
 * 前端 google.script.run.addDressingInventoryStock(payload) 使用。
 * 同一組：院內碼＋扣庫單位＋批號＋效期。
 * 入庫：累加庫存；盤點：改成實際盤點數。兩者都同步寫入庫存交易紀錄。
 */
function addDressingInventoryStock(payload) {
  try {
    assertSkhSheetWriteAllowed_('dressing');
    payload = payload || {};

    const hospitalCode = String(payload.hospitalCode || '').trim();
    const stockUnit = String(payload.stockUnit || '').trim();
    let lot = String(payload.lot || '').trim();
    const exp = readInventoryExpText_(payload.exp || '');
    const operationType = normalizeDressingInventoryOperationType_(payload.operationType);
    const quantity = Number(payload.quantity || 0);
    const hasActualQuantity =
      payload.actualQuantity !== undefined &&
      payload.actualQuantity !== null &&
      String(payload.actualQuantity).trim() !== '';
    const actualQuantity = Number(payload.actualQuantity);
    const singleGtin = resolveDressingInventorySingleGtin_(hospitalCode, payload.singleGtin || payload.gtin || '');
    const operator = String(payload.operator || '').trim() || '前端使用者';
    const note = String(payload.note || '').trim() ||
      (operationType === '盤點' ? '前端盤點修正' : '前端入庫');

    if (!hospitalCode) throw new Error('缺少院內碼');
    if (!stockUnit) throw new Error('缺少扣庫單位');
    if (!lot) lot = operationType === '盤點' ? 'INITIAL' : buildDressingInventoryAutoLot_(hospitalCode);
    if (operationType === '入庫' && (!Number.isFinite(quantity) || quantity <= 0)) {
      throw new Error('入庫數量必須大於 0');
    }
    if (operationType === '盤點' && (!hasActualQuantity || !Number.isFinite(actualQuantity) || actualQuantity < 0)) {
      throw new Error('盤點實際數量必須大於或等於 0');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getDressingInventorySheet_();
      ensureDressingInventoryHeader_(sheet);
      const transactionSheet = getDressingInventoryTransactionSheet_();
      ensureDressingInventoryTransactionHeader_(transactionSheet);

      const lastRow = sheet.getLastRow();
      let targetRow = 0;
      let oldQuantity = 0;
      let matchingStocktakeRows = [];
      let rollbackQuantityRows = [];
      const isCoarseStocktake =
        operationType === '盤點' &&
        isDressingInventoryCoarseStocktake_(lot, exp);

      if (lastRow >= 2) {
        const values = sheet.getRange(2, 1, lastRow - 1, DRESSING_INVENTORY_HEADERS.length).getValues();

        for (let i = 0; i < values.length; i++) {
          const row = values[i];
          const rowHospitalCode = String(row[0] || '').trim();
          const rowStockUnit = String(row[1] || '').trim();
          const rowLot = String(row[2] || '').trim();
          const rowExp = readInventoryExpText_(row[3]);

          if (isCoarseStocktake) {
            if (rowHospitalCode === hospitalCode && rowStockUnit === stockUnit) {
              matchingStocktakeRows.push({
                rowNumber: i + 2,
                lot: rowLot,
                exp: rowExp,
                quantity: Number(row[4] || 0) || 0
              });
              oldQuantity += Number(row[4] || 0) || 0;
            }
          } else {
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
      }

      if (isCoarseStocktake && matchingStocktakeRows.length > 0) {
        const preferredRow = matchingStocktakeRows.find(function(row) {
          return !isDressingInventoryCoarseStocktake_(row.lot, row.exp);
        }) || matchingStocktakeRows[0];
        targetRow = preferredRow.rowNumber;
        rollbackQuantityRows = matchingStocktakeRows.map(function(row) {
          return { rowNumber: row.rowNumber, quantity: row.quantity };
        });
      } else if (targetRow) {
        rollbackQuantityRows = [{ rowNumber: targetRow, quantity: oldQuantity }];
      }

      const changeQuantity = operationType === '盤點'
        ? actualQuantity - oldQuantity
        : quantity;
      const newQuantity = operationType === '盤點'
        ? actualQuantity
        : oldQuantity + changeQuantity;
      let appendedInventoryRow = 0;

      if (targetRow) {
        if (isCoarseStocktake) {
          matchingStocktakeRows.forEach(function(row) {
            sheet.getRange(row.rowNumber, 5).setValue(row.rowNumber === targetRow ? newQuantity : 0);
          });
        } else {
          sheet.getRange(targetRow, 5).setValue(newQuantity);
        }
      } else {
        const appendRow = [hospitalCode, stockUnit, lot, exp, newQuantity];
        sheet.appendRow(appendRow);
        appendedInventoryRow = sheet.getLastRow();
        targetRow = appendedInventoryRow;
      }

      try {
        appendDressingInventoryTransaction_({
          sheet: transactionSheet,
          operationType: operationType,
          hospitalCode: hospitalCode,
          singleGtin: singleGtin,
          stockUnit: stockUnit,
          lot: lot,
          exp: exp,
          oldQuantity: oldQuantity,
          changeQuantity: changeQuantity,
          newQuantity: newQuantity,
          operator: operator,
          note: note
        });
      } catch (transactionError) {
        if (appendedInventoryRow) {
          sheet.deleteRow(appendedInventoryRow);
        } else if (rollbackQuantityRows.length > 0) {
          rollbackQuantityRows.forEach(function(row) {
            sheet.getRange(row.rowNumber, 5).setValue(row.quantity);
          });
        }

        throw new Error(
          '庫存交易紀錄寫入失敗，已嘗試復原批號庫存：' +
          (transactionError && transactionError.message ? transactionError.message : String(transactionError))
        );
      }

      return {
        ok: true,
        merged: !appendedInventoryRow,
        row: targetRow,
        operationType: operationType,
        oldQuantity: oldQuantity,
        addedQuantity: changeQuantity,
        changeQuantity: changeQuantity,
        newQuantity: newQuantity
      };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return errorDressingInventory_(error);
  }
}

/**
 * 修正既有批號庫存列的批號 / 效期。數量不變；若修正後撞到既有列，合併數量並刪除原列。
 */
function updateDressingInventoryLotMetadata(payload) {
  try {
    assertSkhSheetWriteAllowed_('dressing');
    payload = payload || {};

    const hospitalCode = String(payload.hospitalCode || '').trim();
    const stockUnit = String(payload.stockUnit || '').trim();
    const oldLot = String(payload.oldLot || '').trim();
    const oldExp = readInventoryExpText_(payload.oldExp || '');
    const newLot = String(payload.newLot || '').trim();
    const newExp = readInventoryExpText_(payload.newExp || '');
    const singleGtin = resolveDressingInventorySingleGtin_(hospitalCode, payload.singleGtin || payload.gtin || '');
    const operator = String(payload.operator || '').trim() || '前端使用者';

    if (!hospitalCode) throw new Error('缺少院內碼');
    if (!stockUnit) throw new Error('缺少扣庫單位');
    if (!oldLot && !oldExp) throw new Error('缺少原批號或原效期，無法定位庫存列');
    if (!newLot && !newExp) throw new Error('修正後至少要有批號或效期');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getDressingInventorySheet_();
      ensureDressingInventoryHeader_(sheet);
      const transactionSheet = getDressingInventoryTransactionSheet_();
      ensureDressingInventoryTransactionHeader_(transactionSheet);

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) throw new Error('目前沒有批號庫存資料');

      const values = sheet.getRange(2, 1, lastRow - 1, DRESSING_INVENTORY_HEADERS.length).getValues();
      let sourceRowNumber = 0;
      let sourceQuantity = 0;
      let targetRowNumber = 0;
      let targetQuantity = 0;

      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const rowNumber = i + 2;
        const rowHospitalCode = String(row[0] || '').trim();
        const rowStockUnit = String(row[1] || '').trim();
        const rowLot = String(row[2] || '').trim();
        const rowExp = readInventoryExpText_(row[3]);
        const rowQuantity = Number(row[4] || 0) || 0;

        if (rowHospitalCode !== hospitalCode || rowStockUnit !== stockUnit) {
          continue;
        }

        if (rowLot === oldLot && rowExp === oldExp) {
          sourceRowNumber = rowNumber;
          sourceQuantity = rowQuantity;
        }

        if (rowLot === newLot && rowExp === newExp) {
          targetRowNumber = rowNumber;
          targetQuantity = rowQuantity;
        }
      }

      if (!sourceRowNumber) {
        throw new Error('找不到要修正的批號庫存列');
      }

      const note =
        '批號/效期修正：' +
        (oldLot || '未填') + ' / ' + (oldExp || '未填') +
        ' → ' +
        (newLot || '未填') + ' / ' + (newExp || '未填');

      if (targetRowNumber && targetRowNumber !== sourceRowNumber) {
        sheet.getRange(targetRowNumber, 5).setValue(targetQuantity + sourceQuantity);
        sheet.deleteRow(sourceRowNumber);
      } else {
        sheet.getRange(sourceRowNumber, 3, 1, 2).setValues([[newLot, newExp]]);
      }

      appendDressingInventoryTransaction_({
        sheet: transactionSheet,
        operationType: '資料修正',
        hospitalCode: hospitalCode,
        singleGtin: singleGtin,
        stockUnit: stockUnit,
        lot: newLot,
        exp: newExp,
        oldQuantity: sourceQuantity,
        changeQuantity: 0,
        newQuantity: targetRowNumber && targetRowNumber !== sourceRowNumber
          ? targetQuantity + sourceQuantity
          : sourceQuantity,
        operator: operator,
        note: note
      });

      return {
        ok: true,
        merged: !!(targetRowNumber && targetRowNumber !== sourceRowNumber),
        oldLot: oldLot,
        oldExp: oldExp,
        newLot: newLot,
        newExp: newExp,
        quantity: sourceQuantity
      };
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return errorDressingInventory_(error);
  }
}

/**
 * 前端 google.script.run.submitDressingUse(payload) 使用。
 * 同一張領用單共用一個領用ID；每列各自扣庫、寫入庫存交易紀錄與領用紀錄。
 */
function submitDressingUse(payload) {
  const lock = LockService.getScriptLock();

  try {
    assertSkhSheetWriteAllowed_('dressing');
    const normalized = normalizeDressingUsePayload_(payload);
    lock.waitLock(10000);

    const inventorySheet = getDressingInventorySheet_();
    ensureDressingInventoryHeader_(inventorySheet);

    const transactionSheet = getDressingInventoryTransactionSheet_();
    ensureDressingInventoryTransactionHeader_(transactionSheet);

    const useRecordSheet = getDressingUseRecordSheet_();
    ensureDressingUseRecordHeader_(useRecordSheet);

    const plannedRows = planDressingUseRows_(
      normalized,
      inventorySheet
    );

    const duplicateWarning =
      normalized.forceSubmit === true
      ? null
      : findRecentDressingUseDuplicate_(
          normalized,
          plannedRows,
          transactionSheet,
          useRecordSheet
        );

    if (duplicateWarning) {
      return duplicateWarning;
    }

    const useId =
      buildDressingUseId_();

    const transactionIds =
      plannedRows.map(function(row, index) {
        return buildDressingUseTransactionId_(
          useId,
          index + 1
        );
      });

    const rollbackRows =
      buildDressingUseRollbackRows_(plannedRows);

    const transactionStartRow =
      transactionSheet.getLastRow() + 1;

    const useRecordStartRow =
      useRecordSheet.getLastRow() + 1;

    try {
      plannedRows.forEach(function(row) {
        inventorySheet
          .getRange(row.inventoryRowNumber, 5)
          .setValue(row.newQuantity);
      });

      plannedRows.forEach(function(row, index) {
        const transactionId =
          transactionIds[index];

        appendDressingInventoryTransaction_({
          sheet: transactionSheet,
          transactionId: transactionId,
          operationType: '領用',
          hospitalCode: row.hospitalCode,
          singleGtin: row.singleGtin,
          stockUnit: normalized.stockUnit,
          lot: row.lot,
          exp: row.exp,
          oldQuantity: row.oldQuantity,
          changeQuantity: row.changeQuantity,
          newQuantity: row.newQuantity,
          operator: normalized.operator,
          note: row.note
        });
      });

      plannedRows.forEach(function(row, index) {
        useRecordSheet.appendRow([
          useId,
          transactionIds[index],
          normalized.useTime,
          normalized.patientId,
          normalized.hisStatus,
          normalized.attendingDoctor,
          normalized.operator,
          normalized.useUnit,
          row.note
        ]);
      });
    } catch (writeError) {
      rollbackRows.forEach(function(row) {
        inventorySheet
          .getRange(row.rowNumber, 5)
          .setValue(row.quantity);
      });

      deleteRowsFromEnd_(
        transactionSheet,
        transactionStartRow
      );

      deleteRowsFromEnd_(
        useRecordSheet,
        useRecordStartRow
      );

      throw new Error(
        '領用寫入失敗，已嘗試復原批號庫存：' +
        (writeError && writeError.message ? writeError.message : String(writeError))
      );
    }

    return {
      ok: true,
      useId: useId,
      transactionIds: transactionIds
    };
  } catch (error) {
    return errorDressingInventory_(error);
  } finally {
    try {
      lock.releaseLock();
    } catch (lockError) {
      // Lock may not have been acquired if validation failed before waitLock.
    }
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
      quantity: params.quantity || '',
      operationType: params.operationType || '',
      actualQuantity: params.actualQuantity || '',
      singleGtin: params.singleGtin || params.gtin || '',
      operator: params.operator || '',
      note: params.note || ''
    });
  }

  if (action === 'updateDressingInventoryLotMetadata') {
    return updateDressingInventoryLotMetadata({
      hospitalCode: params.hospitalCode || '',
      stockUnit: params.stockUnit || '',
      oldLot: params.oldLot || '',
      oldExp: params.oldExp || '',
      newLot: params.newLot || '',
      newExp: params.newExp || '',
      singleGtin: params.singleGtin || params.gtin || '',
      operator: params.operator || ''
    });
  }

  if (action === 'lookupDressingInventoryBarcode') {
    return lookupDressingInventoryBarcode(params.code || params.gtin || '');
  }

  if (action === 'submitDressingUse') {
    let payload = params.payload || params;

    if (typeof payload === 'string') {
      payload = JSON.parse(payload || '{}');
    }

    return submitDressingUse(payload);
  }

  return null;
}

function buildDressingInventoryAutoLot_(hospitalCode) {
  const code = String(hospitalCode || '').replace(/[^A-Za-z0-9]/g, '').trim() || 'UNKNOWN';
  const now = new Date();
  return code + Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMddHHmm');
}

function normalizeDressingInventoryOperationType_(operationType) {
  const text = String(operationType || '').trim();
  if (text === 'stocktake' || text === '盤點') return '盤點';
  return '入庫';
}

function isDressingInventoryCoarseStocktake_(lot, exp) {
  const lotText = String(lot || '').trim().toUpperCase();
  const expText = String(exp || '').trim().toUpperCase();
  return !lotText || lotText === 'INITIAL' || (lotText === 'INITIAL' && expText === 'INITIAL');
}

function normalizeDressingUsePayload_(payload) {
  payload = payload || {};

  const normalized = {
    forceSubmit: payload.forceSubmit === true,
    useTime: String(payload.useTime || '').trim(),
    patientId: String(payload.patientId || '').trim(),
    hisStatus: String(payload.hisStatus || '').trim(),
    attendingDoctor: String(payload.attendingDoctor || '').trim(),
    operator: String(payload.operator || '').trim(),
    useUnit: String(payload.useUnit || '').trim(),
    stockUnit: String(payload.stockUnit || '').trim(),
    note: String(payload.note || '').trim(),
    rows: Array.isArray(payload.rows) ? payload.rows : []
  };

  if (!normalized.useTime) throw new Error('領用時間不可空白');
  if (!normalized.patientId) throw new Error('領用病歷號不可空白');
  if (!normalized.hisStatus) throw new Error('HIS計價狀態不可空白');
  if (!normalized.attendingDoctor) throw new Error('領用主治醫師不可空白');
  if (!normalized.operator) throw new Error('領用人不可空白');
  if (!normalized.useUnit) throw new Error('領用單位不可空白');
  if (!normalized.stockUnit) throw new Error('stockUnit 不可空白');
  if (normalized.rows.length < 1) throw new Error('請至少新增一筆敷料列');

  normalized.rows =
    normalized.rows.map(function(row, index) {
      row = row || {};

      const quantity =
        Number(row.quantity || 0);

      const item = {
        rowIndex: index + 1,
        hospitalCode: String(row.hospitalCode || '').trim(),
        singleGtin: String(row.singleGtin || row.gtin || '').replace(/[^0-9]/g, '').trim(),
        dressingName: String(row.dressingName || '').trim(),
        size: String(row.size || '').trim(),
        lot: String(row.lot || '').trim(),
        exp: readInventoryExpText_(row.exp || ''),
        quantity: quantity,
        note: String(row.note || '').trim()
      };

      if (!item.hospitalCode) {
        throw new Error('第 ' + item.rowIndex + ' 列缺少院內碼');
      }

      if (!item.lot && !item.exp) {
        throw new Error('第 ' + item.rowIndex + ' 列缺少批號或效期，無法定位批號庫存');
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error('第 ' + item.rowIndex + ' 列領用數量必須大於 0');
      }

      return item;
    });

  return normalized;
}

function planDressingUseRows_(payload, inventorySheet) {
  const lastRow =
    inventorySheet.getLastRow();

  const inventoryValues =
    lastRow >= 2
    ? inventorySheet
        .getRange(2, 1, lastRow - 1, DRESSING_INVENTORY_HEADERS.length)
        .getValues()
    : [];

  const plannedRows = [];
  const workingQuantityByInventoryRow = {};

  payload.rows.forEach(function(row) {
    const inventoryMatch =
      findDressingUseInventoryRow_(
        inventoryValues,
        row,
        payload.stockUnit
      );

    if (!inventoryMatch) {
      throw new Error(
        '找不到批號庫存：' +
        row.hospitalCode +
        ' / ' +
        payload.stockUnit +
        ' / ' +
        row.lot +
        ' / ' +
        row.exp
      );
    }

    const currentQuantity =
      workingQuantityByInventoryRow[inventoryMatch.rowNumber] === undefined
      ? inventoryMatch.quantity
      : workingQuantityByInventoryRow[inventoryMatch.rowNumber];

    if (currentQuantity < row.quantity) {
      throw new Error(
        '第 ' +
        row.rowIndex +
        ' 列庫存不足，目前剩餘 ' +
        formatDressingInventoryQuantity_(currentQuantity) +
        '，欲領用 ' +
        formatDressingInventoryQuantity_(row.quantity)
      );
    }

    const oldQuantity =
      currentQuantity;

    const changeQuantity =
      -row.quantity;

    const newQuantity =
      oldQuantity + changeQuantity;

    workingQuantityByInventoryRow[inventoryMatch.rowNumber] =
      newQuantity;

    plannedRows.push({
      rowIndex: row.rowIndex,
      inventoryRowNumber: inventoryMatch.rowNumber,
      hospitalCode: row.hospitalCode,
      singleGtin: resolveDressingInventorySingleGtin_(row.hospitalCode, row.singleGtin),
      dressingName: row.dressingName,
      size: row.size,
      lot: inventoryMatch.lot,
      exp: inventoryMatch.exp,
      quantity: row.quantity,
      originalQuantity: inventoryMatch.quantity,
      oldQuantity: oldQuantity,
      changeQuantity: changeQuantity,
      newQuantity: newQuantity,
      note: buildDressingUseNote_(
        payload.note,
        row.note
      )
    });
  });

  return plannedRows;
}

function buildDressingUseRollbackRows_(plannedRows) {
  const seen = {};
  const rollbackRows = [];

  plannedRows.forEach(function(row) {
    if (seen[row.inventoryRowNumber]) {
      return;
    }

    seen[row.inventoryRowNumber] = true;
    rollbackRows.push({
      rowNumber: row.inventoryRowNumber,
      quantity: row.originalQuantity
    });
  });

  return rollbackRows;
}

function findDressingUseInventoryRow_(inventoryValues, useRow, stockUnit) {
  for (let i = 0; i < inventoryValues.length; i++) {
    const row = inventoryValues[i];
    const rowHospitalCode = String(row[0] || '').trim();
    const rowStockUnit = String(row[1] || '').trim();
    const rowLot = String(row[2] || '').trim();
    const rowExp = readInventoryExpText_(row[3]);

    if (
      rowHospitalCode === useRow.hospitalCode &&
      rowStockUnit === stockUnit &&
      rowLot === useRow.lot &&
      rowExp === useRow.exp
    ) {
      return {
        rowNumber: i + 2,
        lot: rowLot,
        exp: rowExp,
        quantity: Number(row[4] || 0) || 0
      };
    }
  }

  return null;
}

function buildDressingUseNote_(formNote, rowNote) {
  const parts =
    ['前端領用'];

  formNote = String(formNote || '').trim();
  rowNote = String(rowNote || '').trim();

  if (formNote) {
    parts.push('單備註：' + formNote);
  }

  if (rowNote) {
    parts.push('列備註：' + rowNote);
  }

  return parts.join('；');
}

function buildDressingUseId_() {
  const now = new Date();
  return [
    'USE',
    Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd-HHmmssSSS'),
    buildDressingUseShortCode_()
  ].join('-');
}

function buildDressingUseShortCode_() {
  const alphabet =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let code = '';
  for (let i = 0; i < 3; i++) {
    code += alphabet.charAt(
      Math.floor(Math.random() * alphabet.length)
    );
  }

  return code;
}

function buildDressingUseTransactionId_(useId, index) {
  return useId + '-' + String(index).padStart(3, '0');
}

function findRecentDressingUseDuplicate_(payload, plannedRows, transactionSheet, useRecordSheet) {
  const useLastRow =
    useRecordSheet.getLastRow();

  const transactionLastRow =
    transactionSheet.getLastRow();

  if (useLastRow < 2 || transactionLastRow < 2) {
    return null;
  }

  const now =
    new Date();

  const fiveMinutesAgo =
    now.getTime() - 5 * 60 * 1000;

  const targetHospitalCodes =
    plannedRows.reduce(function(map, row) {
      map[row.hospitalCode] = true;
      return map;
    }, {});

  const transactionValues =
    transactionSheet
      .getRange(2, 1, transactionLastRow - 1, DRESSING_INVENTORY_TRANSACTION_HEADERS.length)
      .getValues();

  const transactionHospitalCodeById =
    transactionValues.reduce(function(map, row) {
      const transactionId = String(row[0] || '').trim();
      const operationType = String(row[2] || '').trim();
      const hospitalCode = String(row[4] || '').trim();

      if (transactionId && operationType === '領用') {
        map[transactionId] = hospitalCode;
      }

      return map;
    }, {});

  const useRecordValues =
    useRecordSheet
      .getRange(2, 1, useLastRow - 1, DRESSING_USE_RECORD_HEADERS.length)
      .getValues();

  for (let i = 0; i < useRecordValues.length; i++) {
    const row = useRecordValues[i];
    const transactionId = String(row[1] || '').trim();
    const useTime = parseDressingUseTime_(row[2]);
    const patientId = String(row[3] || '').trim();
    const useUnit = String(row[7] || '').trim();
    const hospitalCode = transactionHospitalCodeById[transactionId] || '';

    if (!useTime) {
      continue;
    }

    if (
      useTime.getTime() >= fiveMinutesAgo &&
      patientId === payload.patientId &&
      useUnit === payload.useUnit &&
      targetHospitalCodes[hospitalCode]
    ) {
      return {
        ok: false,
        duplicateWarning: true,
        message: '這位病人最近 5 分鐘內已有相同敷料領用紀錄，可能是重複送出。'
      };
    }
  }

  return null;
}

function parseDressingUseTime_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  const text =
    String(value || '').trim();

  if (!text) {
    return null;
  }

  const normalized =
    text.replace(' ', 'T');

  const date =
    new Date(normalized);

  return isNaN(date.getTime()) ? null : date;
}

function formatDressingInventoryQuantity_(value) {
  const number =
    Number(value || 0) || 0;

  return Math.abs(number - Math.round(number)) < 0.000001
    ? String(Math.round(number))
    : String(Math.round(number * 100) / 100);
}

function deleteRowsFromEnd_(sheet, startRow) {
  const lastRow =
    sheet.getLastRow();

  if (lastRow >= startRow) {
    sheet.deleteRows(
      startRow,
      lastRow - startRow + 1
    );
  }
}

function resolveDressingInventorySingleGtin_(hospitalCode, singleGtin) {
  const direct = String(singleGtin || '').replace(/[^0-9]/g, '').trim();
  if (direct) return direct;

  const code = String(hospitalCode || '').trim();
  if (!code || typeof listDressingBarcode !== 'function') {
    return '';
  }

  try {
    const res = listDressingBarcode();
    const rows = res && res.ok && Array.isArray(res.data) ? res.data : [];
    const found = rows.find(function(item) {
      return String(item && item.hospitalCode || '').trim() === code;
    });
    return String(found && (found.singleGtin || found.gtin) || '').replace(/[^0-9]/g, '').trim();
  } catch (error) {
    return '';
  }
}

function buildDressingInventoryTransactionId_(hospitalCode) {
  const code = String(hospitalCode || '').replace(/[^A-Za-z0-9]/g, '').trim() || 'UNKNOWN';
  const now = new Date();
  return 'TRX-' + code + '-' + Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd-HHmmssSSS');
}

function buildDressingItemId_(hospitalCode, singleGtin) {
  const code = String(hospitalCode || '').trim();
  const gtin = String(singleGtin || '').replace(/[^0-9]/g, '').trim() || 'NO-GTIN';
  return code + '|' + gtin;
}

function appendDressingInventoryTransaction_(payload) {
  payload = payload || {};
  const sheet = payload.sheet || getDressingInventoryTransactionSheet_();
  ensureDressingInventoryTransactionHeader_(sheet);

  const hospitalCode = String(payload.hospitalCode || '').trim();
  const singleGtin = String(payload.singleGtin || '').replace(/[^0-9]/g, '').trim();
  const now = new Date();

  sheet.appendRow([
    String(payload.transactionId || '').trim() ||
      buildDressingInventoryTransactionId_(hospitalCode),
    Utilities.formatDate(now, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'),
    String(payload.operationType || '').trim(),
    buildDressingItemId_(hospitalCode, singleGtin),
    hospitalCode,
    singleGtin,
    String(payload.stockUnit || '').trim(),
    String(payload.lot || '').trim(),
    readInventoryExpText_(payload.exp || ''),
    Number(payload.oldQuantity || 0) || 0,
    Number(payload.changeQuantity || 0) || 0,
    Number(payload.newQuantity || 0) || 0,
    String(payload.operator || '').trim() || '前端使用者',
    String(payload.note || '').trim()
  ]);
}

function getDressingInventorySheet_() {
  const ss = SpreadsheetApp.openById(getSkhSheetId_('dressing', 'read'));
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

function getDressingInventoryTransactionSheet_() {
  const ss = SpreadsheetApp.openById(getSkhSheetId_('dressing', 'read'));
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === DRESSING_INVENTORY_TRANSACTION_SHEET_ID) {
      return sheets[i];
    }
  }

  const byName = ss.getSheetByName(DRESSING_INVENTORY_TRANSACTION_SHEET_NAME);
  if (byName) return byName;

  throw new Error(
    '找不到庫存交易紀錄 Sheet：gid=' +
    DRESSING_INVENTORY_TRANSACTION_SHEET_ID +
    '，名稱=' +
    DRESSING_INVENTORY_TRANSACTION_SHEET_NAME
  );
}

function getDressingUseRecordSheet_() {
  const ss = SpreadsheetApp.openById(getSkhSheetId_('dressing', 'read'));
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === DRESSING_USE_RECORD_SHEET_ID) {
      return sheets[i];
    }
  }

  const byName = ss.getSheetByName(DRESSING_USE_RECORD_SHEET_NAME);
  if (byName) return byName;

  throw new Error(
    '找不到領用紀錄 Sheet：gid=' +
    DRESSING_USE_RECORD_SHEET_ID +
    '，名稱=' +
    DRESSING_USE_RECORD_SHEET_NAME
  );
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

function ensureDressingUseRecordHeader_(sheet) {
  const range = sheet.getRange(1, 1, 1, DRESSING_USE_RECORD_HEADERS.length);
  const current = range.getValues()[0].map(function(v) { return String(v || '').trim(); });
  const same = DRESSING_USE_RECORD_HEADERS.every(function(header, index) {
    return current[index] === header;
  });

  if (!same) {
    range.setValues([DRESSING_USE_RECORD_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function ensureDressingInventoryTransactionHeader_(sheet) {
  const range = sheet.getRange(1, 1, 1, DRESSING_INVENTORY_TRANSACTION_HEADERS.length);
  const current = range.getValues()[0].map(function(v) { return String(v || '').trim(); });
  const same = DRESSING_INVENTORY_TRANSACTION_HEADERS.every(function(header, index) {
    return current[index] === header;
  });

  if (!same) {
    range.setValues([DRESSING_INVENTORY_TRANSACTION_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function errorDressingInventory_(error) {
  const code =
    error && error.code
    ? String(error.code)
    : '';

  const message =
    error && error.message
    ? error.message
    : String(error);

  return {
    ok: false,
    code: code,
    message: message
  };
}

function readInventoryExpText_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy/MM/dd');
  }

  return String(value || '').trim();
}
