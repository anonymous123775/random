import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import moment from 'moment'; // For formatting the time
import { CircularProgress, Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper } from '@mui/material';
import { fetchHistoricalData } from '../../Services/api';
import { Annotations } from 'plotly.js';

interface LineChartComponentProps {
  machineId: string[];
  plantId: string;
  parameters: string[];
  realtimeData: any[];
}

const NORMAL_RANGE: any = {
  temperature: [40, 60],
  humidity: [40, 50],
  power_supply: [230, 240],
  vibration: [0.2, 0.4]
};

const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters, realtimeData }) => {
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

  useEffect(() => {
    setData((prevData) => {
        const combinedData = [...prevData, ...realtimeData];
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
        return uniqueData;
      });
  },[realtimeData])

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
  const generateTimeIntervals = (start: number, end: number, interval: string) => {
    const intervals = [];
    let current = moment(start);
    const endMoment = moment(end);

    const intervalMapping: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      'm': 'minutes',
      'h': 'hours',
      'd': 'days'
    };

    const intervalUnit = intervalMapping[interval] || 'minutes'; 

    while (current <= endMoment) {
      intervals.push(current.valueOf());
      current = current.add(1, intervalUnit);
    }

    return intervals;
  };

  const minTime = Math.min(...data.map(item => item.time));
  const maxTime = Math.max(...data.map(item => item.time));
  const intervalUnit = timeframe.slice(-1);
  const timeIntervals = generateTimeIntervals(minTime, maxTime, intervalUnit);

  const getAggregationWindow = (timeframe: string) => {
    if (timeframe === '1m') return 5;
    if (timeframe === '5m') return 15; 
    if (timeframe.endsWith('m')) return 30;
    if (timeframe.endsWith('h') && parseInt(timeframe) >= 6) return 300;
    return 60;
  };

  const aggregationWindow = getAggregationWindow(timeframe) * 1000;

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

      return{    
          x: aggregatedData.map(item => moment(item.time).format('YYYY-MM-DD HH:mm:ss')),
          y: aggregatedData.map(item => item.value),
          mode: 'lines',
          name: `Machine ${id} - ${param}`
      }
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

  const getXRange = (timeframe: string) => {
    const now = moment().valueOf();
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

    return [now - (timeMapping[timeframe] || 300000), now];
  };

  const xRange = getXRange(timeframe);
  const annotations: Partial<Annotations>[] = traces.filter(trace => trace.x.length > 0 && trace.y.length > 0).map((trace, index) => {
    const lastIndex = trace.x.length - 1;
    return {
      xref: 'x',
      yref: 'y',
      x: trace.x[lastIndex],
      y: trace.y[lastIndex],
      text: `${trace.name} : ${trace.y[lastIndex] ? trace.y[lastIndex].toFixed(2) : ""}`,
      showarrow: true,
      arrowhead: 1,
      opacity:0.5,
      ax: -40,
      ay: -30 - (index* 20), 
      align: "center"    
    };
  });

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
          legend: { title: { text: 'Machine and Parameter' } , orientation: 'h', y: -0.2 },
          autosize: true,
          // annotations: annotations,
          margin: { t: 40, b: 80, l: 40, r: 40 }
        }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </Paper>
  );
};

export default LineChartComponent;
