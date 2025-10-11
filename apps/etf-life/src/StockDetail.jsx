import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_HOST } from './config';
import './App.css';
import Footer from './components/Footer';
import { useLanguage } from './i18n';

const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;
// const DIVIDEND_YEAR_QUERY = `year=${CURRENT_YEAR}&year=${PREVIOUS_YEAR}`;
const ALLOWED_YEARS = [CURRENT_YEAR, PREVIOUS_YEAR];

export default function StockDetail({ stockId }) {
  const { lang } = useLanguage();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const { data: stockList = [], isLoading: stockLoading, dataUpdatedAt: stockUpdatedAt } = useQuery({
    queryKey: ['stockList'],
    queryFn: async () => {
      const res = await fetch(`${API_HOST}/get_stock_list`);
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : [];
    },
    staleTime: 2 * 60 * 60 * 1000,
  });

  const { data: dividendList = [], isLoading: dividendLoading } = useQuery({
    queryKey: ['dividend'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        ALLOWED_YEARS.map(async year => {
          const res = await fetch(`${API_HOST}/get_dividend?year=${year}`);
          const data = await res.json();
          return Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.items)
                ? data.items
                : [];
        })
      );
      const fulfilledResults = results.filter(result => result.status === 'fulfilled');
      if (!fulfilledResults.length) {
        const firstRejection = results.find(result => result.status === 'rejected');
        if (firstRejection?.reason) throw firstRejection.reason;
        throw new Error('Failed to fetch dividend data');
      }
      const data = fulfilledResults.flatMap(result => result.value);
      return data.filter(item => ALLOWED_YEARS.includes(new Date(item.dividend_date).getFullYear()));
    },
    staleTime: 2 * 60 * 60 * 1000,
  });

  const { data: returns = {}, isLoading: returnsLoading } = useQuery({
    queryKey: ['returns', stockId],
    queryFn: async () => {
      const res = await fetch(`${API_HOST}/get_returns?stock_id=${stockId}`);
      return await res.json();
    },
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
    staleTime: 30 * 60 * 1000,
  });

  const newsUrl = dividendNews?.news_url || '';
  const newsTextEntries = Object.entries(
    dividendNews?.news_text && typeof dividendNews.news_text === 'object'
      ? dividendNews.news_text
      : {}
  );

  const distributionLabelMap = {
    股利所得占比: {
      zh: '股利所得占比',
      en: 'Dividend income ratio',
    },
    利息所得占比: {
      zh: '利息所得占比',
      en: 'Interest income ratio',
    },
    收益平準金占比: {
      zh: '收益平準金占比',
      en: 'Equalization reserve ratio',
    },
    已實現資本利得占比: {
      zh: '已實現資本利得占比',
      en: 'Realized capital gains ratio',
    },
    其他所得占比: {
      zh: '其他所得占比',
      en: 'Other income ratio',
    },
  };

  const stock = useMemo(() => {
    return stockList.find(item => item.stock_id === stockId) || {};
  }, [stockList, stockId]);

  const dividends = useMemo(() => {
    const arr = dividendList.filter(item => item.stock_id === stockId);
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
      <h3>{stock.stock_id} {stock.stock_name}</h3>
      {stockUpdatedAt && (
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          {lang === 'en' ? 'Data updated at:' : '資料更新時間:'} {new Date(stockUpdatedAt).toLocaleString()}
        </div>
      )}
      <p>{lang === 'en' ? 'Dividend frequency:' : '配息頻率:'} {stock.dividend_frequency || '-'}</p>
      <p>{lang === 'en' ? 'Custodian bank:' : '保管銀行:'} {stock.custodian || '-'}</p>
      <p>{lang === 'en' ? 'Issuer:' : '發行券商:'} {stock.issuer || '-'}</p>
      <p>{lang === 'en' ? 'ETF size:' : 'ETF規模:'} {stock.assets || '-'}</p>
      <p>
        {lang === 'en' ? 'Website:' : '官網:'} {website ? (
          <a href={website} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{website}</a>
        ) : (
          '-'
        )}
      </p>
      <p>
        {lang === 'en' ? 'Latest Income Distribution Announcement:' : '最新分配收益資訊:'} {newsUrl ? (
          <a href={newsUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{newsUrl}</a>
        ) : (
          '-'
        )}
      </p>
      {newsTextEntries.length > 0 && (
        <div className="news-text">
          <p style={{ marginBottom: 4 }}>{lang === 'en' ? 'Income distribution breakdown:' : '收益來源占比:'}</p>
          <ul style={{ marginTop: 0, marginBottom: 12 }}>
            {newsTextEntries.map(([key, value]) => {
              const label = distributionLabelMap[key];
              const displayLabel = label ? (lang === 'en' ? label.en : label.zh) : key;
              return (
                <li key={key} style={{ lineHeight: 1.6 }}>
                  <strong>{displayLabel}:</strong> {typeof value === 'number' ? `${value}%` : value}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p>{lang === 'en' ? 'Listing date:' : '上市日期:'} {stock.listing_date || '-'}</p>

      {returns.stock_id && (
        <div className="table-responsive">
          <table className="dividend-record">
            <thead>
                <tr>
                  <th></th>
                  <th>{lang === 'en' ? 'Price Return (ex-div)' : '價差(不含息)'}</th>
                  <th>{lang === 'en' ? 'Total Return (incl. div)' : '績效(含息)'}</th>
                  <th>{lang === 'en' ? 'Highest' : '最高'}</th>
                  <th>{lang === 'en' ? 'Lowest' : '最低'}</th>
                  <th>{lang === 'en' ? 'Mean' : '平均'}</th>
                </tr>
            </thead>
            <tbody>
              <tr>
                <td>{lang === 'en' ? '1M' : '近1月'}</td>
                <td>{returns.price_return_1m}%</td>
                <td>{returns.total_return_1m}%</td>
                <td>{returns.highest_1m}</td>
                <td>{returns.lowest_1m}</td>
                <td>{returns.mean_1m}</td>
              </tr>
              <tr>
                <td>{lang === 'en' ? '3M' : '近3月'}</td>
                <td>{returns.price_return_3m}%</td>
                <td>{returns.total_return_3m}%</td>
                <td>{returns.highest_3m}</td>
                <td>{returns.lowest_3m}</td>
                <td>{returns.mean_3m}</td>
              </tr>
              <tr>
                <td>{lang === 'en' ? '1Y' : '近1年'}</td>
                <td>{returns.price_return_1y}%</td>
                <td>{returns.total_return_1y}%</td>
                <td>{returns.highest_1y}</td>
                <td>{returns.lowest_1y}</td>
                <td>{returns.mean_1y}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p style={{marginTop: 6}}>{lang === 'en' ? 'External Date:' : '外部資料'}</p>
      <ul className="link-list">
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://www.cmoney.tw/etf/tw/${stockId}/intro`} target="_blank" rel="noreferrer">{lang === 'en' ? 'CMoney ETF Intro' : 'CMoney ETF介紹'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://www.moneydj.com/etf/x/basic/basic0003.xdjhtm?etfid=${stockId}.tw`} target="_blank" rel="noreferrer">{lang === 'en' ? 'MoneyDJ Basic Info' : 'MoneyDJ 基本資料'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=${stockId}`} target="_blank" rel="noreferrer">{lang === 'en' ? 'Goodinfo Stock Info' : 'Goodinfo 股市資訊'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://tw.stock.yahoo.com/quote/${stockId}.TW`} target="_blank" rel="noreferrer">{lang === 'en' ? 'Yahoo Price' : 'Yahoo 股價'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://histock.tw/stock/${stockId}`} target="_blank" rel="noreferrer">{lang === 'en' ? 'HiStock Info' : 'HiStock 個股資訊'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://www.cnyes.com/twstock/${stockId}`} target="_blank" rel="noreferrer">{lang === 'en' ? 'Cnyes Stock Info' : '鉅亨網 個股資訊'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
        <li>{lang === 'en' ? 'Data source:' : '資料來源：'}<a href={`https://www.stockq.org/etf/${stockId}.php`} target="_blank" rel="noreferrer">{lang === 'en' ? 'StockQ ETF Data' : 'StockQ ETF資料'}</a>{lang === 'en' ? ' (external site)' : '（外部網站）'}</li>
      </ul>

      <div className="disclaimer">
        {lang === 'en'
          ? 'The above links are third-party sites. Data is provided by those sites and we are not responsible for its accuracy.'
          : '以上連結皆為第三方外部網站，資料內容由各網站提供，本網站不對其正確性負責。'}
      </div>

      {dividends.length > 0 && (
        <div className="table-responsive">
          <table className="dividend-record">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Date' : '日期'}</th>
                <th>{lang === 'en' ? 'Dividend' : '配息金額'}</th>
                <th>{lang === 'en' ? 'Yield' : '利率'}</th>
              </tr>
            </thead>
            <tbody>
              {dividends.map(item => (
                <tr key={item.dividend_date}>
                  <td>{item.dividend_date}</td>
                  <td>{item.dividend}</td>
                  <td>{item.dividend_yield}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    <Footer theme={theme} setTheme={setTheme} />
    </>
  );
}

