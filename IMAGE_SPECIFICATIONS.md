# 圖片資源規格說明

## 📋 總覽

本文件說明 ETF Life 各個應用程式所需的圖片資源規格與要求。

---

## 🎨 品牌色彩

| App | 主色 | 用途 |
|-----|------|------|
| Dividend Life | `#10b981` (Green) | 股息、配息相關 |
| Balance Life | `#3b82f6` (Blue) | 平衡、穩定相關 |
| Health Life | `#ef4444` (Red) | 健檢、警示相關 |
| Wealth Life | `#f59e0b` (Amber) | 財富、目標相關 |
| Concept Life | `#8b5cf6` (Purple) | 概念、主題相關 |

背景色：`#0b1021` (深藍黑)

---

## 📸 圖片規格

### 1. OG Image (Open Graph 分享圖)

**檔名格式：** `{app-name}-og.png`

**尺寸：** 1200 x 630 px

**格式：** PNG

**用途：** Facebook、Twitter、LinkedIn 等社交平台分享時顯示

**設計建議：**
- 使用 app 的主色作為重點色
- 包含 app 名稱和簡短描述
- 保持文字清晰易讀
- 避免在邊緣放置重要資訊（可能被裁切）
- 安全區域：距離邊緣至少 40px

**範例檔案位置：**
```
apps/dividend-life/public/dividend-life-og.png
apps/balance-life/public/balance-life-og.png
apps/health-life/public/health-life-og.png
apps/wealth-life/public/wealth-life-og.png
apps/conceptb-life/public/conceptb-life-og.png
```

---

### 2. Screenshot (應用程式截圖)

**檔名格式：** `{app-name}-screenshot.png`

**建議尺寸：** 1200 x 800 px (或實際應用程式截圖尺寸)

**格式：** PNG

**用途：** Google Search、App Store 展示

**設計建議：**
- 使用實際應用程式的截圖
- 展示最重要的功能
- 確保截圖清晰、專業
- 可以加上設備框架（如瀏覽器視窗）

**範例檔案位置：**
```
apps/dividend-life/public/dividend-life-screenshot.png
apps/balance-life/public/balance-life-screenshot.png
apps/health-life/public/health-life-screenshot.png
apps/wealth-life/public/wealth-life-screenshot.png
apps/conceptb-life/public/conceptb-life-screenshot.png
```

---

### 3. Favicon (網站圖示)

**需要的尺寸：**

| 檔名 | 尺寸 | 用途 |
|------|------|------|
| `favicon-16x16.png` | 16 x 16 px | 瀏覽器分頁圖示 |
| `favicon-32x32.png` | 32 x 32 px | 瀏覽器分頁圖示 (Retina) |
| `favicon-192x192.png` | 192 x 192 px | Android Chrome |
| `favicon-512x512.png` | 512 x 512 px | PWA、高解析度 |
| `apple-touch-icon.png` | 180 x 180 px | iOS 桌面圖示 |

**格式：** PNG (支援透明背景)

**設計建議：**
- 使用簡單、易識別的圖形
- 在小尺寸下仍然清晰
- 建議使用 SVG 設計後輸出多種尺寸
- 可以使用 "E" 字母代表 ETF Life
- 每個 app 可以用不同的主色區分

**檔案位置：**
```
apps/{app-name}/public/favicon-16x16.png
apps/{app-name}/public/favicon-32x32.png
apps/{app-name}/public/favicon-192x192.png
apps/{app-name}/public/favicon-512x512.png
apps/{app-name}/public/apple-touch-icon.png
```

---

### 4. Logo (品牌標誌)

**檔名：** `logo.png`

**建議尺寸：** 512 x 512 px

**格式：** PNG (支援透明背景)

**用途：** Schema.org 結構化資料、品牌識別

**設計建議：**
- ETF Life 主要 logo
- 支援透明背景
- 清晰、專業
- 可縮放至不同尺寸

**檔案位置：**
```
apps/{app-name}/public/logo.png
```

---

## 🛠️ 設計工具建議

### 線上工具
- [Canva](https://www.canva.com/) - 適合快速設計 OG images
- [Figma](https://www.figma.com/) - 專業設計工具
- [Photopea](https://www.photopea.com/) - 免費線上 Photoshop 替代品

### 桌面軟體
- Adobe Photoshop
- Sketch (Mac)
- Affinity Designer

### Favicon 生成工具
- [RealFaviconGenerator](https://realfavicongenerator.net/) - 自動生成各種尺寸
- [Favicon.io](https://favicon.io/) - 簡單快速生成

---

## 📦 圖片優化

生成圖片後，建議進行優化以提升網站載入速度：

### 優化工具
- [TinyPNG](https://tinypng.com/) - PNG 壓縮
- [Squoosh](https://squoosh.app/) - Google 的圖片優化工具
- [ImageOptim](https://imageoptim.com/) (Mac) - 批次優化

### 優化目標
- OG images: < 300 KB
- Screenshots: < 500 KB
- Favicons: < 50 KB each
- Logo: < 100 KB

---

## ✅ 檢查清單

### 完成後請確認：

#### 每個 App (5 個)
- [ ] `{app-name}-og.png` (1200x630)
- [ ] `{app-name}-screenshot.png`
- [ ] `favicon-16x16.png`
- [ ] `favicon-32x32.png`
- [ ] `favicon-192x192.png`
- [ ] `favicon-512x512.png`
- [ ] `apple-touch-icon.png`
- [ ] `logo.png`

#### 品質檢查
- [ ] 所有圖片尺寸正確
- [ ] 圖片已優化壓縮
- [ ] OG images 在社交平台預覽正常
- [ ] Favicons 在不同瀏覽器顯示正常
- [ ] 所有圖片色彩一致，符合品牌風格

---

## 🎯 當前狀態

✅ **已完成：** 所有佔位圖片已生成
⏳ **待辦：** 使用實際設計替換佔位圖片

### 佔位圖片位置
所有佔位圖片已放置在各 app 的 `public` 目錄中，可以直接使用，但建議替換為專業設計的圖片以提升品牌形象。

---

## 📞 需要協助？

如果需要設計協助或有任何問題，請參考：
1. 查看現有的佔位圖片作為參考
2. 使用 `generate_images.py` 腳本重新生成佔位圖片
3. 聯繫設計團隊進行專業設計
