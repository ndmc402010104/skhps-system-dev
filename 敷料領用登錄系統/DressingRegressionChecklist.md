# DressingFront Inventory MVP Regression Checklist

時間戳記：2026-06-02 00:36 UTC+8  
用途：敷料庫存 MVP 後端函式修正後測試清單。

## 後端函式

- [ ] Apps Script 專案內已新增 `數據網頁&參考系統/DressingInventory.js`。
- [ ] Apps Script 編輯器可找到全域函式 `listDressingInventory`。
- [ ] Apps Script 編輯器可找到全域函式 `addDressingInventoryStock`。
- [ ] Apps Script 編輯器可找到全域函式 `lookupDressingInventoryBarcode`。

## Sheet 對應

- [ ] `DRESSING_INVENTORY_SPREADSHEET_ID` 指向敷料庫存系統試算表。
- [ ] `DRESSING_INVENTORY_SHEET_ID = 1869036956`。
- [ ] 批號庫存 Sheet 第一列為：`院內碼｜扣庫單位｜批號｜效期｜庫存數量`。

## 前端讀取

- [ ] 點「敷料庫存 📦」後不再出現 `listDressingInventory is not a function`。
- [ ] 空資料時顯示「目前沒有批號庫存資料」。
- [ ] 有資料時表格欄位為：敷料、院內碼、扣庫單位、總庫存數量、批號明細。

## 入庫累加

- [ ] 同院內碼＋同扣庫單位＋同批號＋同效期再次入庫時，庫存數量累加而不是新增列。
- [ ] 不同扣庫單位入庫時，即使院內碼/批號/效期相同，也新增不同列。
- [ ] 不同批號或不同效期入庫時，新增不同批號明細。

## 顯示彙總

- [ ] 同一敷料同一扣庫單位有多批號時，商品列顯示總庫存。
- [ ] 展開批號明細可看到各 LOT、效期、庫存數量。
