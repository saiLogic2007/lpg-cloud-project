# SafeGuard IoT: MQ-6 LPG Gas Sensing System Hardware Guide (JavaScript Version)

Welcome to the **SafeGuard IoT Hardware & Software Kit**! This directory contains complete physical codes and plain JavaScript files to build a physical gas sensor setup.

With these files, you can connect a real **ESP32 Microcontroller** and an **MQ-6 Liquefied Petroleum Gas (LPG) Semiconductor Sensor** to transmit real-time room ppm levels straight to your screen!

---

## 📂 Included Resources

1. 🔌 **`arduino_esp32_mq6.ino`**: The microcontroller source code written in C++ (Arduino sketch) to flash onto your ESP32 board.
2. 💻 **`local_server.js`**: A server written in **plain JavaScript (Node.js & Express)** that captures real physical signals and streams them dynamically.
3. 📊 **`index.html`**: A lightweight frontend built with **HTML5, Tailwind CSS, Chart.js, and Web Speech Synthesis**. It plots gas levels instantly and reads voice alarms aloud during leaks!

---

## 🛠️ Step 1: Physical Hardware Connections

Connect your physical **MQ-6 gas sensor** to your **ESP32 microcontroller** using standard jumper wires:

| MQ-6 Gas Sensor Pin | Connection | ESP32 board Pin |
|:---|:---:|:---|
| **VCC** (Power Input) | ➡️ | **5V Pin** (or **3V3**) |
| **GND** (Ground) | ➡️ | **GND Pin** |
| **A0** / **AD** (Analog Out) | ➡️ | **GPIO 34** (Analog ADC pin) |
| *D0* / *DO* (Digital Out) | ➡️ | *Not required for analog telemetry* |

> 💡 **Tip:** MQ-6 heating elements require stable power to yield accurate readings. Ensure your ESP32 is plugged into a dedicated phone USB adapter or Laptop port while calibrating.

---

## 💾 Step 2: Upload the Microcontroller Code

1. Download and open the **Arduino IDE** (or VS Code with PlatformIO).
2. Go to `Tools ➔ Board` and select your matches (e.g., **ESP32 Dev Module**).
3. Search and install the **ArduinoJson** library by Benoit Blanchon inside the library manager.
4. Copy the code inside `arduino_esp32_mq6.ino` and replace your sketch contents.
5. Configure your home Wi-Fi SSID and password:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
6. Paste your hosted application URL inside `serverEndpoint` (or use your local computer's IP address if running locally):
   ```cpp
   const char* serverEndpoint = "https://YOUR-APP-URL.run.app/api/sensor-data";
   ```
7. Click **Upload** ➔ open the **Serial Monitor at 115200 Baud** to verify successful connections and telemetry.

---

## 🚀 Step 3: Run the Local JavaScript Server

If you prefer to run the entire backend system locally on your personal computer in **plain JavaScript**:

1. Install **Node.js** from [nodejs.org](https://nodejs.org/).
2. Open your terminal inside this directory and install the lightweight server components:
   ```bash
   npm install express
   ```
3. Start your plain JavaScript backend node:
   ```bash
   node local_server.js
   ```
4. Done! The local terminal will print:
   ```txt
   ============================================================
   🚀 SafeGuard IoT Local Web Server listening on port 3000
   - Web dashboard:   http://localhost:3000
   - Ingress URL:     http://localhost:3000/api/sensor-data
   - Stream line:     http://localhost:3000/api/stream
   ============================================================
   ```

---

## 🎨 Step 4: Access your Web Dashboard

- Open **`index.html`** inside any browser tab (Double-click of the file is enough!).
- You should instantly see the **LPG Dial progress speed**, **real-time trend graph lines**, **emergency status indicator badges**, and **auditory alert synthesis warning prompts**!
- Use the **Hardware Simulator Slider** inside the page to check how the UI reacts when values cross into Safe, Warning, and Danger thresholds!
