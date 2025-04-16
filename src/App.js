import AuthenticationPage from "./pages/AuthenticationPage";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatPage from "./pages/ChatPage";
import './css/App.css'

function App() {
  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
      <Routes>
        <Route path="/" element={<AuthenticationPage />} />
        <Route path="/chat" element={<ChatPage />} /> 
      </Routes>
    </Router>
    </div>
  );
}

export default App;


