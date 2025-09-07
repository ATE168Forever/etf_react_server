export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-black text-yellow-400">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* 聯絡方式 */}
        <div className="text-center md:text-left">
          <h3 className="text-lg font-bold border-b border-yellow-400 inline-block mb-2">
            聯絡方式
          </h3>
          <p>
            電子信箱：
            <a
              href="mailto:giantbean2025@gmail.com"
              className="underline hover:text-yellow-300 transition"
            >
              giantbean2025@gmail.com
            </a>
          </p>
        </div>

        {/* 贊助區塊 */}
        <div className="text-center">
          <p className="mb-2">喜歡這個專案嗎？請作者喝杯咖啡 ☕</p>
          <a
            href="https://www.buymeacoffee.com/ginatbean"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition"
          >
            贊助
          </a>
        </div>
      </div>

      {/* 版權資訊 */}
      <div className="bg-black text-yellow-600 text-sm text-center py-4 border-t border-yellow-800">
        © {year} ETF Life. All rights reserved.
      </div>
    </footer>
  );
}
