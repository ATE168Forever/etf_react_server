const featureUpdateEntries = [
  {
    date: '2025-08-11',
    category: {
      zh: '表格排序',
      en: 'Table Sorting'
    },
    description: {
      zh: '加入預設排序箭頭，讓初始欄位排序一目了然。',
      en: 'Added default sort arrows so the initial column order is always visible.'
    }
  },
  {
    date: '2025-08-11',
    category: {
      zh: '自選群組',
      en: 'Watch Groups'
    },
    description: {
      zh: '新增自選群組管理功能，整理追蹤中的 ETF。',
      en: 'Introduced watch group management to organize tracked ETFs.'
    }
  },
  {
    date: '2025-08-11',
    category: {
      zh: '股息資料',
      en: 'Dividend Data'
    },
    description: {
      zh: '新增發行商資訊並更新完整的股息表格版面。',
      en: 'Added issuer information and a comprehensive dividend table layout.'
    }
  },
  {
    date: '2025-08-12',
    category: {
      zh: '股息指標',
      en: 'Dividend Metrics'
    },
    description: {
      zh: '在總覽中新增當前殖利率與成本欄位。',
      en: 'Expanded the overview with current yield and cost columns.'
    }
  },
  {
    date: '2025-08-15',
    category: {
      zh: 'NL 助手',
      en: 'NL Helper'
    },
    description: {
      zh: '加入自然語言查詢小幫手側邊欄。',
      en: 'Added the natural language query helper side panel.'
    }
  },
  {
    date: '2025-08-17',
    category: {
      zh: '目標設定',
      en: 'Goals'
    },
    description: {
      zh: '支援自訂每月現金流目標設定。',
      en: 'Enabled custom monthly income goal configuration.'
    }
  },
  {
    date: '2025-08-22',
    category: {
      zh: '系統架構',
      en: 'Architecture'
    },
    description: {
      zh: '模組化主要 UI 元件並導入虛擬化股票表格。',
      en: 'Modularized major UI components and integrated a virtualized stock table.'
    }
  },
  {
    date: '2025-08-22',
    category: {
      zh: '資料層',
      en: 'Data Layer'
    },
    description: {
      zh: '將交易資料搬移至 localStorage 並更新相關介面。',
      en: 'Migrated transactions to localStorage and refreshed the UI around them.'
    }
  },
  {
    date: '2025-08-23',
    category: {
      zh: '提醒',
      en: 'Alerts'
    },
    description: {
      zh: '完成即將配息提醒介面。',
      en: 'Implemented the upcoming dividend alert surface.'
    }
  },
  {
    date: '2025-09-02',
    category: {
      zh: '整合服務',
      en: 'Integrations'
    },
    description: {
      zh: '新增 Google 試算表同步投資組合資料。',
      en: 'Added Google Sheet synchronization for portfolio data.'
    }
  },
  {
    date: '2025-09-09',
    category: {
      zh: '行事曆',
      en: 'Calendar'
    },
    description: {
      zh: '推出「我的配息」行事曆視圖與對應表格。',
      en: 'Launched the “My Dividend” calendar view and supporting table.'
    }
  },
  {
    date: '2025-09-10',
    category: {
      zh: '分析',
      en: 'Analytics'
    },
    description: {
      zh: '在個股頁面呈現歷史價格與總報酬。',
      en: 'Displayed price history and total returns in the stock detail page.'
    }
  },
  {
    date: '2025-09-11',
    category: {
      zh: '備份',
      en: 'Backups'
    },
    description: {
      zh: '支援 OneDrive 作為內建備份目的地。',
      en: 'Integrated OneDrive as a first-party backup destination.'
    }
  },
  {
    date: '2025-09-12',
    category: {
      zh: '國際化',
      en: 'Internationalization'
    },
    description: {
      zh: '提供全站英文翻譯。',
      en: 'Delivered full English translations across the application.'
    }
  },
  {
    date: '2025-09-18',
    category: {
      zh: '目標設定',
      en: 'Goals'
    },
    description: {
      zh: '在首頁與庫存頁整合投資目標追蹤。',
      en: 'Added investment goal tracking spanning home and inventory tabs.'
    }
  },
  {
    date: '2025-09-20',
    category: {
      zh: '目標設定',
      en: 'Goals'
    },
    description: {
      zh: '新增持股累積目標規劃。',
      en: 'Introduced share accumulation target planning.'
    }
  },
  {
    date: '2025-09-21',
    category: {
      zh: '穩定性',
      en: 'Reliability'
    },
    description: {
      zh: '依據資料來源提供自動儲存控制。',
      en: 'Added auto-save controls tied to the selected data source.'
    }
  },
  {
    date: '2025-09-25',
    category: {
      zh: '備份',
      en: 'Backups'
    },
    description: {
      zh: '完成 OneDrive 設定於正式環境的串接。',
      en: 'Wired OneDrive configuration into the production environment.'
    }
  },
  {
    date: '2025-09-29',
    category: {
      zh: '股息指標',
      en: 'Dividend Metrics'
    },
    description: {
      zh: '在股息總覽中直接彙整每月成本資訊。',
      en: 'Summarized monthly cost information directly in the dividend overview.'
    }
  }
];

export const getFeatureUpdates = (lang = 'zh') =>
  featureUpdateEntries.map(update => ({
    date: update.date,
    category: update.category[lang] ?? update.category.en,
    description: update.description[lang] ?? update.description.en
  }));

export default featureUpdateEntries;
