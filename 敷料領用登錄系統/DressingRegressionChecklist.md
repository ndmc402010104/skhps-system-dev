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

# DressingFront inventory units regression checklist

時間戳記：2026-06-02 00:50 UTC+8

## 本次修改重點
- 庫存入庫的「扣庫單位」由自由輸入改成選單：5A、傷口照護中心。
- 移除「入庫計算單位 / 本次數量 / 換算後庫存數量」舊流程。
- 改成「本次入庫盒數」＋「本次入庫單位數」。
- 若敷料主檔沒有一盒數量，隱藏盒數欄，只保留單位數。
- 若掃到盒裝 GTIN 且主檔缺少一盒數量，跳出對話框詢問一盒幾單位，並回寫敷料主檔。
- 實際增加庫存自動以「盒數 × 一盒數量 + 單位數」計算。

## 必測項目
1. 開啟敷料庫存頁後，扣庫單位應為選單，不可自由輸入。
2. 扣庫單位選項應至少包含：5A、傷口照護中心。
3. 查詢主檔沒有一盒數量的敷料時，不應顯示「本次入庫盒數」欄位。
4. 查詢主檔有一盒數量的敷料時，應顯示「本次入庫盒數」欄位。
5. 輸入 2 盒、一盒 10 單位時，實際增加庫存應顯示 20 單位。
6. 輸入 2 盒又輸入 3 單位時，實際增加庫存應顯示 23 單位。
7. 掃到盒裝 GTIN 且主檔缺少一盒數量時，應跳出詢問對話框。
8. 填入一盒數量後，應回寫敷料主檔，並繼續帶入入庫表單。
9. 取消一盒數量詢問時，不應入庫，也不應亂填數量。
10. 確認入庫後，批號庫存應增加「實際增加庫存」數量。
11. 同院內碼、扣庫單位、批號、效期重複入庫時，後端應累加同一筆批號庫存。
12. 院內碼仍應允許英文與數字混合，例如 1EWF16。

# DressingUse row card regression checklist

時間戳記：2026-06-03 UTC+8

## 本次修改重點
- 領用敷料明細由 table 改成 row card。
- 每列新增領用類別：健保、自費、試用。
- 每列 payload 新增 `useCategory`，不移除原本欄位。
- 掃描同院內碼、同批號、同效期時不新增重複列，改 focus 到既有列。

## 必測項目
1. 自費 / 健保 / 試用每列可選。
2. 領用類別預設為健保。
3. payload 每列含 `useCategory`。
4. 領用明細改成 row card，不再使用難用 table。
5. 搜尋框選定後消失，改成主檔卡片。
6. 主檔卡片沒有重新選擇按鈕。
7. 手動搜尋只顯示目前領用單位有庫存的敷料。
8. 掃描同批號不新增列，會 focus 到既有列。
9. 領用盒數與領用單位數合計正確。
10. 沒有一盒數量時，盒數欄 disabled。
11. 目前可領用數量大字顯示。
12. 上方整張單備註移除。
13. 每列領用備註進入 `row.note`。
14. 測試單包碼 / 測試盒裝碼仍可用。
15. `node --check` 通過。

# Inventory scan-first regression checklist

時間戳記：2026-06-04 UTC+8

## 本次修改重點
- 入庫 / 盤點頁選完作業類型與庫存位置後，搜尋輸入框與相機按鈕優先顯示。
- 批號庫存或敷料主檔仍在載入時，掃描 / 搜尋內容先暫存，後端資料回覆後自動續查。
- 盤點掃到不存在庫存批號時，提示「目前沒有庫存，建議改入庫」，確認後保留掃描批號與效期並切到入庫。
- 領用頁初始化讀取後端時，不再鎖住整個表單；失敗時顯示局部錯誤並允許重試。

