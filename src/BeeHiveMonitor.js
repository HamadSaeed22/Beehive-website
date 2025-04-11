import React, { useState, useEffect } from "react";
import { FaBug } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const apiUrl =
          timeSlot === 0
            ? "https://script.google.com/macros/s/AKfycbyCgm1SpH2zBdPysIHdSf3Ublnpx5Zw3xKp6kXdenGpFs9si5Ou3z1vcbl5XR3nWkJxZA/exec?all=true"
            : `https://script.google.com/macros/s/AKfycbyCgm1SpH2zBdPysIHdSf3Ublnpx5Zw3xKp6kXdenGpFs9si5Ou3z1vcbl5XR3nWkJxZA/exec?timeSlot=${timeSlot}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();

        const formattedData = data
          .map((entry) => ({
            time: new Date(entry.time).toLocaleTimeString(),
            avgTemperature: parseFloat(entry.avgTempDS) || 0,
            humidity: parseFloat(entry.humidityDHT1) || 0,
          }))
          .filter((entry) => entry.avgTemperature > 0 && entry.humidity > 0);

        setChartData(formattedData);

        if (data.length > 0) {
          const latest = data[data.length - 1];
          setLatestData({
            temperature: latest.avgTempDS || 35,
            humidity: latest.humidityDHT1 || 65,
            fanStatus: latest.fanStatus || "Active",
            flapStatus: latest.flapStatus || "Open",
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Error fetching data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeSlot, selectedBeehive]);

  const toggleControl = (control) => {
    setControls((prev) => ({ ...prev, [control]: !prev[control] }));
    toast.success(`${control.charAt(0).toUpperCase() + control.slice(1)} toggled successfully!`);
  };

  const handleTimeSlotChange = (slot) => {
    setTimeSlot(slot);
  };

  const handleBeehiveChange = (event) => {
    setSelectedBeehive(event.target.value);
    toast.info(`Switched to ${event.target.value}`);
  };

  const statusTooltips = {
    active: `Hive is currently active. Last updated: ${new Date().toLocaleTimeString()}`,
    fan: `Fan is ${latestData.fanStatus}. Current setting: ${controls.fan ? "ON" : "OFF"}`,
    temperature: `Current temperature: ${latestData.temperature}°C. Optimal range: 32-36°C`,
    flap: `Flap is ${latestData.flapStatus}. Current setting: ${controls.flap ? "OPEN" : "CLOSED"}`,
  };

  return (
    <div className={`${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col`}>
      <ToastContainer />
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
              <div
                className="absolute top-4 left-4 bg-green-200 text-green-700 px-3 py-1 rounded-lg text-sm cursor-pointer hover:bg-green-300 transition"
                onMouseEnter={() => setHoveredStatus("active")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                Active
              </div>
              <div
                className="absolute top-20 left-20 bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm cursor-pointer hover:bg-gray-300 transition"
                onMouseEnter={() => setHoveredStatus("fan")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                Fan Status
              </div>
              <div
                className="absolute bottom-4 left-4 bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm cursor-pointer hover:bg-gray-300 transition"
                onMouseEnter={() => setHoveredStatus("temperature")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                Temperature: {latestData.temperature}°C
              </div>
              <div
                className="absolute top-4 right-4 bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm cursor-pointer hover:bg-gray-300 transition"
                onMouseEnter={() => setHoveredStatus("flap")}
                onMouseLeave={() => setHoveredStatus(null)}
              >
                Flap Status
              </div>
              {hoveredStatus && (
                <div
                  className={`absolute z-10 p-3 rounded-lg shadow-lg max-w-xs ${
                    isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
                  }`}
                  style={{
                    top: hoveredStatus === "active" ? "3rem" : hoveredStatus === "fan" ? "5rem" : "auto",
                    bottom: hoveredStatus === "temperature" ? "3rem" : "auto",
                    left: hoveredStatus === "active" ? "1rem" : hoveredStatus === "fan" ? "5rem" : "auto",
                    right: hoveredStatus === "flap" ? "1rem" : "auto",
                  }}
                >
                  {statusTooltips[hoveredStatus]}
                </div>
              )}
            </div>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Active
              </li>
              <li>Temperature: {latestData.temperature}°C</li>
              <li>Humidity: {latestData.humidity}%</li>
              <li className="flex items-center">
                <span
                  className={`w-3 h-3 rounded-full mr-2 ${
                    latestData.fanStatus === "Active" ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
                Ventilation: {latestData.fanStatus}
              </li>
              <li>Flap Status: {latestData.flapStatus}</li>
            </ul>
          </div>

          <div className="col-span-2 space-y-4">
            <div className={`${isDarkMode ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-md`}>
              <h2 className="text-xl font-semibold mb-4">Environmental Data</h2>
              <div className="flex space-x-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 60 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(60)}
                >
                  1h
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 360 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(360)}
                >
                  6h
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 720 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(720)}
                >
                  12h
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    timeSlot === 1440 ? "bg-yellow-500 text-white" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  }`}
                  onClick={() => handleTimeSlotChange(1440)}
                >
                  24h
                </button>
              </div>
              {loading ? (
                <div className="text-center text-lg">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgTemperature" stroke="#ff7300" dot={false} />
                    <Line type="monotone" dataKey="humidity" stroke="#0088fe" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Manual Controls */}
            <section className={`${isDarkMode ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-md`}>
              <h2 className="text-xl font-semibold mb-4">Manual Controls</h2>
              <div className="flex space-x-4">
                <button
                  className={`px-6 py-3 rounded-lg text-lg ${
                    controls.fan ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => toggleControl("fan")}
                >
                  Ventilation Fan
                </button>
                <button
                  className={`px-6 py-3 rounded-lg text-lg ${
                    controls.mist ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => toggleControl("mist")}
                >
                  Mist System
                </button>
                <button
                  className={`px-6 py-3 rounded-lg text-lg ${
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