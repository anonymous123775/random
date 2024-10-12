import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

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

const WebSocketPieChartComponent: React.FC<MachineStatusProps> = ({ plantId }) => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [machineStatuses, setMachineStatuses] = useState<MachineStatus[]>([]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/machine-status?plantId=${plantId}`); // Replace with your WebSocket URL

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
  }, [plantId]); // Include plantId in the dependency array to re-establish connection if it changes

  // Define colors for the pie chart
  const COLORS = ['#00C49F', '#FFBB28', '#FF8042']; // Green, Yellow, Red

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ width: '50%' }}>
        <h3>Machine Status Distribution</h3>
        <PieChart width={500} height={300}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 10)}`} // Display percentage on the pie chart
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
      </div>

      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <h3>Machine Status</h3>
        {machineStatuses.map((machine) => (
          <div key={machine.machine_id} style={{ display: 'flex', alignItems: 'center', margin: '5px 0' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor:
                  machine.status === 'online' ? '#00C49F' : // Green for online
                  machine.status === 'offline' ? '#FF8042' : // Yellow for offline
                  '#FFBB28', // Red for unavailable
                marginRight: '10px',
              }}
            />
            <span>
              Machine {machine.machine_id}: {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebSocketPieChartComponent;