## 必測項目
1. 進入庫存作業後選「入庫」與 5A，批號庫存尚在載入時仍可看到搜尋輸入框與相機按鈕。
2. 載入尚未完成時掃描 GS1 條碼，系統應提示已暫存；載入完成後自動帶入主檔、批號與效期。
3. 盤點模式掃描沒有庫存紀錄的批號，應跳出「目前沒有庫存，建議改入庫」確認。
4. 確認切換入庫後，入庫欄位應保留剛掃描解析出的批號與效期。
5. 批號庫存讀取失敗時，庫存頁應顯示局部錯誤，仍可切換作業類型 / 庫存位置並按重新整理重試。
6. 領用頁初始化讀取中，病歷號、領用人、主治醫師等基本資料欄位仍可輸入。
7. 領用頁後端讀取失敗時，應顯示錯誤與重新整理提示，不應讓整頁卡在 disabled 狀態。

# 三段式環境與部署 regression checklist

時間戳記：2026-06-05 UTC+8

## A. 頁尾環境標籤
1. app script測試版頁面會高亮「app script測試版」。
2. dev-skhps.jonaminz.com 會高亮「測試版」。
3. skhps.jonaminz.com 會高亮「正式版」。
4. 三個環境標籤永遠同時存在。
5. 三個環境標籤各自顯示自己的版本號。
6. 不再只顯示舊式單一網頁版模糊名稱。

## B. 環境切換
1. 從 app script測試版可點到測試版。
2. 從 app script測試版可點到正式版。
3. 從測試版可點到 app script測試版。
4. 從測試版可點到正式版。
5. 從正式版可點到 app script測試版。
6. 從正式版可點到測試版。
7. 手機版點擊區域足夠，不會太小。
8. 手機版 footer 不會遮住主要操作或掃碼區。

## C. 版本同步
1. dev-app script 部署後，只更新 app script測試版版本號。
2. dev-skhps 推送後，只更新測試版版本號。
3. skhps 正式推送後，只更新正式版版本號。
4. 三個版本號可以不同，不會互相覆蓋。
5. README 當前版本紀錄與 footer 版本一致。

## D. 安全性
1. 測試版不會顯示成正式版。
2. 正式版不會顯示成測試版。
3. app script測試版不會顯示成正式版。
4. 正式版只能從 master 分支推送。
5. dev-skhps 可從目前 HEAD 推送到 dev repo main。
6. 測試版不會寫入正式 Sheet。
7. 正式版不會寫入測試 Sheet。
8. devSheetId / testSheetId 尚未設定時，測試環境寫入會回傳 `TEST_SHEET_NOT_CONFIGURED`。
9. dev 查詢若暫讀正式資料，只能透過集中設定 `allowDevReadProd: true`。

# HIS 對接測試頁與 HIS Bridge Service MVP regression checklist

時間戳記：2026-06-06 03:23 UTC+8

## A. 專案搜尋
1. 已搜尋 HIS / EIP / Excel / hidden form / bookmarklet 相關程式。
2. 搜尋結果有摘要。
3. 敏感 value 已遮罩。
4. 可重用設定有集中整理。

## B. 新頁面與檔案
1. 存在 `HisConnect/HisConnectPage.html`。
2. 存在 `HisBridgeService.js`。
3. 不存在不必要新增的 `HisConnectClient.js`。
4. `HisConnectPage.html` 有標準檔案位置 / 時間戳記 / 用途註解。
5. `HisBridgeService.js` 有標準檔案位置 / 時間戳記 / 用途註解。
6. `HisConnectPage.html` 顯示「HIS 對接測試」。
7. `HisConnectPage.html` 有「測試 HIS Excel」按鈕。
8. `HisConnectPage.html` 有「返回首頁」按鈕。

## C. 首頁入口
1. 首頁「CSS 測試」後面出現「HIS 對接測試」按鈕。
2. 按鈕樣式與首頁既有按鈕一致。
3. 點擊後進入 `HisConnect/HisConnectPage.html`。
4. CSS 測試按鈕仍可正常使用。
5. 手機版按鈕可點。

## D. Bridge 建立
1. 在 HisConnectPage 點「測試 HIS Excel」會開新分頁。
2. popup 被擋時有提示。
3. bridge page 可顯示 debug 狀態。
4. bridge page console log 不印敏感值。
5. 後端未設定時顯示「尚未設定 HIS Excel Bridge」。

