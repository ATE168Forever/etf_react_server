import { useState, useEffect } from 'react';

export default function useCalendarState() {
  const [showCalendar, setShowCalendar] = useState(() => {
    const stored = localStorage.getItem('appShowCalendar');
    return stored === null ? true : stored === 'true';
  });

  const [calendarFilter, setCalendarFilter] = useState('both');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  useEffect(() => {
    localStorage.setItem('appShowCalendar', showCalendar);
  }, [showCalendar]);

  return {
    showCalendar,
    setShowCalendar,
    calendarFilter,
    setCalendarFilter,
    calendarMonth,
    setCalendarMonth,
  };
}
