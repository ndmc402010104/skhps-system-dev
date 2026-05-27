# 晨會 QR 簽到系統
Morning Meeting System

整形外科科室系統  
Google Apps Script × Google Sheet × Google Form

---

# 快速部署

## 最簡單流程

按：

```
Ctrl + Shift + B
```

之後照問題回答就好：

```text
1. 要不要先儲存全部檔案
2. 要更新 patch / minor / major / none
3. 要 push 測試版，還是 deploy 正式版
4. 這次備註要寫什麼
5. 要不要寫入 README 版本日誌
6. 要不要順便 push GitHub
```

建議回答：

```text
小修正：
  patch → push → README 選 N

新增功能：
  minor → push → README 選 Y

大改版：
  major → push → README 選 Y

確認要上正式版：
  通常選 none 或 patch → deploy → README 選 Y
```

GitHub 那題：

```text
留空：不 commit、不 push GitHub
有輸入：自動 git add .、git commit、git push
```

## 手動執行

```powershell
.\push.ps1
```

它跟 `Ctrl + Shift + B` 是同一套流程。

正式版

Ctrl + Shift + B  
→ 依問題選 deploy  
→ clasp push  
→ 建立 Apps Script version  
→ 更新正式 deployment  
→ 可選擇是否寫 README 與 GitHub

---

# 版本規則

格式：

```text
vMajor.Minor.Patch-YYYYMMDDHHmm
```

範例：

```text
v1.1.5-202605262315
```

說明：

- Major → 大改版
- Minor → 新功能
- Patch → 修正
- 時間 → push 時間

版本階段：

```text
0.x.x → 開發中
1.x.x 以上 → 穩定版
```

# 版本日誌

## 最新版本（保留近期）

---

v2.4.13-202605271921

更新：

-

---

v2.4.0-202605271436

更新：

- 增加連接新的敷料庫存系統sheet

---

v2.3.0-202605271345

更新：

- 開始讓首頁連上github

---

v2.2.0-202605271154

更新：

- 版面變得更漂亮
- 剩後台管理系統的頁頭還沒有跟別人一樣修改過
- 還需要討論頁頭按下去連結的功能，理論上前台連到前台，後台連到後台
- 大螢幕情況下簽到管理後台table前三個圈圈占用的空間要跟右邊的比例不一樣，不然前面好空後面好擠
- 頁頭有點太大了，可以往上推一點

---

v2.0.0-202605271033

更新：

- 正式部署 v2.0.0
- 後台大改版
- 修正下載檔案內容與檔名重複問題
- 調整簽到上傳格式，目前為可上傳版本

---

v1.5.0-202605270107

更新：

- 敷料領用登錄系統架構初具雛形

---

v1.4.0-202605270026

更新：

- 完成更新readme自動化patch不要生成(不然雜訊太多)，minor, major才有日誌

---

v1.2.1-202605262354

更新：

- 完成readme自動化功能

---

v1.1.8-202605262350

更新：

- 調整readme更新(成功)
- 增加page=dressing連線

---

v1.1.7-202605262329

更新：

- 測試readme有沒有被正常增加(失敗)


---

v1.1.6-202605262321

更新：

- 測試readme有沒有被正常增加(失敗)

---

v1.1.5-202605262315

更新：

- 測試readme有沒有被正常增加(失敗)

---

v1.1.4-202605262304

更新：

- Front 標題調整

---

v1.1.1-202605262256

更新：

- 修正取消變更 alert

---

v1.1.0-202605262250

更新：

- 晨會管理編輯流程優化

---

## 正式版里程碑

---

正式版 v2.0.0-202605271033

來源：

v2.0.0-202605271033

更新：

- 後台大改版
- 修正簽到原始檔欄位
- 修正簽到上傳時間格式
- 下載檔名增加月日時分避免重複
- Ctrl + Shift + B 改為真正正式部署流程

---

正式版 v1.0.0

來源：

v0.7.9

更新：

- 第一版正式部署
- 晨會管理
- 簽到後台
- 匯出功能
- RWD

---

舊版請查看：

```text
Git History
GitHub Releases
```

---

# 專案資料夾架構

```text
Root
│
├─ README.md
├─ appsscript.json
├─ .claspignore
├─ .clasp.json
│
├─ clasp-tools.ps1
├─ watch-push.ps1
├─ push.ps1
├─ update-version.ps1
│
├─ .vscode/
│ └─ tasks.json
│
├─ 共用設定檔/
│ ├─ Config.js
│ ├─ Route.js
│ ├─ Calendar.js
│ ├─ Staff.js
│ └─ Token.js
│
├─ 科室系統用戶端/
│ ├─ Front.js
│ ├─ FrontIndex.html
│ ├─ QR.js
│ ├─ Sign.js
│ ├─ SignMeeting.html
│ ├─ SignQRGenerator.html
│ └─ HospitalSignIn.html
│
├─ 後台/
│ ├─ 後台首頁/
│ └─ 後台簽到管理/
│
└─ 敷料領用登錄系統/
```

---

# 系統流程

使用者

```text
建立會議
↓
產生 QR
↓
簽到
↓
驗證
↓
完成
```

管理者

```text
後台
↓
查詢
↓
修正
↓
匯出
```

---

# 功能導覽

## Route

入口與頁面切換

```text
網址
↓
doGet()
↓
showPage()
```

---

## Config

集中管理：

```text
APP_VERSION
APP_ENTRY_URL
SHEET_ID
FORM_ID
```

---

## QR

建立簽到 QR

---

## Sign

完成簽到流程

---

## Meeting

建立與維護會議

---

## Admin

後台修正資料

---

## Export

輸出：

- PDF
- Excel

---

## Staff

人員與員編

---

## Calendar

行事曆來源

---

## Token

驗證與防重複

---

# 命名規則

頁面：

```javascript
show○○Page()
```

資料：

```javascript
get○○()
save○○()
update○○()
```

---

# 開發原則

優先：

```text
可讀
＞
可維護
＞
擴充
＞
速度
```

避免：

- 重複邏輯
- 寫死資料
- 強耦合
- 隱藏依賴

---

# 待辦

□ 人員管理頁  
□ 系統設定頁  
□ 敷料系統  
□ App 包裝  
□ PWA  
□ 多科別支援
