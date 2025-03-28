import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/navbar"; // ✅ Import Navbar
import Home from "./pages/home";
import Trading from "./pages/trading";
import Portfolio from "./pages/portfolio";

function App() {
    const [balance, setBalance] = useState(10000); // Default balance
    const [cryptoPrices, setCryptoPrices] = useState({});

    // Fetch crypto prices from backend
    useEffect(() => {
        const fetchPrices = () => {
            fetch("http://localhost:3001/api/crypto")
                .then(res => res.json())
                .then(data => setCryptoPrices(data))
                .catch(err => console.error("Error fetching crypto prices:", err));
        };

        fetchPrices(); // Fetch immediately on load

        // Auto-update every 10 seconds
        const interval = setInterval(fetchPrices, 10000);

        return () => clearInterval(interval); // Cleanup interval
    }, []);

    return (
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={
              <div className="dashboard-container">
                <h1>Dashboard</h1>
                <h2>Your Balance: ${balance.toFixed(2)}</h2>
      
                <div className="crypto-container">
                  <div className="crypto-box">
                    <h3>Bitcoin (BTC)</h3>
                    <p>Price: ${cryptoPrices.btc?.usd || "Loading..."}</p>
                  </div>
                  <div className="crypto-box">
                    <h3>Ethereum (ETH)</h3>
                    <p>Price: ${cryptoPrices.eth?.usd || "Loading..."}</p>
                  </div>
                </div>
      
                <div>
                  <button className="primary-button" onClick={() => alert("Login/Register Coming Soon!")}>
                    Login / Register
                  </button>
                  <button className="primary-button" onClick={() => alert("Trading Dashboard Coming Soon!")}>
                    Start Trading
                  </button>
                </div>
              </div>
            }/>
            <Route path="/trading" element={<Trading />} />
            <Route path="/portfolio" element={<Portfolio />} />
          </Routes>
        </Router>
      );
}

// Styling
// const styles = {
//     container: {
//         minHeight: "100vh",              // full height of the screen
//         width: "100%",                   // full width
//         padding: "50px",
//         fontFamily: "Arial, sans-serif",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         backgroundColor: "#fff",         // optional: ensures white background
//     },
//     cryptoContainer: { display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" },
//     cryptoBox: { border: "1px solid #ddd", padding: "10px", borderRadius: "8px", width: "180px", textAlign: "center", background: "#f9f9f9" },
//     button: { margin: "10px", padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "#007bff", color: "#fff", borderRadius: "5px", border: "none" }
// };

export default App;
