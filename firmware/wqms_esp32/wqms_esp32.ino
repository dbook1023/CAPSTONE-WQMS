#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DisplayManager.h"
#include "PHSensor.h"
#include "TDSSensor.h"
#include "TemperatureSensor.h"
#include "TurbiditySensor.h"

// ================= WIFI CREDENTIALS =================
#define WIFI_SSID "Infinix ZERO 30 5G"
#define WIFI_PASSWORD "DBookz1023"
#define FLASK_SERVER_URL "http://10.151.31.14:5000/api/v1/sensors/update"

// ================= PINS =================
constexpr uint8_t TURBIDITY_PIN = 32;
constexpr uint8_t TDS_PIN = 33;
constexpr uint8_t TEMP_PIN = 4;
constexpr uint8_t PH_PIN = 34;

// ================= CALIBRATION =================
constexpr int CLEAN_WATER = 3537;
constexpr int DIRTY_WATER = 2500;
constexpr float PH_CALIBRATION = 21.34f;

// ================= COMPONENTS =================
TemperatureSensor tempSensor(TEMP_PIN);
TurbiditySensor turbiditySensor(TURBIDITY_PIN, CLEAN_WATER, DIRTY_WATER);
TDSSensor tdsSensor(TDS_PIN);
PHSensor phSensor(PH_PIN, PH_CALIBRATION);
DisplayManager display(0x27, 16, 2);

// ================= GLOBAL VARIABLES =================
String deviceSerialNumber = "";
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 10000; // Send data every 10 seconds
bool wifiConnected = false;

// ================= WIFI FUNCTIONS =================
void initWiFi() {
  Serial.println("\n[WIFI] Initializing WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n[WIFI] Connected!");
    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n[WIFI] Connection failed");
  }
}

void getDeviceSerialNumber() {
  uint64_t chipid = ESP.getEfuseMac();
  uint16_t chip = (uint16_t)(chipid >> 32);
  char serialBuffer[13];
  snprintf(serialBuffer, 13, "%04X%08X", chip, (uint32_t)chipid);
  deviceSerialNumber = String(serialBuffer);
  Serial.print("[DEVICE] Serial Number: ");
  Serial.println(deviceSerialNumber);
}

bool sendDataToServer(float temperature, float ntu, float tds, float ph) {
  if (!wifiConnected) {
    Serial.println("[SERVER] WiFi not connected, skipping upload");
    return false;
  }

  HTTPClient http;
  
  StaticJsonDocument<256> jsonDoc;
  jsonDoc["device_id"] = deviceSerialNumber;
  jsonDoc["temperature"] = temperature;
  jsonDoc["ntu"] = ntu;
  jsonDoc["turbidity"] = ntu;
  jsonDoc["tds"] = tds;
  jsonDoc["ph"] = ph;
  jsonDoc["timestamp"] = millis();

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  http.begin(FLASK_SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonString);

  Serial.print("[SERVER] Response Code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.println("[SERVER] Data sent successfully");
    http.end();
    return true;
  } else {
    Serial.print("[SERVER] Error: ");
    Serial.println(http.errorToString(httpResponseCode));
    Serial.print("[SERVER] Sent JSON: ");
    Serial.println(jsonString);
    http.end();
    return false;
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n[STARTUP] 4-Parameter Water Quality Monitor");
  
  analogSetPinAttenuation(TURBIDITY_PIN, ADC_11db);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);
  analogSetPinAttenuation(PH_PIN, ADC_11db);

  analogReadResolution(12);

  Wire.begin(21, 22);
  display.begin();
  tempSensor.begin();

  display.showSplash("Water System", 1500);
  
  // Get device serial number
  getDeviceSerialNumber();
  
  // Initialize WiFi
  display.showSplash("WiFi Connecting...", 500);
  initWiFi();

  // Show device info on startup
  display.showDeviceInfo(deviceSerialNumber);
  delay(2000);
}

// ================= LOOP =================
void loop() {
  // ===== READ SENSORS =====
  float temperature = tempSensor.readC();
  float ntu = turbiditySensor.readNtu();
  float tdsValue = tdsSensor.readTds(temperature);
  float phValue = phSensor.readPh();

  // ===== SERIAL DEBUG =====
  Serial.print("[SENSORS] Temp: ");
  Serial.print(temperature);
  Serial.print("C | NTU: ");
  Serial.print(ntu, 2);
  Serial.print(" | TDS: ");
  Serial.print(tdsValue, 0);
  Serial.print(" ppm | pH: ");
  Serial.println(phValue, 2);

  // ===== LCD DISPLAY =====
  display.showReadings(temperature, ntu, tdsValue, phValue);

  // ===== SEND TO SERVER PERIODICALLY =====
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    sendDataToServer(temperature, ntu, tdsValue, phValue);
  }

  delay(1000);
}
