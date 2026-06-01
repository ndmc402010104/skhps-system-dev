# 新光整形外科科室系統

Plastic Surgery Department System

Google Apps Script × Google Sheets × GitHub

---

# 當前版本號

正式版：v2.17.0-202605292358

測試版: v2.26.1-202606011713

Github: v2.26.1-202606011713

---

本專案為新光整形外科科內自行開發之資訊平台。

目前包含：

* 晨會 QR 簽到系統
* 敷料建檔系統
* 敷料領用登錄系統
* Design System Studio
* GitHub 自動化部署流程

未來規劃：

* 敷料庫存系統
* 批號與效期管理
* Patient List MVP
* PWA / App 化

---

# 文件導航

## 敷料系統

### Regression Checklist

* [敷料建檔 Regression Checklist](敷料領用登錄系統/Dressing_table_regression_checklist.md)

用途：

* 每次修改敷料建檔功能後進行回歸測試
* 每修正一個 Bug 必須新增對應測項
* Merge 回 master 前必須完成核心測試與壓力測試

---

## UI 設定系統

### UI 文件

* [UI Regression Checklist](共用設定檔/UI設定/99_文件/UI regression checklist.md)
* [UI 設定架構](共用設定檔/UI設定/99_文件/UI設定架構.md)
* [SKH UI Test Center](共用設定檔/UI設定/99_文件/skh-ui-test-page.html)

用途：

* Design System 元件測試
* Theme Builder 測試
* UI Token 架構記錄
* UI Regression Checklist 管理

---

## 開發沿革

* [README-v2.16.9-202605292314](archive/README-v2.16.9-202605292314.md)

---

# 最新里程碑

## v2.26.0 Design System Theme Engine Foundation

完成：

* Base Style Builder v1
* Button Builder v1
* Theme Loader
* Theme Database
* Sheet 自動建立
* Token 自動補齊
* Default / Current 雙版本 Theme 架構
* 設為新 Default 流程
* CSS Design System Studio 雛形完成

成果：

```text
UI Builder
↓
Theme Database
↓
Google Sheet
↓
Theme Loader
↓
全站同步套用
```

---

# Design System Studio

## 已完成

### 00_基礎 / UiStyle

包含：

* Brand
* Page
* Surface
* Radius
* Spacing
* Font
* Motion
* Layout

功能：

* Token 化管理
* Default Theme
* Current Theme
* Sheet 自動建立
* Token 自動補齊
* Theme Loader 套用
* UiStyleTest 視覺化測試

---

### 01_按鈕 / UiButton

包含：

* Base
* Role
* Size
* Shape
* State
* Group
* Mobile

功能：

* 視覺化編輯器
* Theme 儲存
* Theme 還原
* 設為新 Default
* 自由搭配模式
* ButtonCssSetting 自動建 Sheet / 補 Token

---

## 開發中

### 02_表單 / UiForm

規劃：

* Input
* Select
* Textarea
* Checkbox
* Radio
* Validation State

---

### 03_表格 / UiTable

規劃：

* Header
* Row
* Hover
* Zebra
* Compact
* Sticky

---

### 04_提示 / UiAlert

規劃：

* Success
* Warning
* Error
* Info

---

### 05_互動 / UiLoading & UiModal

規劃：

* Spinner
* Skeleton
* Overlay
* Dialog
* Confirm
* Drawer

---

# Design System 元件開發流程

建立新元件時：

```text
UiXXX.html
↓
UiXXXTest.html
↓
XXXCssSetting.js
↓
UiThemeDatabase 登錄
↓
UiThemeLoader 套用
↓
加入 SKH UI Test Center
↓
加入 UI Regression Checklist
```

開發原則：

```text
所有樣式必須 Token 化
↓
所有 Token 必須可編輯
↓
所有 Token 必須支援 Default / Current
↓
Sheet 不存在時自動建立
↓
Token 不足時自動補齊
↓
正式系統只讀 Theme
↓
Builder 負責管理 Theme
```

目前完成：

* Base Style
* Button

下一階段：

* Form
* Table
* Alert
* Loading
* Modal

---

# Theme Engine 架構

```text
UiThemeLoader.html
↓
ensureUiThemeDatabase()
↓
UiThemeDatabase.js
↓
getBaseCssSettings()
getButtonCssSettings()
↓
UiStyleCssSetting.js
ButtonCssSetting.js
↓
Google Sheet
↓
回傳 Theme Token
↓
覆蓋 CSS Variables
↓
全站套用
```

分工：

```text
UiStyle.html
→ 定義全站基礎 CSS Variables 與 helper class

UiThemeLoader.html
→ 頁面載入時自動讀取 Theme 並套用

UiThemeDatabase.js
→ Theme 總入口，統一呼叫各元件設定

UiStyleCssSetting.js
→ 00_基礎 Sheet 建立、讀取、儲存、補 Token

ButtonCssSetting.js
→ 01_按鈕 Sheet 建立、讀取、儲存、補 Token

UiXXXTest.html
→ Builder / 測試頁 / 視覺化編輯器
```

---

# 開發原則

```text
發現 Bug
↓
修正 Bug
↓
加入 Regression Checklist
↓
重新測試
↓
Merge
```

