import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_HOST } from '../config';
import './App.css';
import Footer from '@shared/components/Footer/Footer.jsx';
import { useLanguage, translations } from './i18n';
import { fetchStockList } from './stockApi';
import { fetchDividendsByYears } from './dividendApi';

const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;
const ALLOWED_YEARS = [CURRENT_YEAR, PREVIOUS_YEAR];

// --------- format helpers ---------
const isNil = (v) => v === null || v === undefined || Number.isNaN(v);
const formatPercent = (v) => (isNil(v) ? '-' : `${v}%`);
const formatNumber = (v, digits = 2) => (isNil(v) ? '-' : Number(v).toFixed(digits));
const formatDateStr = (s) => s || '-';
const normalizeCurrencyCode = (value) => {
  if (value === null || value === undefined) return '';
  const code = String(value).trim().toUpperCase();
  if (!code) return '';
  if (code === 'NT$' || code === 'NTD') return 'TWD';
  if (code === 'US$') return 'USD';
  return code;
};

export default function StockDetail({ stockId }) {
  const { lang, setLang, t } = useLanguage();
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [returnsEnabled, setReturnsEnabled] = useState(false);
  const [dividendHelperEnabled, setDividendHelperEnabled] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      if (localStorage.getItem('theme')) return;
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  }, [lang]);

  const {
    data: stockList = [],
    isLoading: stockLoading,
    dataUpdatedAt: stockUpdatedAt,
  } = useQuery({
    queryKey: ['stockList'],
    queryFn: async () => {
      const { list } = await fetchStockList();
      return list;
    },
    staleTime: 2 * 60 * 60 * 1000,
  });

  const { data: dividendList = [], isLoading: dividendLoading } = useQuery({
    queryKey: ['dividend', ...ALLOWED_YEARS],
    queryFn: async () => {
      const { data } = await fetchDividendsByYears(ALLOWED_YEARS);
      return data.filter((item) => {
        const date = item.dividend_date || item.payment_date;
        if (!date) return false;
        const year = new Date(date).getFullYear();
        return ALLOWED_YEARS.includes(year);
      });
    },
    staleTime: 2 * 60 * 60 * 1000,
  });

  const returnsQuery = useQuery({
    queryKey: ['returns', stockId],
    queryFn: async () => {
      const res = await fetch(`${API_HOST}/get_returns?stock_id=${stockId}`);
      return await res.json();
    },
    enabled: !!stockId && returnsEnabled,
    staleTime: 2 * 60 * 60 * 1000,
  });
  const returns = returnsQuery.data ?? {};

  const dividendNewsQuery = useQuery({
    queryKey: ['dividend_helper', stockId],
    queryFn: async () => {
      if (!stockId) return {};
      const res = await fetch(`${API_HOST}/dividend_helper?stock_id=${stockId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch dividend helper data');
      }
      return await res.json();
    },
    enabled: !!stockId && dividendHelperEnabled,
    staleTime: 30 * 60 * 1000,
  });
  const dividendNews = dividendNewsQuery.data ?? {};

  const newsUrl = dividendNews?.news_url || '';
  const newsDate = dividendNews?.news_date || '';
  const newsTextEntries = Object.entries(
    dividendNews?.news_text && typeof dividendNews.news_text === 'object'
      ? dividendNews.news_text
      : {}
  );

  const distributionLabelMap = {
    股利所得占比: { zh: '股利所得占比', en: 'Dividend income ratio' },
    利息所得占比: { zh: '利息所得占比', en: 'Interest income ratio' },
    收益平準金占比: { zh: '收益平準金占比', en: 'Equalization reserve ratio' },
    已實現資本利得占比: { zh: '已實現資本利得占比', en: 'Realized capital gains ratio' },
    其他所得占比: { zh: '其他所得占比', en: 'Other income ratio' },
  };

  const stock = useMemo(() => {
    return stockList.find((item) => item.stock_id === stockId) || {};
  }, [stockList, stockId]);

  const dividends = useMemo(() => {
    const arr = dividendList.filter((item) => item.stock_id === stockId);
    arr.sort((a, b) => new Date(b.dividend_date) - new Date(a.dividend_date));
    return arr;
  }, [dividendList, stockId]);

  const dividendRows = useMemo(() => {
    const yearlyTotals = new Map();
    const enriched = new Array(dividends.length);
    const reversed = dividends
      .map((item, originalIndex) => ({ item, originalIndex }))
      .reverse();

    reversed.forEach(({ item, originalIndex }) => {
      const displayDate = item.dividend_date || item.payment_date || '-';
      const yearKey =
        displayDate && displayDate !== '-'
          ? new Date(displayDate).getFullYear()
          : 'unknown';

      if (!yearlyTotals.has(yearKey)) {
        yearlyTotals.set(yearKey, {
          dividend: 0,
          yield: 0,
          hasDividend: false,
          hasYield: false,
        });
      }

      const totals = yearlyTotals.get(yearKey);
      const dividendValue = Number(item.dividend);
      const yieldValue = Number(item.dividend_yield);

      if (Number.isFinite(dividendValue)) {
        totals.dividend += dividendValue;
        totals.hasDividend = true;
      }

      if (Number.isFinite(yieldValue)) {
        totals.yield += yieldValue;
        totals.hasYield = true;
      }

      enriched[originalIndex] = {
        ...item,
        displayDate,
        cumulativeDividend: totals.hasDividend ? totals.dividend : null,
        cumulativeYield: totals.hasYield ? totals.yield : null,
      };
    });

    return enriched;
  }, [dividends]);

  const dividendCurrencyUnit =
    normalizeCurrencyCode(
      stock.dividend_currency || stock.currency || dividends[0]?.currency,
    ) || 'TWD';

  useEffect(() => {
    if (!stock?.stock_id) return;
    const name = stock.stock_name ? `${stock.stock_id} ${stock.stock_name}` : stock.stock_id;
    document.title = lang === 'en' ? `${name} — Dividend Life` : `${name} — Dividend Life`;
    return () => { document.title = 'Dividend Life'; };
  }, [stock?.stock_id, stock?.stock_name, lang]);

  if (stockLoading || dividendLoading) {
    return (
      <div className="stock-detail-skeleton" role="status" aria-live="polite" aria-label={lang === 'en' ? 'Loading…' : '載入中…'} style={{ padding: '24px 16px' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="stock-detail-skeleton__row">
            <div className="skeleton-line stock-detail-skeleton__cell stock-detail-skeleton__cell--label" />
            <div className="skeleton-line stock-detail-skeleton__cell" />
            <div className="skeleton-line stock-detail-skeleton__cell" />
          </div>
        ))}
      </div>
    );
  }

  if (!stock.stock_id) {
    return <div className="stock-detail-message">{lang === 'en' ? 'Stock not found' : '找不到股票'}</div>;
  }

  const website = stock.website;
  const isUsStock = (stock.country || '').toUpperCase() === 'US';
  const shouldShowDividendNews = !isUsStock && dividends.length > 0;

  return (
    <>
      <main id="main-content" className="stock-detail">
        <button
          type="button"
          className="stock-detail__back-btn"
          onClick={() => window.history.back()}
          aria-label={lang === 'en' ? 'Go back' : '返回上一頁'}
        >
          ← {lang === 'en' ? 'Back' : '返回'}
        </button>
        <h1 className="h3">
          {stock.stock_id} {stock.stock_name}
        </h1>

        {stockUpdatedAt && (
          <div className="stock-detail__timestamp">
            {lang === 'en' ? 'Data updated at:' : '資料更新時間：'}{' '}
            {new Date(stockUpdatedAt).toLocaleString()}
          </div>
        )}

        <p>
          {lang === 'en' ? 'Dividend frequency:' : '配息頻率：'} {stock.dividend_frequency || '-'}
        </p>
        <p>
          {lang === 'en' ? 'Custodian bank:' : '保管銀行：'} {stock.custodian || '-'}
        </p>
        <p>
          {lang === 'en' ? 'Issuer:' : '發行券商：'} {stock.issuer || '-'}
        </p>
        <p>
          {lang === 'en' ? 'ETF size:' : 'ETF 規模：'} {stock.assets || '-'}
        </p>
        <p>
          {lang === 'en' ? 'Website:' : '官網：'}{' '}
          {website ? (
            <a href={website} target="_blank" rel="noreferrer" className="word-break-all"
              aria-label={`${lang === 'en' ? 'Official website (opens in new tab):' : '官網（開啟新分頁）：'} ${website}`}>
              {website}
            </a>
          ) : (
            '-'
          )}
        </p>
        <p>{lang === 'en' ? 'Listing date:' : '上市日期：'} {stock.listing_date || '-'}</p>

        <div className="stock-detail__section">
          <button
            type="button"
            onClick={() => {
              if (!returnsEnabled) {
                setReturnsEnabled(true);
              } else {
                returnsQuery.refetch();
              }
            }}
            disabled={returnsQuery.isFetching}
          >
            {returnsQuery.isFetching
              ? lang === 'en'
                ? 'Loading performance data...'
                : '績效資料載入中...'
              : returnsEnabled
                ? lang === 'en'
                  ? 'Refresh performance data'
                  : '重新整理績效資料'
                : lang === 'en'
                  ? 'Load performance data'
                  : '載入績效資料'}
          </button>
        </div>

        {returnsEnabled && returnsQuery.isFetching && (
          <div className="stock-detail-skeleton" aria-busy="true" aria-label={lang === 'en' ? 'Loading…' : '載入中…'}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="stock-detail-skeleton__row">
                <div className="skeleton-line stock-detail-skeleton__cell stock-detail-skeleton__cell--label" />
                <div className="skeleton-line stock-detail-skeleton__cell" />
                <div className="skeleton-line stock-detail-skeleton__cell" />
                <div className="skeleton-line stock-detail-skeleton__cell" />
              </div>
            ))}
          </div>
        )}

        {returnsEnabled && returnsQuery.isError && (
          <div className="stock-detail__error" role="alert">
            {lang === 'en'
              ? `Failed to load performance data: ${returnsQuery.error?.message ?? ''}`
              : `無法載入績效資料：${returnsQuery.error?.message ?? ''}`}
          </div>
        )}

        {returnsEnabled && returns.stock_id && !returnsQuery.isFetching && !returnsQuery.isError && (
          <div className="table-responsive stock-detail__section">
            <table className="dividend-record" aria-label={lang === 'en' ? 'Performance data' : '績效資料'}>
              <thead>
                <tr>
                  <th scope="col"></th>
                  <th scope="col">{lang === 'en' ? 'Price Return (ex-div)' : '價差（不含息）'}</th>
                  <th scope="col">{lang === 'en' ? 'Total Return (incl. div)' : '績效（含息）'}</th>
                  <th scope="col">{lang === 'en' ? 'Highest' : '最高'}</th>
                  <th scope="col">{lang === 'en' ? 'Lowest' : '最低'}</th>
                  <th scope="col">{lang === 'en' ? 'Mean' : '平均'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{lang === 'en' ? '1M' : '近1月'}</th>
                  <td>{formatPercent(returns.price_return_1m)}</td>
                  <td>{formatPercent(returns.total_return_1m)}</td>
                  <td>{formatNumber(returns.highest_1m)}</td>
                  <td>{formatNumber(returns.lowest_1m)}</td>
                  <td>{formatNumber(returns.mean_1m)}</td>
                </tr>
                <tr>
                  <th scope="row">{lang === 'en' ? '3M' : '近3月'}</th>
                  <td>{formatPercent(returns.price_return_3m)}</td>
                  <td>{formatPercent(returns.total_return_3m)}</td>
                  <td>{formatNumber(returns.highest_3m)}</td>
                  <td>{formatNumber(returns.lowest_3m)}</td>
                  <td>{formatNumber(returns.mean_3m)}</td>
                </tr>
                <tr>
                  <th scope="row">{lang === 'en' ? '1Y' : '近1年'}</th>
                  <td>{formatPercent(returns.price_return_1y)}</td>
                  <td>{formatPercent(returns.total_return_1y)}</td>
                  <td>{formatNumber(returns.highest_1y)}</td>
                  <td>{formatNumber(returns.lowest_1y)}</td>
                  <td>{formatNumber(returns.mean_1y)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {returnsEnabled && !returnsQuery.isFetching && !returns.stock_id && !returnsQuery.isError && (
          <div className="stock-detail__note">
            {lang === 'en' ? 'No performance data available.' : '目前沒有可顯示的績效資料。'}
          </div>
        )}

        <p className="stock-detail__section-label">{lang === 'en' ? 'External Data' : '外部資料'}</p>
        <ul className="link-list">
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://www.cmoney.tw/etf/tw/${stockId}/intro`} target="_blank" rel="noreferrer"
              aria-label={lang === 'en' ? 'CMoney ETF Intro (opens in new tab)' : 'CMoney ETF 介紹（開啟新分頁）'}>
              {lang === 'en' ? 'CMoney ETF Intro' : 'CMoney ETF 介紹'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a
              href={`https://www.moneydj.com/etf/x/basic/basic0003.xdjhtm?etfid=${stockId}.tw`}
              target="_blank"
              rel="noreferrer"
              aria-label={lang === 'en' ? 'MoneyDJ Basic Info (opens in new tab)' : 'MoneyDJ 基本資料（開啟新分頁）'}
            >
              {lang === 'en' ? 'MoneyDJ Basic Info' : 'MoneyDJ 基本資料'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a
              href={`https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=${stockId}`}
              target="_blank"
              rel="noreferrer"
              aria-label={lang === 'en' ? 'Goodinfo Stock Info (opens in new tab)' : 'Goodinfo 股市資訊（開啟新分頁）'}
            >
              {lang === 'en' ? 'Goodinfo Stock Info' : 'Goodinfo 股市資訊'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://tw.stock.yahoo.com/quote/${stockId}.TW`} target="_blank" rel="noreferrer"
              aria-label={lang === 'en' ? 'Yahoo Price (opens in new tab)' : 'Yahoo 股價（開啟新分頁）'}>
              {lang === 'en' ? 'Yahoo Price' : 'Yahoo 股價'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://histock.tw/stock/${stockId}`} target="_blank" rel="noreferrer"
              aria-label={lang === 'en' ? 'HiStock Info (opens in new tab)' : 'HiStock 個股資訊（開啟新分頁）'}>
              {lang === 'en' ? 'HiStock Info' : 'HiStock 個股資訊'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://www.cnyes.com/twstock/${stockId}`} target="_blank" rel="noreferrer"
              aria-label={lang === 'en' ? 'Cnyes Stock Info (opens in new tab)' : '鉅亨網 個股資訊（開啟新分頁）'}>
              {lang === 'en' ? 'Cnyes Stock Info' : '鉅亨網 個股資訊'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://www.stockq.org/etf/${stockId}.php`} target="_blank" rel="noreferrer"
              aria-label={lang === 'en' ? 'StockQ ETF Data (opens in new tab)' : 'StockQ ETF 資料（開啟新分頁）'}>
              {lang === 'en' ? 'StockQ ETF Data' : 'StockQ ETF 資料'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
        </ul>

        {dividends.length > 0 && (() => {
          const STR = {
            en: {
              twseLinkText: 'Latest Announcements from the Taiwan Stock Exchange (TWSE)',
              loading: 'Loading announcement...',
              refresh: 'Refresh announcement',
              load: 'Load announcement',
              loadFailed: 'Failed to load announcement:',
              latest: 'Latest Income Distribution Announcement',
              announceDate: 'Announcement date:',
              link: 'Link:',
              breakdown: 'Income distribution breakdown:',
              noData: 'No announcement data available.',
              date: 'Date',
              dividend: 'Dividend',
              accumetive_dividend: 'Accumulative Dividend',
              yield: 'Yield',
              accumetive_yield: 'Accumulative Yield'
            },
            zh: {
              twseLinkText: '台灣證交所最新訊息',
              loading: '公告資料載入中...',
              refresh: '重新整理公告',
              load: '載入公告資料',
              loadFailed: '無法載入公告資料：',
              latest: '最新分配收益資訊',
              announceDate: '公告日期：',
              link: '連結：',
              breakdown: '最新一期收益來源占比：',
              noData: '目前沒有公告資料。',
              date: '日期',
              dividend: '配息金額',
              accumetive_dividend: '累積配息',
              yield: '殖利率',
              accumetive_yield: '累積殖利率'
            }
          }[lang === 'en' ? 'en' : 'zh'];

          const hasDividends = dividends.length > 0;
          const showNewsEntry = shouldShowDividendNews && hasDividends;
          const isFetching = dividendNewsQuery.isFetching;
          const isError = dividendNewsQuery.isError;
          const errorMsg = dividendNewsQuery.error?.message ?? '';
          const canRenderNews = dividendHelperEnabled && !isFetching && !isError;
          const hasNewsText = (newsTextEntries?.length ?? 0) > 0;

          const handleClick = () => {
            if (!dividendHelperEnabled) {
              setDividendHelperEnabled(true);
            } else {
              dividendNewsQuery.refetch();
            }
          };

          return (
            <>
              {showNewsEntry && (
                <>
                  <div className="stock-detail__section">
                    <div>
                      <a
                        href="https://www.twse.com.tw/zh/products/securities/etf/news.html"
                        target="_blank"
                        rel="noreferrer"
                        aria-label={lang === 'en' ? `${STR.twseLinkText} (opens in new tab)` : `${STR.twseLinkText}（開啟新分頁）`}
                      >
                        {STR.twseLinkText}
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={handleClick}
                      disabled={isFetching}
                      className="btn-load-news"
                    >
                      {isFetching
                        ? STR.loading
                        : (dividendHelperEnabled ? STR.refresh : STR.load)}
                    </button>
                  </div>

                  {dividendHelperEnabled && isError && (
                    <div className="stock-detail__error" role="alert">
                      {`${STR.loadFailed} ${errorMsg}`}
                    </div>
                  )}

                  {canRenderNews && hasNewsText && (
                    <div className="news stock-detail__section">
                      <div className="news__header">{STR.latest}</div>
                      <p className="news__item">
                        {STR.announceDate} {formatDateStr(newsDate)}
                      </p>
                      <p className="news__item">
                        {STR.link}{' '}
                        {newsUrl ? (
                          <a
                            href={newsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="word-break-all"
                            aria-label={lang === 'en' ? `Announcement link (opens in new tab): ${newsUrl}` : `公告連結（開啟新分頁）：${newsUrl}`}
                          >
                            {newsUrl}
                          </a>
                        ) : (
                          '-'
                        )}
                      </p>
                    </div>
                  )}

                  {canRenderNews && hasNewsText && (
                    <div className="news-text">
                      <div className="news-text__header">{STR.breakdown}</div>
                      <ul className="news-text__list">
                        {newsTextEntries.map(([key, value]) => {
                          const label = distributionLabelMap[key];
                          const displayLabel = label ? (lang === 'en' ? label.en : label.zh) : key;
                          const v = typeof value === 'number' ? `${value}%` : (value ?? '-');
                          return (
                            <li key={key}>
                              <strong>{displayLabel}：</strong> {v}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {canRenderNews && !hasNewsText && (
                    <div className="stock-detail__note">
                      {STR.noData}
                    </div>
                  )}
                </>
              )}

              <div className="table-responsive">
                <table className="dividend-record table-striped table table-bordered" aria-label={lang === 'en' ? 'Dividend history' : '配息歷史'}>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{STR.date}</th>
                      <th scope="col">
                        {STR.dividend}
                        <span className="table-unit">({dividendCurrencyUnit})</span>
                      </th>
                      <th scope="col">
                        {STR.accumetive_dividend}
                        <span className="table-unit">({dividendCurrencyUnit})</span>
                      </th>
                      <th scope="col">
                        {STR.yield}
                        <span className="table-unit">(%)</span>
                      </th>
                      <th scope="col">
                        {STR.accumetive_yield}
                        <span className="table-unit">(%)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividendRows.map((item, index) => (
                      <tr
                        key={`${item.displayDate}-${item.dividend}-${item.dividend_yield}-${index}`}
                      >
                        <td>{index + 1}</td>
                        <td>{item.displayDate}</td>
                        <td>{isNil(item.dividend) ? '-' : item.dividend}</td>
                        <td>
                          {isNil(item.cumulativeDividend) ? '-' : formatNumber(item.cumulativeDividend, 2)}
                        </td>
                        <td>{isNil(item.dividend_yield) ? '-' : item.dividend_yield}</td>
                        <td>{isNil(item.cumulativeYield) ? '-' : formatNumber(item.cumulativeYield, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}

      </main>

      <Footer
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        t={t}
        translations={translations}
      />
    </>
  );
}
