import { useState } from 'react';
import { API_HOST } from './config';

function NLHelper() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch(`${API_HOST}:8001/nl_query?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setResponse(`Error: ${res.status}`);
      } else {
        const data = await res.json();
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setResponse('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nl-helper">
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="輸入查詢..."
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '查詢中...' : '送出'}
      </button>
      <pre className="nl-helper-response">{response}</pre>
    </div>
  );
}

export default NLHelper;
