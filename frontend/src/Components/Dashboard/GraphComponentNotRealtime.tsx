import React, { useEffect, useState } from 'react';
import { Grid} from '@mui/material';
import LineChartNotRealtimeComponent from './Graph/LineChartNotRealTime';
import { fetchHistoricalMachineData } from '../Services/api';
import moment from 'moment';

interface GraphsComponentProps {
  selectedMachine: string[];
  selectedPlant: string;
  startTime: Date|null;
  endTime: Date|null;
}

const GraphsComponentNotRealtime: React.FC<GraphsComponentProps> = ({ selectedMachine, selectedPlant, startTime, endTime }) => {
    const [linechartData, setLinechartData] = useState<any[]>([]);

    useEffect(() => {
      const fetchData = async () => {
        if (!startTime || !endTime) return;
  
        try {
          const startMoment = moment(startTime);
          const endMoment = moment(endTime)
          endMoment.subtract(60,'minutes');
  
          if (endMoment.diff(startMoment, 'minutes') < 60) {
            const hourData = await Promise.all(
              selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, startTime, endTime))
            );
  
            const combinedData = hourData.flat().map((item) => ({
              ...item,
              time: moment(item.time).valueOf(),
            }));
  
            const uniqueData: any[] = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
            setLinechartData(uniqueData);
          } else {
            const initialEndTime = endMoment.clone();
            const initialStartTime = initialEndTime.clone();
            initialStartTime.subtract(60,'minutes')

            const initialData = await Promise.all(
              selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, initialStartTime.toDate(), initialEndTime.toDate()))
            );

            console.log("Data fetched for ", initialStartTime.toString(), " -> ", initialEndTime.toString());
  
            const combinedInitialData = initialData.flat().map((item) => ({
              ...item,
              time: moment(item.time).valueOf(),
            }));
  
            const uniqueInitialData: any[] = Array.from(new Map(combinedInitialData.map(item => [item.time, item])).values());
            setLinechartData(uniqueInitialData);
  
            let currentEndTime = initialStartTime.clone();
  
            console.log("Last 5 minutes data fetched");
  
            while (currentEndTime.isAfter(startMoment)) {
              const previousHour = moment(currentEndTime).subtract(60, 'minutes');
              const hourStartTime = previousHour.isAfter(startMoment) ? previousHour : startMoment;
  
              const hourData = await Promise.all(
                selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, hourStartTime.toDate(), currentEndTime.toDate()))
              );
  
              console.log("Data fetched for ", hourStartTime.toString(), " -> ", currentEndTime.toString());
  
              const combinedData = hourData.flat().map((item) => ({
                ...item,
                time: moment(item.time).valueOf(),
              }));
  
              const uniqueData: any[] = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
              setLinechartData(uniqueData);
  
              currentEndTime = previousHour;
              console.log("Previous hour data fetched");
            }
          }
        } catch (error) {
          console.error('Error fetching historical data:', error);
        }
      };
  
      fetchData();
    }, [selectedMachine, selectedPlant, startTime, endTime]);

  return (
    <>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} dataLast={linechartData} startTime={startTime} endTime={endTime} />
        </Grid>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} dataLast={linechartData} startTime={startTime} endTime={endTime} />
        </Grid>

        {/* Vibration and Power Graphs */}
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} dataLast={linechartData} startTime={startTime} endTime={endTime} />
        </Grid>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} dataLast={linechartData} startTime={startTime} endTime={endTime} />
        </Grid>
    </>
  );
};

export default GraphsComponentNotRealtime;



// import React, { useEffect, useState } from 'react';
// import { Grid } from '@mui/material';
// import LineChartNotRealtimeComponent from './Graph/LineChartNotRealTime';
// import { fetchHistoricalMachineData } from '../Services/api';
// import moment from 'moment';

// interface GraphsComponentProps {
//   selectedMachine: string[];
//   selectedPlant: string;
//   startTime: Date | null;
//   endTime: Date | null;
// }

// const GraphsComponentNotRealtime: React.FC<GraphsComponentProps> = ({ selectedMachine, selectedPlant, startTime, endTime }) => {
//   const [loadingLineChart, setLoadingLineChart] = useState<boolean>(true);
//   const [linechartData, setLinechartData] = useState<any[]>([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!startTime || !endTime) return;

//       try {
//         setLoadingLineChart(true);
//         const startMoment = moment(startTime);
//         const endMoment = moment(endTime);
//         const allData: any[] = [];

//         if (endMoment.diff(startMoment, 'hours') < 1) {
//           // If the time range is less than one hour, fetch data for that period
//           const hourData = await Promise.all(
//             selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, startTime, endTime))
//           );

//           const combinedData = hourData.flat().map((item) => ({
//             ...item,
//             time: moment(item.time).valueOf(),
//           }));

//           const uniqueData: any[] = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
//           setLinechartData(uniqueData);
//         } else {
//           // Fetch initial data for the last hour
//           const initialEndTime = endMoment;
//           const initialStartTime = moment(initialEndTime).subtract(1, 'hour');
//           const initialData = await Promise.all(
//             selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, initialStartTime.toDate(), initialEndTime.toDate()))
//           );
//           console.log("Data fetched for ", initialStartTime, " -> ", initialEndTime);

//           const combinedInitialData = initialData.flat().map((item) => ({
//             ...item,
//             time: moment(item.time).valueOf(),
//           }));

//           const uniqueInitialData: any[] = Array.from(new Map(combinedInitialData.map(item => [item.time, item])).values());
//           setLinechartData(uniqueInitialData);

//           // Continue fetching the remaining data in the background
//           let currentEndTime = initialStartTime;

//           console.log("Last hour data fetched");

//           while (currentEndTime.isAfter(startMoment)) {
//             const previousHour = moment(currentEndTime).subtract(1, 'hour');
//             const hourStartTime = previousHour.isAfter(startMoment) ? previousHour : startMoment;

//             const hourData = await Promise.all(
//               selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, hourStartTime.toDate(), currentEndTime.toDate()))
//             );

//             console.log("Data fetched for ", hourStartTime, " -> ", currentEndTime);

//             const combinedData = hourData.flat().map((item) => ({
//               ...item,
//               time: moment(item.time).valueOf(),
//             }));

//             allData.push(...combinedData);

//             const uniqueData: any[] = Array.from(new Map(allData.map(item => [item.time, item])).values());
//             setLinechartData(uniqueData);

//             currentEndTime = previousHour;
//             console.log("Previous hour data fetched");
//           }
//         }
//         setLoadingLineChart(false);
//       } catch (error) {
//         console.error('Error fetching historical data:', error);
//       }
//     };

//     fetchData();
//   }, [selectedMachine, selectedPlant, startTime, endTime]);

//   return (
//     <>
//       <Grid item xs={12} md={6}>
//         <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} loading={loadingLineChart} data={linechartData} />
//       </Grid>
//       <Grid item xs={12} md={6}>
//         <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} loading={loadingLineChart} data={linechartData} />
//       </Grid>

//       {/* Vibration and Power Graphs */}
//       <Grid item xs={12} md={6}>
//         <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} loading={loadingLineChart} data={linechartData} />
//       </Grid>
//       <Grid item xs={12} md={6}>
//         <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} loading={loadingLineChart} data={linechartData} />
//       </Grid>
//     </>
//   );
// };

// export default GraphsComponentNotRealtime;
