  import React, { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import '../css/AuthenticationPage.css'; // Ensure you have this CSS file for styling

  function AuthenticationPage() {
    const [authMode, setAuthMode] = useState('login');
    const navigate = useNavigate();

    // State for login
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // State for register
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');

    // State for messages
    const [message, setMessage] = useState('');

    // Handle Register
    const handleRegister = (e) => {
      e.preventDefault();

      fetch('http://localhost:5000/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: registerUsername,  // ✅ Matches backend requirement
            email: registerEmail,        // ✅ Matches backend requirement
            password: registerPassword   // ✅ Matches backend requirement
          }),
        })
          .then(response => response.json())
          .then(data => {
            alert(data.message);
          })
          .catch(error => {
            console.error('Error:', error);
            alert('An error occurred.');
          });
    };

    // Handle Login
    const handleLogin = (e) => {
      e.preventDefault();
    
      fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail, 
          password: loginPassword 
        }),
      })
        .then(async (response) => {
          const data = await response.json();
          
          if (response.ok) { 
            // ✅ Save email locally
            localStorage.setItem("loggedInEmail", loginEmail);
            
            alert(data.message);
            navigate('/chat'); // Redirect to chat page
          } else {
            alert(data.message);
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          alert('An error occurred during login.');
        });
    };


    return (
      <div className="auth-container">
        <div className="auth-form">
          {/* Login Form */}
          {authMode === 'login' && (
            <div className="auth-content">
              <h2>Login</h2>
              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="input-group">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <button type="submit">Login</button>
              </form>
              <p>Don’t have an account? <span onClick={() => setAuthMode('register')}>Register here</span></p>
              <p>Forgot password? <span onClick={() => setAuthMode('forgot')}>Reset it</span></p>
            </div>
          )}

          {/* Register Form */}
          {authMode === 'register' && (
            <div className="auth-content">
              <h2>Register</h2>
              <form onSubmit={handleRegister}>
                <div className="input-group">
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>
                <div className="input-group">
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="input-group">
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <button type="submit">Register</button>
              </form>
              {message && <p>{message}</p>}
              <p>Already have an account? <span onClick={() => setAuthMode('login')}>Login here</span></p>
            </div>
          )}

          {/* Forgot Password Form */}
          {authMode === 'forgot' && (
            <div className="auth-content">
              <h2>Forgot Password</h2>
              <form>
                <div className="input-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email to reset password"
                  />
                </div>
                <button type="submit">Reset Password</button>
              </form>
              <p>Remembered your password? <span onClick={() => setAuthMode('login')}>Login here</span></p>
            </div>
          )}
        </div>
      </div>
    );
  }

  export default AuthenticationPage;
