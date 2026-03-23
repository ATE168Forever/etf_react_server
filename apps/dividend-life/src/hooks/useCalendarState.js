import { useState, useEffect } from 'react';

export default function useCalendarState() {
  const [showCalendar, setShowCalendar] = useState(() => {
    const stored = localStorage.getItem('appShowCalendar');
    return stored === null ? true : stored === 'true';
  });

  const [calendarFilter, setCalendarFilter] = useState(() => {
    const saved = localStorage.getItem('appCalendarFilter');
    return saved === 'ex' || saved === 'pay' ? saved : 'both';
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  useEffect(() => {
    localStorage.setItem('appShowCalendar', showCalendar);
  }, [showCalendar]);

  useEffect(() => {
    localStorage.setItem('appCalendarFilter', calendarFilter);
  }, [calendarFilter]);

  return {
    showCalendar,
    setShowCalendar,
    calendarFilter,
    setCalendarFilter,
    calendarMonth,
    setCalendarMonth,
  };
}
