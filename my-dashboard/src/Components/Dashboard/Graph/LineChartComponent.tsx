import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import moment from 'moment'; // For formatting the time
import './ChartStyles.css';
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
        const historicalData = await fetchHistoricalData(machineId,plantId,timeframe);
        console.log(historicalData)
        const formattedData = historicalData.map((item: any) => ({
          ...item,
          time: moment(item.time).format('HH:mm:ss'),
        }));
        // console.log("historical data : ", formattedData);
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

  // const updateVisibleData = (combinedData: any[]) => {
  //   const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = {
  //     m: 'minutes',
  //     h: 'hours',
  //   };
  //   const unit = unitMap[timeframe.slice(-1)];
  //   const duration = parseInt(timeframe.slice(0, -1));
  //   const cutoffTime = moment().subtract(duration, unit);
  //   const endTime = moment();

  //   // Create an array of all time points within the selected timeframe
  //   const timePoints = [];
  //   for (let m = cutoffTime; m <= endTime; m.add(1, 'minute')) {
  //     timePoints.push(m.format('HH:mm:ss'));
  //   }

  //   // Fill in missing data points with null values
  //   const filledData = timePoints.map(time => {
  //     const existingData = combinedData.find(item => item.time === time);
  //     if (existingData) {
  //       return existingData;
  //     } else {
  //       const emptyData: {[key : string] : any} = { time };
  //       parameters.forEach(param => {
  //         emptyData[param] = null;
  //       });
  //       return emptyData;
  //     }
  //   });

  //   setVisibleData(filledData);
  // };

  const handleTimeframeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
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
    <div className="chart-card">
      <h2>{parameters}</h2>
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
        <LineChart data={visibleData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="time" tick={{ fill: '#8884d8' }} domain={getXAxisDomain()} />
          <YAxis tick={{ fill: '#8884d8' }} />
          <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: 'none' }} />
          <Legend verticalAlign="top" height={36} />
          {parameters.includes('temperature') && <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('humidity') && <Line type="monotone" dataKey="humidity" stroke="#82ca9d" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('power') && <Line type="monotone" dataKey="power_supply" stroke="#ff7300" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          {parameters.includes('vibration') && <Line type="monotone" dataKey="vibration" stroke="#ff7800" strokeWidth={1} dot={{ r: 1 }} activeDot={{ r: 2 }} />}
          <Brush dataKey="time" height={30} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChartComponent;



// import React, { useEffect, useRef, useState } from 'react';
// import { Chart, registerables } from 'chart.js';
// import zoomPlugin from 'chartjs-plugin-zoom';
// import moment from 'moment';
// import 'chartjs-adapter-moment';

// Chart.register(...registerables, zoomPlugin);

// interface LineChartComponentProps {
//   machineId: string;
//   plantId: string;
//   parameters: string[];
// }

// const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
//   const chartRef = useRef<HTMLCanvasElement>(null);
//   const [data, setData] = useState<any[]>([]);
//   const [timeframe, setTimeframe] = useState('5m');
//   const [chartInstance, setChartInstance] = useState<Chart | null>(null);

//   useEffect(() => {
//     // Fetch historical data based on the selected timeframe
//     const fetchHistoricalData = async () => {
//       try {
//         const response = await fetch(`http://localhost:8000/historical-data?machineId=${machineId}&plantId=${plantId}&timeframe=${timeframe}`);
//         const historicalData = await response.json();
//         const formattedData = historicalData.map((item: any) => ({
//           ...item,
//           time: moment(item.time).toISOString(), // Ensure time is in ISO format
//         }));
//         console.log("Historical data:", formattedData);
//         setData(formattedData);
//       } catch (error) {
//         console.error('Error fetching historical data:', error);
//       }
//     };

//     fetchHistoricalData();
//   }, [machineId, plantId, timeframe]);

//   useEffect(() => {
//     const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

//     socket.onmessage = (event) => {
//       const newData = JSON.parse(event.data);
//       console.log('New data received:', newData);

//       const filteredData = newData
//         .filter((item: any) => item.machine_id === Number(machineId) && item.plant_id === Number(plantId))
//         .map((item: any) => ({
//           ...item,
//           time: moment(item.time).toISOString(), // Ensure time is in ISO format
//         }));

//       console.log('Filtered data:', filteredData);

//       setData((prevData) => {
//         const combinedData = [...prevData, ...filteredData];
//         const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = { m: 'minutes', h: 'hours' };
//         const unit = unitMap[timeframe.slice(-1) as keyof typeof unitMap];
//         const duration = parseInt(timeframe.slice(0, -1));
//         const cutoffTime = moment().subtract(duration, unit).toISOString();
//         const visibleData = combinedData.filter((item) => item.time >= cutoffTime);
//         console.log('Visible data:', visibleData);
//         return visibleData;
//       });
//     };

//     socket.onclose = () => {
//       console.log('WebSocket connection closed');
//     };

//     return () => {
//       socket.close();
//     };
//   }, [machineId, plantId, timeframe]);

//   useEffect(() => {
//     if (chartRef.current && data.length > 0) {
//       const ctx = chartRef.current.getContext('2d');
//       const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = { m: 'minutes', h: 'hours' };
//       const unit = unitMap[timeframe.slice(-1) as keyof typeof unitMap];
//       const duration = parseInt(timeframe.slice(0, -1));
//       const endTime = moment().toISOString();
//       const startTime = moment().subtract(duration, unit).toISOString();

//       if (chartInstance) {
//         // Preserve the current zoom and pan state
//         const zoomPanState = {
//           x: chartInstance.scales.x.min,
//           y: chartInstance.scales.y.min,
//           xMax: chartInstance.scales.x.max,
//           yMax: chartInstance.scales.y.max,
//         };

//         // Update the chart data
//         chartInstance.data.labels = data.map((d) => d.time);
//         chartInstance.data.datasets.forEach((dataset, index) => {
//           dataset.data = data.map((d) => d[parameters[index]]);
//         });
//         chartInstance.options.scales!.x!.min = startTime;
//         chartInstance.options.scales!.x!.max = endTime;

//         // Reapply the zoom and pan state
//         chartInstance.update();
//         chartInstance.options.scales!.x!.min = zoomPanState.x;
//         chartInstance.options.scales!.x!.max = zoomPanState.xMax;
//         chartInstance.options.scales!.y!.min = zoomPanState.y;
//         chartInstance.options.scales!.y!.max = zoomPanState.yMax;
//         chartInstance.update();
//       } else {
//         const newChartInstance = new Chart(ctx!, {
//           type: 'line',
//           data: {
//             labels: data.map((d) => d.time),
//             datasets: parameters.map((param) => ({
//               label: param,
//               data: data.map((d) => d[param]),
//               fill: false,
//               borderColor: param === 'temperature' ? 'rgb(75, 192, 192)' : param === 'humidity' ? 'rgb(153, 102, 255)' : 'rgb(255, 159, 64)',
//               tension: 0.1,
//             })),
//           },
//           options: {
//             responsive: true,
//             plugins: {
//               zoom: {
//                 pan: {
//                   enabled: true,
//                   mode: 'xy',
//                 },
//                 zoom: {
//                   wheel: {
//                     enabled: true,
//                   },
//                   pinch: {
//                     enabled: true,
//                   },
//                   mode: 'xy',
//                 },
//               },
//             },
//             scales: {
//               x: {
//                 type: 'time',
//                 time: {
//                   unit: 'minute',
//                 },
//                 title: {
//                   display: true,
//                   text: 'Time',
//                 },
//                 min: startTime,
//                 max: endTime,
//               },
//               y: {
//                 title: {
//                   display: true,
//                   text: 'Value',
//                 },
//               },
//             },
//           },
//         });

//         setChartInstance(newChartInstance);
//       }
//     }
//   }, [data, parameters, timeframe, chartInstance]);

//   const handleTimeframeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setTimeframe(event.target.value);
//   };

//   return (
//     <div>
//       <div className="controls">
//         <label htmlFor="timeframe-select">Timeframe:</label>
//         <select id="timeframe-select" value={timeframe} onChange={handleTimeframeChange}>
//           <option value="1m">1 Minute</option>
//           <option value="5m">5 Minutes</option>
//           <option value="15m">15 Minutes</option>
//           <option value="30m">30 Minutes</option>
//           <option value="1h">1 Hour</option>
//           <option value="6h">6 Hours</option>
//           <option value="12h">12 Hours</option>
//           <option value="24h">24 Hours</option>
//         </select>
//       </div>
//       <canvas ref={chartRef}></canvas>
//     </div>
//   );
// };

// export default LineChartComponent;

// import React, { useEffect, useRef, useState } from 'react';
// import { Chart, registerables } from 'chart.js';
// import zoomPlugin from 'chartjs-plugin-zoom';
// import moment from 'moment';
// import 'chartjs-adapter-moment';

// Chart.register(...registerables, zoomPlugin);

// interface LineChartComponentProps {
//   machineId: string;
//   plantId: string;
//   parameters: string[];
// }

// const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
//   const chartRef = useRef<HTMLCanvasElement>(null);
//   const [data, setData] = useState<any[]>([]);
//   const [timeframe, setTimeframe] = useState('5m');
//   const [chartInstance, setChartInstance] = useState<Chart | null>(null);
//   const [isRealTime, setIsRealTime] = useState(true);

//   useEffect(() => {
//     // Fetch historical data based on the selected timeframe
//     const fetchHistoricalData = async () => {
//       try {
//         const response = await fetch(`http://localhost:8000/historical-data?machineId=${machineId}&plantId=${plantId}&timeframe=${timeframe}`);
//         const historicalData = await response.json();
//         const formattedData = historicalData.map((item: any) => ({
//           ...item,
//           time: moment(item.time).toISOString(), // Ensure time is in ISO format
//         }));
//         console.log("Historical data:", formattedData);
//         setData(formattedData);
//       } catch (error) {
//         console.error('Error fetching historical data:', error);
//       }
//     };

//     fetchHistoricalData();
//   }, [machineId, plantId, timeframe]);

//   useEffect(() => {
//     const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

//     socket.onmessage = (event) => {
//       const newData = JSON.parse(event.data);
//       console.log('New data received:', newData);

//       const filteredData = newData
//         .filter((item: any) => item.machine_id === Number(machineId) && item.plant_id === Number(plantId))
//         .map((item: any) => ({
//           ...item,
//           time: moment(item.time).toISOString(), // Ensure time is in ISO format
//         }));

//       console.log('Filtered data:', filteredData);

//       setData((prevData) => {
//         const combinedData = [...prevData, ...filteredData];
//         const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = { m: 'minutes', h: 'hours' };
//         const unit = unitMap[timeframe.slice(-1) as keyof typeof unitMap];
//         const duration = parseInt(timeframe.slice(0, -1));
//         const cutoffTime = moment().subtract(duration, unit).toISOString();
//         const visibleData = combinedData.filter((item) => item.time >= cutoffTime);
//         console.log('Visible data:', visibleData);

//         if (isRealTime && chartInstance) {
//           const endTime = moment().toISOString();
//           const startTime = moment().subtract(duration, unit).toISOString();
//           chartInstance.options.scales!.x!.min = startTime;
//           chartInstance.options.scales!.x!.max = endTime;
//           chartInstance.update();
//         }

//         return visibleData;
//       });
//     };

//     socket.onclose = () => {
//       console.log('WebSocket connection closed');
//     };

//     return () => {
//       socket.close();
//     };
//   }, [machineId, plantId, timeframe, isRealTime, chartInstance]);

//   useEffect(() => {
//     if (chartRef.current && data.length > 0) {
//       const ctx = chartRef.current.getContext('2d');
//       const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = { m: 'minutes', h: 'hours' };
//       const unit = unitMap[timeframe.slice(-1) as keyof typeof unitMap];
//       const duration = parseInt(timeframe.slice(0, -1));
//       const endTime = moment().toISOString();
//       const startTime = moment().subtract(duration, unit).toISOString();

//       if (chartInstance) {
//         // Preserve the current zoom and pan state
//         const zoomPanState = {
//           x: chartInstance.scales.x.min,
//           y: chartInstance.scales.y.min,
//           xMax: chartInstance.scales.x.max,
//           yMax: chartInstance.scales.y.max,
//         };

//         // Update the chart data
//         chartInstance.data.labels = data.map((d) => d.time);
//         chartInstance.data.datasets.forEach((dataset, index) => {
//           dataset.data = data.map((d) => d[parameters[index]]);
//         });
//         chartInstance.options.scales!.x!.min = startTime;
//         chartInstance.options.scales!.x!.max = endTime;

//         // Reapply the zoom and pan state
//         chartInstance.update();
//         chartInstance.options.scales!.x!.min = zoomPanState.x;
//         chartInstance.options.scales!.x!.max = zoomPanState.xMax;
//         chartInstance.options.scales!.y!.min = zoomPanState.y;
//         chartInstance.options.scales!.y!.max = zoomPanState.yMax;
//         chartInstance.update();
//       } else {
//         const newChartInstance = new Chart(ctx!, {
//           type: 'line',
//           data: {
//             labels: data.map((d) => d.time),
//             datasets: parameters.map((param) => ({
//               label: param,
//               data: data.map((d) => d[param]),
//               fill: false,
//               borderColor: param === 'temperature' ? 'rgb(75, 192, 192)' : param === 'humidity' ? 'rgb(153, 102, 255)' : 'rgb(255, 159, 64)',
//               tension: 0.1,
//             })),
//           },
//           options: {
//             responsive: true,
//             plugins: {
//               zoom: {
//                 pan: {
//                   enabled: true,
//                   mode: 'xy',
//                 },
//                 zoom: {
//                   wheel: {
//                     enabled: true,
//                   },
//                   pinch: {
//                     enabled: true,
//                   },
//                   mode: 'xy',
//                 },
//               },
//             },
//             scales: {
//               x: {
//                 type: 'time',
//                 time: {
//                   unit: 'minute',
//                 },
//                 title: {
//                   display: true,
//                   text: 'Time',
//                 },
//                 min: startTime,
//                 max: endTime,
//               },
//               y: {
//                 title: {
//                   display: true,
//                   text: 'Value',
//                 },
//               },
//             },
//           },
//         });

//         setChartInstance(newChartInstance);
//       }
//     }
//   }, [data, parameters, timeframe, chartInstance]);

//   const handleTimeframeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setTimeframe(event.target.value);
//   };

//   const handleRealTimeClick = () => {
//     setIsRealTime(true);
//     if (chartInstance) {
//       const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = { m: 'minutes', h: 'hours' };
//       const unit = unitMap[timeframe.slice(-1) as keyof typeof unitMap];
//       const duration = parseInt(timeframe.slice(0, -1));
//       const endTime = moment().toISOString();
//       const startTime = moment().subtract(duration, unit).toISOString();
//       chartInstance.options.scales!.x!.min = startTime;
//       chartInstance.options.scales!.x!.max = endTime;
//       chartInstance.update();
//     }
//   };

//   return (
//     <div>
//       <div className="controls">
//         <label htmlFor="timeframe-select">Timeframe:</label>
//         <select id="timeframe-select" value={timeframe} onChange={handleTimeframeChange}>
//           <option value="1m">1 Minute</option>
//           <option value="5m">5 Minutes</option>
//           <option value="15m">15 Minutes</option>
//           <option value="30m">30 Minutes</option>
//           <option value="1h">1 Hour</option>
//           <option value="6h">6 Hours</option>
//           <option value="12h">12 Hours</option>
//           <option value="24h">24 Hours</option>
//         </select>
//         <button onClick={handleRealTimeClick}>Go to Real-Time</button>
//       </div>
//       <canvas ref={chartRef}></canvas>
//     </div>
//   );
// };

// export default LineChartComponent;


// import React, { useEffect, useState } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
// import moment from 'moment';
// import './ChartStyles.css';

// interface LineChartComponentProps {
//   machineId: string;
//   plantId: string;
//   parameters: string[];
// }

// const LineChartComponent: React.FC<LineChartComponentProps> = ({ machineId, plantId, parameters }) => {
//   const [data, setData] = useState<any[]>([]);
//   const [timeframe, setTimeframe] = useState('5m');

//   useEffect(() => {
//     // Fetch historical data based on the selected timeframe
//     const fetchHistoricalData = async () => {
//       try {
//         const response = await fetch(`http://localhost:8000/historical-data?machineId=${machineId}&plantId=${plantId}&timeframe=${timeframe}`);
//         const historicalData = await response.json();
//         const formattedData = historicalData.map((item: any) => ({
//           ...item,
//           time: moment(item.time).format('YYYY-MM-DDTHH:mm:ss'),
//         }));
//         console.log("Historical data:", formattedData);
//         setData(formattedData);
//       } catch (error) {
//         console.error('Error fetching historical data:', error);
//       }
//     };

//     fetchHistoricalData();
//   }, [machineId, plantId, timeframe]);

//   useEffect(() => {
//     const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);

//     socket.onmessage = (event) => {
//       const newData = JSON.parse(event.data);
//       console.log('New data received:', newData);

//       const filteredData = newData
//         .filter((item: any) => item.machine_id === Number(machineId) && item.plant_id === Number(plantId))
//         .map((item: any) => ({
//           ...item,
//           time: moment(item.time).format('YYYY-MM-DDTHH:mm:ss'),
//         }));

//       console.log('Filtered data:', filteredData);

//       setData((prevData) => {
//         const combinedData = [...prevData, ...filteredData];
//         const unitMap: { [key: string]: moment.unitOfTime.DurationConstructor } = { m: 'minutes', h: 'hours' };
//         const unit = unitMap[timeframe.slice(-1) as keyof typeof unitMap];
//         const duration = parseInt(timeframe.slice(0, -1));
//         const cutoffTime = moment().subtract(duration, unit).format('YYYY-MM-DDTHH:mm:ss');
//         const visibleData = combinedData.filter((item) => item.time >= cutoffTime);
//         console.log('Visible data:', visibleData);
//         return visibleData;
//       });
//     };

//     socket.onclose = () => {
//       console.log('WebSocket connection closed');
//     };

//     return () => {
//       socket.close();
//     };
//   }, [machineId, plantId, timeframe]);

//   const handleTimeframeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setTimeframe(event.target.value);
//   };

//   return (
//     <div className="chart-card">
//       <div className="controls">
//         <label htmlFor="timeframe-select">Timeframe:</label>
//         <select id="timeframe-select" value={timeframe} onChange={handleTimeframeChange}>
//           <option value="1m">1 Minute</option>
//           <option value="5m">5 Minutes</option>
//           <option value="15m">15 Minutes</option>
//           <option value="30m">30 Minutes</option>
//           <option value="1h">1 Hour</option>
//           <option value="6h">6 Hours</option>
//           <option value="12h">12 Hours</option>
//           <option value="24h">24 Hours</option>
//         </select>
//       </div>
//       <ResponsiveContainer width="100%" height={400}>
//         <LineChart data={data}>
//           <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
//           <XAxis dataKey="time" tick={{ fill: '#8884d8' }} />
//           <YAxis tick={{ fill: '#8884d8' }} />
//           <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: 'none' }} />
//           <Legend verticalAlign="top" height={36} />
//           {parameters.includes('temperature') && <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} />}
//           {parameters.includes('humidity') && <Line type="monotone" dataKey="humidity" stroke="#82ca9d" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} />}
//           {parameters.includes('power') && <Line type="monotone" dataKey="power_supply" stroke="#ff7300" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} />}
//           <Brush dataKey="time" height={30} stroke="#8884d8" />
//         </LineChart>
//       </ResponsiveContainer>
//     </div>
//   );
// };

// export default LineChartComponent;
