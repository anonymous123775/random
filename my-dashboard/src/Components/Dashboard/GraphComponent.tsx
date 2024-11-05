import React, { useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import LineChartComponent from './Graph/LineChartComponent'; // Adjust the import path as needed
import moment from 'moment';
import DataTableComponent from './Table/DataTableComponent';

interface GraphsComponentProps {
  selectedMachine: string[];
  selectedPlant: string;
}

const GraphsComponent: React.FC<GraphsComponentProps> = ({ selectedMachine, selectedPlant }) => {
  const [realtimeData, setRealtimeData] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const sockets = selectedMachine.map(id => {
      const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${id}&plantId=${selectedPlant}`);
      
      socket.onmessage = (event) => {
        const newData = JSON.parse(event.data);
        const latestData = newData
          .filter((item: any) => item.machine_id === Number(id) && item.plant_id === Number(selectedPlant))
          .map((item: any) => ({
            ...item,
            time: moment(item.time).valueOf(),
          }))[0]; // Get the latest data entry

          if (latestData) {
            setRealtimeData(prevData => ({
              ...prevData,
              [id]: latestData,
            }));
          }
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
      };

      return socket;
    });

    return () => {
      sockets.forEach(socket => socket.close());
    };
  }, [selectedMachine, selectedPlant]);

  // Combine all machine data into a single array
  const combinedData = Object.values(realtimeData);

  return (
    <>
      <Grid item xs={12} md={6}>
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} realtimeData={combinedData} />
      </Grid>
      <Grid item xs={12} md={6}>
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} realtimeData={combinedData} />
      </Grid>
      <Grid item xs={12} md={6}>
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} realtimeData={combinedData} />
      </Grid>
      <Grid item xs={12} md={6}>
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} realtimeData={combinedData} />
      </Grid>
      <Grid item xs={12}>
        <DataTableComponent selectedMachine={selectedMachine} realtimeData={combinedData} />
      </Grid>
    </>
  );
};

export default GraphsComponent;
