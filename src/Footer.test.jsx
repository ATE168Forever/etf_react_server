import { render, screen } from '@testing-library/react';
import Footer from './components/Footer.jsx';
import { LanguageContext, translations } from './i18n';

test('renders contact info and dynamic copyright', () => {
  const year = new Date().getFullYear();
  const lang = 'zh';
  const t = (key) => translations[lang][key];
  render(
    <LanguageContext.Provider value={{ lang, setLang: () => {}, t }}>
      <Footer theme="dark" toggleTheme={() => {}} />
    </LanguageContext.Provider>
  );
  expect(screen.getByRole('link', { name: t('light_theme') })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '英' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: t('donate') })).toBeInTheDocument();
  expect(
    screen.getByText(`© ${year} ETF Life. All rights reserved.`)
  ).toBeInTheDocument();
});
