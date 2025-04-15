import React, { useState, useEffect } from 'react';
import { FaBug, FaSync } from 'react-icons/fa';

const BeeHiveMonitor = () => {
  const [sensorData, setSensorData] = useState({
    time: '--',
    tempDHT1: '--',
    humidityDHT1: '--',
    tempDHT2: '--',
    humidityDHT2: '--',
    tempDHT3: '--',
    humidityDHT3: '--',
    tempDS1: '--',
    tempDS2: '--',
    avgTempDS: '--',
    servoPosition: '--'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState({
    id: null,
    text: '',
    position: { x: 0, y: 0 }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("https://script.google.com/macros/s/AKfycbyqkcItNb--ZhoUQ53-YUoa7pJ6Y2feAMQXCJfumqffB06sriTI5-sKKOa5xe3aiwCRDg/exec");
      const data = await response.json();
      
      if (data.error) {
        throw new Error("No data available");
      }

      setSensorData({
        time: data.time || '--',
        tempDHT1: data.tempDHT1 || '--',
        humidityDHT1: data.humidityDHT1 || '--',
        tempDHT2: data.tempDHT2 || '--',
        humidityDHT2: data.humidityDHT2 || '--',
        tempDHT3: data.tempDHT3 || '--',
        humidityDHT3: data.humidityDHT3 || '--',
        tempDS1: data.tempDS1 || '--',
        tempDS2: data.tempDS2 || '--',
        avgTempDS: data.avgTempDS || '--',
        servoPosition: data.servoPosition || '--'
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showTooltip = (event, id, text) => {
    setActiveTooltip({
      id,
      text,
      position: { x: event.pageX, y: event.pageY }
    });
  };

  const hideTooltip = () => {
    setActiveTooltip(prev => ({ ...prev, id: null }));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const sensorMarkers = [
    { id: 'sensor1', top: 265, left: 240, tooltip: `Temp: ${sensorData.tempDHT1}°C, Humidity: ${sensorData.humidityDHT1}%` },
    { id: 'sensor2', top: 370, left: 283, tooltip: `Temp: ${sensorData.tempDHT2}°C, Humidity: ${sensorData.humidityDHT2}%` },
    { id: 'sensor3', top: 242, left: 210, tooltip: `Temp: ${sensorData.tempDHT3}°C, Humidity: ${sensorData.humidityDHT3}%` },
    { id: 'sensor4', top: 310, left: 90, tooltip: `Temp: ${sensorData.tempDS1}°C` },
    { id: 'sensor5', top: 330, left: 90, tooltip: `Temp: ${sensorData.tempDS2}°C` }
  ];

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold flex items-center">
            <FaBug className="text-xl mr-2" /> BeeHive Monitor
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Beehive Status Card */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Beehive Status</h2>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded">Active</span>
            </div>
            <div className="relative">
              <img src="image.png" alt="Beehive Diagram" className="w-full mb-4" />
              {sensorMarkers.map(marker => (
                <div
                  key={marker.id}
                  className="absolute w-3 h-3 bg-red-500 bg-opacity-50 rounded-full cursor-pointer"
                  style={{ top: `${marker.top}px`, left: `${marker.left}px` }}
                  onMouseOver={(e) => showTooltip(e, marker.id, marker.tooltip)}
                  onMouseOut={hideTooltip}
                />
              ))}
              {activeTooltip.id && (
                <div
                  className="absolute bg-white p-2 border border-gray-300 rounded shadow-lg z-10"
                  style={{ left: `${activeTooltip.position.x}px`, top: `${activeTooltip.position.y}px` }}
                >
                  {activeTooltip.text}
                </div>
              )}
            </div>
          </div>

          {/* Sensor Readings Card */}
          <div className="col-span-2 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Sensor Readings</h2>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <SensorReading label="Time" value={sensorData.time} />
                <SensorReading label="Temp DHT1" value={`${sensorData.tempDHT1}°C`} />
                <SensorReading label="Humidity DHT1" value={`${sensorData.humidityDHT1}%`} />
                <SensorReading label="Temp DHT2" value={`${sensorData.tempDHT2}°C`} />
                <SensorReading label="Humidity DHT2" value={`${sensorData.humidityDHT2}%`} />
                <SensorReading label="Temp DHT3" value={`${sensorData.tempDHT3}°C`} />
                <SensorReading label="Humidity DHT3" value={`${sensorData.humidityDHT3}%`} />
                <SensorReading label="Temp DS1" value={`${sensorData.tempDS1}°C`} />
                <SensorReading label="Temp DS2" value={`${sensorData.tempDS2}°C`} />
                <SensorReading label="Avg Temp DS" value={`${sensorData.avgTempDS}°C`} />
                <SensorReading label="Servo Position" value={sensorData.servoPosition} />
              </div>
            )}
          </div>

          {/* Environmental Data Card */}
          <div className="col-span-3 bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Environmental Data</h2>
              <button 
                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded flex items-center"
                onClick={fetchData}
                disabled={loading}
              >
                <FaSync className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="bg-gradient-to-r from-yellow-100 via-blue-100 to-gray-100 h-40 rounded flex items-center justify-center text-xl">
              {loading ? 'Loading data...' : error ? error : 'Data visualization coming soon...'}
            </div>
          </div>

          {/* Manual Controls Card */}
          <div className="col-span-3 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Manual Controls</h2>
            <div className="flex space-x-4">
              <ControlButton label="Fan" active={false} />
              <ControlButton label="Motor" active={false} />
              <ControlButton label="Servo" active={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable components
const SensorReading = ({ label, value }) => (
  <div className="bg-gray-100 p-3 rounded">
    {label}: <span className="font-medium">{value}</span>
  </div>
);

const ControlButton = ({ label, active }) => (
  <button className={`${active ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-800'} px-3 py-1 rounded`}>
    {label}
  </button>
);

export default BeeHiveMonitor;