Checklist 與程式碼同等重要。

---

# 快速部署

## 最簡單流程

按：

```text
Ctrl + Shift + B
```

之後照問題回答即可。

建議：

```text
小修正
→ patch
→ push

新增功能
→ minor
→ push

大改版
→ major
→ push

正式上線
→ deploy
```

---

## 手動執行

```powershell
.\push.ps1
```

---

# 版本規則

格式：

```text
vMajor.Minor.Patch-YYYYMMDDHHmm
```

範例：

```text
v2.26.0-2026060103xx
```

說明：

* Major → 大改版
* Minor → 新功能
* Patch → Bug 修正
* 時間 → Push 時間

---

# 版本日誌

## 最新版本（保留近期）

---

v2.26.0-202606010212

更新：

* 完成 Design System Theme Engine Foundation
* 完成 Base Style Builder v1
* 完成 Button Builder v1
* 建立 Theme Loader
* 建立 Theme Database
* 完成 Sheet 自動建立與 Token 自動補齊
* 建立 Default / Current 雙版本 Theme 架構
* 建立 Design System Studio 開發流程
* 建立 UiStyleTest / UiButtonTest Builder 測試流程
* 建立 00_基礎與 01_按鈕的 Theme Sheet 串接模式

---

v2.25.0-202606010048

更新：

* 完成 CSS 測試頁按鈕元件
* 開始建立基礎樣式編輯器

---

v2.24.1-202605311423

更新：

* 完成 AJAX 及按鈕測試 v1

---

v2.24.0-202605311339

更新：

* 更新 UI 測試頁面成 AJAX 互動

---

v2.23.0-202605302353

更新：

* 完成按鈕測試 section，可以開始設計

---

v2.22.0-202605301523

更新：

* 完成 CSS 測試 101

---

v2.21.0-202605301417

更新：

* 建立模組化基本架構

---

v2.20.0-202605301355

更新：

* 開始使用 UI 測試中心

---

v2.17.0-202605292314

更新：

* 完成 Table State Foundation
* 建立 Regression Checklist
* 建立 Branch 開發流程

---

# 專案架構

```text
Root
│
├─ README.md
├─ AppHeader.html
│
├─ archive
│
├─ 共用設定檔
│   │
│   └─ UI設定
│       │
│       ├─ 00_基礎
│       │   ├─ UiStyle.html
│       │   ├─ UiStyleCssSetting.js
│       │   ├─ UiStyleTest.html
│       │   ├─ UiThemeDatabase.js
│       │   └─ UiThemeLoader.html
│       │
│       ├─ 01_按鈕
│       │   ├─ ButtonCssSetting.js
│       │   ├─ UiButton.html
│       │   └─ UiButtonTest.html
│       │
│       ├─ 02_表單
│       │   ├─ UiForm.html
│       │   └─ UiFormTest.html
│       │
│       ├─ 03_表格
│       │   ├─ UiTable.html
│       │   └─ UiTableTest.html
│       │
│       ├─ 04_提示
│       │   ├─ UiAlert.html
│       │   └─ UiAlertTest.html
│       │
│       ├─ 05_互動
│       │   ├─ UiLoading.html
│       │   ├─ UiLoadingTest.html
│       │   ├─ UiModal.html
│       │   └─ UiModalTest.html
│       │
│       └─ 99_文件
│           ├─ skh-ui-test-page.html
│           ├─ UI regression checklist.md
│           └─ UI設定架構.md
│
├─ 科室系統用戶端
├─ 後台
├─ 晨會簽到系統
└─ 敷料領用登錄系統
```

---

# 系統模組

## 晨會 QR 簽到系統

* 建立會議
* QR 簽到
* 後台管理
* 匯出功能

---

## 敷料建檔系統

* GTIN 建檔
* GS1 / UDI 解析
* 條碼掃描
* Table State Foundation

---

## 敷料領用登錄系統

* 領用登錄
* 健保 / 自費管理
* 主治醫師紀錄
* 使用紀錄保存

---

## Design System Studio

* UI Token 管理
* Theme Builder
* CSS Builder
* SKH UI Test Center
* Theme Loader
* Google Sheet Theme Database

---

## 敷料庫存系統（開發中）

規劃：

* LOT
* EXP
* 庫存管理
* 效期管理

---

# 待辦事項

## Design System Studio

* 完成 UiForm Builder
* 完成 UiTable Builder
* 完成 UiAlert Builder
* 完成 UiLoading Builder
* 完成 UiModal Builder
* 補齊 UI Regression Checklist
* 建立 Theme Bundle / UiBundle
* 正式頁面導入 UiThemeLoader

---

## 敷料系統

* 庫存批號管理
* 效期管理
* 自動扣庫
* 庫存查詢

---

## 病人管理

* Patient List MVP
* 病人資料整合
* 領用紀錄串接

---

## 系統功能

* App 包裝
* PWA
* 多科別支援
* 權限管理

---

# 核心理念

```text
流程比功能重要

Checklist 比記憶可靠

每個 Bug
都應該成為下一次不再發生的測試項目
```

```text
Design System 不只是樣式

而是把樣式變成資料

把資料變成系統
```

























