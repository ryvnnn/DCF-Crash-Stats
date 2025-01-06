'use client';

import { useState, useEffect } from 'react';

interface CrashData {
  crashValue: number;
  timestamp: number;
}

const Page = () => {
  const [crashData, setCrashData] = useState<CrashData[]>([]);
  const [percentage, setPercentage] = useState<number>(120); // Input value for percentage
  const [suggestedPercentage, setSuggestedPercentage] = useState<number>(0); // Calculated suggested percentage
  const [averagePercentage, setAveragePercentage] = useState<number>(83); // Placeholder for average percentage
  const [last1000, setLast1000] = useState<CrashData[]>([]);
  const [last1, setLast1] = useState<CrashData[]>([]);

  useEffect(() => {
    // Simulating crash data fetch or use your actual data fetching logic
    const fetchedData: CrashData[] = [
      { crashValue: 110, timestamp: Date.now() - 1000 },
      { crashValue: 120, timestamp: Date.now() - 2000 },
      { crashValue: 100, timestamp: Date.now() - 3000 },
      { crashValue: 90, timestamp: Date.now() - 4000 },
      { crashValue: 115, timestamp: Date.now() - 5000 },
    ];
    
    setCrashData(fetchedData);
    setLast1000(fetchedData.slice(0, 10));  // Simulating last 1000% hit
    setLast1(fetchedData.slice(0, 5)); // Simulating last 1% hit
  }, []);

  const handlePercentageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPercentage = parseFloat(event.target.value);
    setPercentage(newPercentage);
    calculateSuggestedPercentage(newPercentage);
  };

  const calculateSuggestedPercentage = (inputPercentage: number) => {
    // Example logic for calculating the suggested percentage
    const crashValues = crashData.map((data) => data.crashValue);
    const lowCrashValues = crashValues.filter((value) => value >= 101 && value <= 110);
    
    const suggested = averagePercentage + (lowCrashValues.length / crashValues.length) * 12; // Increase percentage based on historical data
    setSuggestedPercentage(suggested);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Crash Game Stats</h1>

      {/* Last 10 Crash Values */}
      <section>
        <h2>Last 10 Crash Values</h2>
        <ul>
          {crashData.slice(0, 10).map((data, index) => (
            <li key={index}>
              Crash Value: {data.crashValue} at {new Date(data.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </section>

      {/* When the last 1000% hit */}
      <section>
        <h2>When the Last 1000% Hit</h2>
        <ul>
          {last1000.map((data, index) => (
            <li key={index}>
              Crash Value: {data.crashValue} at {new Date(data.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </section>

      {/* When the last 1% hit */}
      <section>
        <h2>When the Last 1% Hit</h2>
        <ul>
          {last1.map((data, index) => (
            <li key={index}>
              Crash Value: {data.crashValue} at {new Date(data.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </section>

      {/* Input for Percentage */}
      <section>
        <h2>Set Your Desired Percentage</h2>
        <input
          type="number"
          value={percentage}
          onChange={handlePercentageChange}
          style={{ padding: '10px', fontSize: '16px', marginBottom: '10px' }}
        />
        <p>Your calculated percentage: {suggestedPercentage}%</p>
      </section>
    </div>
  );
};

export default Page;
