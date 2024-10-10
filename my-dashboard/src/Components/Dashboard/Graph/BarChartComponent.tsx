import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ChartStyles.css';
import DateSelector from '../DateSelector';

interface BarChartComponentProps {
  machineId: string;
  plantId: string;
}

const BarChartComponent: React.FC<BarChartComponentProps> = ({ machineId, plantId }) => {
  const [data, setData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()+1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(event.target.value));
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(event.target.value));
  };


  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`http://localhost:8000/api/num-failures?month=${selectedMonth}&year=${selectedYear}&machine_id=${machineId}&plant_id=${plantId}`);
      const newData = await response.json();
      console.log('New alert data received:', newData);

      setData(newData);
    };

    fetchData();
  }, [selectedMonth, selectedYear, machineId, plantId]);

  return (
    <div className="chart-container">
      <h2>Failures per Day</h2>
      <DateSelector
        month={selectedMonth}
        year={selectedMonth}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
      />
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="failures" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartComponent;
