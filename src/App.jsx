import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MeetingApp from './components/MeetingApp';
// import { CustomLayoutPage } from './pages/CustomLayoutPage';
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        {/* Navigation */}
        <nav style={{ 
          padding: '15px 20px', 
          background: '#f8f9fa', 
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <Link 
            to="/" 
            style={{ 
              textDecoration: 'none', 
              color: '#007bff',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            🏠 Meeting App
          </Link>
          <Link 
            to="/customLayout" 
            style={{ 
              textDecoration: 'none', 
              color: '#007bff',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            🎥 Custom Recording Layout
          </Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<MeetingApp />} />
          {/* <Route path="/customLayout" element={<CustomLayoutPage />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
