import React, { useEffect, useState } from 'react';
import { Grid} from '@mui/material';
import LineChartNotRealtimeComponentParam from './Graph/LineChartNotRealTimeParam';

interface GraphsComponentProps {
  selectedMachine: string[];
  selectedPlant: string;
  startTime: Date|null;
  endTime: Date|null;
}

const GraphsComponentNotRealtimeMachine: React.FC<GraphsComponentProps> = ({ selectedMachine, selectedPlant, startTime, endTime }) => {

  return (
    <>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponentParam machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} startTime={startTime} endTime={endTime} />
        </Grid>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponentParam machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} startTime={startTime} endTime={endTime} />
        </Grid>

        {/* Vibration and Power Graphs */}
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponentParam machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} startTime={startTime} endTime={endTime} />
        </Grid>
        <Grid item xs={12} md={6}>
            <LineChartNotRealtimeComponentParam machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} startTime={startTime} endTime={endTime} />
        </Grid>
    </>
  );
};

export default GraphsComponentNotRealtimeMachine;
