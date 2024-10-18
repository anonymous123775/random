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
    const [loadingLineChart, setLoadingLineChart] = useState<boolean>(true);
    const [linechartData, setLinechartData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
          try {
            setLoadingLineChart(true);
            const allData = await Promise.all(selectedMachine.map(id => fetchHistoricalMachineData(id, selectedPlant, startTime, endTime)));
            const combinedData = allData.flat().map((item) => ({
              ...item,
              time: moment(item.time).valueOf(),
            }));
            const uniqueData: any[] = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
            setLinechartData(uniqueData);
            setLoadingLineChart(false);
          } catch (error) {
            console.error('Error fetching historical data:', error);
          }
        };
    
        fetchData();
      }, [selectedMachine, selectedPlant, startTime, endTime]);

  return (
    <>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} loading={loadingLineChart} data={linechartData} />
        </Grid>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} loading={loadingLineChart} data={linechartData} />
        </Grid>

        {/* Vibration and Power Graphs */}
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} loading={loadingLineChart} data={linechartData} />
        </Grid>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} loading={loadingLineChart} data={linechartData} />
        </Grid>
    </>
  );
};

export default GraphsComponentNotRealtime;
