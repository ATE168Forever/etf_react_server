# Dividend Life — Phase 2（總覽 P0）設計文件

## 背景與來源

延續 `../../../docs/CLAUDE_CODE_DIVIDEND_LIFE_INTEGRATED_REDESIGN_SPEC.md`（下稱「主規格書」）的分階段實作，Phase 0（現況盤點）與 Phase 1（視覺基礎與 layout，`fix/pagecontainer-overreach-width`，已於 `8a496f6` 合併至 `main`）已完成。本文件是 Phase 2（總覽 P0）的實作設計，範圍對應主規格書 §15 Phase 2、§11 元件清單、§10 共用計算規則。

`ADDENDUM_INTEGRATED_SPEC_REVIEW.md` 第 1、2 點（覆蓋率幣別政策、美股稅前免責文案）已於主規格書 §6.1.B 定案並整合，不再是待決事項，本文件直接採用該節文字。

## 目標

在 `apps/dividend-life` 首頁（HomeTab）5 秒內回答：本月能收到多少、下一筆何時入帳、配息能覆蓋多少生活費、未來現金流是否平均（主規格書 §1）。

## 範圍

- 生活費設定（單一數字，僅存本機）。
- 本月生活覆蓋率計算與顯示（含幣別政策、稅前免責文案）。
- 本月配息（預計／已入帳／未入帳）。
- 下一筆入帳（僅已公告事件）。
- 未來 6–12 個月現金流（僅已公告事件）。
- 年度進度（沿用既有目標邏輯）。
- 對應的 selector/util 單元測試。

不在本次範圍：Demo 模式（`DemoModeBanner` 僅預留 prop 介面，Phase 5 才啟用）、`.ics` 匯出（`AddToCalendarButton` 僅預留掛載點）、無資料時的去年同月推估（決議只用已公告資料，見下）。

## 既有內容的定位（§4.3 資訊優先序）

主規格書 §4.3 明確排序：① 本月收入與生活費狀態 ② 下一筆入帳／低收入月 ③ 未來現金流 ④ 持股與配息摘要 ⑤ 全市場研究 ⑥ 平台資料量／公告。

`HomeTab.jsx` 現有的四個 tier（收益 hero 卡片、投資目標卡、歷史配息長條圖、底部統計／消息／功能更新）對應到優先序 ④、⑥，**全部保留，邏輯不變**，只是整組往下移一層，插到新的 P0 內容之下。這是風險最低的做法，不觸碰既有測試涵蓋的計算邏輯。

## 新增計算層（`apps/dividend-life/src/utils/`）

### `livingCostStorage.js`（新建）

仿照 `investmentGoalsStorage.js` 的既有模式：

- 單一數字 `monthlyLivingCost`，localStorage 持久化。
- 驗證為有限、非負數字；`0` 視為未設定（對應主規格書 §10.1）。
- 讀寫函式：`loadLivingCost()` / `saveLivingCost(value)`。

### `coverageUtils.js`（新建）

```
本月生活覆蓋率 = 本月預估發放金額（預設僅台股／使用者主要生活幣別）/ 每月生活費 × 100%
```

- 輸入：`dividendSummary`（既有 `calculateDividendSummary` 輸出）、`monthlyLivingCost`。
- 輸出：`{ twAmount, usAmount, coveragePercent, hasUsAmount, isLivingCostSet }`。
- **範圍修正（規劃階段發現）**：codebase 裡沒有任何真正的匯率換算功能可重用——`hooks/useCurrencyView.js` 只是「切換顯示哪個幣別」的 UI 篩選，不做換算；後端也沒有匯率 endpoint（見根目錄 `CLAUDE.md` 端點列表）。因此「使用者選擇把美股配息併入覆蓋率」（需顯示匯率與換算時間點）**延後到 P1**，需要新的匯率資料來源，不在本次範圍內。Phase 2 P0 只實作預設行為：覆蓋率分子固定僅計台股金額，`usAmount` 只作為單獨顯示用途，不併入分母計算的分子。
- `hasUsAmount === true`（即 `usAmount > 0`）時，UI（`CoverageProgress` 與 `MonthlyIncomeCard`）必須顯示「美股股息為稅前估算，實際入帳金額會扣除預扣稅。」（主規格書 §6.1.B 原文案）。這個提醒的觸發條件是「畫面上有顯示美股金額」，跟有沒有做貨幣合併換算無關，因此不受上述範圍修正影響。
- 生活費未設定（`monthlyLivingCost === 0`）時 `isLivingCostSet` 為 `false`、不計算百分比，回傳需要顯示設定 CTA 的狀態。