## E. Excel 提取
1. 設定完整且 `HIS_EXCEL_AUTO_SUBMIT=true` 時，bridge page 會自動 submit hidden form。
2. submit 後顯示已送出提取資訊。
3. 瀏覽器允許時，Excel 下載會開始。
4. submit 後會嘗試自動關閉 bridge page。
5. `window.close` 失敗時有手動關閉提示。
6. target mode 可支援 `download-iframe` / `self`。

## F. 安全
1. GitHub Pages 前端搜尋不到 `_AUTOWEB_COM_FILE` 完整值。
2. GitHub Pages 前端搜尋不到 HIS token / 密碼。
3. `HisConnectPage.html` 不含 HIS sensitive config。
4. HIS sensitive config 只在後端或 Script Properties。
5. 不會 iframe 嵌入 HIS 操作頁。
6. 不會跨網域 click HIS 頁面按鈕。
7. 不會自動計價。
8. 不會自動按 HIS 儲存/確認。
9. HIS bridge 測試登入帳號由後端 `HIS_BRIDGE_ACCOUNT_ID` 或預設 `M015081` 提供，不寫入公開前端。
10. 送出後若顯示找不到網頁，bridge page 會提示檢查 AnyConnect/VPN。

## G. 三環境
1. dev-app script 可測。
2. dev-skhps 可測。
3. skhps 未設定時安全失敗。
4. 不硬指向錯誤 endpoint。
5. 三環境都有列入測試說明。

## H. 不回歸
1. 首頁其他按鈕仍可用。
2. 領用頁沒有被本任務破壞。
3. 掃描流程沒有被本任務破壞。
4. backend router / action registry 不影響既有 action。
5. 既有 CSS 測試頁仍可用。

# GitHub Pages version manifest 與 footer 版本顯示 regression checklist

時間戳記：2026-06-06 03:44 UTC+8

## A. version.json
1. repo 根目錄存在 `version.json`。
2. `version.json` 是合法 JSON。
3. 根層 `updatedAt` 代表 manifest 最近更新時間。
4. `dev.updatedAt` 只由測試版發布流程更新。
5. `prod.updatedAt` 只由正式版發布流程更新。
6. `gasDev` 第一階段不由 GitHub Pages manifest 驅動。

## B. footer 顯示
1. 正式版 footer 顯示本頁版本與測試版最新版。
2. 測試版 footer 顯示本頁版本與正式版最新版。
3. Apps Script 測試版 footer 不讀 `version.json`，只顯示本頁版本。
4. `version.json` 使用 cache busting。
5. `version.json` 讀取失敗時不阻塞頁面功能。
6. `version.json` JSON 格式錯誤時不白屏。
7. footer 掛點 `data-skh-version-footer` 每頁一致。
8. footer 右下角比例、字級、RWD 不跑版。

## C. push / release manifest
1. `push.ps1` 測試版流程會更新 `dev.version`。
2. `push.ps1` 測試版流程不會誤改 `prod.version`。
3. `push.ps1` 會將 `version.json` 納入 commit。
4. `push.ps1` 原本 README / commit message 問答流程不被破壞。
5. `push.ps1` 正式版流程會更新 `prod.version`。
6. `push.ps1` 正式版流程不會誤改 `dev.version`。
7. `push.ps1` 原本 PROD 安全確認不被破壞。
8. 若未來新增 `release.ps1`，需呼叫同一個 `scripts/Update-VersionManifest.ps1 -Env prod` helper。

## D. 不影響主要功能
1. 不影響 QR code cursor pointer。
2. 不影響 jonaminz 測試版頁面連結。
3. 不影響 DressingUse 領用流程。
4. 不影響 DressingFront 查詢 / 建檔流程。
5. 不影響 Admin / QR / 其他頁面既有主要功能。
6. 不影響 `google.script.run`。
7. 不影響 GitHub Pages fetch Apps Script Web App API。

