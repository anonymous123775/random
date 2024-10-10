import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import moment from 'moment'; // For formatting the time
import './ChartStyles.css';

interface LineChartComponentProps {
  machineId: string;
  plantId: string;
  parameters: string[];
}

const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
  const [data, setData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('5m');

  useEffect(() => {
    // Fetch historical data based on the selected timeframe
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/historical-data?machineId=${machineId}&plantId=${plantId}&timeframe=${timeframe}`);
        const historicalData = await response.json();
        const formattedData = historicalData.map((item: any) => ({
          ...item,
          time: moment(item.time).format('HH:mm:ss'),
        }));
        setData(formattedData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchHistoricalData();
  }, [machineId, plantId, timeframe]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

    socket.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      console.log('New data received:', newData);

      // Filter data for the specific machine and plant and map time
      const filteredData = newData
        .filter((item: any) => 
            item.machine_id === Number(machineId) && item.plant_id === Number(plantId)
        )
        .map((item: any) => ({
            ...item,
            time: moment(item.time).format('HH:mm:ss'),
        }));

      console.log('Filtered data:', filteredData);  // Log filtered data

      // Combine historical data with real-time data
      setData((prevData) => {
        const combinedData = [...prevData, ...filteredData];
        const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = {
          m: 'minutes',
          h: 'hours',
        };
        const unit = unitMap[timeframe.slice(-1)];
        const duration = parseInt(timeframe.slice(0, -1));
        const cutoffTime = moment().subtract(duration, unit).format('HH:mm:ss');
        return combinedData.filter(item => item.time >= cutoffTime);
      });
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    return () => {
      socket.close(); // Close socket when component unmounts
    };
  }, [machineId, plantId, timeframe]);

  const handleTimeframeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeframe(event.target.value);
  };

  return (
    <div className="chart-container">
      <div className="controls">
        <label htmlFor="timeframe-select">Timeframe:</label>
        <select id="timeframe-select" value={timeframe} onChange={handleTimeframeChange}>
          <option value="1m">1 Minute</option>
          <option value="5m">5 Minutes</option>
          <option value="15m">15 Minutes</option>
          <option value="30m">30 Minutes</option>
          <option value="1h">1 Hour</option>
          <option value="6h">6 Hours</option>
          <option value="12h">12 Hours</option>
          <option value="24h">24 Hours</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="time" tick={{ fill: '#8884d8' }} />
          <YAxis tick={{ fill: '#8884d8' }} />
          <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: 'none' }} />
          <Legend verticalAlign="top" height={36} />
          {parameters.includes('temperature') && <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
          {parameters.includes('humidity') && <Line type="monotone" dataKey="humidity" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
          {parameters.includes('power') && <Line type="monotone" dataKey="power" stroke="#ff7300" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;
