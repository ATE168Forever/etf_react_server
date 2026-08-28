# Explore ETFs 頁範圍拆分設計文件

## 背景與來源

延續 `docs/CLAUDE_CODE_DIVIDEND_LIFE_INTEGRATED_REDESIGN_SPEC.md`（主規格書，已從工作目錄消失——gitignored、無版本歷史，本文件以現有程式碼為準）§16 驗收清單第 1 項：「探索ETF頁預設查詢範圍」。原始決議記錄於該規格書：Explore ETFs 頁應該預設顯示全市場（`'all'`）資料，而不是使用者目前持股（`'purchased'`），因為使用者來這個頁面的目的是「發掘新的 ETF」，而不是看自己已經有的持股。此項當時被列為「應該做但延後」的中型重構，本文件是實作前的規劃。

## 現況（問題所在）

`DividendLifePage.jsx` 只呼叫一次 `useDividendData({ dividendScope, setDividendScope, transactionHistory, transactionHistoryLoaded })`（單一 hook 實例），其輸出的 `data`／`filteredData`／`years` 等被四個分頁共用：

逐一追蹤每個輸出欄位在檔案裡的實際用法後（不能只看名稱像不像，`stockListPriceMap`／`dividendCacheInfo` 兩個欄位同時被 Holdings 與 Explore ETFs 兩邊引用，需求範圍卻不同），完整的欄位對照表如下：

| 分頁 | 用到的欄位 | 用途 |
|---|---|---|
| Overview（`HomeTab`） | `data`、`loading` | 首頁摘要卡片 |
| Cash Flow（`UserDividendsTab`） | `data`、`years` | 現金流表格 |
| Holdings（`InventoryTab`） | `data`、`dividendCacheInfo`、`stockListPriceMap` | 持股清單比對 |
| 頂部「明天配息提醒」橫幅（不分頁籤常駐） | `data`（經 `getTomorrowDividendAlerts`）、`custodianMap` | 提醒文字含保管銀行 |
| Explore ETFs（`dividend` tab，目前直接寫在 `DividendLifePage.jsx` 內） | `loading`、`error`、`filteredData`、`stocks`、`stockOptions`、`dividendTable`、`years`、`selectedYear`、`setSelectedYear`、`stockCurrencyMap`、`availableCurrencies`、`freqMap`、`stockListPriceMap`、`dividendCacheInfo` | 篩選表格、月曆、觀察組合 |

`stockListPriceMap` 與 `dividendCacheInfo` 同時出現在 Holdings 與 Explore ETFs 兩列——這兩個欄位不是「單純搬去 explore」，而是兩邊都要各自保留一份（見下方方案第 2 節）。`custodianMap` 則只被頂部橫幅使用，Explore ETFs 分頁完全沒用到，維持只留在主要 hook。

`dividendScope` 預設 `'purchased'`，並在使用者沒有任何持股時自動退回 `'all'`（`useDividendData.js:44-50`）。這是刻意的效能設計：多數使用者只關心自己持有的 3–10 檔 ETF，沒必要每次載入都抓全市場資料。

問題：這個 `dividendScope` 是**全域單一開關**。Explore ETFs 頁上雖然已經有「只看我持有」／「全部」的切換按鈕（`DividendLifePage.jsx:743-766`），但只要使用者切換它，Home／Cash Flow／Holdings 用的 `data` 也會跟著變動範圍——因為背後是同一份 fetch。若把 Explore ETFs 的**預設值**直接改成 `'all'`，等於把全站的預設抓取範圍都改成全市場，違背了原本的效能設計（此為主規格書當時明確記下「不能這樣做」的理由）。

另外，`upcomingAlerts`（頁面最上方「明天配息提醒」橫幅，`DividendLifePage.jsx:278`）也是吃這份共用 `data`，且不分頁籤都會顯示——這份資料語意上就該是使用者自己的持股，必須維持 `'purchased'` 為主的範圍，不可與 Explore ETFs 混用。

## 目標

- Explore ETFs 頁的資料抓取，改成**預設 `'all'`、與其他三個分頁的資料完全獨立**（互不影響切換）。
- Home／Cash Flow／Holdings／頂部提醒橫幅維持現有行為與效能特性（`'purchased'` 為主、無持股才退回 `'all'`）完全不變。
- Explore ETFs 這份「全市場」資料的抓取要**惰性**：使用者沒點開過 Explore ETFs 分頁之前，不觸發這個較大的 fetch。
- 改動範圍盡量小，不重寫 `useDividendData.js` 既有邏輯，也不搬動 Explore ETFs 分頁現有的 15 個以上關聯 state（`useCalendarState`、`useWatchGroups`、`selectedStockIds`、`extraFilters`、顯示模式旗標、觀察組合 Modal 等）。

