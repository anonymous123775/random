import React, { useEffect, useState } from 'react';
import { Container, Grid, Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, Box, CircularProgress } from '@mui/material';
import LineChartComponent from './Graph/LineChartComponent';
import BarChartComponent from './Graph/BarChartComponent';
import PieChartComponent from './Graph/PieChartComponent';
import { getMachineCount, getPlantCount, fetchMachineKpis, fetchKpiNotRealTime } from '../Services/api';
import WebSocketPieChartComponent from './MachineStatusDashboard';
import BarChartFailureComponent from './Graph/BarChartFailureComponent';
import { Tabs, Tab, Checkbox, ListItemText, TextField, FormControlLabel, Switch } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import LineChartNotRealtimeComponent from './Graph/LineChartNotRealTime';

interface KPIData {
  uptime?: number;
  downtime?: number;
  failure_rate?: number;
  num_alerts_triggered?: number;
}

const Dashboard: React.FC = () => {
  const [selectedMachine, setSelectedMachine] = useState<string[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>('1');
  const [machines, setMachines] = useState<string[]>([]);
  const [plants, setPlants] = useState<string[]>([]);
  const [kpis, setKpis] = useState<KPIData>({});
  const [loadingMachines, setLoadingMachines] = useState<boolean>(true);
  const [loadingPlants, setLoadingPlants] = useState<boolean>(true);
  const [loadingKpis, setLoadingKpis] = useState<boolean>(true);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [realTime, setRealTime] = useState<boolean>(true);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleStartTimeChange = (newValue: Date | null) => {
    setStartTime(newValue);
  };

  const handleEndTimeChange = (newValue: Date | null) => {
    setEndTime(newValue);
  };

  const handleRealTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRealTime(event.target.checked);
    if (event.target.checked) {
    }
    else{
      setStartTime(new Date(0)); // Set to epoch time or any very low value
      setEndTime(new Date()); // Current time
    }
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoadingMachines(true);
        setLoadingPlants(true);
        const machineData = await getMachineCount();
        const plantData = await getPlantCount();
        setMachines(machineData.distinct_machine_count);
        setPlants(plantData.distinct_plant_count);
      } finally {
        setLoadingMachines(false);
        setLoadingPlants(false);
      }
    };

    const fetchKpis = async () => {
      try {
        setLoadingKpis(true);
        const kpiData = await Promise.all(
          selectedMachine.map(machine => 
            realTime 
              ? fetchMachineKpis(machine, selectedPlant) 
              : fetchKpiNotRealTime(machine, selectedPlant, startTime, endTime)
          )
        );
        // console.log(kpiData)
        const aggregatedKpis = kpiData.flat().reduce((acc, kpi) => {
          if (kpi) {
            acc.uptime += kpi.uptime || 0;
            acc.downtime += kpi.downtime || 0;
            acc.failure_rate += kpi.failure_rate || 0;
            acc.num_alerts_triggered += kpi.num_alerts_triggered || 0;
          }
          return acc;
        }, { uptime: 0, downtime: 0, failure_rate: 0, num_alerts_triggered: 0 });
        // console.log("aggregated data : ",aggregatedKpis)
        // Calculate the average failure rate
        if (selectedMachine.length > 0) {
          aggregatedKpis.failure_rate = aggregatedKpis.failure_rate / selectedMachine.length;
        }

        setKpis(aggregatedKpis);
      } finally {
        setLoadingKpis(false);
      }
    };

    if (selectedMachine.length > 0 && selectedPlant) {
      fetchKpis();
    }
    fetchCounts();
  }, [selectedMachine, selectedPlant, realTime]);

  const handleMachineChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedMachine(event.target.value as string[]);
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

  useEffect(() => {
    console.log(startTime,endTime)
  },[startTime,endTime])

  return (
    <Container maxWidth="xl">
      <Box mt={3}>
        <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box flexGrow={1} display="flex" justifyContent="center">
          <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab label="Machine View" />
            <Tab label="Plant View" />
          </Tabs>
        </Box>
        {selectedTab === 0 && (
          <FormControlLabel
            control={<Switch checked={realTime} onChange={handleRealTimeChange} />}
            label="Real-time Data"
          />
        )}
        </Box>
        {selectedTab === 0 && (
          <Grid container spacing={3}>
            {/* Machine View Components */}
            <Grid item xs={12} md={realTime?6:3}>
              <FormControl fullWidth>
                <InputLabel id="plant-select-label">Select Plant</InputLabel>
                {loadingPlants ? (
                  <Box display="flex" justifyContent="center">
                    <CircularProgress />
                  </Box>
                ) : (
                  <Select
                    labelId="plant-select-label"
                    value={selectedPlant}
                    onChange={handlePlantChange}
                  >
                    {plants.map((plant, index) => (
                      <MenuItem key={index} value={plant}>
                        {plant}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={realTime?6:3}>
              <FormControl fullWidth>
                <InputLabel id="machine-select-label">Select Machine</InputLabel>
                {loadingMachines ? (
                  <Box display="flex" justifyContent="center">
                    <CircularProgress />
                  </Box>
                ) : (
                  <Select
                    labelId="machine-select-label"
                    multiple
                    value={selectedMachine}
                    onChange={handleMachineChange}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {machines.map((machine, index) => (
                      <MenuItem key={index} value={machine}>
                        <Checkbox checked={selectedMachine.indexOf(machine) > -1} />
                        <ListItemText primary={`Machine ${index + 1}`} />
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            </Grid>

            {!realTime && (
              <>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Start Time"
                      value={startTime}
                      onChange={handleStartTimeChange}
                      slots={{ textField: (params) => <TextField {...params} fullWidth /> }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="End Time"
                      value={endTime}
                      onChange={handleEndTimeChange}
                      slots={{ textField: (params) => <TextField {...params} fullWidth /> }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}

            {/* KPI Cards and Pie Chart */}
            <Grid item xs={12} md={4}>
              {loadingKpis ? (
                <Box display="flex" justifyContent="center" height={300}>
                  <CircularProgress />
                </Box>
              ) : (
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
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <PieChartComponent machineId={selectedMachine} plantId={selectedPlant} startTime={startTime} endTime={endTime} realTime={realTime}/>
            </Grid>
            {realTime ?(
              <>
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
                  <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} />
                </Grid>
              </>
            ):(
              <>
                {/* Temperature and Humidity Graphs */}
                <Grid item xs={12} md={6}>
                  <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} startTime={startTime} endTime={endTime} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} startTime={startTime} endTime={endTime} />
                </Grid>
      
                {/* Vibration and Power Graphs */}
                <Grid item xs={12} md={6}>
                  <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} startTime={startTime} endTime={endTime} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <LineChartNotRealtimeComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power_supply']} startTime={startTime} endTime={endTime} />
                </Grid>
              </>
            )
            }

            <Grid item xs={12}>
              <BarChartComponent machineIds={selectedMachine} plantId={selectedPlant}  />
            </Grid>
          </Grid>
        )}
        {selectedTab === 1 && (
          <Grid container spacing={3}>
            {/* Plant View Components */}
            <Grid item xs={12}>
              <WebSocketPieChartComponent plantId={selectedPlant} />
            </Grid>
            <Grid item xs={12}>
              <BarChartFailureComponent plantId={selectedPlant} />
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );  
};

export default Dashboard;
