import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ChartStyles.css';
import { fetchMachineFailuresPlant, getPlantCount } from '../../Services/api';

interface BarChartComponentProps {
  plantId: string;
}

const BarChartFailureComponent: React.FC<BarChartComponentProps> = ({plantId}) => {
  const [data, setData] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const plantList = await getPlantCount();
      setPlants(plantList);

      const newData = await fetchMachineFailuresPlant(plantId);
      setData(newData);
    };

    fetchData();
  }, []);

  return (
    <div className="chart-container">
      <h2>Failures per Machine</h2>
      <p>Total Plants: {plants.length}</p>
      <ul>
        {plants.map((plant) => (
          <li key={plant.id}>{plant.name}</li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis dataKey="machine_id" stroke="#333" />
          <YAxis stroke="#333" />
          <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ccc' }} />
          <Legend />
          <Bar dataKey="failures" fill="#8884d8" barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartFailureComponent;
