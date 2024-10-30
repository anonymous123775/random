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
  selectedPlant: string;
}

const BarChartFailureComponent: React.FC<BarChartComponentProps> = ({ selectedPlant }) => {
  const [data, setData] = useState<any[]>([]);
  const [animationKey, setAnimationKey] = useState<number>(0); // New state for triggering animation
  const [loading, setLoading] = useState<boolean>(true); // Loading state

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading
      try {


        const newData = await fetchMachineFailuresPlant(selectedPlant);
        setData(newData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false); 
        setAnimationKey(prevKey => prevKey + 1);
      }
    };

    fetchData();
  }, [selectedPlant]);

  return (
    <Container>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Failures per Machine
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={400}>
            <CircularProgress />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data}
              key={animationKey} 
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
