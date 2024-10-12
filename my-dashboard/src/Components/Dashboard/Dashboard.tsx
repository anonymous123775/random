// // Dashboard.tsx

// import React, { useEffect, useState } from 'react';
// import LineChartComponent from './Graph/LineChartComponent';
// import SelectionComponent from './SelectionComponent';
// import './Dashboard.css';
// import BarChartComponent from './Graph/BarChartComponent';
// import PieChartComponent from './Graph/PieChartComponent'; // Import the PieChartComponent
// import { getMachineCount, getPlantCount, fetchMachineKpis } from '../Services/api';

// const Dashboard: React.FC = () => {
//   const [selectedMachine, setSelectedMachine] = useState('1');
//   const [selectedPlant, setSelectedPlant] = useState('1');
//   const [machines, setMachines] = useState<string[]>([]);
//   const [plants, setPlants] = useState<string[]>([]); 
//   const [kpis, setKpis] = useState<any>({});

//   useEffect(() => {
//     const fetchCounts = async() =>{
//       const machineData = await getMachineCount();
//       const plantData = await getPlantCount();
//       setMachines(machineData.distinct_machine_count);
//       setPlants(plantData.distinct_plant_count);
//     };

//     const fetchKpis = async () => {
//       const kpiData = await fetchMachineKpis(selectedMachine, selectedPlant);
//       if(kpiData){
//         setKpis(kpiData[0]);
//       }
//     };

//     fetchKpis();
//     fetchCounts();
//   }, [selectedMachine, selectedPlant]);

//   const handleMachineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setSelectedMachine(event.target.value);
//   };

//   const handlePlantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setSelectedPlant(event.target.value);
//   };

//   const convertMinutesToHMS = (minutes: number) => {
//     const hours = Math.floor(minutes / 60);
//     const mins = Math.floor(minutes % 60);
//     const secs = Math.floor((minutes * 60) % 60);
//     return { hours, mins, secs };
//   };

//   const uptimeHMS = kpis.uptime !== undefined ? convertMinutesToHMS(kpis.uptime) : { hours: 0, mins: 0, secs: 0 };
//   const downtimeHMS = kpis.downtime !== undefined ? convertMinutesToHMS(kpis.downtime) : { hours: 0, mins: 0, secs: 0 };
//   const failureRatePercentage = kpis.failure_rate !== undefined ? (kpis.failure_rate * 100).toFixed(2) : 'Loading...';

//   return (
//     <div className="dashboard-container">
//       <SelectionComponent
//         machines={machines}
//         plants={plants}
//         selectedMachine={selectedMachine}
//         selectedPlant={selectedPlant}
//         onMachineChange={handleMachineChange}
//         onPlantChange={handlePlantChange}
//       />
//       <div className="widget-container">
//         <div className="widget">
//           <h3>Uptime</h3>
//           <p>{uptimeHMS.hours}h {uptimeHMS.mins}m {uptimeHMS.secs}s</p>
//         </div>
//         <div className="widget">
//           <h3>Downtime</h3>
//           <p>{downtimeHMS.hours}h {downtimeHMS.mins}m {downtimeHMS.secs}s</p>
//         </div>
//         <div className="widget">
//           <h3>Failure Rate</h3>
//           <p>{failureRatePercentage}%</p>
//         </div>
//         <div className="widget">
//           <h3>Number of Alerts</h3>
//           <p>{kpis.num_alerts_triggered !== undefined ? kpis.num_alerts_triggered : 'Loading...'}</p>
//         </div>
//       </div>
//       <div className="grid">
//         <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} />
//         <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} />
//         <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power']} />
//         <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} />
//       </div>
//       <div className="grid">
//         <BarChartComponent machineId={selectedMachine} plantId={selectedPlant} />
//       </div>
//       <div className="grid">
//         <PieChartComponent machineId={selectedMachine} plantId={selectedPlant} />
//       </div>
//     </div>
//   );
// };

// export default Dashboard;


