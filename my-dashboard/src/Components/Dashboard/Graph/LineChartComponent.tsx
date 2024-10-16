import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import moment from 'moment'; // For formatting the time
import { CircularProgress, Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper } from '@mui/material';
import { fetchHistoricalData } from '../../Services/api';

interface LineChartComponentProps {
  machineId: string[];
  plantId: string;
  parameters: string[];
}

const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
  const [data, setData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('5m');
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch historical data based on the selected timeframe
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const allData = await Promise.all(machineId.map(id => fetchHistoricalData(id, plantId, timeframe)));
        const combinedData = allData.flat().map((item: any) => ({
          ...item,
          time: moment(item.time).valueOf(), // Use timestamps for more reliable filtering
        }));
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
        // console.log('Fetched Data:', uniqueData); // Log fetched data
        setData(uniqueData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchData();
  }, [machineId, plantId, timeframe]);

  // WebSocket to get real-time updates
  useEffect(() => {
    const sockets = machineId.map(id => {
      const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${id}&plantId=${plantId}`);
      
      socket.onmessage = (event) => {
        const newData = JSON.parse(event.data);

        // Filter data for the specific machine and plant and map time
        const filteredData = newData
          .filter((item: any) => item.machine_id === Number(id) && item.plant_id === Number(plantId))
          .map((item: any) => ({
            ...item,
            time: moment(item.time).valueOf(), // Store timestamp for consistency
          }));

        // Combine historical data with real-time data
        setData((prevData) => {
          const combinedData = [...prevData, ...filteredData];
          const uniqueData = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
          // console.log('Updated Data:', uniqueData); // Log updated data
          return uniqueData;
        });
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
      };

      return socket;
    });

    return () => {
      sockets.forEach(socket => socket.close()); // Close all sockets when component unmounts
    };

  }, [machineId, plantId, timeframe]);

  const handleTimeframeChange = (event: SelectChangeEvent<string>) => {
    setTimeframe(event.target.value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress />
      </Box>
    );
  }

  // Generate time intervals based on the selected timeframe
  const generateTimeIntervals = (start: number, end: number, interval: string) => {
    const intervals = [];
    let current = moment(start);
    const endMoment = moment(end);

    const intervalMapping: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      'm': 'minutes',
      'h': 'hours',
      'd': 'days'
    };

    const intervalUnit = intervalMapping[interval] || 'minutes'; // Default to minutes if not found

    while (current <= endMoment) {
      intervals.push(current.valueOf());
      current = current.add(1, intervalUnit);
    }

    return intervals;
  };

  const minTime = Math.min(...data.map(item => item.time));
  const maxTime = Math.max(...data.map(item => item.time));
  const intervalUnit = timeframe.slice(-1); // Get the unit (m, h, etc.)
  const timeIntervals = generateTimeIntervals(minTime, maxTime, intervalUnit);

  // Determine aggregation window based on timeframe
  const getAggregationWindow = (timeframe: string) => {
    if (timeframe === '1m') return 15; // 15 seconds
    if (timeframe === '5m') return 30; // 30 seconds
    if (timeframe.endsWith('m')) return 60; // 1 minute for other minute-based timeframes
    if (timeframe.endsWith('h') && parseInt(timeframe) >= 6) return 1800; // 30 minutes for 6 hours or more
    return 60; // Default to 1 minute
  };

  const aggregationWindow = getAggregationWindow(timeframe) * 1000; // Convert to milliseconds

  const traces = machineId.flatMap(id =>
    parameters.map(param => {
      const machineData = data.filter(item => item.machine_id === id);
      const aggregatedData = [];

      for (let i = minTime; i <= maxTime; i += aggregationWindow) {
        const windowData = machineData.filter(item => item.time >= i && item.time < i + aggregationWindow);
        const avgValue = windowData.reduce((sum, item) => sum + item[param], 0) / windowData.length;
        if (windowData.length > 0) {
          aggregatedData.push({
            time: i,
            value: avgValue
          });
        }
      }

      // console.log(`Aggregated Data for Machine ${id} - ${param}:`, aggregatedData);

      return {
        x: aggregatedData.map(item => moment(item.time).format('YYYY-MM-DD HH:mm:ss')),
        y: aggregatedData.map(item => item.value),
        mode: 'lines',
        name: `Machine ${id} - ${param}`
      };
    })
  );


  // console.log('Traces:', traces); // Log traces

  // Calculate the range for the x-axis based on the selected timeframe
  const getXRange = (timeframe: string) => {
    const now = moment().valueOf();
    const timeMapping: { [key: string]: number } = {
      '1m': 60000, // 1 minute in milliseconds
      '5m': 300000, // 5 minutes in milliseconds
      '15m': 900000, // 15 minutes in milliseconds
      '30m': 1800000, // 30 minutes in milliseconds
      '1h': 3600000, // 1 hour in milliseconds
      '6h': 21600000, // 6 hours in milliseconds
      '12h': 43200000, // 12 hours in milliseconds
      '24h': 86400000 // 24 hours in milliseconds
    };

    return [now - (timeMapping[timeframe] || 300000), now]; // Default to 5 minutes if not found
  };

  const xRange = getXRange(timeframe);

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
      <Plot
        data={traces}
        layout={{
          title: 'Machine Parameters Over Time',
          xaxis: { title: 'Time', tickformat: '%Y-%m-%d %H:%M:%S', range: xRange }, // Adjust x-axis range based on timeframe
          yaxis: { title: 'Value' },
          legend: { title: { text: 'Machine and Parameter' } },
          autosize: true
        }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </Paper>
  );
};

export default LineChartComponent;
