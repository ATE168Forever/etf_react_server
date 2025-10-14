# Budget Life

Budget Life 是 ETF Life 的姊妹專案，專注於日常支出追蹤與預算規劃。此資料夾內包含一個使用 React + Vite 建立的前端專案雛形，現已透過 pnpm workspace 與 ETF Life 並存。

## 可用指令

先在專案根目錄安裝依賴，接著可透過 workspace 指令啟動或建置此專案：

```bash
pnpm --filter budget-life dev
pnpm --filter budget-life build
pnpm --filter budget-life lint
pnpm --filter budget-life preview
```

如需在此資料夾單獨執行指令，也可以切換目錄後使用原本的 `pnpm dev` 等腳本。

## 同步說明

- 登入 Google 後，App 會透過 Firestore `onSnapshot` 自動訂閱目前 Workspace 的交易紀錄，任何變更都會即時同步到畫面。
- 若需要手動觸發同步，可在「Workspace」區塊點擊 **立即同步** 按鈕，系統會從雲端重新抓取一次交易資料並更新「上次同步」時間。
- IndexedDB 快取會在支援的瀏覽器中自動啟用，離線期間新增的資料會在重新連線後自動送出。
