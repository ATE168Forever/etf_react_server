import { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import Select from 'react-select';
import { API_HOST } from './config';
import { fetchWithCache } from './api';

const COOKIE_KEY = 'my_transaction_history';
const BACKUP_COOKIE_KEY = 'inventory_last_backup';

function getTransactionHistory() {
    try {
        const val = Cookies.get(COOKIE_KEY);
        const list = val ? JSON.parse(val) : [];
        return list.map(item => ({
            stock_id: item.stock_id,
            date: item.date || item.purchased_date,
            quantity: item.quantity,
            type: item.type || 'buy',
            price: item.price
        }));
    } catch {
        return [];
    }
}
function saveTransactionHistory(list) {
    Cookies.set(COOKIE_KEY, JSON.stringify(list), { expires: 365 });
}

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function Modal({ show, onClose, stockList, form, setForm, onSubmit }) {
    if (!show) return null;

    const options = stockList.map(s => ({
        value: s.stock_id,
        label: `${s.stock_id} - ${s.stock_name}${s.dividend_frequency ? '' : ' x'}`,
        isDisabled: !s.dividend_frequency
    }));
    const selectedOption = options.find(o => o.value === form.stock_id) || null;

    return (
        <div style={{
            position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.2)', zIndex: 1000
        }}>
            <div style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                background: '#000', borderRadius: 10, padding: 28, minWidth: 400,
                boxShadow: "0 4px 18px #0008", color: '#fff'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center" }}>新增購買紀錄</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 10 }}>
                    {/* 股票 */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                            style={{
                                width: 85, minWidth: 85, fontWeight: 500, textAlign: "left",
                                whiteSpace: "nowrap", display: "block", lineHeight: "30px"
                            }}
                        >
                            股票：
                        </label>
                        <div style={{ width: "100%" }}>
                            <Select
                                options={options}
                                value={selectedOption}
                                onChange={option =>
                                    setForm(f => ({ ...f, stock_id: option ? option.value : '' }))
                                }
                                placeholder="搜尋或選擇股票"
                                isClearable
                                styles={{
                                    control: base => ({
                                        ...base,
                                        minHeight: 30,
                                        height: 30,
                                        borderRadius: 5,
                                        borderColor: "#ccc",
                                        fontSize: 16,
                                        backgroundColor: "#fff"
                                    }),
                                    valueContainer: base => ({
                                        ...base,
                                        height: 30, padding: '0 6px'
                                    }),
                                    indicatorsContainer: base => ({
                                        ...base,
                                        height: 30
                                    }),
                                    menu: base => ({
                                        ...base,
                                        zIndex: 9999
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        color: "#000",
                                        backgroundColor: state.isFocused ? "#eee" : "#fff"
                                    })
                                }}
                            />
                        </div>
                    </div>
                    {/* 購買日期 */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                            style={{
                                width: 85, minWidth: 85, fontWeight: 500, textAlign: "left",
                                whiteSpace: "nowrap", display: "block", lineHeight: "30px"
                            }}
                        >
                            購買日期：
                        </label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            style={{ width: "100%", height: 30, borderRadius: 5, border: "1px solid #ccc", paddingLeft: 6, background: '#fff', color: '#000' }}
                        />
                    </div>
                    {/* 數量 */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                            style={{
                                width: 85, minWidth: 85, fontWeight: 500, textAlign: "left",
                                whiteSpace: "nowrap", display: "block", lineHeight: "30px"
                            }}
                        >
                            數量（股）：
                        </label>
                        <input
                            type="number"
                            min={1000}
                            value={form.quantity}
                            step={1000}
                            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                            style={{ width: "100%", height: 30, borderRadius: 5, border: "1px solid #ccc", paddingLeft: 6, background: '#fff', color: '#000' }}
                        />
                    </div>
                    {/* 價格 */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                            style={{
                                width: 85, minWidth: 85, fontWeight: 500, textAlign: "left",
                                whiteSpace: "nowrap", display: "block", lineHeight: "30px"
                            }}
                        >
                            價格（元）：
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.price}
                            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                            style={{ width: "100%", height: 30, borderRadius: 5, border: "1px solid #ccc", paddingLeft: 6, background: '#fff', color: '#000' }}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                    <button
                        onClick={onSubmit}
                        style={{
                            padding: "7px 26px",
                            background: "#1e70b8",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            fontWeight: 600,
                            letterSpacing: 2,
                            cursor: "pointer"
                        }}
                    >
                        儲存
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "7px 22px",
                            background: "#eee",
                            color: "#555",
                            border: "1px solid #bbb",
                            borderRadius: 6,
                            cursor: "pointer"
                        }}
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
}

function SellModal({ show, stock, onClose, onSubmit }) {
    const [quantity, setQuantity] = useState(1);
    useEffect(() => {
        if (stock) setQuantity(stock.total_quantity);
    }, [stock]);
    if (!show || !stock) return null;
    return (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000 }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: '#000', borderRadius: 10, padding: 28, minWidth: 350, boxShadow: '0 4px 18px #0008', color: '#fff' }}>
                <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: 'center' }}>賣出股票</h2>
                <p style={{ margin: '8px 0' }}>股票：{stock.stock_id} - {stock.stock_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
                    <label style={{ width: 85, minWidth: 85, fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap', display: 'block', lineHeight: '30px' }}>賣出數量：</label>
                    <input
                        type="number"
                        min={1}
                        max={stock.total_quantity}
                        step={1}
                        value={quantity}
                        onChange={e => {
                            let val = Math.floor(Number(e.target.value));
                            if (!val) val = 1;
                            if (val > stock.total_quantity) val = stock.total_quantity;
                            if (val < 1) val = 1;
                            setQuantity(val);
                        }}
                        style={{ width: "100%", height: 30, borderRadius: 5, border: '1px solid #ccc', paddingLeft: 6, background: '#fff', color: '#000' }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                    <button onClick={() => { onSubmit(stock.stock_id, quantity); }} style={{ padding: '7px 26px', background: '#1e70b8', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, letterSpacing: 2, cursor: 'pointer' }}>確認</button>
                    <button onClick={onClose} style={{ padding: '7px 22px', background: '#eee', color: '#555', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer' }}>關閉</button>
                </div>
            </div>
        </div>
    );
}

export default function InventoryTab() {
    const [stockList, setStockList] = useState([]);
    const [transactionHistory, setTransactionHistory] = useState(getTransactionHistory());
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        stock_id: '',
        date: getToday(),
        quantity: '',
        price: ''
    });

    // view toggle: default show inventory summary
    const [showInventory, setShowInventory] = useState(true);

    // 編輯用狀態
    const [editingIdx, setEditingIdx] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', quantity: '', price: '' });
    const [sellModal, setSellModal] = useState({ show: false, stock: null });
    const fileInputRef = useRef(null);

    const handleExport = useCallback(() => {
        const header = ['stock_id', 'date', 'quantity', 'type', 'price'];
        const rows = transactionHistory.map(item => [
            item.stock_id,
            item.date,
            item.quantity,
            item.type,
            item.price ?? ''
        ]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_backup.csv';
        a.click();
        URL.revokeObjectURL(url);
        Cookies.set(BACKUP_COOKIE_KEY, new Date().toISOString(), { expires: 365 });
    }, [transactionHistory]);

    const handleImport = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            const text = event.target.result;
            const lines = text.trim().split(/\r?\n/);
            if (lines.length <= 1) return;
            const [header, ...rows] = lines;
            const fields = header.split(',');
            const list = rows.map(line => {
                const cols = line.split(',');
                const obj = {};
                fields.forEach((f, idx) => {
                    obj[f] = cols[idx];
                });
                obj.quantity = Number(obj.quantity);
                if (obj.price) obj.price = Number(obj.price);
                return obj;
            });
            if (transactionHistory.length > 0) {
                if (!window.confirm('匯入後將覆蓋現有紀錄，是否繼續？')) {
                    e.target.value = '';
                    return;
                }
            }
            setTransactionHistory(list);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    useEffect(() => {
        if (transactionHistory.length === 0) return;
        const last = Cookies.get(BACKUP_COOKIE_KEY);
        const now = new Date();
        if (!last) {
            Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
        } else if (now - new Date(last) >= 30 * 24 * 60 * 60 * 1000) {
            if (window.confirm('距離上次備份已超過30天，是否匯出 CSV 備份？')) {
                handleExport();
            }
            Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
        }
    }, [transactionHistory, handleExport]);

    useEffect(() => {
        fetchWithCache(`${API_HOST}/get_stock_list`)
            .then(list => setStockList(list))
            .catch(() => setStockList([]));
    }, []);

    // cookie 同步
    useEffect(() => {
        saveTransactionHistory(transactionHistory);
    }, [transactionHistory]);

    // 依股票彙總
    const inventoryMap = {};
    transactionHistory.forEach(item => {
        if (!inventoryMap[item.stock_id]) {
            const s = stockList.find(x => x.stock_id === item.stock_id) || {};
            inventoryMap[item.stock_id] = {
                stock_id: item.stock_id,
                stock_name: s.stock_name || '',
                total_quantity: 0,
                total_cost: 0
            };
        }
        const info = inventoryMap[item.stock_id];
        const qty = Number(item.quantity);
        if (item.type === 'sell') {
            const sellQty = Math.min(qty, info.total_quantity);
            if (info.total_quantity > 0) {
                const avg = info.total_cost / info.total_quantity;
                info.total_quantity -= sellQty;
                info.total_cost -= avg * sellQty;
            }
        } else {
            const price = Number(item.price) || 0;
            info.total_quantity += qty;
            info.total_cost += qty * price;
        }
    });

    const inventoryList = Object.values(inventoryMap)
        .filter(i => i.total_quantity > 0)
        .map(i => ({ ...i, avg_price: i.total_cost / i.total_quantity }));

    const handleAdd = () => {
        if (!form.stock_id || !form.date || !form.quantity || !form.price) {
            alert("請輸入完整資料");
            return;
        }
        setTransactionHistory([
            ...transactionHistory,
            {
                ...form,
                date: form.date,
                quantity: Number(form.quantity),
                price: Number(form.price),
                type: 'buy'
            }
        ]);
        setForm({ stock_id: '', date: getToday(), quantity: '', price: '' });
        setShowModal(false);
    };

    const handleEditSave = (idx) => {
        const original = transactionHistory[idx];
        if (!editForm.quantity || !editForm.date || (original.type === 'buy' && !editForm.price)) {
            alert("請輸入有效數字、價格和日期");
            return;
        }
        const updated = [...transactionHistory];
        updated[idx] = {
            ...updated[idx],
            date: editForm.date,
            quantity: Number(editForm.quantity)
        };
        if (original.type === 'buy') {
            updated[idx].price = Number(editForm.price);
        }
        setTransactionHistory(updated);
        setEditingIdx(null);
    };

    const handleDelete = (idx) => {
        if (window.confirm("確定要刪除此筆紀錄？")) {
            setTransactionHistory(transactionHistory.filter((_, i) => i !== idx));
        }
    };

    const handleSell = (stock_id, qty) => {
        const stock = inventoryList.find(s => s.stock_id === stock_id);
        if (!stock || qty > stock.total_quantity) {
            alert('賣出數量不得超過庫存');
            return;
        }
        setTransactionHistory([
            ...transactionHistory,
            { stock_id, date: getToday(), quantity: Number(qty), type: 'sell' }
        ]);
        setSellModal({ show: false, stock: null });
    };

    return (
        <div className="App">
            <p style={{ textAlign: 'left', marginBottom: 16 }}>
                這是一個免費網站，我們不會把你的資料存到後台或伺服器，所有的紀錄（像是你的設定或操作紀錄）都只會保存在你的瀏覽器裡。簡單說：你的資料只在你這台電腦，不會上傳，也不會被我們看到，請安心使用！
            </p>

            <div style={{ textAlign: 'left', marginBottom: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    style={{
                        padding: "6px 18px",
                        borderRadius: 6,
                        border: "1px solid #888",
                        background: "#e7f0fd",
                        cursor: "pointer"
                    }}
                    onClick={() => {
                        setForm({ stock_id: '', date: getToday(), quantity: '', price: '' });
                        setShowModal(true);
                    }}
                >
                    新增購買紀錄
                </button>
                <button
                    style={{
                        padding: "6px 18px",
                        borderRadius: 6,
                        border: "1px solid #888",
                        background: "#e7f0fd",
                        cursor: "pointer"
                    }}
                    onClick={handleExport}
                >
                    匯出 CSV
                </button>
                <button
                    style={{
                        padding: "6px 18px",
                        borderRadius: 6,
                        border: "1px solid #888",
                        background: "#e7f0fd",
                        cursor: "pointer"
                    }}
                    onClick={handleImportClick}
                >
                    匯入 CSV
                </button>
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImport}
                />
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                stockList={stockList}
                form={form}
                setForm={setForm}
                onSubmit={handleAdd}
            />
            <SellModal
                show={sellModal.show}
                stock={sellModal.stock}
                onClose={() => setSellModal({ show: false, stock: null })}
                onSubmit={handleSell}
            />

            {/* View switcher: show one panel at a time */}
            <div className="inventory-tables">
                {showInventory ? (
                    // 目前庫存 (依股票彙總)
                    <div style={{ width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", margin: "10px 0 0 0", justifyContent: 'space-between' }}>
                            <h3>目前庫存 (依股票彙總)</h3>
                            {/* Toggle button */}
                            <button
                                onClick={() => setShowInventory(v => !v)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 6,
                                    border: "1px solid #888",
                                    background: showInventory ? "#ffe082" : "#81d4fa", // yellow when showing 庫存, blue when showing 歷史
                                    color: "#000",
                                    cursor: "pointer",
                                    marginRight: 6
                                }}
                                title="切換列表顯示"
                            >
                                {showInventory ? '顯示：交易歷史' : '顯示：目前庫存'}
                            </button>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-bordered table-striped" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 30 }}>#</th>
                                        <th>代碼</th>
                                        <th>名稱</th>
                                        <th>平均股價</th>
                                        <th>總數量</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryList.length === 0
                                        ? <tr><td colSpan={5}>尚無庫存</td></tr>
                                        : inventoryList.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td>{item.stock_id}</td>
                                                <td>{item.stock_name}</td>
                                                <td>{item.avg_price.toFixed(2)}</td>
                                                <td>{item.total_quantity} ({(item.total_quantity / 1000).toFixed(3).replace(/\.?0+$/, '')} 張)</td>
                                                <td>
                                                    <button onClick={() => setSellModal({ show: true, stock: item })}>賣出</button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    // 交易歷史
                    <div style={{ width: "100%" }}>
                        <h3 style={{ margin: '10px 0 8px' }}>交易歷史</h3>
                        <div className="table-responsive">
                            <table className="table table-bordered table-striped" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>代碼</th>
                                        <th>名稱</th>
                                        <th>交易日期</th>
                                        <th>數量(股)</th>
                                        <th>價格(元)</th>
                                        <th>類型</th>
                                        <th style={{ width: 160 }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactionHistory.length === 0 ? (
                                        <tr><td colSpan={6}>尚無交易紀錄</td></tr>
                                    ) : (
                                        transactionHistory.map((item, idx) => {
                                            const stock = stockList.find(s => s.stock_id === item.stock_id) || {};
                                            const isEditing = editingIdx === idx;
                                            return (
                                                <tr key={idx}>
                                                    <td>{item.stock_id}</td>
                                                    <td>{stock.stock_name || ''}</td>
                                                    <td>
                                                        {isEditing ? (
                                                            <input
                                                                type="date"
                                                                value={editForm.date}
                                                                onChange={e =>
                                                                    setEditForm(f => ({ ...f, date: e.target.value }))
                                                                }
                                                            />
                                                        ) : (
                                                            item.date
                                                        )}
                                                    </td>
                                                    <td>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                min={item.type === 'buy' ? 1000 : 1}
                                                                step={item.type === 'buy' ? 1000 : 1}
                                                                value={editForm.quantity}
                                                                onChange={e =>
                                                                    setEditForm(f => ({ ...f, quantity: e.target.value }))
                                                                }
                                                                style={{ width: 80 }}
                                                            />
                                                        ) : (
                                                            <>
                                                                {item.quantity} ({(item.quantity / 1000).toFixed(3).replace(/\.?0+$/, '')} 張)
                                                            </>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {item.type === 'buy' ? (
                                                            isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    step={0.01}
                                                                    value={editForm.price}
                                                                    onChange={e =>
                                                                        setEditForm(f => ({ ...f, price: e.target.value }))
                                                                    }
                                                                    style={{ width: 80 }}
                                                                />
                                                            ) : (
                                                                item.price
                                                            )
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                    <td>{item.type === 'sell' ? '賣出' : '買入'}</td>
                                                    <td>
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={() => handleEditSave(idx)}>
                                                                    儲存
                                                                </button>
                                                                <button onClick={() => setEditingIdx(null)} style={{ marginLeft: 6 }}>
                                                                    取消
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingIdx(idx);
                                                                        setEditForm({ date: item.date, quantity: item.quantity, price: item.price });
                                                                    }}
                                                                >
                                                                    修改
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(idx)}
                                                                    style={{ marginLeft: 6 }}
                                                                >
                                                                    刪除
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
