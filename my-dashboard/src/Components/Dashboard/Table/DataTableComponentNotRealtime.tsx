import React, { useMemo, useEffect, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import moment from 'moment';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { fetchHistoricalMachineDataParam } from '../../Services/api';

interface RealtimeData {
  machine_id: number;
  time: number | 'Unavailable';
  parameter: number | 'Unavailable';
}

interface DataTableComponentProps {
  selectedMachine: string[];
  plantId: string;
  startTime: Date | null;
  endTime: Date | null;
  parameter: string[];
}

const DataTableComponentNotRealtime: React.FC<DataTableComponentProps> = ({ selectedMachine, plantId, startTime, endTime, parameter }) => {
  const [dataByMachine, setDataByMachine] = useState<RealtimeData[]>([]);
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingState(true);
      try {
        const endMoment = moment(endTime);
        const startMomentHere = moment(startTime);
        const allData = await Promise.all(selectedMachine.map(id => fetchHistoricalMachineDataParam(id, plantId, parameter[0], startMomentHere.toDate(), endMoment.toDate())));
        const combinedData = allData.flat().map((item: any) => ({
          ...item,
          time: moment(item.time).valueOf(),
          parameter: item[parameter[0]] ?? 'Unavailable', // Ensure the parameter value is included
        }));
        const uniqueData = Array.from(new Map(combinedData.map(item => [`${item.machine_id}-${item.time}`, item])).values());
        setDataByMachine(uniqueData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoadingState(false);
      }
    };

    fetchData();
  }, [selectedMachine, plantId, startTime, endTime, parameter]);

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
        accessorKey: 'parameter',
        header: parameter[0], // Dynamically set the column header to the parameter name
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return value === 'Unavailable' ? 'Unavailable' : (typeof value === 'number' ? value.toFixed(2) : 'Unavailable');
        },
      },
    ],
    [parameter]
  );

  const table = useMaterialReactTable({
    columns,
    data: dataByMachine,
    state: {
      isLoading: loadingState,
    },
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

export default DataTableComponentNotRealtime;
