import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CircularProgress, Box, Typography, Paper } from '@mui/material';
import { fetchMachineKpis } from '../../Services/api';

interface PieChartComponentProps {
  machineId: string;
  plantId: string;
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({ machineId, plantId }) => {
  const [uptime, setUptime] = useState<number>(0);
  const [downtime, setDowntime] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);  // Add loading state


  useEffect(() => {
    const fetchKpis = async () => {
      try {
        setLoading(true); // Start loading
        const kpiData = await fetchMachineKpis(machineId, plantId);
        if (kpiData && kpiData.length > 0) {
          setUptime(Number((kpiData[0].uptime / 60).toFixed(2))); // Convert minutes to hours
          setDowntime(Number((kpiData[0].downtime / 60).toFixed(2))); // Convert minutes to hours
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setLoading(false); // End loading
      }
    };
  
    fetchKpis();
    const interval = setInterval(fetchKpis, 300000); // Refresh every 5 minutes
  
    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [machineId, plantId]);
  

  const total = uptime + downtime;
  const data = [
    { name: 'Uptime', value: (uptime / total) * 100 },
    { name: 'Downtime', value: (downtime / total) * 100 },
  ];
  const COLORS = ['#4CAF50', '#FF6347'];

  return (
    <Paper elevation={3} sx={{ padding: 2, marginBottom: 1 }}>
      <Typography variant="h6" gutterBottom>
        Uptime vs Downtime
      </Typography>
  
      {loading ? (  // Show loading spinner while fetching data
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress />
        </Box>
      ) : (  // Show the PieChart once data is fetched
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
  
};

export default PieChartComponent;
