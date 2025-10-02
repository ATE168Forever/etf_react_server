import { useMemo, useState } from 'react';

const mockCategories = [
  { id: 'housing', label: 'Housing' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'transport', label: 'Transportation' },
  { id: 'leisure', label: 'Leisure' },
  { id: 'savings', label: 'Savings' },
];

const mockTransactions = [
  { id: 1, category: 'housing', description: 'Rent', amount: 1200 },
  { id: 2, category: 'food', description: 'Groceries', amount: 320 },
  { id: 3, category: 'transport', description: 'Metro card', amount: 75 },
  { id: 4, category: 'leisure', description: 'Streaming subscriptions', amount: 45 },
  { id: 5, category: 'savings', description: 'Emergency fund', amount: 200 },
];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTransactions = useMemo(() => {
    if (selectedCategory === 'all') {
      return mockTransactions;
    }

    return mockTransactions.filter((transaction) => transaction.category === selectedCategory);
  }, [selectedCategory]);

  const total = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="app">
      <header className="hero">
        <h1>Budget Life</h1>
        <p className="tagline">Track day-to-day spending and stay aligned with long-term goals.</p>
      </header>

      <section className="filters" aria-label="transaction filters">
        <label className="filter-label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          className="filter-select"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {mockCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </section>

      <section className="summary" aria-live="polite">
        <h2>Monthly summary</h2>
        <p className="summary-total">
          <span aria-label="currency">$</span>
          {total.toLocaleString()}
        </p>
      </section>

      <section className="transactions" aria-label="transaction list">
        <table>
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Category</th>
              <th scope="col" className="numeric">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.description}</td>
                <td>{mockCategories.find((category) => category.id === transaction.category)?.label}</td>
                <td className="numeric">${transaction.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
