import React from 'react';
import "./Navbar.css";
import { useNavigate, Link } from 'react-router-dom';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="navbar navbar-inverse navbar-fixed-top bs-docs-nav" role="banner">
      <div className="container">
        <div className="navbar-header">
          <button className="navbar-toggle" type="button" data-toggle="collapse" data-target=".bs-navbar-collapse">
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
          <Link to="/" className="navbar-brand">IOT</Link>
        </div>
        <nav className="collapse navbar-collapse bs-navbar-collapse" role="navigation">
          <ul className="nav navbar-nav navbar-right">
            {isAuthenticated ? (
              <>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/notifications">Notifications</Link></li>
                <li className="dropdown profile-menu">
                  <a href="#" className="dropdown-toggle" data-toggle="dropdown">
                    Profile <b className="caret"></b>
                  </a>
                  <ul className="dropdown-menu">
                    <li><Link to="/profile">My Profile</Link></li>
                    <li><a href="#" onClick={handleLogoutClick}>Logout</a></li>
                  </ul>
                </li>
              </>
            ) : (
              <li><Link to="/login">Login</Link></li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
