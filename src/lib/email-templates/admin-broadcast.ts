export interface ForecastDay {
  date: string;
  dayName: string;
  score: number;
  scoreLabel: string;
  bestTime: string;
  conditions: string;
}

export interface WeatherHighlights {
  temperature: string;
  conditions: string;
  wind: string;
  precipitation: string;
}

export interface TideInfo {
  date: string;
  dayName: string;
  high: string;
  low: string;
}

export interface FishingReport {
  date: string;
  location: string;
  summary: string;
}

export interface AdminBroadcastEmailData {
  customMessage: string;
  locationName?: string;

  // Optional data sections
  includeForecast?: boolean;
  forecastDays?: ForecastDay[];

  includeWeather?: boolean;
  weatherHighlights?: WeatherHighlights;

  includeTides?: boolean;
  tideInfo?: TideInfo[];

  includeReports?: boolean;
  fishingReports?: FishingReport[];
}

/**
 * Get score color based on fishing score
 */
function getScoreColor(score: number): string {
  if (score >= 8) return '#22c55e'; // green
  if (score >= 6) return '#eab308'; // yellow
  if (score >= 4) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get score emoji based on fishing score
 */
function getScoreEmoji(score: number): string {
  if (score >= 8) return '🟢';
  if (score >= 6) return '🟡';
  if (score >= 4) return '🟠';
  return '🔴';
}

/**
 * Generate HTML email for admin broadcast
 */
export function generateAdminBroadcastEmail(data: AdminBroadcastEmailData): string {
  const {
    customMessage,
    locationName,
    includeForecast,
    forecastDays,
    includeWeather,
    weatherHighlights,
    includeTides,
    tideInfo,
    includeReports,
    fishingReports,
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update from ReelCaster</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .custom-message {
      background-color: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 20px;
      margin: 0 0 30px 0;
      border-radius: 4px;
    }
    .custom-message p {
      margin: 0;
      color: #1e293b;
      font-size: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-title-icon {
      margin-right: 8px;
    }
    .forecast-day {
      background-color: #f8fafc;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid #cbd5e1;
    }
    .forecast-day h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    .score-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin-left: 8px;
    }
    .forecast-details {
      font-size: 14px;
      color: #64748b;
      margin: 5px 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .info-item {
      background-color: #f8fafc;
      padding: 12px;
      border-radius: 6px;
    }
    .info-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    .tide-day {
      background-color: #f8fafc;
      padding: 12px;
      margin: 8px 0;
      border-radius: 6px;
    }
    .tide-day strong {
      color: #1e293b;
    }
    .report-item {
      background-color: #f8fafc;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 3px solid #0ea5e9;
    }
    .report-date {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 5px;
    }
    .report-location {
      font-weight: 600;
      color: #0ea5e9;
      margin-bottom: 8px;
    }
    .report-summary {
      font-size: 14px;
      color: #475569;
    }
    .cta-button {
      display: inline-block;
      background-color: #0ea5e9;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #0ea5e9;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎣 ReelCaster</h1>
      <p>Fishing Forecasts for British Columbia</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Custom Message Section -->
      <div class="custom-message">
        <p>${customMessage.replace(/\n/g, '<br>')}</p>
      </div>

      ${includeForecast && forecastDays && forecastDays.length > 0 ? `
      <!-- Forecast Section -->
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">📅</span>
          Fishing Forecast${locationName ? ` - ${locationName}` : ''}
        </h2>
        ${forecastDays.map(day => `
        <div class="forecast-day" style="border-left-color: ${getScoreColor(day.score)}">
          <h3>
            ${day.dayName}, ${day.date}
            <span class="score-badge" style="background-color: ${getScoreColor(day.score)}">
              ${getScoreEmoji(day.score)} ${day.score}/10 ${day.scoreLabel}
            </span>
          </h3>
          <div class="forecast-details">
            <strong>Best Time:</strong> ${day.bestTime}
          </div>
          <div class="forecast-details">
            ${day.conditions}
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${includeWeather && weatherHighlights ? `
      <!-- Weather Section -->
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">☀️</span>
          Weather Highlights
        </h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Temperature</div>
            <div class="info-value">${weatherHighlights.temperature}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Conditions</div>
            <div class="info-value">${weatherHighlights.conditions}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Wind</div>
            <div class="info-value">${weatherHighlights.wind}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Precipitation</div>
            <div class="info-value">${weatherHighlights.precipitation}</div>
          </div>
        </div>
      </div>
      ` : ''}

      ${includeTides && tideInfo && tideInfo.length > 0 ? `
      <!-- Tide Section -->
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">🌊</span>
          Tide Information
        </h2>
        ${tideInfo.map(tide => `
        <div class="tide-day">
          <strong>${tide.dayName}, ${tide.date}</strong><br>
          High: ${tide.high} | Low: ${tide.low}
        </div>
        `).join('')}
      </div>
      ` : ''}

      ${includeReports && fishingReports && fishingReports.length > 0 ? `
      <!-- Fishing Reports Section -->
      <div class="section">
        <h2 class="section-title">
          <span class="section-title-icon">📝</span>
          Recent Fishing Reports
        </h2>
        ${fishingReports.map(report => `
        <div class="report-item">
          <div class="report-date">${report.date}</div>
          <div class="report-location">${report.location}</div>
          <div class="report-summary">${report.summary}</div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Call to Action -->
      <div style="text-align: center;">
        <a href="https://reelcaster.com" class="cta-button">View Full Forecast</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        You received this email because you have an account with ReelCaster.
      </p>
      <p>
        <a href="https://reelcaster.com/profile">Manage Preferences</a> |
        <a href="https://reelcaster.com">ReelCaster.com</a>
      </p>
      <p style="margin-top: 10px;">
        © ${new Date().getFullYear()} ReelCaster. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
