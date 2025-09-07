import './Footer.css';

export default function Footer({ theme, toggleTheme }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="theme-toggle">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
            className="theme-toggle-link"
          >
            {theme === 'dark' ? '亮色主題' : '暗色主題'}
          </a>
        </div>
        <div className="contact-section">
          <h3>聯絡方式</h3>
          <p>
            電子信箱：
            <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>
          </p>
        </div>
        <div className="donation-section">
          <p>喜歡這個專案嗎？請作者喝杯咖啡 ☕</p>
          <a
            href="https://www.buymeacoffee.com/ginatbean"
            target="_blank"
            rel="noreferrer"
            className="donate-link"
          >
            贊助
          </a>
        </div>
      </div>
      <div className="copyright">© {year} ETF Life. All rights reserved.</div>
    </footer>
  );
}
