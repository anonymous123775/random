import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, Brush } from 'recharts';
import moment from 'moment'; // For formatting the time
import { CircularProgress, Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper } from '@mui/material';
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
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch historical data based on the selected timeframe
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const historicalData = await fetchHistoricalData(machineId, plantId, timeframe);
        const formattedData = historicalData.map((item: any) => ({
          ...item,
          time: moment(item.time).valueOf(), // Use timestamps for more reliable filtering
        }));
        setData(formattedData);
        setLoading(false);
        updateVisibleData(formattedData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchData();
  }, [machineId, plantId, timeframe]);

  // WebSocket to get real-time updates
  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

    socket.onmessage = (event) => {
      const newData = JSON.parse(event.data);

      // Filter data for the specific machine and plant and map time
      const filteredData = newData
        .filter((item: any) => item.machine_id === Number(machineId) && item.plant_id === Number(plantId))
        .map((item: any) => ({
          ...item,
          time: moment(item.time).valueOf(), // Store timestamp for consistency
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
    const cutoffTime = moment().subtract(duration, unit).valueOf(); // Use timestamp for filtering
    const visible = combinedData.filter(item => item.time >= cutoffTime);
    setVisibleData(visible);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress />
      </Box>
    );
  }

  const handleTimeframeChange = (event: SelectChangeEvent<string>) => {
    setTimeframe(event.target.value);
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
          <XAxis
            dataKey="time"
            tick={{ fill: '#8884d8' }}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(time) => moment(time).format('HH:mm:ss')} // Format the time for X-axis
          >
            <Label value="Time" offset={-20} position="insideBottom" />
          </XAxis>
          <YAxis tick={{ fill: '#8884d8' }}>
            <Label value={parameters.join(', ')} angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: 'none' }} />
          <Legend verticalAlign="top" height={36} />
          {parameters.includes('temperature') && <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('humidity') && <Line type="monotone" dataKey="humidity" stroke="#82ca9d" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('power') && <Line type="monotone" dataKey="power_supply" stroke="#ff7300" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('vibration') && <Line type="monotone" dataKey="vibration" stroke="#ff7800" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default LineChartComponent;

// import React, { useEffect, useState, useRef } from 'react';
// import Plot from 'react-plotly.js'; // Import Plotly
// // import Plotly from 'plotly.js-dist-min'; // Import Plotly for animations
// import moment from 'moment'; // For formatting the time
// import { CircularProgress, Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper } from '@mui/material';
// import { fetchHistoricalData } from '../../Services/api';
// import { ScatterData } from 'plotly.js'; // Import ScatterData type

// interface LineChartComponentProps {
//   machineId: string;
//   plantId: string;
//   parameters: string[];
// }

// const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
//   const [data, setData] = useState<any[]>([]);
//   const [timeframe, setTimeframe] = useState('5m');
//   const [loading, setLoading] = useState<boolean>(true);
//   const plotRef = useRef<Plotly.PlotlyHTMLElement | null>(null);

//   // Fetch historical data based on the selected timeframe
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const historicalData = await fetchHistoricalData(machineId, plantId, timeframe);
//         const formattedData = historicalData.map((item: any) => ({
//           ...item,
//           time: moment(item.time).valueOf(),
//         }));
//         setData(formattedData);
//         setLoading(false);
//       } catch (error) {
//         console.error('Error fetching historical data:', error);
//       }
//     };

//     fetchData();
//   }, [machineId, plantId, timeframe]);

//   // WebSocket to get real-time updates
//   useEffect(() => {
//     const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

//     socket.onmessage = (event) => {
//       const newData = JSON.parse(event.data);

//       // Check if newData is an array and process it
//       if (Array.isArray(newData)) {
//         // Format newData
//         const formattedNewData = newData.map((item: any) => ({
//           ...item,
//           time: moment(item.time).valueOf(), // Convert to timestamp
//         }));

//         // Combine historical data with real-time data
//         setData((prevData) => {
//           const combinedData = [...prevData, ...formattedNewData];
//           updateVisibleData(combinedData);
//           return combinedData;
//         });

//         // Trigger animation
//         // if (plotRef.current) {
//         //   Plotly.animate(plotRef.current, {
//         //     data: plotlyData,
//         //     traces: plotlyData.map((_, index) => index), // Update this based on your trace indices
//         //     layout: {},
//         //   }, {
//         //     transition: { duration: 500, easing: 'cubic-in-out' },
//         //     frame: { duration: 500, redraw: false },
//         //   });
//         // }
//       }
//     };

//     socket.onclose = (event) => {
//       console.log('WebSocket connection closed:', event);
//     };

//     return () => {
//       socket.close(); // Close socket when component unmounts
//     };
//   }, [machineId, plantId]);

//   const updateVisibleData = (combinedData: any[]) => {
//     const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = {
//       m: 'minutes',
//       h: 'hours',
//     };
//     const unit = unitMap[timeframe.slice(-1)];
//     const duration = parseInt(timeframe.slice(0, -1));
//     const cutoffTime = moment().subtract(duration, unit).valueOf(); // Use timestamp for filtering
//     const visible = combinedData.filter(item => item.time >= cutoffTime);
//     setData(visible);
//   };

//   if (loading) {
//     return (
//       <Box display="flex" justifyContent="center" alignItems="center" height={300}>
//         <CircularProgress />
//       </Box>
//     );
//   }

//   // Prepare data for Plotly
//   const plotlyData: Partial<ScatterData>[] = parameters.map((param) => ({
//     x: data.map((item) => moment(item.time).format('HH:mm:ss')), // Format time for x-axis
//     y: data.map((item) => item[param]), // Extract parameter values
//     type: 'scatter', // Type of plot
//     mode: 'lines+markers', // Show both lines and markers
//     name: param.charAt(0).toUpperCase() + param.slice(1), // Capitalize parameter name for the legend
//     line: { width: 2 },
//   }));

//   return (
//     <Paper elevation={3} sx={{ padding: 2, marginBottom: 3, height: '100%' }}>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
//         <Typography variant="h6" gutterBottom>
//           {parameters.map(param => `${param.charAt(0).toUpperCase() + param.slice(1)} over Time`).join(', ')}
//         </Typography>
//         <FormControl variant="outlined" size="small">
//           <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
//           <Select
//             labelId="timeframe-select-label"
//             value={timeframe}
//             onChange={(event: SelectChangeEvent<string>) => setTimeframe(event.target.value)}
//             label="Timeframe"
//           >
//             <MenuItem value="1m">1 Minute</MenuItem>
//             <MenuItem value="5m">5 Minutes</MenuItem>
//             <MenuItem value="15m">15 Minutes</MenuItem>
//             <MenuItem value="30m">30 Minutes</MenuItem>
//             <MenuItem value="1h">1 Hour</MenuItem>
//             <MenuItem value="6h">6 Hours</MenuItem>
//             <MenuItem value="12h">12 Hours</MenuItem>
//             <MenuItem value="24h">24 Hours</MenuItem>
//           </Select>
//         </FormControl>
//       </Box>
//       <Box sx={{ height: 'calc(100% - 64px)' }}>
//         <Plot
//           // ref={plotRef}
//           data={plotlyData}
//           layout={{
//             title: 'Machine Parameters Over Time',
//             xaxis: { title: 'Time', tickangle: -45, autorange: true },
//             yaxis: { title: 'Values', autorange: true },
//             autosize: true,
//             margin: { l: 50, r: 50, b: 50, t: 50 },
//             showlegend: true,
//             legend: { orientation: 'h' },
//           }}
//           style={{ width: '100%', height: '100%' }}
//           config={{ displayModeBar: true}}
//         />
//       </Box>
//     </Paper>
//   );
// };

// export default LineChartComponent;
