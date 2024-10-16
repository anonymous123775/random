import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { CircularProgress, Box, Typography, Paper } from '@mui/material';
import { fetchMachineKpis, fetchKpiNotRealTime } from '../../Services/api';
import { Data } from 'plotly.js';

interface PieChartComponentProps {
  machineId: string[];
  plantId: string;
  startTime: Date|null;
  endTime: Date|null;
  realTime: boolean
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({ machineId, plantId, startTime, endTime, realTime }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        setLoading(true);
        const kpiData = await Promise.all(
          machineId.map(id => 
            realTime 
              ? fetchMachineKpis(id, plantId) 
              : fetchKpiNotRealTime(id, plantId, startTime, endTime)
            )
        );

        console.log("Fetched KPI Data:", kpiData); // Log the fetched data

        const aggregatedData = kpiData.flat().map((kpi, index) => {
          const uptime = kpi?.uptime || 0;
          const downtime = kpi?.downtime || 0;
          return {
            machine: machineId[index],
            uptime: Number((uptime / 60).toFixed(2)), // Convert minutes to hours
            downtime: Number((downtime / 60).toFixed(2)), // Convert minutes to hours
          };
        });

        console.log("Aggregated Data:", aggregatedData); // Log the aggregated data

        setData(aggregatedData);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, [machineId, plantId, realTime]);

  const uptimeValues = data.map(machineData => machineData.uptime);
  const downtimeValues = data.map(machineData => machineData.downtime);
  const labels = data.flatMap(machineData => [
    `Uptime (${machineData.machine})`,
    `Downtime (${machineData.machine})`
  ]);
  const values = data.flatMap(machineData => [machineData.uptime, machineData.downtime]);

  const trace: Data = {
    labels: labels,
    values: values,
    type: 'pie',
    hoverinfo: 'label+percent+name',
    textinfo: 'label+percent',
    marker: {
      colors: labels.map(label => label.includes('Uptime') ? '#4CAF50' : '#FF6347')
    }
  };

  console.log("Trace:", trace); // Log the trace

  return (
    <Paper elevation={3} sx={{ padding: 2, marginBottom: 1 }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress />
        </Box>
      ) : (
        <Plot
          data={[trace]}
          layout={{
            title: 'Uptime vs Downtime',
            showlegend: true,
            legend: { title: { text: 'Machines' } },
            height: 330,
            margin: { l: 20, r: 20, t: 40, b: 20 }, // Adjust margins to cover most of the card area
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </Paper>
  );
};

export default PieChartComponent;
