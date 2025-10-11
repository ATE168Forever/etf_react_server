import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_HOST } from './config';
import './App.css';
import Footer from './components/Footer';
import { useLanguage } from './i18n';
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

export default function StockDetail({ stockId }) {
  const { lang } = useLanguage();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  const { data: returns = {}, isLoading: returnsLoading } = useQuery({
    queryKey: ['returns', stockId],
    queryFn: async () => {
      const res = await fetch(`${API_HOST}/get_returns?stock_id=${stockId}`);
      return await res.json();
    },
    enabled: !!stockId,
    staleTime: 2 * 60 * 60 * 1000,
  });

  const { data: dividendNews = {}, isLoading: dividendNewsLoading } = useQuery({
    queryKey: ['dividend_helper', stockId],
    queryFn: async () => {
      if (!stockId) return {};
      const res = await fetch(`${API_HOST}/dividend_helper?stock_id=${stockId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch dividend helper data');
      }
      return await res.json();
    },
    enabled: !!stockId,
    staleTime: 30 * 60 * 1000,
  });

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

  if (stockLoading || dividendLoading || returnsLoading || dividendNewsLoading) {
    return <div>{lang === 'en' ? 'Loading...' : '載入中...'}</div>;
  }

  if (!stock.stock_id) {
    return <div style={{ padding: 20 }}>{lang === 'en' ? 'Stock not found' : '找不到股票'}</div>;
  }

  const website = stock.website;

  return (
    <>
      <div className="stock-detail">
        <h3>
          {stock.stock_id} {stock.stock_name}
        </h3>

        {stockUpdatedAt && (
          <div style={{ textAlign: 'right', fontSize: 12 }}>
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
            <a href={website} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
              {website}
            </a>
          ) : (
            '-'
          )}
        </p>
        <p>{lang === 'en' ? 'Listing date:' : '上市日期：'} {stock.listing_date || '-'}</p>

        {returns.stock_id && (
          <div className="table-responsive">
            <table className="dividend-record">
              <thead>
                <tr>
                  <th></th>
                  <th>{lang === 'en' ? 'Price Return (ex-div)' : '價差（不含息）'}</th>
                  <th>{lang === 'en' ? 'Total Return (incl. div)' : '績效（含息）'}</th>
                  <th>{lang === 'en' ? 'Highest' : '最高'}</th>
                  <th>{lang === 'en' ? 'Lowest' : '最低'}</th>
                  <th>{lang === 'en' ? 'Mean' : '平均'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{lang === 'en' ? '1M' : '近1月'}</td>
                  <td>{formatPercent(returns.price_return_1m)}</td>
                  <td>{formatPercent(returns.total_return_1m)}</td>
                  <td>{formatNumber(returns.highest_1m)}</td>
                  <td>{formatNumber(returns.lowest_1m)}</td>
                  <td>{formatNumber(returns.mean_1m)}</td>
                </tr>
                <tr>
                  <td>{lang === 'en' ? '3M' : '近3月'}</td>
                  <td>{formatPercent(returns.price_return_3m)}</td>
                  <td>{formatPercent(returns.total_return_3m)}</td>
                  <td>{formatNumber(returns.highest_3m)}</td>
                  <td>{formatNumber(returns.lowest_3m)}</td>
                  <td>{formatNumber(returns.mean_3m)}</td>
                </tr>
                <tr>
                  <td>{lang === 'en' ? '1Y' : '近1年'}</td>
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

        <p style={{ marginTop: 6 }}>{lang === 'en' ? 'External Data' : '外部資料'}</p>
        <ul className="link-list">
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://www.cmoney.tw/etf/tw/${stockId}/intro`} target="_blank" rel="noreferrer">
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
            >
              {lang === 'en' ? 'Goodinfo Stock Info' : 'Goodinfo 股市資訊'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://tw.stock.yahoo.com/quote/${stockId}.TW`} target="_blank" rel="noreferrer">
              {lang === 'en' ? 'Yahoo Price' : 'Yahoo 股價'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://histock.tw/stock/${stockId}`} target="_blank" rel="noreferrer">
              {lang === 'en' ? 'HiStock Info' : 'HiStock 個股資訊'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://www.cnyes.com/twstock/${stockId}`} target="_blank" rel="noreferrer">
              {lang === 'en' ? 'Cnyes Stock Info' : '鉅亨網 個股資訊'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
          <li>
            {lang === 'en' ? 'Data source:' : '資料來源：'}
            <a href={`https://www.stockq.org/etf/${stockId}.php`} target="_blank" rel="noreferrer">
              {lang === 'en' ? 'StockQ ETF Data' : 'StockQ ETF 資料'}
            </a>
            {lang === 'en' ? ' (external site)' : '（外部網站）'}
          </li>
        </ul>

        {dividends.length > 0 && (
          <>
            <div className="news" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600 }}>
                {lang === 'en' ? 'Latest Income Distribution Announcement' : '最新分配收益資訊'}
              </div>
              <p style={{ paddingLeft: 20, margin: '6px 0' }}>
                {lang === 'en' ? 'Announcement date:' : '公告日期：'} {formatDateStr(newsDate)}
              </p>
              <p style={{ paddingLeft: 20, margin: '6px 0' }}>
                {lang === 'en' ? 'Link:' : '連結：'}
                {newsUrl ? (
                  <a href={newsUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                    {newsUrl}
                  </a>
                ) : (
                  '-'
                )}
              </p>
            </div>

            {newsTextEntries.length > 0 && (
              <div className="news-text" style={{ paddingLeft: 20 }}>
                <div style={{ fontWeight: 600, marginTop: 6 }}>
                  {lang === 'en' ? 'Income distribution breakdown:' : '收益來源占比：'}
                </div>
                <ul style={{ marginTop: 4 }}>
                  {newsTextEntries.map(([key, value]) => {
                    const label = distributionLabelMap[key];
                    const displayLabel = label ? (lang === 'en' ? label.en : label.zh) : key;
                    const v = typeof value === 'number' ? `${value}%` : (value ?? '-');
                    return (
                      <li key={key} style={{ lineHeight: 1.6 }}>
                        <strong>{displayLabel}：</strong> {v}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="table-responsive">
              <table className="dividend-record">
                <thead>
                  <tr>
                    <th>{lang === 'en' ? 'Date' : '日期'}</th>
                    <th>{lang === 'en' ? 'Dividend' : '配息金額'}</th>
                    <th>{lang === 'en' ? 'Yield' : '殖利率'}</th>
                  </tr>
                </thead>
                <tbody>
                  {dividends.map((item) => (
                    <tr key={`${item.dividend_date}-${item.dividend}-${item.dividend_yield}`}>
                      <td>{item.dividend_date || '-'}</td>
                      <td>{isNil(item.dividend) ? '-' : item.dividend}</td>
                      <td>{isNil(item.dividend_yield) ? '-' : item.dividend_yield}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Footer theme={theme} setTheme={setTheme} />
    </>
  );
}
