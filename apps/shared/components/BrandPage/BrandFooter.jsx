import Footer from '@shared/components/Footer/Footer.jsx';
import { useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';

export default function BrandFooter({ brandName = 'ETF Life' }) {
  const { theme, setTheme, lang, setLang } = useThemeLanguage();

  return (
    <Footer
      theme={theme}
      setTheme={setTheme}
      lang={lang}
      setLang={setLang}
      brandName={brandName}
    />
  );
}
