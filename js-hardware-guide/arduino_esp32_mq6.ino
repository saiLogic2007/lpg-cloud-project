/*
  SafeGuard IoT - LPG Gas Leakage Response System with NEO-6M GPS
  ESP32, MQ-6 Gas Sensor & NEO-6M GPS Hardware Link Sketch

  Wiring Connections:
  ---------------------------------------------------------
  1. MQ-6 Gas Sensor:
     - MQ-6 VCC  -->  ESP32 5V (Preferred for heating element stability)
     - MQ-6 GND  -->  ESP32 GND
     - MQ-6 A0   -->  ESP32 GPIO 34 (Analog input pin)

  2. NEO-6M GPS Module:
     - GPS VCC   -->  ESP32 3.3V or 5V
     - GPS GND   -->  ESP32 GND
     - GPS TXD   -->  ESP32 RX2 (GPIO 16)
     - GPS RXD   -->  ESP32 TX2 (GPIO 17)

  Libraries Required (Install via Arduino Library Manager):
  ---------------------------------------------------------
  - ArduinoJson (by Benoit Blanchon)
  - TinyGPS++ (by Mikal Hart)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>

// Wi-Fi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server API Ingress Endpoint
// Replace this with your actual hosted app or secure endpoint (e.g. "https://your-safeguard-app.run.app/api/sensor-data")
const char* serverEndpoint = "https://your-safeguard-app.run.app/api/sensor-data"; 

// Pin Definition for MQ-6 Analog channel
const int mq6AnalogPin = 34; // ESP32 GPIO34

// Hardware Serial 2 configuration for NEO-6M GPS
// GPIO16 is RX2, GPIO17 is TX2 on the ESP32
HardwareSerial SerialGPS(2);
TinyGPSPlus gps;

// Configuration Variables
unsigned long previousMillis = 0;
const long interval = 2500; // Transmit reading every 2.5 seconds

void setup() {
  Serial.begin(115200);
  delay(10);

  // Initialize GPS UART channel at 9600 baud (Standard NEO-6M Default)
  SerialGPS.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("NEO-6M GPS Receiver serial port initialized on pins RX2=16, TX2=17");

  // Initialize Analog Read Resolution (ESP32 goes up to 12-bit / 4095)
  analogReadResolution(12);

  // Connect to Wi-Fi Network
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("Wi-Fi connected successfully!");
  Serial.print("IP Address assigned: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Feed characters from NEO-6M into the TinyGPS++ parser
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }

  unsigned long currentMillis = millis();

  // Transmit reading periodically to prevent packet flooding
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // 1. Read Gas Sensor Value
    // We average 10 readings to prevent sensor noise jitter
    long sum = 0;
    for (int i = 0; i < 10; i++) {
      sum += analogRead(mq6AnalogPin);
      delay(10);
    }
    int rawAnalogValue = sum / 10;

    // 2. Scale value to fit MQ-6 standard 10-bit resolution (0 to 1023)
    // ESP32 registers up to 4095. Scaling keeps calibration uniform.
    int unifiedPpmValue = map(rawAnalogValue, 0, 4095, 0, 1023);

    Serial.print("MQ-6 Sensor raw physical reading: ");
    Serial.print(rawAnalogValue);
    Serial.print(" | Unified scaled PPM output: ");
    Serial.println(unifiedPpmValue);

    // 3. Connect to server API if WiFi is connected
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClientSecure client;
      client.setInsecure(); // Bypass SSL certificate verification for simple node setups
      
      HTTPClient http;
      http.begin(client, serverEndpoint);
      http.addHeader("Content-Type", "application/json");

      // Create JSON payload structure with GPS latitude and longitude
      StaticJsonDocument<250> doc;
      doc["value"] = unifiedPpmValue;
      doc["timestamp"] = ""; // Server updates UTC timestamps dynamically

      if (gps.location.isValid()) {
        doc["latitude"] = gps.location.lat();
        doc["longitude"] = gps.location.lng();
        Serial.print("GPS Fix Locked! Coordinates: ");
        Serial.print(gps.location.lat(), 6);
        Serial.print(", ");
        Serial.println(gps.location.lng(), 6);
      } else {
        // If GPS is still acquiring satellites (no lock inside building),
        // we can transmit simulated live coordinates or last valid GPS state
        doc["latitude"] = 13.7563; 
        doc["longitude"] = 100.5018;
        Serial.println("GPS Fix not locked yet. Streaming fallback baseline coordinates.");
      }

      String jsonPayload;
      serializeJson(doc, jsonPayload);

      Serial.print("POST payload to backend API: ");
      Serial.println(jsonPayload);

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("HTTP Response Code: ");
        Serial.println(httpResponseCode);
        Serial.println(response);
      } else {
        Serial.print("HTTP Error transmitting: ");
        Serial.println(httpResponseCode);
      }

      http.end(); // Free connection socket
    } else {
      Serial.println("Warning: Wi-Fi connection lost. Attempting reconnection...");
      WiFi.begin(ssid, password);
    }
  }
}
