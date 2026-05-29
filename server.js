import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import twilio from "twilio";
import cors from "cors";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors({
  origin: "https://lpg-cloud-project.vercel.app",
  methods: ["GET", "POST"],
  credentials: true
}));

  // SSE Clients
  let clients = [];

  // Historical data store
  let historicalReadings = [];

  // Seed initial nice looking historical data
  const now = Date.now();
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now - i * 5000).toISOString();
    const baseValue = 50 + Math.random() * 30; // 50-80 PPM
    historicalReadings.push({
      value: baseValue,
      percentage: (baseValue / 1000) * 100,
      severity: "Safe",
      timestamp: time,
latitude: 16.482372983354427,
longitude: 80.6913302784681
    });
  }

  // API to fetch history
  app.get("/api/history", (req, res) => {
    res.json(historicalReadings);
  });

  // API to verify Twilio config status
  app.get("/api/twilio-status", (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    res.json({
      configured: !!(accountSid && authToken && fromNumber),
      hasSid: !!accountSid,
      hasToken: !!authToken,
      hasPhone: !!fromNumber
    });
  });

  // API to place Automated Voice Call (The Midnight Saver) via Twilio Voice TTS
  app.post("/api/make-voice-call", async (req, res) => {
    const { phone, value, severity, latitude, longitude, recipientRole, customSid, customToken, customPhone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Missing 'phone' parameter." });
    }

    const accountSid = customSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = customToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = customPhone || process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn("Twilio settings are not configured for voice calls.");
      return res.status(400).json({
        success: false,
        error: "CredentialsMissing",
        message: "Twilio credentials are not configured. Setup environment variables or dashboard credentials to trigger Midnight Saver Automated Voice Call."
      });
    }

    try {
      const client = twilio(accountSid, authToken);
      let targetPhone = phone.trim();

      // Detection for landlines/short-codes which cannot receive SMS but are standard local responder routes
      const isShortCode = targetPhone.length <= 5 || !targetPhone.startsWith("+");
      const activeLat = latitude !== undefined && latitude !== null ? Number(latitude) : 13.7563;
      const activeLng = longitude !== undefined && longitude !== null ? Number(longitude) : 100.5018;

      const speakText = `Emergency Alert, LPG Gas Leakage Detected! Scaled PPM concentration level is ${value}. Current severity classification is ${severity.toUpperCase()}! This is a high-risk dispatch notice for ${recipientRole || 'Emergency Response Division'}. The live incident coordinate is at Latitude ${activeLat.toFixed(4)}, Longitude ${activeLng.toFixed(4)}. Respond immediately. Repeating emergency incident, coordinates are Latitude ${activeLat.toFixed(4)}, Longitude ${activeLng.toFixed(4)}.`;

      const twiml = `<Response><Say voice="alice" language="en-US" loop="2">${speakText}</Say></Response>`;

      let callSid = "MOCK_CALL_SID_" + Math.floor(Math.random() * 1000000);
      let simulated = false;

      if (isShortCode) {
        console.log(`[The Midnight Saver] Emergency shortcode '${targetPhone}' detected. Simulating local emergency dispatcher broadcast.`);
        simulated = true;
      } else {
        const twilioCall = await client.calls.create({
          twiml: twiml,
          to: targetPhone,
          from: fromNumber
        });
        callSid = twilioCall.sid;
        console.log(`[The Midnight Saver] Real Cellular Twilio Voice Call dispatched to: ${targetPhone}. SID: ${callSid}`);
      }

      return res.json({
        success: true,
        status: "Called",
        sid: callSid,
        simulated: simulated,
        message: speakText
      });
    } catch (err) {
      console.error("[The Midnight Saver] Voice call exception:", err);
      return res.status(500).json({
        success: false,
        error: "VoiceCallFailed",
        message: err.message || "Twilio voice call execution threw an exception."
      });
    }
  });

  // API to send real SMS alerts via Twilio
  app.post("/api/send-sms", async (req, res) => {
    const { phone, message, customSid, customToken, customPhone } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: "Missing 'phone' or 'message' parameter." });
    }

    const accountSid = customSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = customToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = customPhone || process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn("Twilio settings are not configured.");
      return res.status(400).json({
        success: false,
        error: "CredentialsMissing",
        message: "Twilio credentials are not configured. Please define them in environment variables or enter them directly on the web dashboard."
      });
    }

    try {
      // Automatic detection and format handling for Twilio WhatsApp Gateway
      let formattedFrom = fromNumber;
      let formattedTo = phone;

      formattedTo = formattedTo.trim();

      // Automatically add India country code if missing
      if (!formattedTo.startsWith("+")) {
        formattedTo = "+91" + formattedTo;
      }

      // Automatically convert to Twilio WhatsApp format
      if (formattedFrom.startsWith("whatsapp:")) {
        if (!formattedTo.startsWith("whatsapp:")) {
          formattedTo = "whatsapp:" + formattedTo;
        }
      }

      console.log("Sending WhatsApp to:", formattedTo);

      // Lazy initialization of the Twilio client
     const twilioMsg = await client.messages.create({
  body: message,
  from: `whatsapp:${formattedFrom}`,
  to: `whatsapp:${formattedTo}`
});

      console.log(`Twilio SMS sent successfully. SID: ${twilioMsg.sid}`);
      return res.json({
        success: true,
        status: "Delivered",
        sid: twilioMsg.sid
      });
    } catch (err) {
      console.error("Twilio SMS transmission failed:", err);
      return res.status(500).json({
        success: false,
        error: "TransmissionFailed",
        message: err.message || "Twilio gateway failed to deliver the SMS."
      });
    }
  });

  // API to send real WhatsApp alerts via CallMeBot
  app.post("/api/send-whatsapp", async (req, res) => {
    const { phone, message, apiKey } = req.body;

    if (!phone || !message || !apiKey) {
      return res.status(400).json({ error: "Missing 'phone', 'message', or 'apiKey' parameter." });
    }

    try {
      // Format number to CallMeBot format
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
      
      const response = await fetch(url);
      const text = await response.text();

      console.log(`CallMeBot WhatsApp delivered to ${phone}. Response: ${text}`);
      return res.json({
        success: true,
        status: "WhatsApp Delivered",
        message: "WhatsApp dispatch processed successfully",
        gatewayResponse: text
      });
    } catch (err) {
      console.error("WhatsApp CallMeBot dispatch failed:", err);
      return res.status(500).json({
        success: false,
        error: "WhatsAppFailed",
        message: err.message || "Failed to reach CallMeBot Gateway."
      });
    }
  });

  // API for ESP32 or Simulator
  app.post("/api/sensor-data", (req, res) => {
    const { value, percentage, severity, timestamp, latitude, longitude } = req.body;
    
    const data = {
      value: value || 0,
      percentage: percentage || 0,
      severity: severity || "Safe",
      timestamp: timestamp || new Date().toISOString(),
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null
    };

    // Store in history (limit to last 100 entries)
    historicalReadings.push(data);
    if (historicalReadings.length > 100) {
      historicalReadings.shift();
    }

    // Notify all SSE clients
    clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));

    res.json({ status: "success", received: data });
  });

  // SSE Endpoint for real-time frontend updates
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    req.on("close", () => {
      clients = clients.filter(c => c.id !== clientId);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    //const distPath = path.join(process.cwd(), 'dist');
    //app.use(express.static(distPath));
    //app.get('*', (req, res) => {
    //  res.sendFile(path.join(distPath, 'index.html'));
   // });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API check: http://localhost:${PORT}/api/sensor-data`);
  });
}


startServer();
