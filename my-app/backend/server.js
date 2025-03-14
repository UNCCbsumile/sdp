const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

app.get("/api/crypto", async (req, res) => {
    try {
        const response = await axios.get("https://api.binance.us/api/v3/ticker/price?symbols=[\"BTCUSDT\",\"ETHUSDT\"]");
        const prices = response.data.reduce((acc, item) => {
            const symbol = item.symbol.replace("USDT", "").toLowerCase();
            acc[symbol] = { usd: parseFloat(item.price) };
            return acc;
        }, {});
        res.json(prices);
    } catch (error) {
        console.error("Error fetching crypto prices:", error.message);
        res.status(500).json({ error: "Failed to fetch crypto prices" });
    }
});


app.listen(3001, () => console.log("Server running on port 3001"));
