import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import { Box, Button, Typography, Container, Grid, Paper, CircularProgress } from '@mui/material'; // Import CircularProgress
import { fetchMachineFailuresPlant, getPlantCount } from '../../Services/api';

interface BarChartComponentProps {
  plantId: string;
}

const BarChartFailureComponent: React.FC<BarChartComponentProps> = ({ plantId }) => {
  const [data, setData] = useState<any[]>([]);
  const [plants, setPlants] = useState<string[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>(plantId);
  const [animationKey, setAnimationKey] = useState<number>(0); // New state for triggering animation
  const [loading, setLoading] = useState<boolean>(true); // Loading state

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading
      try {
        const plantList = await getPlantCount();
        setPlants(plantList.distinct_plant_count);

        // Fetch data for the initially selected plant
        const newData = await fetchMachineFailuresPlant(selectedPlant);
        setData(newData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false); // End loading
        // Reset animation key to trigger animation
        setAnimationKey(prevKey => prevKey + 1);
      }
    };

    fetchData();
  }, [selectedPlant]);

  const handlePlantChange = async (plantId: string) => {
    // Avoid fetching data if the same plant is selected
    if (selectedPlant !== plantId) {
      setSelectedPlant(plantId);
      
      // Fetch new data for the selected plant
      setLoading(true); // Start loading
      try {
        const newData = await fetchMachineFailuresPlant(plantId);
        setData(newData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false); // End loading
        // Reset animation key to trigger animation
        setAnimationKey(prevKey => prevKey + 1);
      }
    }
  };

  return (
    <Container>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Failures per Machine
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

        {/* Conditional rendering based on loading state */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={400}>
            <CircularProgress />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data}
              key={animationKey} // Use the animationKey to trigger re-render
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="machine_id" stroke="#333">
                <Label value="Machines" offset={-5} position="insideBottom" />
              </XAxis>
              <YAxis stroke="#333">
                <Label value="Number of Failures" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ccc' }} />
              <Bar
                dataKey="failures"
                fill="#8884d8"
                barSize={30}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={500} // Shortened duration for snappier animation
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Container>
  );
};

export default BarChartFailureComponent;