## 不在本次範圍

- Explore ETFs 分頁 UI／篩選邏輯本身不變動（範圍切換按鈕保留，使用者仍可手動切回「只看我持有」）。
- 不把 Explore ETFs 分頁抽成獨立元件檔案——探索階段發現該區塊與 `DividendLifePage.jsx` 本體的 state 耦合很深，搬遷的 diff 與風險都遠大於本次要解決的問題，故不做（見下方「考慮過但放棄的方案」）。
- 不處理主規格書驗收清單其餘項目（皆已完成或列為既有不變量，見 memory）。

## 方案：`useDividendData` 加 `enabled` 參數 + 第二份 hook 呼叫

### 1. `useDividendData.js` 改動

在既有簽章加一個帶預設值的參數，不影響任何現有呼叫端：

```js
export default function useDividendData({
  dividendScope,
  setDividendScope,
  transactionHistory,
  transactionHistoryLoaded,
  enabled = true,
}) {
```

在目前負責發送 API 請求的 `useEffect`（`useDividendData.js:52-160`）最前面加一行短路：

```js
useEffect(() => {
  if (!enabled) return;
  if (!transactionHistoryLoaded) return;
  ...
}, [enabled, dividendScope, purchasedStockIds, transactionHistoryLoaded, refreshTrigger]);
```

`loadStockList()`（`useEffectOnce`，`useDividendData.js:199-209`）與 visibility 監聽（`useDividendData.js:184-197`）**刻意不**加 `enabled` 短路，維持原樣不動。原因：`useEffectOnce` 的 callback 只在 mount 當下執行一次（`hasRunRef` 鎖住，`useEffect(..., [])` 之後不會再重跑），若在 callback 內判斷 `enabled`，等到使用者真的切到 Explore ETFs 分頁、`enabled` 變成 `true` 時，這個「只執行一次」的視窗早已在 mount 當下、`enabled` 還是 `false` 時關閉，`loadStockList()` 會被永久跳過，`freqMap`／`stockListPriceMap` 永遠是空物件——這是靜默的資料遺失，不是效能問題。visibility 監聽的 `handleVisibility` 閉包有相同的「只在 mount 時註冊一次」特性，同樣不適合閉包內判斷 `enabled`。這兩個副作用改成不論 `enabled` 為何都照常執行，代價是 explore hook 實例掛載當下就會呼叫一次 `fetchStockList()`（見下方副作用評估——這個 API 走 `fetchWithCache`，是相對輕量、有快取的請求，不是本次要避免的「全市場配息歷史」大型 fetch，可以接受）。真正需要惰性、且需要 `enabled` 短路的只有負責發送 `fetchDividendsByYears` 那個 `useEffect`——因為它的依賴陣列本來就包含會變動的值，每次 `enabled` 改變都會重新執行，沒有「只執行一次」的陷阱。`enabled=false` 時 `data`/`years` 等維持初始值（`[]`／`DIVIDEND_YEARS`），不會讓消費端拿到 `undefined`。

### 2. `DividendLifePage.jsx` 改動

新增一個「是否已經點過 Explore ETFs 分頁」的旗標，一旦變 `true` 就不再變回 `false`（分頁切走也保持已抓取狀態，避免每次切換都重抓）：

```js
const [hasVisitedExploreTab, setHasVisitedExploreTab] = useState(tab === 'dividend');
const [exploreScope, setExploreScope] = useState('all');

useEffect(() => {
  if (tab === 'dividend') setHasVisitedExploreTab(true);
}, [tab]);
```

第二次呼叫 `useDividendData`，命名加 `explore` 前綴避免與第一份輸出混淆：

```js
const {
  loading: exploreLoading,
  error: exploreError,
  dividendCacheInfo: exploreDividendCacheInfo,
  years: exploreYears,
  selectedYear: exploreSelectedYear,
  setSelectedYear: setExploreSelectedYear,
  filteredData: exploreFilteredData,
  stocks: exploreStocks,
  stockCurrencyMap: exploreStockCurrencyMap,
  stockOptions: exploreStockOptions,
  dividendTable: exploreDividendTable,
  availableCurrencies: exploreAvailableCurrencies,
  freqMap: exploreFreqMap,
  stockListPriceMap: exploreStockListPriceMap,
} = useDividendData({
  dividendScope: exploreScope,
  setDividendScope: setExploreScope,
  transactionHistory,
  transactionHistoryLoaded,
  enabled: hasVisitedExploreTab,
});
```

