import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const { lang = 'zh' } = this.props;
      return (
        <div style={{ padding: '24px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          {lang === 'en'
            ? 'Something went wrong in this section. Please refresh.'
            : '此區塊發生錯誤，請重新整理頁面。'}
        </div>
      );
    }
    return this.props.children;
  }
}
