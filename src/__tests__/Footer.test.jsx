import { render, screen } from '@testing-library/react';
import Footer from '../components/Footer.jsx';
import { LanguageContext, translations } from '../i18n';

test('renders contact info and dynamic copyright', () => {
  const year = new Date().getFullYear();
  const lang = 'zh';
  const t = (key) => translations[lang][key];
  render(
    <LanguageContext.Provider value={{ lang, setLang: () => {}, t }}>
      <Footer theme="dark" setTheme={() => {}} />
    </LanguageContext.Provider>
  );
  expect(screen.getByRole('button', { name: t('light') })).toBeInTheDocument();
  const darkBtn = screen.getByRole('button', { name: t('dark') });
  expect(darkBtn).toHaveClass('btn-selected');
  expect(screen.getByRole('link', { name: t('donate') })).toBeInTheDocument();
  expect(
    screen.getByText(`© ${year} ETF Life. All rights reserved.`)
  ).toBeInTheDocument();
});
