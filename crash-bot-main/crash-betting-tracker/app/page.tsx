'use client';  // Add this line at the top of your file

import { useState } from 'react';
import Head from 'next/head';

// Define types for the data structure
interface CrashData {
  last10Crashes: number[];
  hits1000: number[];
  hits1: number[];
  averageCrash: number;
}

interface PredictionResult {
  payout: string;
  chance: string;
}

// Sample Data (Mock Data)
const crashData: CrashData = {
  last10Crashes: [1.10, 1.13, 1.09, 1.08, 1.15, 1.20, 1.12, 1.09, 1.05, 1.18],
  hits1000: [1000, 1000, 1000, 1020, 1000, 999, 1025, 1010],
  hits1: [1, 1.2, 1, 1.1, 0.98, 1.05, 1.02, 1.04],
  averageCrash: 1.10, // Mock average value for prediction purposes
};

export default function Home() {
  const [inputPercentage, setInputPercentage] = useState<string>('');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);

  const calculatePrediction = () => {
    const percentage = parseFloat(inputPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      alert('Please enter a valid percentage.');
      return;
    }

    // Calculate the predicted likelihood based on previous data
    let predictionLikelihood = crashData.averageCrash;

    // Check the range of recent crashes to predict likelihood
    const recentCrashes = crashData.last10Crashes.slice(-5); // Last 5 crashes
    const lowHits = recentCrashes.filter(val => val <= 1.10); // Low value hit check
    const highHits = recentCrashes.filter(val => val > 1.10); // High value hit check

    if (lowHits.length > highHits.length) {
      predictionLikelihood = 0.95; // If it's been hitting low, we have a higher chance of hitting soon
    }

    // Calculate expected payout based on the input
    const predictedPayout = (percentage / 100) * predictionLikelihood;

    setPredictionResult({
      payout: predictedPayout.toFixed(2),
      chance: (predictionLikelihood * 100).toFixed(2),
    });
  };

  return (
    <div className="container">
      <Head>
        <title>Crash Betting Tracker</title>
      </Head>

      <h1>Crash Betting Tracker</h1>

      {/* Last 10 Crash Values */}
      <section>
        <h2>Last 10 Crash Values</h2>
        <ul>
          {crashData.last10Crashes.map((value, index) => (
            <li key={index}>{(value * 100).toFixed(2)}%</li>
          ))}
        </ul>
      </section>

      {/* Last 1000% Hit */}
      <section>
        <h2>Last 1000% Hit</h2>
        <p>Last 1000% hit at: {crashData.hits1000[crashData.hits1000.length - 1]}%</p>
      </section>

      {/* Last 1% Hit */}
      <section>
        <h2>Last 1% Hit</h2>
        <p>Last 1% hit at: {crashData.hits1[crashData.hits1.length - 1]}%</p>
      </section>

      {/* Bet Prediction */}
      <section>
        <h2>Bet Prediction</h2>
        <label htmlFor="percentageInput">Enter your target percentage:</label>
        <input
          type="number"
          id="percentageInput"
          value={inputPercentage}
          onChange={(e) => setInputPercentage(e.target.value)}
          placeholder="120%"
        />
        <button onClick={calculatePrediction}>Calculate Prediction</button>

        {predictionResult && (
          <div>
            <p>With a {inputPercentage}% target, your expected payout is:</p>
            <p><strong>{predictionResult.payout} SOL</strong></p>
            <p>Chance of hitting: {predictionResult.chance}%</p>
          </div>
        )}
      </section>
    </div>
  );
}
