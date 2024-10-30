import React, { useMemo, useEffect, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import moment from 'moment';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface RealtimeData {
  machine_id: number;
  time: number | 'Unavailable';
  temperature: number | 'Unavailable';
  humidity: number | 'Unavailable';
  vibration: number | 'Unavailable';
  power_supply: number | 'Unavailable';
}

interface DataTableComponentProps {
  selectedMachine: string[];
  realtimeData: RealtimeData[];
}

const DataTableComponent: React.FC<DataTableComponentProps> = ({ selectedMachine, realtimeData }) => {
  const [dataByMachine, setDataByMachine] = useState<{ [key: string]: RealtimeData }>({});

  useEffect(() => {
    const updatedDataByMachine: { [key: string]: RealtimeData } = { ...dataByMachine };

    selectedMachine.forEach(machineId => {
      const newData = realtimeData.find(item => item.machine_id === Number(machineId));
      if (newData) {
        updatedDataByMachine[machineId] = newData;
      } else if (!updatedDataByMachine[machineId]) {
        updatedDataByMachine[machineId] = { machine_id: Number(machineId), time: 'Unavailable', temperature: 'Unavailable', humidity: 'Unavailable', vibration: 'Unavailable', power_supply: 'Unavailable' };
      }
    });

    setDataByMachine(updatedDataByMachine);
  }, [realtimeData, selectedMachine]);

  const columns = useMemo<MRT_ColumnDef<RealtimeData>[]>(
    () => [
      {
        accessorKey: 'machine_id',
        header: 'Machine ID',
        size: 150,
      },
      {
        accessorKey: 'time',
        header: 'Time',
        size: 200,
        Cell: ({ cell }) => cell.getValue() === 'Unavailable' ? 'Unavailable' : moment(cell.getValue() as number).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        accessorKey: 'temperature',
        header: 'Temperature',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value === 'Unavailable' ? 'Unavailable' : (typeof value === 'number' ? value.toFixed(2) : 'Unavailable');
        },
      },
      {
        accessorKey: 'humidity',
        header: 'Humidity',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value === 'Unavailable' ? 'Unavailable' : (typeof value === 'number' ? value.toFixed(2) : 'Unavailable');
        },
      },
      {
        accessorKey: 'vibration',
        header: 'Vibration',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value === 'Unavailable' ? 'Unavailable' : (typeof value === 'number' ? value.toFixed(2) : 'Unavailable');
        },
      },
      {
        accessorKey: 'power_supply',
        header: 'Power Supply',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value === 'Unavailable' ? 'Unavailable' : (typeof value === 'number' ? value.toFixed(2) : 'Unavailable');
        },
      },
    ],
    []
  );

  const data = useMemo(() => Object.values(dataByMachine), [dataByMachine]);

  const table = useMaterialReactTable({
    columns,
    data,
  });

  const theme = createTheme({
    typography: {
      fontFamily: 'Montserrat, Open Sans, Arial',
      fontSize: 14,
    },
    components: {
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '1.3rem',
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MaterialReactTable table={table} />
    </ThemeProvider>
  );
};

export default DataTableComponent;
