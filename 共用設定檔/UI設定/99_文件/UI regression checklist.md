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
[ ] Loading button spinner 顯示正常
[ ] Loading button 不造成文字跳動

Alert / Badge
[ ] Info alert 顯示正常
[ ] Success alert 顯示正常
[ ] Warning alert 顯示正常
[ ] Danger alert 顯示正常
[ ] Badge 一般狀態顯示正常
[ ] Badge success / warning / danger 顯示正常

Table
[ ] Table header 顯示正常
[ ] Table row hover 顯示正常
[ ] Table 手機版可橫向捲動
[ ] Table 內 button 不會撐高太多
[ ] Table 內 input 對齊正常
[ ] Table 內 radio 不會擠爆欄位
[ ] Table disabled button 狀態明確

Form
[ ] Input 寬度與高度正常
[ ] Select 寬度與高度正常
[ ] Textarea 顯示正常
[ ] Radio group 顯示正常
[ ] Focus 狀態清楚但不刺眼
[ ] Label 與欄位距離正常

Modal
[ ] Modal 可以開啟
[ ] Modal 可以用取消關閉
[ ] Modal 可以用確認關閉
[ ] 點擊背景可關閉
[ ] Modal 在手機版不超出畫面

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
