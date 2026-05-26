# 晨會 QR 簽到系統
Morning Meeting System

整形外科科室系統  
Google Apps Script × Google Sheet × Google Form

---

# 快速部署

## VS Code（主要）

測試版

修改  
→ Ctrl + S  
→ watcher 自動偵測  
→ 更新 APP_VERSION  
→ 更新 README 測試版版本  
→ clasp push

正式版

Ctrl + Shift + B  
→ 更新正式版版本  
→ 更新部署

---

## 手動推版

Patch

```powershell
.\push.ps1
```

Minor

```powershell
.\push.ps1 -Bump minor
```

Major

```powershell
.\push.ps1 -Bump major
```

附註：

```powershell
.\push.ps1 -Note "修正 QR 頁面"
```

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
1.x.x → 穩定版
```

# 版本日誌

## 最新版本（保留近期）

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