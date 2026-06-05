SKH UI Regression Checklist v1

使用規則
- 每次修改 共用設定檔/UI設定 底下任何 CSS，都要跑一次 UiTestPage。
- 每修掉一個 UI bug 或新增一個 UI 行為規則，就把測項補到本檔。
- CSS 分支只改 HTML/CSS，不改 AJAX、cache、fetch、Apps Script 後端流程。

Button
[ ] Primary button：正常、hover、active
[ ] Secondary button：正常、hover、active
[ ] Success button：正常、hover、active
[ ] Danger button：正常、hover、active
[ ] Warning button：正常、hover、active
[ ] Camera button：正常、hover、active
[ ] Ghost button：正常、hover、active
[ ] Small button 在 table 裡高度正常
[ ] Large button 在手機版不擠出畫面
[ ] Disabled button 明顯不可點
[ ] Enabled button hover 顯示 pointer
[ ] Disabled button hover 不顯示 pointer
[ ] Loading button spinner 顯示正常
[ ] Loading button 不造成文字跳動
[ ] Loading 且不可操作元素 hover 不顯示 pointer

Alert / Badge
[ ] Info alert 顯示正常
[ ] Success alert 顯示正常
[ ] Warning alert 顯示正常
[ ] Danger alert 顯示正常
[ ] Badge 一般狀態顯示正常
[ ] Badge success / warning / danger 顯示正常
[ ] 純狀態 badge hover 不顯示 pointer

Table
[ ] Table header 顯示正常
[ ] Table row hover 顯示正常
[ ] Table 手機版可橫向捲動
[ ] Table 內 button 不會撐高太多
[ ] Table 內 input 對齊正常
[ ] Table 內 radio 不會擠爆欄位
[ ] Table disabled button 狀態明確
[ ] 可排序表頭 hover 顯示 pointer，不可排序表頭不顯示 pointer
[ ] 可展開 / 收合列或標題 hover 顯示 pointer

Form
[ ] Input 寬度與高度正常
[ ] Select 寬度與高度正常
[ ] Textarea 顯示正常
[ ] Radio group 顯示正常
[ ] Focus 狀態清楚但不刺眼
[ ] Label 與欄位距離正常
[ ] 純文字 label hover 不顯示 pointer

Modal
[ ] Modal 可以開啟
[ ] Modal 可以用取消關閉
[ ] Modal 可以用確認關閉
[ ] Modal 確認 / 取消 / 關閉 hover 顯示 pointer
[ ] 點擊背景可關閉
[ ] Modal 在手機版不超出畫面

Cursor
[ ] QR code 可點擊時 hover 顯示 pointer
[ ] QR code 不可點擊時 hover 不顯示 pointer
[ ] a[href] hover 顯示 pointer
[ ] onclick 元素 hover 顯示 pointer
[ ] 返回按鈕只有可返回或有 onclick 時 hover 顯示 pointer
[ ] 不能返回或沒有 onclick 的返回區塊 hover 不顯示 pointer
[ ] 搜尋候選項 hover 顯示 pointer

Frontend Route / Domain
[ ] 正式 jonaminz 首頁每個入口都導向 jonaminz 網域
[ ] 正式 jonaminz 返回首頁不跳回 github.io
[ ] 正式 jonaminz QR code 產生頁不跳回 github.io
[ ] 正式 jonaminz 產生的簽到 QR code URL 是 jonaminz 網域
[ ] 正式 jonaminz 簽到頁仍留在 jonaminz 網域
[ ] 正式 jonaminz 後台頁仍留在 jonaminz 網域
[ ] 正式 jonaminz 敷料查詢 / 建檔頁仍留在 jonaminz 網域
[ ] 正式 jonaminz 敷料領用頁仍留在 jonaminz 網域
[ ] 正式 jonaminz 庫存 / 入庫 / 盤點頁仍留在 jonaminz 網域
[ ] dev-skhps 測試版所有入口仍留在測試網域
[ ] dev-skhps 產生的 QR code 不誤連正式版
[ ] API endpoint 仍使用 Apps Script Web App，不被誤改成 frontend URL
[ ] frontend page URL 不使用 Apps Script Web App endpoint
[ ] 搜尋全專案不應殘留舊 github.io 前端跳轉硬編碼
[ ] 搜尋全專案不應殘留舊 Apps Script 前端頁面跳轉硬編碼
[ ] QR token、簽到送出、敷料掃描、敷料查詢、領用送出、入庫 / 盤點流程不受 route 修改影響
[ ] QR code cursor pointer 修正仍存在，可點擊 QR code hover 顯示 pointer

Footer / Version Bar
[ ] footer/version bar 版本資訊永遠置中
[ ] footer/version bar 行事曆來源固定在右下角且不貼邊、不溢出
[ ] footer/version bar 行事曆來源字級與版本資訊一致
[ ] 三個版本資訊 segment 寬度比例一致，不因第一段 active 狀態異常撐大
[ ] footer/version bar 在 768px 以下仍可閱讀且不水平溢出
[ ] footer/version bar 不影響 route/link
[ ] footer/version bar 不影響 QR code cursor pointer
[ ] footer/version bar 不影響 QR code 產生
[ ] footer/version bar 不影響簽到頁、後台頁、敷料頁功能

Loading / Toast
[ ] Spinner 旋轉正常
[ ] Toast 顯示位置正常
[ ] Toast 不遮住主要操作
[ ] Toast 不遮住版本 footer
[ ] Overlay z-index 不壓過 modal

Real World：敷料系統
[ ] 病人領用區排版正常
[ ] 病歷號輸入框正常
[ ] 領用人輸入框正常
[ ] 領用單位 select 正常
[ ] 掃描敷料按鈕正常
[ ] 新增敷料列按鈕正常
[ ] 批次儲存 loading 按鈕正常
[ ] 敷料建檔列在桌機版正常
[ ] 敷料建檔列在手機版可用
[ ] 支付類別 radio 正常
[ ] 計價狀態 radio 正常
[ ] 未知條碼 / 待建檔狀態顯示正常

Integration
[ ] UiTestPage include 正常
[ ] FrontIndex include 正常
[ ] DressingFront include 正常
[ ] Apps Script dev 測試正常
[ ] GitHub Pages 若使用靜態版，不會因 GAS tag 顯示異常
[ ] 本次修改沒有碰 DressingFront.js
[ ] 本次修改沒有碰 AJAX / cache / fetch / 後端 API
[ ] 本次 cursor 修改不影響 QR token、簽到送出、敷料掃描、敷料查詢、領用送出、入庫 / 盤點流程
