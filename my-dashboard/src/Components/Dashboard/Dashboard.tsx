import React from 'react';
import GraphComponent from './Graph/Graph';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>IoT Dashboard</h1>
      <div>
        <h2>Machine 1, Plant 1</h2>
        <GraphComponent machineId="1" plantId="1" />
      </div>
      <div>
        <h2>Machine 2, Plant 1</h2>
        <GraphComponent machineId="2" plantId="1" />
      </div>
    </div>
  );
};

export default Dashboard;