import React, { useEffect, useState } from 'react';
import LineChartComponent from './Graph/LineChartComponent';
import SelectionComponent from './SelectionComponent';
import './Dashboard.css';
import BarChartComponent from './Graph/BarChartComponent';
import PieChartComponent from './Graph/PieChartComponent'; // Import the PieChartComponent
import { getMachineCount, getPlantCount, fetchMachineKpis } from '../Services/api';
import BarChartFailureComponent from './Graph/BarChartFailureComponent';

const Dashboard: React.FC = () => {
  const [selectedMachine, setSelectedMachine] = useState('1');
  const [selectedPlant, setSelectedPlant] = useState('1');
  const [machines, setMachines] = useState<string[]>([]);
  const [plants, setPlants] = useState<string[]>([]); 
  const [kpis, setKpis] = useState<any>({});

  useEffect(() => {
    const fetchCounts = async() =>{
      const machineData = await getMachineCount();
      const plantData = await getPlantCount();
      setMachines(machineData.distinct_machine_count);
      setPlants(plantData.distinct_plant_count);
    };

    const fetchKpis = async () => {
      const kpiData = await fetchMachineKpis(selectedMachine, selectedPlant);
      if(kpiData){
        setKpis(kpiData[0]);
      }
    };

    fetchKpis();
    fetchCounts();
  }, [selectedMachine, selectedPlant]);

  const handleMachineChange = (machineId: string) => {
    setSelectedMachine(machineId);
  };

  const handlePlantChange = (plantId: string) => {
    setSelectedPlant(plantId);
  };

  const convertMinutesToHMS = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return { hours, mins, secs };
  };

  const uptimeHMS = kpis.uptime !== undefined ? convertMinutesToHMS(kpis.uptime) : { hours: 0, mins: 0, secs: 0 };
  const downtimeHMS = kpis.downtime !== undefined ? convertMinutesToHMS(kpis.downtime) : { hours: 0, mins: 0, secs: 0 };
  const failureRatePercentage = kpis.failure_rate !== undefined ? (kpis.failure_rate * 100).toFixed(2) : 'Loading...';

  return (
    <div className="dashboard-container">
      <div className="grid">
        <BarChartFailureComponent plantId={selectedPlant} />
      </div>
      <div className="selection-container">
        <div className="card-container plants">
          {plants.map((plant, index) => (
            <div
              key={index}
              className={`card ${selectedPlant === plant ? 'selected' : ''}`}
              onClick={() => handlePlantChange(plant)}
            >
              Plant {index + 1}
            </div>
          ))}
        </div>
        <div className="card-container machines">
          {machines.map((machine, index) => (
            <div
              key={index}
              className={`card ${selectedMachine === machine ? 'selected' : ''}`}
              onClick={() => handleMachineChange(machine)}
            >
              Machine {index + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="widget-container">
        <div className="widget">
          <h3>Uptime</h3>
          <p>{uptimeHMS.hours}h {uptimeHMS.mins}m {uptimeHMS.secs}s</p>
        </div>
        <div className="widget">
          <h3>Downtime</h3>
          <p>{downtimeHMS.hours}h {downtimeHMS.mins}m {downtimeHMS.secs}s</p>
        </div>
        <div className="widget">
          <h3>Failure Rate</h3>
          <p>{failureRatePercentage}%</p>
        </div>
        <div className="widget">
          <h3>Number of Alerts</h3>
          <p>{kpis.num_alerts_triggered !== undefined ? kpis.num_alerts_triggered : 'Loading...'}</p>
        </div>
      </div>
      <div className="grid">
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['temperature']} />
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['humidity']} />
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['power']} />
        <LineChartComponent machineId={selectedMachine} plantId={selectedPlant} parameters={['vibration']} />
      </div>
      <div className="grid">
        <BarChartComponent machineId={selectedMachine} plantId={selectedPlant} />
      </div>
      <div className="grid">
        <PieChartComponent machineId={selectedMachine} plantId={selectedPlant} />
      </div>
    </div>
  );
};

export default Dashboard;
