import React, { useState } from "react";
import Auth from "./Components/Auth/Auth";
import Dashboard from "./Components/Dashboard/Dashboard";
import Navbar from "./Components/Navbar/Navbar";
// import Dashboard from "./components/Dashboard"; // Create this component later
import "./App.css";

const App: React.FC = () => {

  return (
    <div className="App">
      <Dashboard />
      
    </div>
  );
};

export default App;
