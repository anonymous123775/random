import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import moment from 'moment'; // For formatting the time

interface GraphComponentProps {
  machineId: string;
  plantId: string;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ machineId, plantId }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?machineId=${machineId}&plantId=${plantId}`);


    socket.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      console.log('New data received:', newData);

      // Filter data for the specific machine and plant and map time
      const filteredData = newData
        .filter((item: any) => 
            item.machine_id === Number(machineId) && item.plant_id === Number(plantId)
        )
        .map((item: any) => ({
            ...item,
            time: moment(item.time).format('HH:mm:ss'),
        }));

        console.log('Filtered data:', filteredData);  // Log filtered data


      // Prevent adding duplicate data by checking the last item in the current state
      setData((prevData) => {
        if (prevData.length === 0 || prevData[prevData.length - 1].time !== filteredData[0].time) {
          return [...prevData, ...filteredData];
        }
        return prevData; // If data is the same, don't update the state
      });
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    return () => {
      socket.close(); // Close socket when component unmounts
    };
  }, [machineId, plantId]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#8884d8" />
          <Line type="monotone" dataKey="humidity" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraphComponent;
