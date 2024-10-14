import React, { useEffect, useState } from 'react';
import { Container, Grid, Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, Box } from '@mui/material';
import LineChartComponent from './Graph/LineChartComponent';
import BarChartComponent from './Graph/BarChartComponent';
import PieChartComponent from './Graph/PieChartComponent';
import { getMachineCount, getPlantCount, fetchMachineKpis } from '../Services/api';
import WebSocketPieChartComponent from './MachineStatusDashboard';
import BarChartFailureComponent from './Graph/BarChartFailureComponent';

interface KPIData {
  uptime?: number;
  downtime?: number;
  failure_rate?: number;
  num_alerts_triggered?: number;
}

const Dashboard: React.FC = () => {
  const [selectedMachine, setSelectedMachine] = useState<string>('1');
  const [selectedPlant, setSelectedPlant] = useState<string>('1');
  const [machines, setMachines] = useState<string[]>([]);
  const [plants, setPlants] = useState<string[]>([]);
  const [kpis, setKpis] = useState<KPIData>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const machineData = await getMachineCount();
      const plantData = await getPlantCount();
      setMachines(machineData.distinct_machine_count);
      setPlants(plantData.distinct_plant_count);
    };

    const fetchKpis = async () => {
      const kpiData = await fetchMachineKpis(selectedMachine, selectedPlant);
      if (kpiData) {
        setKpis(kpiData[0]);
      }
    };

    fetchKpis();
    fetchCounts();
  }, [selectedMachine, selectedPlant]);

  const handleMachineChange = (event: SelectChangeEvent<string>) => {
    setSelectedMachine(event.target.value as string);
  };

  const handlePlantChange = (event: SelectChangeEvent<string>) => {
    setSelectedPlant(event.target.value as string);
  };

  const convertMinutesToHMS = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return { hours, mins, secs };
  };

  const uptimeHMS = kpis.uptime !== undefined ? convertMinutesToHMS(kpis.uptime) : { hours: 0, mins: 0, secs: 0 };
  const downtimeHMS = kpis.downtime !== undefined ? convertMinutesToHMS(kpis.downtime) : { hours: 0, mins: 0, secs: 0 };
  const failureRatePercentage = kpis.failure_rate !== undefined ? (kpis.failure_rate * 100).toFixed(2) : 'Loading...';

  return (
    <Container maxWidth="xl">
      <Box mt={3}>
        <Grid container spacing={3}>
          {/* Plant and Machine Selectors */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="plant-select-label">Select Plant</InputLabel>
              <Select
                labelId="plant-select-label"
                value={selectedPlant}
                onChange={handlePlantChange}
              >
                {plants.map((plant, index) => (
                  <MenuItem key={index} value={plant}>
                    Plant {index + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="machine-select-label">Select Machine</InputLabel>
              <Select
                labelId="machine-select-label"
                value={selectedMachine}
                onChange={handleMachineChange}
              >
                {machines.map((machine, index) => (
                  <MenuItem key={index} value={machine}>
                    Machine {index + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* KPI Cards and Pie Chart */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={4.8}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h5">{`Uptime: ${uptimeHMS.hours}h ${uptimeHMS.mins}m ${uptimeHMS.secs}s`}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h5">{`Downtime: ${downtimeHMS.hours}h ${downtimeHMS.mins}m ${downtimeHMS.secs}s`}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h5">{`Failure Rate: ${failureRatePercentage}%`}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h5">{`Number of Alerts: ${kpis.num_alerts_triggered !== undefined ? kpis.num_alerts_triggered : 'Loading...'}`}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={8}>
            <PieChartComponent machineId={selectedMachine} plantId={selectedPlant} />
          </Grid>

          {/* Temperature and Humidity Graphs */}
          <Grid item xs={12} md={6}>
            <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} />
          </Grid>
          <Grid item xs={12} md={6}>
            <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} />
          </Grid>

          {/* Vibration and Power Graphs */}
          <Grid item xs={12} md={6}>
            <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} />
          </Grid>
          <Grid item xs={12} md={6}>
            <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power']} />
          </Grid>

          {/* Machine State Distribution */}
          <Grid item xs={12}>
            <WebSocketPieChartComponent plantId={selectedPlant} />
          </Grid>

          {/* Bar Chart for Failures */}
          <Grid item xs={12}>
            <BarChartFailureComponent plantId={selectedPlant} />
          </Grid>

          {/* Bar Chart for Failures per Day */}
          <Grid item xs={12}>
            <BarChartComponent machineId={selectedMachine} plantId={selectedPlant} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
