// PieChartComponent.tsx

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import axios from 'axios';
import { fetchMachineKpis } from '../../Services/api';

interface PieChartComponentProps {
  machineId: string;
  plantId: string;
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({ machineId, plantId }) => {
  const [uptime, setUptime] = useState<number>(0);
  const [downtime, setDowntime] = useState<number>(0);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const kpiData = await fetchMachineKpis(machineId,plantId);
        if (kpiData && kpiData.length > 0) {
          setUptime(Number((kpiData[0].uptime / 60).toFixed(2))); // Convert minutes to hours
          setDowntime(Number((kpiData[0].downtime / 60).toFixed(2))); // Convert minutes to hours
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error);
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
    <div style={{ width: '100%', height: '600px' }}>
      <h3>Uptime vs Downtime</h3>
      <PieChart width={400} height={400}>
        <Pie
          data={data}
          cx={200}
          cy={200}
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={150}
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
    </div>
  );
};

export default PieChartComponent;