### `nextPaymentUtils.js`（新建，包裝既有邏輯）

- 重用 `utils/dividendUtils.js` 的 `getTomorrowDividendAlerts` 邏輯，但抽出核心比對邏輯改為可傳入的視窗（不寫死 7 天），只保留 `type: 'pay'` 的事件，取 `daysUntil` 最小的一筆。
- 沒有已公告事件時回傳 `null` → UI 顯示「目前沒有已公告的入帳資料」，不得顯示 `0`（主規格書 §6.1.C）。
- 不修改 `getTomorrowDividendAlerts` 既有行為／既有呼叫方（`DividendLifePage.jsx` 頂部提醒 banner），避免回歸風險；新函式是獨立的薄封裝。

### `futureCashflowUtils.js`（新建）

- 掃描 `dividendData` 中 `payment_date` 晚於今天的事件，依月份分桶加總金額（依使用者目前持股，重用既有 `holdings` 建構邏輯）。
- **只計入已公告事件**，不做去年同月金額推估（已與使用者確認的決策）。沒有已公告事件的月份顯示 `0` 並標示「尚無公告資料」，不得當作低收入警示著色。
- 輸出 6 或 12 個月的序列，供 `CashflowChart` 使用；低於 `monthlyLivingCost` 的月份標記供 UI 套用 terracotta。

## 新元件（`apps/dividend-life/src/components/`，對應主規格書 §11）

| 元件 | 資料來源 | 備註 |
|---|---|---|
| `SummaryHero` | `coverageUtils` 結果組字串 | 文案由正式資料生成，不隨機變化 |
| `MonthlyIncomeCard` | 既有 `dividendSummary` 拆出預計／已入帳／未入帳 | |
| `CoverageProgress` | `coverageUtils` | 生活費設定 CTA、progress bar、僅台股計入的覆蓋率、有美股金額時顯示稅前免責文案（併入美股換算為 P1，不在本次範圍） |
| `NextPaymentCard` | `nextPaymentUtils` | `AddToCalendarButton` 掛載點先留 prop，不實作（P1） |
| `CashflowChart` | `futureCashflowUtils` | 6／12 月切換，低於生活費目標月份用 terracotta |
| `InsightCard` | 既有 `buildDividendGoalViewModel`（年度進度） | |
| `EmptyPortfolioState` | 無持股／無資料狀態（主規格書 §6.2） | 目前 `HomeTab.jsx` 沒有專屬無資料畫面，純新建 |
| `DemoModeBanner` | — | 僅建立元件殼與 prop 介面，不接入任何邏輯，不在 Phase 2 啟用 |

## 資料流

`HomeTab.jsx` 既有的資料抓取（`fetchDividendsByYears`、`readTransactionHistory`、`calculateDividendSummary`）不變。新增 `monthlyLivingCost` state（`livingCostStorage` 讀取），將 `dividendData` / `transactionHistory` / `dividendSummary` / `monthlyLivingCost` 餵給上述三個新 util，產出的結果作為 props 傳給新元件。舊有四個 tier 的資料流完全不動。

## 錯誤與邊界狀態

- 生活費未設定或為 `0`：不計算覆蓋率，顯示設定 CTA。
- 無已公告下一筆入帳：顯示文字說明，不顯示 `0`。
- 現金流月份無已公告資料：顯示「尚無公告資料」，不算作低收入警示。
- 缺值一律 `—` 或「資料不足」，不得顯示誤導性 `0%`（主規格書 §10.6）。
- 台幣使用 `NT$18,620` 格式（無 `.00`）；美元保留兩位小數。

## 測試計畫

- `livingCostStorage`、`coverageUtils`、`nextPaymentUtils`、`futureCashflowUtils` 各自的單元測試，覆蓋：未設定生活費、無持股、無已公告下一筆、美股併入覆蓋率時免責文案觸發、formatter 邊界。
- 新元件的 render 測試（沿用專案既有 Testing Library 慣例，`role`/`aria` 查詢）。
- 既有 `HomeTab` 相關測試需確認舊 tier 仍正常渲染（只是位置下移）。

## 驗收對應（主規格書 §16 節錄）

- [ ] 首頁 5 秒內可找到本月預計配息、下一筆入帳及生活費覆蓋率。
- [ ] 生活覆蓋率幣別政策（預設僅計台股）已寫入計算規則測試；併入美股換算標示延後至 P1，本次不實作。
- [ ] 覆蓋率或本月配息卡片顯示美股金額時，附帶「稅前估算」提醒文案。
- [ ] 缺失資料顯示「資料不足」，不顯示 `null` 或誤導性 `0%`。
- [ ] Lint、test、typecheck、production build 通過。
