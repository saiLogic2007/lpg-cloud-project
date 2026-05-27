/*
  SafeGuard IoT - Local Backend Server (Plain JavaScript)
  Host this server locally on your computer to process MQ-6 sensor feeds from physical hardware!

  How to execute:
  1. Open a terminal/command prompt.
  2. Create an empty directory and paste this file as "server.js"
  3. Install dependencies by running:
     npm install express
  4. Start the server using Node:
     node server.js
*/

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parser for incoming hardware feeds
app.use(express.json());

// Enable CORS so external network nodes can register POST payloads without header blocks
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Real-time EventSource Broadcast Clients Array
let sseClients = [];

// Historical points buffer (stores up to last 100 observations)
let localHistory = [];

// Seed initial healthy room samples
const initTime = Date.now();
for (let i = 20; i >= 0; i--) {
  const timeStr = new Date(initTime - i * 5000).toISOString();
  const mockValue = Math.round(40 + Math.random() * 20); // Healthy room baseline 40-60 PPM
  localHistory.push({
    value: mockValue,
    percentage: Math.round((mockValue / 1023) * 100),
    severity: "Safe",
    timestamp: timeStr
  });
}

// REST Route: Fetch Historical data values
app.get("/api/history", (req, res) => {
  res.json(localHistory);
});

// Ingress API Route: Accepts real gas sensor entries from ESP32 or simulated slide generators
app.post("/api/sensor-data", (req, res) => {
  const { value, timestamp } = req.body;
  const inputVal = value !== undefined ? parseInt(value) : 0;

  // Basic classification thresholds (configurable in actual control layout)
  let calculatedSeverity = "Safe";
  if (inputVal >= 800) {
    calculatedSeverity = "Critical";
  } else if (inputVal >= 550) {
    calculatedSeverity = "Danger";
  } else if (inputVal >= 200) {
    calculatedSeverity = "Warning";
  }

  const dataPayload = {
    value: inputVal,
    percentage: Math.min(100, Math.round((inputVal / 1023) * 100)),
    severity: calculatedSeverity,
    timestamp: timestamp || new Date().toISOString()
  };

  // Push into queue and enforce sliding maximum limit of 100 ticks
  localHistory.push(dataPayload);
  if (localHistory.length > 100) {
    localHistory.shift();
  }

  // Broadcast payload synchronously to all active open SSE listener instances
  sseClients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(dataPayload)}\n\n`);
  });

  console.log(`[INGRESS] Received value: ${inputVal} PPM | Severity: ${calculatedSeverity}`);
  res.json({ status: "success", received: dataPayload });
});

// SSE Route: Real-time broadcast line stream
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  console.log(`[CLIENT] Real-time console listener linked. Active links: ${sseClients.length}`);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`[CLIENT] Listener unlinked. Active links: ${sseClients.length}`);
  });
});

// Standard route serving index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n============================================================`);
  console.log(`🚀 SafeGuard IoT Local Web Server listening on port ${PORT}`);
  console.log(`- Web dashboard:   http://localhost:${PORT}`);
  console.log(`- Ingress URL:     http://localhost:${PORT}/api/sensor-data`);
  console.log(`- Stream line:     http://localhost:${PORT}/api/stream`);
  console.log(`============================================================\n`);
});
