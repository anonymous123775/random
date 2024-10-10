import React, { useEffect, useState } from 'react';
import LineChartComponent from './Graph/LineChartComponent';
import SelectionComponent from './SelectionComponent';
import './Dashboard.css';
import BarChartComponent from './Graph/BarChartComponent';
import { getMachineCount, getPlantCount } from '../Services/api';

const Dashboard: React.FC = () => {
  const [selectedMachine, setSelectedMachine] = useState('1');
  const [selectedPlant, setSelectedPlant] = useState('1');
  const [machines, setMachines] = useState<string[]>([]);
  const [plants, setPlants] = useState<string[]>([]);

  useEffect(() => {
    const fetchCounts = async() =>{
      const machineData = await getMachineCount();
      const plantData = await getPlantCount();
      setMachines(machineData.distinct_machine_count);
      setPlants(plantData.distinct_plant_count);
    };

    fetchCounts();
  }, []);

  const handleMachineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMachine(event.target.value);
  };

  const handlePlantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlant(event.target.value);
  };

  // console.log(selectedMachine, selectedPlant);
  return (
    <div className="dashboard-container">
      <SelectionComponent
        machines={machines}
        plants={plants}
        selectedMachine={selectedMachine}
        selectedPlant={selectedPlant}
        onMachineChange={handleMachineChange}
        onPlantChange={handlePlantChange}
      />
      <div className="grid">
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} />
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} />
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power']} />
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} />
      </div>
      <div className="grid">
        <BarChartComponent machineId={selectedMachine} plantId={selectedPlant} />
      </div>
    </div>
  );
};

export default Dashboard;
