import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_HOST } from './config';
import './App.css';

export default function StockDetail({ stockId }) {
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
      const res = await fetch(`${API_HOST}/get_dividend`);
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

  const stock = useMemo(() => {
    return stockList.find(item => item.stock_id === stockId) || {};
  }, [stockList, stockId]);

  const dividends = useMemo(() => {
    const arr = dividendList.filter(item => item.stock_id === stockId);
    arr.sort((a, b) => new Date(b.dividend_date) - new Date(a.dividend_date));
    return arr;
  }, [dividendList, stockId]);

  if (stockLoading || dividendLoading) {
    return <div>載入中...</div>;
  }

  if (!stock.stock_id) {
    return <div style={{ padding: 20 }}>找不到股票</div>;
  }

  const issuer = stock.issuer || stock.securities_firm || stock.broker;
  const website = stock.website || stock.official_site || stock.official_website;
  const startDate = stock.dividend_start_date || stock.first_dividend_date;

  return (
    <div className="stock-detail">
      <h1>{stock.stock_id} {stock.stock_name}</h1>
      {stockUpdatedAt && (
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          資料更新時間: {new Date(stockUpdatedAt).toLocaleString()}
        </div>
      )}
      <p>配息頻率: {stock.dividend_frequency || '-'}</p>
      <p>保管銀行: {stock.custodian || '-'}</p>
      <p>發行券商: {issuer || '-'}</p>
      <p>
        官網: {website ? (
          <a href={website} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{website}</a>
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
                <th>利率</th>
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

