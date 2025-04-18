import React, { useState, useEffect } from "react";
import { FaBug } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const BeeHiveMonitor = () => {
  const [chartData, setChartData] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => JSON.parse(localStorage.getItem("isDarkMode")) || false);
  const [timeSlot, setTimeSlot] = useState(() => {
    const savedTimeSlot = localStorage.getItem("timeSlot");
    return savedTimeSlot !== null ? Number(savedTimeSlot) : 6; // Default to 6 hours if no saved value
  });
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState(() => {
    const savedControls = JSON.parse(localStorage.getItem("controls"));
    return savedControls || {
      fan: true,
      mist: false,
      flap: true,
      fanRelay1: false,
      fanRelay2: false,
    };
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
        return now.getTime() - 6 * 60 * 60 * 1000; // Timestamp for 6 hours ago
      case 12:
        return now.getTime() - 12 * 60 * 60 * 1000; // Timestamp for 12 hours ago
      case 168:
        return now.getTime() - 7 * 24 * 60 * 60 * 1000; // Timestamp for the past week
      default:
        return null; // No filter for all data
    }
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true); // Only show loading screen if explicitly requested
    try {
      const apiUrl =
        selectedBeehive === "Beehive 1"
          ? `https://script.google.com/macros/s/AKfycbyCgm1SpH2zBdPysIHdSf3Ublnpx5Zw3xKp6kXdenGpFs9si5Ou3z1vcbl5XR3nWkJxZA/exec`
          : `https://script.google.com/macros/s/AKfycbz_xEr0EHjHpV46EqARystFcak3hWPF4Xk5iVJqq4RuDnPCIwHjrJkq31qB2e-iPpcW3g/exec`; // Beehive 2 API URL

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();

      // Remove the filtering by `entry.beehive` if the field does not exist
      const formattedData = data.map(entry => {
        let entryDate;
        if (entry.time.includes("-")) {
          // Format: "YYYY-MM-DD HH:mm:ss"
          entryDate = new Date(entry.time.replace(" ", "T"));
        } else {
          // Format: "HH:mm:ss" (assume today's date)
          const today = new Date().toISOString().split("T")[0];
          entryDate = new Date(`${today}T${entry.time}`);
        }

        const formattedTime = `${entryDate.getDate().toString().padStart(2, "0")}, ${entryDate.getHours().toString().padStart(2, "0")}:${entryDate.getMinutes().toString().padStart(2, "0")}:${entryDate.getSeconds().toString().padStart(2, "0")}`;

        return {
          ...entry,
          originalTime: entry.time, // Preserve the original timestamp for filtering
          time: formattedTime, // Replace the time field with the day, hour:min:sec format
          avgTemperature: parseFloat(entry.avgTempDS) || 0,
          humidity: parseFloat(entry.humidityDHT1) || 0,
          tempDHT1: parseFloat(entry.tempDHT1) || 0,
          tempDHT2: parseFloat(entry.tempDHT2) || 0,
          tempDHT3: parseFloat(entry.tempDHT3) || 0,
          sensor4: parseFloat(entry["DS18B20 Sensor 4 (°C)"]) || 0, // Map Sensor 4
          sensor5: parseFloat(entry["DS18B20 Sensor 5 (°C)"]) || 0, // Map Sensor 5
          sensor6: parseFloat(entry["DS18B20 Sensor 6 (°C)"]) || 0, // Map Sensor 6
          flapStatus: calculateFlapStatus(parseFloat(entry.avgTempDS) || 0),
          flapAngle: parseFloat(entry.flapAngle) || 0, // Map flap status to angles
          relayFan1: entry.relayFan1 === "on" ? 90 : 0, // Map ON to 90° and OFF to 0°
          relayFan2: entry.relayFan2 === "on" ? 90 : 0, // Map ON to 90° and OFF to 0°
          entryTimestamp: entryDate.getTime(), // Add timestamp for filtering
          // Include all fields from the script, even if unused
          fanStatus: entry.fanStatus || "Inactive",
          mistStatus: entry.mistStatus || "Inactive",
          additionalField1: entry.additionalField1 || null,
          additionalField2: entry.additionalField2 || null,
        };
      });

      // Determine the most recent timestamp
      const mostRecentTimestamp = Math.max(...formattedData.map(entry => entry.entryTimestamp));

      // Filter data based on the selected time slot
      const timeFilteredData = formattedData.filter(entry => {
        if (timeSlot === 6) {
          // Past 6 hours
          return entry.entryTimestamp >= mostRecentTimestamp - 6 * 60 * 60 * 1000;
        } else if (timeSlot === 12) {
          // Past 12 hours
          return entry.entryTimestamp >= mostRecentTimestamp - 12 * 60 * 60 * 1000;
        } else if (timeSlot === 168) {
          // Past week (7 days)
          return entry.entryTimestamp >= mostRecentTimestamp - 7 * 24 * 60 * 60 * 1000;
        }
        return true; // Show all data for "All Data"
      });

      // Limit the number of data points displayed in the graph
      const maxDataPoints = 100; // Adjust this value as needed
      const limitedData = timeFilteredData.slice(-maxDataPoints);

      setChartData(limitedData);

      if (limitedData.length > 0) {
        const latest = limitedData[limitedData.length - 1];
        setLatestData({
          temperature: latest.avgTemperature,
          humidity: latest.humidity,
          fanStatus: latest.fanStatus || "Active",
          flapStatus: latest.flapStatus || "Open",
          tempDHT1: latest.tempDHT1,
          tempDHT2: latest.tempDHT2,
          tempDHT3: latest.tempDHT3,
          sensor4: latest.sensor4, // Add Sensor 4
          sensor5: latest.sensor5, // Add Sensor 5
          sensor6: latest.sensor6, // Add Sensor 6
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      if (showLoading) setLoading(false); // Only hide loading screen if it was shown
    }
  };

  const filterDataByTime = (data, day, startTime, endTime) => {
    return data.filter(entry => {
      const [entryDay, entryTime] = entry.time.split(", ");
      const [entryHour, entryMinute, entrySecond] = entryTime.split(":").map(Number);
  
      if (entryDay !== day) return false;
  
      const entryTotalSeconds = entryHour * 3600 + entryMinute * 60 + entrySecond;
      const [startHour, startMinute, startSecond] = startTime.split(":").map(Number);
      const startTotalSeconds = startHour * 3600 + startMinute * 60 + startSecond;
  
      const [endHour, endMinute, endSecond] = endTime.split(":").map(Number);
      const endTotalSeconds = endHour * 3600 + endMinute * 60 + endSecond;
  
      return entryTotalSeconds >= startTotalSeconds && entryTotalSeconds <= endTotalSeconds;
    });
  };
  
  // Example usage inside the component
  useEffect(() => {
    if (chartData.length > 0) {
      const filteredData = filterDataByTime(chartData, "16", "11:30:00", "12:00:00");
      console.log("Filtered Data:", filteredData);
    }
  }, [chartData]);

  useEffect(() => {
    fetchData(); // Initial fetch with loading screen
  }, [timeSlot, selectedBeehive]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchData(false); // Periodic fetch without loading screen
    }, 5000); // Fetch every 5 seconds instead of 1 second to reduce API calls
  
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [timeSlot, selectedBeehive]);

  const toggleControl = (control) => {
    setControls((prev) => {
      const updatedControls = { ...prev, [control]: !prev[control] };
      localStorage.setItem("controls", JSON.stringify(updatedControls)); // Save to localStorage
      return updatedControls;
    });
  };

  useEffect(() => {
    const savedControls = JSON.parse(localStorage.getItem("controls"));
    if (savedControls) {
      setControls(savedControls); // Restore controls state on component mount
    }
  }, []);

  const handleTimeSlotChange = (slot) => {
    if (timeSlot !== slot) {
      setTimeSlot(slot);
      localStorage.setItem("timeSlot", slot); // Save the selected time slot as a number
      fetchData(); // Trigger data fetch after time slot change
    }
  };

  useEffect(() => {
    const savedTimeSlot = localStorage.getItem("timeSlot");
    if (savedTimeSlot !== null) {
      setTimeSlot(Number(savedTimeSlot)); // Restore time slot state on component mount
    }
  }, []);

  const handleBeehiveChange = (event) => {
    const newBeehive = event.target.value;
    if (newBeehive !== selectedBeehive) {
      setSelectedBeehive(newBeehive);

      // Reset all state variables to ensure independence between beehives
      setChartData([]); // Clear chart data
      setLatestData({
        temperature: 0,
        humidity: 0,
        fanStatus: "Inactive",
        flapStatus: "Closed",
        tempDHT1: 0,
        tempDHT2: 0,
        tempDHT3: 0,
        sensor4: 0,
        sensor5: 0,
        sensor6: 0,
      }); // Reset latest data
      setControls({
        fan: true,
        mist: false,
        flap: true,
        fanRelay1: false,
        fanRelay2: false,
      }); // Reset controls
      setSelectedLines({
        avgTemperature: true,
        humidity: true,
        tempDHT1: true,
        tempDHT2: true,
        tempDHT3: true,
      }); // Reset selected lines
      setTimeSlot(6); // Reset time slot to default (6 hours)
      localStorage.removeItem("controls"); // Clear saved controls
      localStorage.removeItem("timeSlot"); // Clear saved time slot
      localStorage.removeItem("selectedLines"); // Clear saved selected lines
    }
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
              {/* Temperature Indicator */}
              <div
                className={`absolute top-[65%] left-[25%] w-6 h-6 bg-yellow-500 rounded-full cursor-pointer ${
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
              {/* Humidity Indicator */}
              <div
                className={`absolute top-[80%] left-[70%] w-6 h-6 bg-blue-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("humidity")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "humidity" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    Humidity: {latestData.humidity || "N/A"}%
                  </div>
                )}
              </div>
              {/* Additional Indicators for TempDHT2 and TempDHT3 */}
              <div
                className={`absolute top-[71%] left-[25%] w-6 h-6 bg-yellow-500 rounded-full cursor-pointer ${
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
                className={`absolute top-[77%] left-[25%] w-6 h-6 bg-yellow-500 rounded-full cursor-pointer ${
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
              {/* New Red Dots for DS18B20 Sensors */}
              <div
                className={`absolute top-[50%] left-[85%] w-6 h-6 bg-red-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("sensor4")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "sensor4" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    Sensor 4: {latestData.sensor4 || "N/A"}°C
                  </div>
                )}
              </div>
              <div
                className={`absolute top-[55%] left-[85%] w-6 h-6 bg-red-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("sensor5")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "sensor5" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    Sensor 5: {latestData.sensor5 || "N/A"}°C
                  </div>
                )}
              </div>
              <div
                className={`absolute top-[60%] left-[85%] w-6 h-6 bg-red-500 rounded-full cursor-pointer ${
                  selectedBeehive === "Beehive 2" ? "hidden" : ""
                }`}
                onMouseEnter={() => setHoveredStatus("sensor6")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {hoveredStatus === "sensor6" && (
                  <div
                    className={`absolute z-10 p-2 rounded-lg shadow-lg ${
                      isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                    }`}
                    style={{ top: "-2rem", left: "1rem" }}
                  >
                    Sensor 6: {latestData.sensor6 || "N/A"}°C
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
                  7 Days
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
                    </LineChart>
                  </ResponsiveContainer>

                  {/* New Fan Relays Graph */}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis
                        tickFormatter={(value) => (value === 90 ? "ON" : "OFF")}
                        domain={[0, 90]}
                        ticks={[0, 90]} // Ensure only one "ON" and one "OFF"
                      />
                      <Tooltip formatter={(value) => (value === 90 ? "ON" : "OFF")} />
                      <Legend />
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