import { useState, useEffect } from "react";

function App() {
    const [balance, setBalance] = useState(10000);  // Default balance
    const [cryptoPrices, setCryptoPrices] = useState({});

    // Fetch crypto prices from the backend
    useEffect(() => {
        fetch("http://localhost:3001/api/crypto")
            .then(res => res.json())
            .then(data => {
                console.log("Fetched Crypto Prices:", data); // Debugging log
                setCryptoPrices(data);
            })
            .catch(err => console.error("Error fetching crypto prices:", err));
    }, []);

    return (
        <div style={styles.container}>
            <h1>Crypto Trading Simulator</h1>
            <h2>Your Balance: ${balance.toFixed(2)}</h2>

            {/* Display Bitcoin & Ethereum Prices */}
            <div style={styles.cryptoContainer}>
                <div style={styles.cryptoBox}>
                    <h3>Bitcoin (BTC)</h3>
                    <p>Price: ${cryptoPrices.btc?.usd || "Loading..."}</p>
                </div>
                <div style={styles.cryptoBox}>
                    <h3>Ethereum (ETH)</h3>
                    <p>Price: ${cryptoPrices.eth?.usd || "Loading..."}</p>
                </div>
            </div>

            {/* Buttons for Authentication & Trading */}
            <div>
                <button style={styles.button} onClick={() => alert("Login/Register Coming Soon!")}>Login / Register</button>
                <button style={styles.button} onClick={() => alert("Trading Dashboard Coming Soon!")}>Start Trading</button>
            </div>
        </div>
    );
}

// Basic Inline Styles
const styles = {
    container: { textAlign: "center", padding: "50px", fontFamily: "Arial, sans-serif" },
    cryptoContainer: { display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" },
    cryptoBox: { border: "1px solid #ddd", padding: "10px", borderRadius: "8px", width: "180px", textAlign: "center", background: "#f9f9f9" },
    button: { margin: "10px", padding: "10px 20px", fontSize: "16px", cursor: "pointer", border: "none", background: "#007bff", color: "#fff", borderRadius: "5px" }
};

export default App;