（不解構 `data`／`custodianMap`：`data` 在 Explore ETFs 分頁裡從未被直接引用，分頁邏輯一律走 `filteredData`；`custodianMap` 完全不被 Explore ETFs 使用，見上方欄位對照表。）

`tab === 'dividend'` 區塊（`DividendLifePage.jsx:690-949`）目前引用第一份 hook 輸出的地方全部改成對應的 `explore*` 變數，依用途分兩類：

- **單純改名**（原變數只被 Explore ETFs 分頁用到）：`years`、`selectedYear`、`setSelectedYear`、`filteredData`、`stocks`、`stockCurrencyMap`、`stockOptions`、`dividendTable`、`availableCurrencies`、`freqMap`。
- **不是改名、是「該行程式碼改讀 explore 版本，主要 hook 的版本留給別的分頁」**：`loading`／`error`（第 853、902、914-917 行的 Explore ETFs 骨架畫面與錯誤訊息，改讀 `exploreLoading`／`exploreError`；第 687 行 `HomeTab dividendLoading={loading}` 不動）、`stockListPriceMap`（第 481、509 行的 Explore ETFs 總計算式，改讀 `exploreStockListPriceMap`；第 957 行 `InventoryTab stockListPriceMap={stockListPriceMap}` 不動）、`dividendCacheInfo`（第 831-839 行 Explore ETFs 的資料新鮮度標示，改讀 `exploreDividendCacheInfo`；第 956 行 `InventoryTab dividendCacheInfo={dividendCacheInfo}` 不動）。

`custodianMap` 不動（只有第 665 行的頂部提醒橫幅在用，不屬於 Explore ETFs 分頁）。`selectedStockIds`／`extraFilters`／`calendarEvents`／`watchGroups`／觀察組合 Modal 等既有邏輯完全不動，只是它們讀取的來源（`filteredData`、`dividendTable` 等）換成 explore 版本。

還有兩個容易漏掉、但只被 Explore ETFs 分頁使用的既有邏輯，也要一併換成 explore 版本：

- `useCurrencyView({ availableCurrencies, lang })`（`DividendLifePage.jsx:282-289`）：檢查過 `viewMode`／`hasTwd`／`hasUsd`／`activeCurrencies`／`viewDescriptionContent` 這幾個輸出全部只在 Explore ETFs 分頁的篩選邏輯與 JSX（`CurrencyViewToggle`）裡用到，沒有被其他分頁引用——這個 hook 呼叫的輸入要改成 `exploreAvailableCurrencies`。
- `handleDividendScopeChange`（`DividendLifePage.jsx:267-270`）目前呼叫的是全域 `setDividendScope`；Explore ETFs 分頁的範圍切換按鈕（`DividendLifePage.jsx:751`／`760`）要改成呼叫一個新的 `handleExploreScopeChange`，內部呼叫 `setExploreScope`。

`purchasedStockIds`（`DividendLifePage.jsx:100`，來自主要 hook）例外：它純粹由 `getPurchasedStockIds(transactionHistory)` 算出（`useDividendData.js:40-42`），與 `dividendScope` 無關，兩份 hook 實例算出來的值必然相同，所以 Explore ETFs 分頁沿用主要 hook 的 `purchasedStockIds` 即可（`canSelectPurchased`、`isPurchasedStock` 判斷、`purchasedScopeLabel`／`allScopeLabel` 這幾個純文字/布林值同理，不需要建立 explore 版本）。

第一份 hook 呼叫（餵給 Home／Cash Flow／Holdings／`upcomingAlerts`）維持現狀，一個字元都不改。

### 3. 資料流示意

```
transactionHistory ──┬── useDividendData(dividendScope='purchased'預設, enabled=true 恆常)
                      │     └─> data ──> HomeTab / UserDividendsTab / InventoryTab / upcomingAlerts
                      │
                      └── useDividendData(dividendScope=exploreScope='all'預設, enabled=hasVisitedExploreTab)
                            └─> exploreFilteredData / exploreDividendTable / ... ──> Explore ETFs 分頁 JSX
```

兩份 hook 實例共用同一個 `transactionHistory`／`transactionHistoryLoaded`（不重複讀 localStorage），彼此的 `dividendScope` 狀態、`data`、`years`、`selectedYear` 完全獨立，互不干擾。

## 考慮過但放棄的方案

