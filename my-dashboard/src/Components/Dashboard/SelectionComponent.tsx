import React from "react";
import './SelectionComponent.css';

interface SelectionProps {
  machines: string[],
  plants: string[],
  selectedMachine: string,
  selectedPlant: string,
  onMachineChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPlantChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectionComponent: React.FC<SelectionProps> = ({ machines, plants, selectedMachine, selectedPlant, onMachineChange, onPlantChange }) => {
  return (
    <div className="selection-container">
      <div className="selection-control">
        <label htmlFor="machine-select">Machine</label>
        <select id="machine-select" value={selectedMachine} onChange={onMachineChange}>
          {machines.map((machine) => (
            <option key={machine} value={machine}>
              {machine}
            </option>
          ))}
        </select>
      </div>
      <div className="selection-control">
        <label htmlFor="plant-select">Plant</label>
        <select id="plant-select" value={selectedPlant} onChange={onPlantChange}>
          {plants.map((plant) => (
            <option key={plant} value={plant}>
              {plant}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SelectionComponent;
