import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography, Container, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, styled, CircularProgress } from '@mui/material';
import { fetchMachineFailuresPlant, getPlantCount } from '../Services/api';

interface MachineStatus {
  machine_id: number;
  status: 'online' | 'offline' | 'unavailable';
}

interface WebSocketData {
  online_count: number;
  offline_count: number;
  unavailable_count: number;
  machines: MachineStatus[];
}

interface MachineStatusProps {
  selectedPlant: string;
  loading: boolean;
}

const StatusCell = styled(TableCell)(({ theme }) => ({
  '&.online': {
    backgroundColor: '#00C49F',
    color: 'white',
    animation: 'blink 1s infinite',
  },
  '&.offline': {
    backgroundColor: '#FF8042',
    color: 'white',
    animation: 'blink 1s infinite',
  },
  '&.unavailable': {
    backgroundColor: '#FFBB28',
    color: 'white',
    animation: 'blink 1s infinite',
  },
  '@keyframes blink': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 },
  },
}));

const WebSocketPieChartComponent: React.FC<MachineStatusProps> = ({ selectedPlant, loading }) => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [machineStatuses, setMachineStatuses] = useState<MachineStatus[]>([]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/machine-status?plantId=${selectedPlant}`);

    socket.onmessage = (event) => {
      const newData: WebSocketData = JSON.parse(event.data);
      const { online_count, offline_count, unavailable_count, machines } = newData;
      setMachineStatuses(machines);

      const pieData = [
        { name: 'Online', value: online_count },
        { name: 'Offline', value: offline_count },
        { name: 'Unavailable', value: unavailable_count },
      ];

      setData(pieData);
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    return () => {
      socket.close();
    };
  }, [selectedPlant]);

  const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Container>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Machine Status Distribution
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={300}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={6}>
              <TableContainer component={Paper} sx={{ maxHeight: 300, overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Machine ID</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {machineStatuses.map((machine) => (
                      <TableRow key={machine.machine_id}>
                        <TableCell>{machine.machine_id}</TableCell>
                        <StatusCell className={machine.status}>
                          {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
                        </StatusCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default WebSocketPieChartComponent;
