import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import moment from 'moment';
import { CircularProgress, Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper } from '@mui/material';
import { fetchHistoricalMachineData, fetchHistoricalMachineDataParam } from '../../Services/api';

interface LineChartComponentProps {
  machineId: string[];
  plantId: string;
  parameters: string[];
  startTime: Date | null;
  endTime: Date | null;
}

const NORMAL_RANGE: any = {
  temperature: [40, 60],
  humidity: [40, 50],
  power_supply: [230, 240],
  vibration: [0.2, 0.4]
};

const LineChartNotRealtimeComponentParam: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters, startTime, endTime }) => {
  const [timeframe, setTimeframe] = useState('5m');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoadingState] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!startTime || !endTime) return;
      setLoadingState(true);

      try {
        const endMoment = moment(endTime);
        const startMomentHere = moment(startTime);
        const allData = await Promise.all(machineId.map(id => fetchHistoricalMachineDataParam(id, plantId, parameters[0],startMomentHere.toDate(), endMoment.toDate())));
        const combinedData = allData.flat().map((item: any) => ({
          ...item,
          time: moment(item.time).valueOf(),
        }));
        const uniqueData = Array.from(new Map(combinedData.map(item => [`${item.machine_id}-${item.time}`, item])).values());
        setData(uniqueData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoadingState(false);
      }
    };

    fetchData();
  }, [machineId, plantId, startTime, endTime]);

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

  const traces = machineId.flatMap(id =>
    parameters.map(param => {
      const machineData = data.filter(item => item.machine_id === id);
      return {
        x: machineData.map(item => moment(item.time).format('YYYY-MM-DD HH:mm:ss')),
        y: machineData.map(item => item[param]),
        mode: 'lines',
        name: `Machine ${id} - ${param}`
      };
    })
  );

  parameters.forEach(param => {
    const [normalRangeMin, normalRangeMax] = NORMAL_RANGE[param];
    const firstTrace = traces.find(trace => trace.name.includes(param));
    if (firstTrace) {
      const normalRangeMinLine = {
        x: firstTrace.x,
        y: Array(firstTrace.x.length).fill(normalRangeMin),
        mode: 'lines',
        name: `Normal Range Min - ${param}`,
        line: { dash: 'dash', color: 'green' }
      };

      const normalRangeMaxLine = {
        x: firstTrace.x,
        y: Array(firstTrace.x.length).fill(normalRangeMax),
        mode: 'lines',
        name: `Normal Range Max - ${param}`,
        line: { dash: 'dash', color: 'red' }
      };

      traces.push(normalRangeMinLine, normalRangeMaxLine);
    }
  });

  const maxTime = Math.max(...data.map(item => item.time));

  const getXRange = (timeframe: string) => {
    const timeMapping: { [key: string]: number } = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '6h': 21600000,
      '12h': 43200000,
      '24h': 86400000
    };
    return [maxTime - (timeMapping[timeframe] || 300000), maxTime];
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
          xaxis: { title: 'Time', tickformat: '%Y-%m-%d %H:%M:%S', range: xRange },
          yaxis: { title: 'Value' },
          legend: { title: { text: 'Machine and Parameter' }, orientation: 'h', y: -0.2 },
          autosize: true,
          margin: { t: 30, b: 80, l: 40, r: 30 }
        }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </Paper>
  );
};

export default LineChartNotRealtimeComponentParam;
