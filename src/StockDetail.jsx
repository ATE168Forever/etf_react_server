import { useState, useEffect } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';

export default function StockDetail({ stockId }) {
  const [stock, setStock] = useState(null);
  const [dividends, setDividends] = useState([]);
  const [stockCacheInfo, setStockCacheInfo] = useState(null);
  const [dividendCacheInfo, setDividendCacheInfo] = useState(null);

  // fetch stock basic info
  useEffect(() => {
    fetchWithCache(`${API_HOST}/get_stock_list`)
      .then(({ data, cacheStatus, timestamp }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const s = list.find(item => item.stock_id === stockId);
        setStock(s || {});
        setStockCacheInfo({ cacheStatus, timestamp });
      })
      .catch(() => setStock({}));
  }, [stockId]);

  // fetch dividend records
  useEffect(() => {
    fetchWithCache(`${API_HOST}/get_dividend`)
      .then(({ data, cacheStatus, timestamp }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const arr = list.filter(item => item.stock_id === stockId);
        arr.sort((a, b) => new Date(b.dividend_date) - new Date(a.dividend_date));
        setDividends(arr);
        setDividendCacheInfo({ cacheStatus, timestamp });
      })
      .catch(() => setDividends([]));
  }, [stockId]);

  if (!stock) {
    return <div>Loading...</div>;
  }

  if (!stock.stock_id) {
    return <div style={{ padding: 20 }}>Stock not found.</div>;
  }

  const issuer = stock.issuer || stock.securities_firm || stock.broker;
  const website = stock.website || stock.official_site || stock.official_website;
  const startDate = stock.dividend_start_date || stock.first_dividend_date;

  return (
    <div className="stock-detail">
      <h1>{stock.stock_id} {stock.stock_name}</h1>
      {stockCacheInfo && (
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          基本資料快取: {stockCacheInfo.cacheStatus}
          {stockCacheInfo.timestamp ? ` (${new Date(stockCacheInfo.timestamp).toLocaleString()})` : ''}
        </div>
      )}
      {dividendCacheInfo && (
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          配息資料快取: {dividendCacheInfo.cacheStatus}
          {dividendCacheInfo.timestamp ? ` (${new Date(dividendCacheInfo.timestamp).toLocaleString()})` : ''}
        </div>
      )}
      <p>配息頻率: {stock.dividend_frequency || '-'}</p>
      <p>保管銀行: {stock.custodian || '-'}</p>
      <p>發行券商: {issuer || '-'}</p>
      <p>
        官網: {website ? (
          <a href={website} target="_blank" rel="noreferrer">{website}</a>
        ) : (
          '-'
        )}
      </p>
      <p>開始配息日期: {startDate || '-'}</p>
      <ul className="link-list">
        <li>資料來源：<a href={`https://www.cmoney.tw/etf/tw/${stockId}/intro`} target="_blank" rel="noreferrer">CMoney ETF介紹</a>（外部網站）</li>
        <li>資料來源：<a href={`https://www.moneydj.com/etf/x/basic/basic0003.xdjhtm?etfid=${stockId}.tw`} target="_blank" rel="noreferrer">MoneyDJ 基本資料</a>（外部網站）</li>
        <li>資料來源：<a href={`https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=${stockId}`} target="_blank" rel="noreferrer">Goodinfo 股市資訊</a>（外部網站）</li>
        <li>資料來源：<a href={`https://tw.stock.yahoo.com/quote/${stockId}.TW`} target="_blank" rel="noreferrer">Yahoo 股價</a>（外部網站）</li>
        <li>資料來源：<a href={`https://histock.tw/stock/${stockId}`} target="_blank" rel="noreferrer">HiStock 個股資訊</a>（外部網站）</li>
        <li>資料來源：<a href={`https://www.cnyes.com/twstock/${stockId}`} target="_blank" rel="noreferrer">鉅亨網 個股資訊</a>（外部網站）</li>
        <li>資料來源：<a href={`https://www.stockq.org/etf/${stockId}.php`} target="_blank" rel="noreferrer">StockQ ETF資料</a>（外部網站）</li>
      </ul>
      <p className="disclaimer">
        以上連結皆為第三方外部網站，資料內容由各網站提供，本網站不對其內容的正確性與即時性負責。
      </p>
      {dividends.length > 0 && (
        <div className="table-responsive">
          <table className="dividend-record">
            <thead>
              <tr>
                <th>日期</th>
                <th>配息金額</th>
                <th>殖利率</th>
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
  );
}

