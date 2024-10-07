// import React from "react";
// import { useNavigate } from "react-router-dom";
// import "./Navbar.css"; // Adjust the path if needed

// const Navbar: React.FC<{ isAuthenticated: boolean; onLogout: () => void }> = ({
//   isAuthenticated,
//   onLogout,
// }) => {
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     // Call the logout function passed from parent
//     onLogout();
//     navigate("/auth"); // Redirect to auth page after logout
//   };

//   return (
//     <nav className="navbar">
//       <h1 className="logo">MyApp</h1>
//       <ul>
//         <li>
//           <button onClick={() => navigate("/dashboard")}>Dashboard</button>
//         </li>
//         {isAuthenticated ? (
//           <li>
//             <button onClick={handleLogout}>Logout</button>
//           </li>
//         ) : (
//           <li>
//             <button onClick={() => navigate("/auth")}>Login</button>
//           </li>
//         )}
//       </ul>
//     </nav>
//   );
// };

// export default Navbar;


import React from 'react';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout }) => {
  return (
    <nav>
      <h1>MyApp</h1>
      <ul>
        <li><a href="/">Home</a></li>
        {isAuthenticated ? (
          <>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><button onClick={onLogout}>Logout</button></li>
          </>
        ) : (
          <li><a href="/auth">Login</a></li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
