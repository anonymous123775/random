import React from 'react';
import './DateSelector.css';

interface DateSelectorProps {
  month: number;
  year: number;
  onMonthChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onYearChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ month, year, onMonthChange, onYearChange }) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="date-selector">
      <select value={month} onChange={onMonthChange}>
        {months.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select value={year} onChange={onYearChange}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateSelector;
