# 新光整形外科科室系統

Plastic Surgery Department System

Google Apps Script × Google Sheets × GitHub

---

# 當前版本號
正式版: v2.17.0-202605292358
測試版: v2.22.0-202605301327
Github: v2.22.0-202605301327

---

本專案為新光整形外科科內自行開發之資訊平台。

目前包含：

- 晨會 QR 簽到系統
- 敷料建檔系統
- 敷料領用登錄系統
- GitHub 自動化部署流程

未來規劃：

- 敷料庫存系統
- 批號與效期管理
- Patient List MVP
- PWA / App 化

---

# 文件導航

## 敷料系統

### Regression Checklist

- [敷料建檔 Regression Checklist](敷料領用登錄系統/敷料建檔/Dressing_table_regression_checklist.md)

用途：

- 每次修改敷料建檔功能後進行回歸測試
- 每修正一個 Bug 必須新增對應測項
- Merge 回 master 前必須完成核心測試與壓力測試

---

## 開發沿革

- [README-v2.16.9-202605292314](archive/README-v2.16.9-202605292314.md)

記錄：

- 晨會系統發展歷程
- 敷料系統啟動
- GitHub 自動化流程建立
- Table State Foundation 建立前後歷史

---

# 最新里程碑

## v2.17.0 Table State Foundation

完成：

- 新增與編輯共存
- 前端暫存列（frontOnly）
- Scan Memory 管理
- 掃描取消流程
- 離開頁面保護
- Regression Checklist 建立
- Branch 開發流程建立

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
v2.17.0-202605292314
```

說明：

- Major → 大改版
- Minor → 新功能
- Patch → Bug 修正
- 時間 → Push 時間

---

# 版本日誌

## 最新版本（保留近期）

---

v2.22.0-202605301327

更新：

- 完成敷料建檔並且使用AJAX，可以邁入庫存系統

---

v2.21.0-202605300929

更新：

- 嘗試AJAX

---

v2.20.0-202605300838

更新：

- 搬運檔案到敷料建檔

---

v2.19.0-202605300801

更新：

- 嘗試分離敷料建檔到敷料建檔資料夾

---

v2.18.0-202605300021

更新：

- 分支github出去展示，繼續更新master

---

正式版 v2.17.0-202605292346

來源：
v2.16.9-202605292314

更新：

- 成功完成敷料登陸table checklist

---

v2.17.0-202605292314

更新：

- 完成 Table State Foundation
- 建立 Regression Checklist
- 建立 Branch 開發流程

---

# 專案架構

```text
Root
│
├─ README.md
│
├─ archive
│   └─ README-v2.16.9-202605292314.md
│
├─ 共用設定檔
│
├─ 科室系統用戶端
│
├─ 後台
│
└─ 敷料領用登錄系統
    │
    ├─ Dressing.js
    ├─ DressingBarcodeFetch.js
    ├─ DressingFront.html
    └─ Dressing_table_regression_checklist.md
```

---

# 系統模組

## 晨會 QR 簽到系統

- 建立會議
- QR 簽到
- 後台管理
- 匯出功能

---

## 敷料建檔系統

- GTIN 建檔
- GS1 / UDI 解析
- 條碼掃描
- Table State Foundation

---

## 敷料領用登錄系統

- 領用登錄
- 健保 / 自費管理
- 主治醫師紀錄
- 使用紀錄保存

---

## 敷料庫存系統（開發中）

規劃：

- LOT
- EXP
- 庫存管理
- 效期管理

---

# 待辦事項

## 敷料系統

- 庫存批號管理
- 效期管理
- 自動扣庫
- 庫存查詢

---

## 病人管理

- Patient List MVP
- 病人資料整合
- 領用紀錄串接

---

## 系統功能

- App 包裝
- PWA
- 多科別支援
- 權限管理

---

# 核心理念

```text
流程比功能重要

Checklist 比記憶可靠

每個 Bug
都應該成為下一次不再發生的測試項目
```





























