import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

// Simple login component
const LoginPage = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        window.location.href = `/${data.user.role}/dashboard`;
      } else {
        setError('Email ose fjalëkalim i pasaktë!');
      }
    } catch (err) {
      setError('Gabim në lidhje me serverin!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            🏗️
          </div>
          <h1 style={{ color: '#333', marginBottom: '10px' }}>Building System</h1>
          <p style={{ color: '#666' }}>Hyr në sistemin tënd</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#333',
              fontWeight: '500'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Shkruaj email-in tënd"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#333',
              fontWeight: '500'
            }}>
              Fjalëkalimi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Shkruaj fjalëkalimin tënd"
            />
          </div>

          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Duke hyrë...' : 'Hyr'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            <strong>Test Credentials:</strong><br/>
            Admin: admin@example.com / admin123<br/>
            Manager: manager@example.com / manager123<br/>
            User: user@example.com / user123
          </p>
        </div>
      </div>
    </div>
  );
};

// Simple dashboard component
const Dashboard = ({ user }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authUser');
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{ color: '#333', margin: 0 }}>Dashboard</h1>
          <button
            onClick={handleLogout}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Dil
          </button>
        </div>

        <div style={{
          background: '#e9ecef',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Mirë se vini!</h3>
          <p style={{ margin: 0, color: '#666' }}>
            <strong>Emri:</strong> {user?.name}<br/>
            <strong>Email:</strong> {user?.email}<br/>
            <strong>Roli:</strong> {user?.role}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>🏗️</h3>
            <p style={{ margin: 0 }}>Building System</p>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📊</h3>
            <p style={{ margin: 0 }}>Dashboard</p>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>👥</h3>
            <p style={{ margin: 0 }}>Users</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main app component
const AppMinimal = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authUser');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          color: 'white',
          fontSize: '18px'
        }}>
          Duke ngarkuar...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        {user ? <Dashboard user={user} /> : <LoginPage />}
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppMinimal;