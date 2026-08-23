/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import InsightCard from '../src/components/InsightCard';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows the achievement label and percent when a goal is set', () => {
  render(<InsightCard achievementLabel="62%" achievementPercent={0.62} lowIncomeMonthMessage={null} lang="zh" t={t} />);
  expect(screen.getByText('62%')).toBeInTheDocument();
});

test('shows a no-goal message when achievementLabel is null', () => {
  render(<InsightCard achievementLabel={null} achievementPercent={0} lowIncomeMonthMessage={null} lang="zh" t={t} />);
  expect(screen.getByText(t('insight_card_no_goal'))).toBeInTheDocument();
});

test('does not render a low-income section when lowIncomeMonthMessage is not provided', () => {
  render(<InsightCard achievementLabel="62%" achievementPercent={0.62} lowIncomeMonthMessage={null} lang="zh" t={t} />);
  expect(screen.queryByTestId('insight-low-income')).not.toBeInTheDocument();
});
