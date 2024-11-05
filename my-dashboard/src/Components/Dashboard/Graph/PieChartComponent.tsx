import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { CircularProgress, Box, Paper } from '@mui/material';
import { fetchMachineKpis, fetchKpiNotRealTime } from '../../Services/api';
import { Data } from 'plotly.js';

interface PieChartComponentProps {
  machineId: string[];
  plantId: string;
  startTime: Date | null;
  endTime: Date | null;
  realTime: boolean;
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

        const aggregatedData = kpiData.flat().map((kpi, index) => {
          const uptime = kpi?.uptime || 0;
          const downtime = kpi?.downtime || 0;
          return {
            machine: `Machine ${kpi?.machine_id}`,
            uptime: Number((uptime / 60).toFixed(2)),
            downtime: Number((downtime / 60).toFixed(2)),
          };
        });

        setData(aggregatedData);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, [machineId, plantId, realTime, startTime, endTime]);

  // Sort data by machine label
  const sortedData = data.sort((a, b) => a.machine.localeCompare(b.machine));

  const traces: Data[] = [
    {
      labels: sortedData.flatMap(machineData => [
        `Uptime (${machineData.machine})`,
        `Downtime (${machineData.machine})`
      ]),
      values: sortedData.flatMap(machineData => [
        machineData.uptime,
        machineData.downtime
      ]),
      type: 'pie',
      hoverinfo: 'label+percent+name',
      textinfo: 'label+percent',
      hovertemplate: '%{label}<br>%{value} hours<br>%{percent}',
      marker: {
        colors: sortedData.flatMap(() => ['#4CAF50', '#FF6347'])
      },
      showlegend: true,
      textposition: 'inside',
      textfont: {
        size: 12,
        color: 'white',
        family: 'Arial, sans-serif'
      },
    }
  ];

  return (
    <Paper elevation={3} sx={{ padding: 2, marginBottom: 1 }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress />
        </Box>
      ) : (
        <Plot
          data={traces}
          layout={{
            title: 'Uptime vs Downtime',
            showlegend: true,
            legend: {
              title: { text: 'Machines' },
              itemsizing: 'constant',
              traceorder: 'normal',
            },
            height: 330,
            margin: { l: 20, r: 20, t: 40, b: 20 },
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </Paper>
  );
};

export default PieChartComponent;
