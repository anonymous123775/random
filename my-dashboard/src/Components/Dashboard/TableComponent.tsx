import React from 'react';
import { Grid} from '@mui/material';
import DataTableComponentNotRealtime from './Table/DataTableComponentNotRealtime';

interface TableComponentProps {
  selectedMachine: string[];
  selectedPlant: string;
  startTime: Date|null;
  endTime: Date|null;
}

const TableComponent: React.FC<TableComponentProps> = ({ selectedMachine, selectedPlant, startTime, endTime }) => {

  return (
    <>
        <Grid item xs={12} md={6}>
            <DataTableComponentNotRealtime selectedMachine={selectedMachine} plantId={selectedPlant} parameter={['temperature']} startTime={startTime} endTime={endTime} />
        </Grid>
        <Grid item xs={12} md={6}>
            <DataTableComponentNotRealtime selectedMachine={selectedMachine} plantId={selectedPlant} parameter={['humidity']} startTime={startTime} endTime={endTime} />
        </Grid>

        {/* Vibration and Power Graphs */}
        <Grid item xs={12} md={6}>
            <DataTableComponentNotRealtime selectedMachine={selectedMachine} plantId={selectedPlant} parameter={['vibration']} startTime={startTime} endTime={endTime} />
        </Grid>
        <Grid item xs={12} md={6}>
            <DataTableComponentNotRealtime selectedMachine={selectedMachine} plantId={selectedPlant} parameter={['power_supply']} startTime={startTime} endTime={endTime} />
        </Grid>
    </>
  );
};

export default TableComponent;