1. **抽成獨立元件 `ExploreEtfsTab.jsx`**：一開始的方向，探索後發現要搬動 `useCalendarState`／`useWatchGroups`／十餘個篩選 state／一個跨區塊 Modal，diff 大、風險高，且好處（元件化）跟本次要解決的問題（範圍獨立、惰性載入）無直接關係，故降級為本方案。
2. **在 `useDividendData` 內部同時管理兩組 scope/data（單一實例）**：可以避免第二次呼叫 `fetchStockList()`，但需要重寫 hook 對外介面（回傳形狀從單一物件變成巢狀兩組），四個既有消費端都要跟著改，且無法用一個乾淨的 `enabled` 短路做惰性載入，複雜度不划算。
3. **乾脆固定抓 `'all'`，各分頁前端自行過濾**：拿掉 scope 概念最簡單，但等於放棄「大多數使用者只抓自己持股資料」這個效能最佳化，且主規格書已明確記下反對理由，不採用。

## 副作用評估

- `fetchStockList()` 會在**每次載入時**都被呼叫兩次（一次來自主要 hook，一次來自 explore hook，兩者的 `loadStockList()` 都不受 `enabled` 短路，見上方原因說明），不像 `fetchDividendsByYears` 的大型全市場配息查詢那樣要等使用者造訪 Explore ETFs 分頁才觸發。`stockApi.js` 底層走 `fetchWithCache`（`api.js`），只要 TTL 未過期，第二次呼叫會直接吃快取，不會真的打兩次網路。程式碼層面會多一份 `freqMap`／`stockListPriceMap`／`dividendCacheInfo` 存在記憶體中，兩份分頁分開持有，可接受。
- `exploreYears`／`exploreSelectedYear` 與 Cash Flow 分頁的 `years` 不再共用同一份清單——這其實修正了既有的小瑕疵（原本兩個語意不同的「哪些年份有資料」被迫共用同一份，只是恰好因為 scope 通常一致所以沒被注意到），不算行為劣化。
- `dividendScope`（主要 hook）與 `exploreScope`（explore hook）現在是兩個獨立 state，若未來要在 Explore ETFs 頁「切回只看我持有」，操作的是 `exploreScope`，不會影響 Home／Cash Flow／Holdings 的 `dividendScope`——這正是本次要達成的效果。

## 測試計畫

沿用 `tests/AppYearSelection.test.jsx` 等既有的「render `<App>`、mock `fetchDividendsByYears`/`fetchStockList`」整合測試手法，新增／調整測試涵蓋：

1. **預設不惰性抓全市場**：首次載入（未切到 Explore ETFs 分頁）時，斷言 `mockFetchDividendsByYears` 沒有被以 `stockIds: 'all'`（explore 專用）呼叫超過一次（即維持既有「無持股才退回 all」的呼叫次數，不因新增第二個 hook 實例而多一次全市場 fetch）。
2. **切到 Explore ETFs 分頁才觸發全市場抓取**：切換到 `dividend` 分頁後，斷言額外觸發了一次 `stockIds: 'all'` 的抓取（或等效地檢查分頁內容渲染出非持股限定的股票數）。
3. **範圍互不干擾**：使用者已有持股（`transactionHistory` 非空、`dividendScope` 為 `'purchased'`）時，切到 Explore ETFs 分頁預設仍是 `'all'`；在 Explore ETFs 頁把範圍切成「只看我持有」後，切回 Overview 分頁，`HomeTab` 顯示的資料不受影響（仍是 `'purchased'` 範圍）。
4. **`useDividendData` 單元測試（新建 `tests/useDividendData.test.js`，目前沒有這個 hook 的獨立測試檔）**：`enabled: false` 時不呼叫 `fetchDividendsByYears`、且不進入 loading 狀態（`fetchStockList` 不受 `enabled` 影響，仍會被呼叫，見上方原因說明，測試不斷言它不被呼叫）；`enabled` 從 `false` 變 `true` 後才觸發 `fetchDividendsByYears` 一次；`enabled` 預設為 `true`（不傳這個參數時行為與改動前一致，既有呼叫端不用改）。
5. 既有 `AppYearSelection.test.jsx`／`AppCalendarFilter.test.jsx`／`AppCalendarVisibility.test.jsx` 全數維持綠燈（回歸測試，計算 Explore ETFs 分頁行為的測試多半落在這幾個檔案裡）。

## 風險與已知限制

- `hasVisitedExploreTab` 目前設計為「一旦造訪過就不會重置」，代表使用者離開 Explore ETFs 分頁再切回來不會重抓（沿用既有 `useDividendData` 內部的 30 分鐘 staleness／`visibilitychange` 重抓機制，行為與主要 hook 一致，不算新風險）。
- 若未來 URL 深連結／分享連結需要直接開啟 Explore ETFs 分頁（例如 `#dividend`），`hasVisitedExploreTab` 的初始值已用 `tab === 'dividend'` 涵蓋這個情境（見上方程式碼片段），不會漏掉惰性載入的初始判斷。
