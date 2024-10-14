import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, Label } from 'recharts';
import moment from 'moment'; // For formatting the time
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper } from '@mui/material';
import { fetchHistoricalData } from '../../Services/api';

interface LineChartComponentProps {
  machineId: string;
  plantId: string;
  parameters: string[];
}

const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
  const [data, setData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('5m');
  const [visibleData, setVisibleData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch historical data based on the selected timeframe
    const fetchData = async () => {
      try {
        const historicalData = await fetchHistoricalData(machineId, plantId, timeframe);
        const formattedData = historicalData.map((item: any) => ({
          ...item,
          time: moment(item.time).format('HH:mm:ss'),
        }));
        setData(formattedData);
        updateVisibleData(formattedData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchData();
  }, [machineId, plantId, timeframe]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

    socket.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      // Filter data for the specific machine and plant and map time
      const filteredData = newData
        .filter((item: any) => 
            item.machine_id === Number(machineId) && item.plant_id === Number(plantId)
        )
        .map((item: any) => ({
            ...item,
            time: moment(item.time).format('HH:mm:ss'),
        }));

      // Combine historical data with real-time data
      setData((prevData) => {
        const combinedData = [...prevData, ...filteredData];
        updateVisibleData(combinedData);
        return combinedData;
      });
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    return () => {
      socket.close(); // Close socket when component unmounts
    };
  }, [machineId, plantId, timeframe]);

  const updateVisibleData = (combinedData: any[]) => {
    const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      m: 'minutes',
      h: 'hours',
    };
    const unit = unitMap[timeframe.slice(-1)];
    const duration = parseInt(timeframe.slice(0, -1));
    const cutoffTime = moment().subtract(duration, unit).format('HH:mm:ss');
    const visible = combinedData.filter(item => item.time >= cutoffTime);
    setVisibleData(visible);
  };

  const handleTimeframeChange = (event: SelectChangeEvent<string>) => {
    setTimeframe(event.target.value);
  };

  const getXAxisDomain = () => {
    const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      m: 'minutes',
      h: 'hours',
    };
    const unit = unitMap[timeframe.slice(-1)];
    const duration = parseInt(timeframe.slice(0, -1));
    const endTime = moment().format('HH:mm:ss');
    const startTime = moment().subtract(duration, unit).format('HH:mm:ss');
    return [startTime, endTime];
  };

  return (
    <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h6" gutterBottom>
          {parameters.map(param => param.charAt(0).toUpperCase() + param.slice(1)).join(', ')}
        </Typography>
        <FormControl variant="outlined" size="small">
          <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
          <Select
            labelId="timeframe-select-label"
            value={timeframe}
            onChange={handleTimeframeChange}
            label="Timeframe"
          >
            <MenuItem value="1m">1 Minute</MenuItem>
            <MenuItem value="5m">5 Minutes</MenuItem>
            <MenuItem value="15m">15 Minutes</MenuItem>
            <MenuItem value="30m">30 Minutes</MenuItem>
            <MenuItem value="1h">1 Hour</MenuItem>
            <MenuItem value="6h">6 Hours</MenuItem>
            <MenuItem value="12h">12 Hours</MenuItem>
            <MenuItem value="24h">24 Hours</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={visibleData} margin={{ left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="time" tick={{ fill: '#8884d8' }} domain={getXAxisDomain()}>
            <Label value="Time" offset={-20} position="insideBottom" />
          </XAxis>
          <YAxis tick={{ fill: '#8884d8' }}>
            <Label value={parameters.join()} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: 'none' }} />
          <Legend verticalAlign="top" height={36} />
          {parameters.includes('temperature') && <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('humidity') && <Line type="monotone" dataKey="humidity" stroke="#82ca9d" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('power') && <Line type="monotone" dataKey="power_supply" stroke="#ff7300" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('vibration') && <Line type="monotone" dataKey="vibration" stroke="#ff7800" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {/* <Brush dataKey="time" height={30} stroke="#8884d8" /> */}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default LineChartComponent;
