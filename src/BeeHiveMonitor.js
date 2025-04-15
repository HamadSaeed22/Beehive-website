import React, { useState, useEffect } from "react";
import { FaBug } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const BeeHiveMonitor = () => {
  const [chartData, setChartData] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => JSON.parse(localStorage.getItem("isDarkMode")) || false);
  const [timeSlot, setTimeSlot] = useState(() => Number(localStorage.getItem("timeSlot")) || 6);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState({
    fan: true,
    mist: false,
    flap: true,
  });
  const [selectedBeehive, setSelectedBeehive] = useState("Beehive 1");
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [latestData, setLatestData] = useState({
    temperature: 35,
    humidity: 65,
    fanStatus: "Active",
    flapStatus: "Open",
    tempDHT1: 0,
    tempDHT2: 0,
    tempDHT3: 0,
  });
  const [selectedLines, setSelectedLines] = useState(() => {
    const savedLines = JSON.parse(localStorage.getItem("selectedLines"));
    return savedLines || {
      avgTemperature: true,
      humidity: true,
      tempDHT1: true,
      tempDHT2: true,
      tempDHT3: true,
    };
  });

  const calculateFlapStatus = (temperature) => {
    if (temperature < 33) return "Closed (180°)";
    if (temperature === 33) return "25% Open (135°)";
    if (temperature === 34) return "50% Open (90°)";
    if (temperature === 35) return "75% Open (45°)";
    return "100% Open (0°)";
  };

  const calculateTimeRange = (timeSlot) => {
    const now = new Date();
    switch (timeSlot) {
      case 6:
        return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(); // 6 hours ago
      case 12:
        return new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago
      case 168:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last week
      default:
        return null; // All data
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startTime = calculateTimeRange(timeSlot);
        const apiUrl = startTime
          ? `https://script.google.com/macros/s/AKfycbyCgm1SpH2zBdPysIHdSf3Ublnpx5Zw3xKp6kXdenGpFs9si5Ou3z1vcbl5XR3nWkJxZA/exec?startTime=${startTime}`
          : "https://script.google.com/macros/s/AKfycbyCgm1SpH2zBdPysIHdSf3Ublnpx5Zw3xKp6kXdenGpFs9si5Ou3z1vcbl5XR3nWkJxZA/exec?all=true";

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();

        const formattedData = data
          .map((entry) => ({
            time: new Date(entry.time).toLocaleTimeString(),
            avgTemperature: parseFloat(entry.avgTempDS) || 0,
            humidity: parseFloat(entry.humidityDHT1) || 0,
            tempDHT1: parseFloat(entry.tempDHT1) || 0,
            tempDHT2: parseFloat(entry.tempDHT2) || 0,
            tempDHT3: parseFloat(entry.tempDHT3) || 0,
            flapStatus: calculateFlapStatus(parseFloat(entry.avgTempDS) || 0),
            relayFan1: entry.relayFan1 === "on" ? "ON" : "OFF", // Map "on" to "ON" and "off" to "OFF"
            relayFan2: entry.relayFan2 === "on" ? "ON" : "OFF", // Map "on" to "ON" and "off" to "OFF"
          }))
          .filter((entry) => entry.avgTemperature > 0 && entry.humidity > 0);

        setChartData(formattedData);

        if (formattedData.length > 0) {
          const latest = formattedData[formattedData.length - 1];
          setLatestData({
            temperature: latest.avgTemperature,
            humidity: latest.humidity,
            fanStatus: latest.fanStatus || "Active",
            flapStatus: latest.flapStatus || "Open",
            tempDHT1: latest.tempDHT1,
            tempDHT2: latest.tempDHT2,
            tempDHT3: latest.tempDHT3,
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeSlot, selectedBeehive]);

  const toggleControl = (control) => {
    setControls((prev) => ({ ...prev, [control]: !prev[control] }));
  };

  const handleTimeSlotChange = (slot) => {
    setTimeSlot(slot);
  };

  const handleBeehiveChange = (event) => {
    setSelectedBeehive(event.target.value);
  };

  const toggleLine = (line) => {
    setSelectedLines((prev) => {
      const updatedLines = { ...prev, [line]: !prev[line] };
      localStorage.setItem("selectedLines", JSON.stringify(updatedLines)); // Save to localStorage
      return updatedLines;
    });
  };

  return (
    <div className={`${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col`}>
      {/* Header */}
      <header className="flex justify-between items-center p-6 shadow-md">
        <h1 className="text-2xl font-bold flex items-center">
          <FaBug className={`${isDarkMode ? "text-yellow-300" : "text-yellow-500"} mr-3`} /> BeeHive Monitor
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedBeehive}
            onChange={handleBeehiveChange}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900"
          >
            <option value="Beehive 1">Beehive 1</option>
            <option value="Beehive 2">Beehive 2</option>
          </select>
          <button
            aria-label="Toggle Dark Mode"
            className={`transition duration-300 ${isDarkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-900"} px-4 py-2 rounded-lg`}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* Beehive Status */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`${isDarkMode ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-md`}>
            <h2 className="text-xl font-semibold mb-4">{selectedBeehive} Status</h2>
            <div className="relative">
              <img
                src={selectedBeehive === "Beehive 1" ? "/beehive1-diagram.png" : "/beehive2-diagram.png"}
                alt={`${selectedBeehive} Diagram`}
                className="w-full"
              />
              {/* Smoothed and Aligned Red Dots */}
              <div
                className={`absolute top-[50%] left-[16%] w-4 h-4 bg-red-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("tempDHT1")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "tempDHT1" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    TempDHT1: {latestData.tempDHT1 || "N/A"}°C
                  </div>
                )}
              </div>
              <div
                className={`absolute top-[54%] left-[16%] w-4 h-4 bg-red-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("tempDHT2")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "tempDHT2" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    TempDHT2: {latestData.tempDHT2 || "N/A"}°C
                  </div>
                )}
              </div>
              <div
                className={`absolute top-[59%] left-[16%] w-4 h-4 bg-red-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("tempDHT3")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "tempDHT3" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    TempDHT3: {latestData.tempDHT3 || "N/A"}°C
                  </div>
                )}
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Active
              </li>
              <li>Temperature: {latestData.temperature}°C</li>
              <li>Humidity: {latestData.humidity}%</li>
            </ul>
          </div>

          <div className="col-span-2 space-y-4">
            <div className={`${isDarkMode ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-md`}>
              <h2 className="text-xl font-semibold mb-4">Environmental Data</h2>
              <div className="flex flex-wrap space-x-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 6 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(6)}
                >
                  6 Hours
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 12 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(12)}
                >
                  12 Hours
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 168 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(168)}
                >
                  Past Week
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === null ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(null)}
                >
                  All Data
                </button>
              </div>
              <div className="flex flex-wrap space-x-4 mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedLines.avgTemperature}
                    onChange={() => toggleLine("avgTemperature")}
                  />
                  <span>Avg Temperature</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedLines.humidity}
                    onChange={() => toggleLine("humidity")}
                  />
                  <span>Humidity</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedLines.tempDHT1}
                    onChange={() => toggleLine("tempDHT1")}
                  />
                  <span>TempDHT1</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedLines.tempDHT2}
                    onChange={() => toggleLine("tempDHT2")}
                  />
                  <span>TempDHT2</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedLines.tempDHT3}
                    onChange={() => toggleLine("tempDHT3")}
                  />
                  <span>TempDHT3</span>
                </label>
              </div>
              {loading ? (
                <div className="text-center text-lg">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {selectedLines.avgTemperature && (
                        <Line type="monotone" dataKey="avgTemperature" stroke="#ff7300" dot={false} name="Avg Temperature" />
                      )}
                      {selectedLines.humidity && (
                        <Line type="monotone" dataKey="humidity" stroke="#0088fe" dot={false} name="Humidity" />
                      )}
                      {selectedLines.tempDHT1 && (
                        <Line type="monotone" dataKey="tempDHT1" stroke="#82ca9d" dot={false} name="TempDHT1" />
                      )}
                      {selectedLines.tempDHT2 && (
                        <Line type="monotone" dataKey="tempDHT2" stroke="#8884d8" dot={false} name="TempDHT2" />
                      )}
                      {selectedLines.tempDHT3 && (
                        <Line type="monotone" dataKey="tempDHT3" stroke="#d88484" dot={false} name="TempDHT3" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>

                  {/* New Flap Status Graph */}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis dataKey="flapStatus" type="category" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="flapStatus" stroke="#ff0000" dot={false} name="Flap Status" />
                      <Line type="monotone" dataKey="relayFan1" stroke="#00ff00" dot={false} name="Relay Fan 1" />
                      <Line type="monotone" dataKey="relayFan2" stroke="#0000ff" dot={false} name="Relay Fan 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Manual Controls */}
            <section
              className={`${isDarkMode ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-md ${
                selectedBeehive === "Beehive 2" ? "hidden" : ""
              }`}
            >
              <h2 className="text-xl font-semibold mb-4">Manual Controls</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  title="Toggle Fan Relay 1"
                  className={`w-full h-12 rounded-lg text-lg flex items-center justify-center ${
                    controls.fanRelay1 ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => toggleControl("fanRelay1")}
                >
                  Fan Relay 1
                </button>
                <button
                  title="Toggle Fan Relay 2"
                  className={`w-full h-12 rounded-lg text-lg flex items-center justify-center ${
                    controls.fanRelay2 ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => toggleControl("fanRelay2")}
                >
                  Fan Relay 2
                </button>
                <button
                  title="Toggle Mist System"
                  className={`w-full h-12 rounded-lg text-lg flex items-center justify-center ${
                    controls.mist ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => toggleControl("mist")}
                >
                  Mist System
                </button>
                <button
                  title="Toggle Entry Flap"
                  className={`w-full h-12 rounded-lg text-lg flex items-center justify-center ${
                    controls.flap ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => toggleControl("flap")}
                >
                  Entry Flap
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BeeHiveMonitor;