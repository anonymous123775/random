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
  plantId: string;
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

const WebSocketPieChartComponent: React.FC<MachineStatusProps> = ({ plantId }) => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [machineStatuses, setMachineStatuses] = useState<MachineStatus[]>([]);
  const [plants, setPlants] = useState<string[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>(plantId);
  const [loading, setLoading] = useState<boolean>(true); // Loading state

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Set loading to true when fetching data
      const plantList = await getPlantCount();
      setPlants(plantList.distinct_plant_count);

      // Fetch data for the initially selected plant
      const newData = await fetchMachineFailuresPlant(selectedPlant);
      setData(newData);
      setLoading(false); // Set loading to false after data is fetched
    };

    fetchData();
  }, [selectedPlant]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/machine-status?plantId=${selectedPlant}`); // Replace with your WebSocket URL

    socket.onmessage = (event) => {
      const newData: WebSocketData = JSON.parse(event.data);
      const { online_count, offline_count, unavailable_count, machines } = newData;

      // Update the machine statuses
      setMachineStatuses(machines);

      // Prepare pie chart data
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
      socket.close(); // Close socket when component unmounts
    };
  }, [selectedPlant]); // Include selectedPlant in the dependency array to re-establish connection if it changes

  // Define colors for the pie chart
  const COLORS = ['#00C49F', '#FFBB28', '#FF8042']; // Green, Yellow, Red

  const handlePlantChange = async (plantId: string) => {
    // Avoid fetching data if the same plant is selected
    if (selectedPlant !== plantId) {
      setSelectedPlant(plantId);
      
      // Fetch new data for the selected plant
      setLoading(true); // Set loading to true when fetching new data
      const newData = await fetchMachineFailuresPlant(plantId);
      setData(newData);
      setLoading(false); // Set loading to false after data is fetched
    }
  };

  return (
    <Container>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Machine Status Distribution
        </Typography>
        <Box display="flex" justifyContent="center" mb={2}>
          {plants.map((plant, index) => (
            <Button
              key={index}
              variant={selectedPlant === plant ? 'contained' : 'outlined'}
              color="primary"
              onClick={() => handlePlantChange(plant)}
              sx={{ margin: 0.5 }}
            >
              Plant {index + 1}
            </Button>
          ))}
        </Box>

        {loading ? ( // Show loading spinner while data is being fetched
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
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} // Display percentage on the pie chart
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
