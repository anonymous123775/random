import React, { useState } from "react";
import "./Auth.css";
import { loginUser, registerUser } from "../Services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; 

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); 
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const response = await loginUser(formData.username, formData.password);
        console.log("Login successful:", response);
        onAuthSuccess();
        toast.success("Login successful!");
      } else {
        const response = await registerUser(formData);
        console.log("Signup successful:", response);
        toast.success("Signup successful!");
      }
    } catch (error: any) {
      if (error.response) {
        toast.error(`Error: ${error.response.data.detail || error.message}`);
      } else {
        toast.error("An unknown error occurred.");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="form-container">
        <h2>{isLogin ? "Login" : "Signup"}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </>
          )}
          <label htmlFor="username">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">{isLogin ? "Login" : "Signup"}</button>
        </form>
        <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Signup" : "Already have an account? Login"}
        </button>
      </div>

      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick />
    </div>
  );
};

export default Auth;
