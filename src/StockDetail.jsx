import { useState, useEffect } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';

export default function StockDetail({ stockId }) {
  const [stock, setStock] = useState(null);
  const [stockSource, setStockSource] = useState('latest');

  useEffect(() => {
    fetchWithCache(`${API_HOST}/get_stock_list`)
      .then(({ data: list, fromCache }) => {
        const s = list.find(item => item.stock_id === stockId);
        setStock(s || {});
        setStockSource(fromCache ? 'cache' : 'latest');
      })
      .catch(() => setStock({}));
  }, [stockId]);

  if (!stock) {
    return <div>Loading...</div>;
  }

  if (!stock.stock_id) {
    return <div style={{ padding: 20 }}>Stock not found.</div>;
  }

  return (
    <div className="stock-detail">
      <p style={{ fontSize: 12 }}>{stockSource === 'cache' ? '使用快取' : '最新'}</p>
      <h1>{stock.stock_id} {stock.stock_name}</h1>
      <p>配息頻率: {stock.dividend_frequency || '-'}</p>
      <p>保管銀行: {stock.custodian || '-'}</p>
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
    </div>
  );
}

