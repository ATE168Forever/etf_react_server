import { render, screen } from '@testing-library/react';
import Footer from '@shared/components/Footer/Footer.jsx';
import { translations } from '../src/i18n';

test('renders contact info and dynamic copyright', () => {
  const year = new Date().getFullYear();
  const lang = 'zh';
  const t = (key) => translations[lang][key];
  render(
    <Footer
      theme="dark"
      setTheme={() => {}}
      lang={lang}
      setLang={() => {}}
      t={t}
      translations={translations}
    />
  );
  expect(screen.getByRole('button', { name: t('light') })).toBeInTheDocument();
  const darkBtn = screen.getByRole('button', { name: t('dark') });
  expect(darkBtn).toHaveClass('btn-selected');
  expect(screen.getByRole('link', { name: t('donate') })).toBeInTheDocument();
  expect(
    screen.getByText(`© ${year} ETF Life. All rights reserved.`)
  ).toBeInTheDocument();
});
