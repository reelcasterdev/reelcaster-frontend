/**
 * Scheduled Notification Email Template
 *
 * Personalized fishing notification emails based on user preferences and forecasts
 */

import type {
  ForecastDay,
  WeatherAlert,
  RegulationChange,
} from '../notification-service';

export interface ScheduledNotificationEmailData {
  userName?: string;
  userEmail: string;
  locationName?: string;
  bestDay: ForecastDay;
  forecastDays: ForecastDay[];
  weatherAlerts?: WeatherAlert[];
  regulationChanges?: RegulationChange[];
  speciesNames?: string[];
  preferences?: {
    fishing_score_threshold: number;
    wind_speed_threshold_kph: number;
    precipitation_threshold_mm: number;
  };
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981'; // green
  if (score >= 60) return '#3b82f6'; // blue
  if (score >= 40) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function getSeverityColor(severity: 'warning' | 'danger'): string {
  return severity === 'danger' ? '#ef4444' : '#f59e0b';
}

export function generateScheduledNotificationEmail(
  data: ScheduledNotificationEmailData
): string {
  const { bestDay, forecastDays, weatherAlerts, regulationChanges, locationName, speciesNames } =
    data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Fishing Forecast - ReelCaster</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎣 Great Fishing Ahead!
              </h1>
              <p style="margin: 12px 0 0; color: #dbeafe; font-size: 16px;">
                Your personalized fishing forecast for ${locationName || 'your location'}
              </p>
            </td>
          </tr>

          <!-- Best Day Alert -->
          <tr>
            <td style="padding: 24px;">
              <div style="background: linear-gradient(135deg, ${getScoreColor(bestDay.score)}15 0%, ${getScoreColor(bestDay.score)}05 100%); border-left: 4px solid ${getScoreColor(bestDay.score)}; border-radius: 8px; padding: 20px;">
                <h2 style="margin: 0 0 8px; color: #1f2937; font-size: 20px; font-weight: 600;">
                  Best Day: ${formatDate(bestDay.date)}
                </h2>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="background-color: ${getScoreColor(bestDay.score)}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 18px; font-weight: 700;">
                    ${bestDay.score}
                  </div>
                  <span style="color: #4b5563; font-size: 16px; font-weight: 500;">
                    ${getScoreLabel(bestDay.score)} Conditions
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px;">
                  <div>
                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Temperature</div>
                    <div style="color: #1f2937; font-size: 16px; font-weight: 600;">${bestDay.avgTemp}°C</div>
                  </div>
                  <div>
                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Wind</div>
                    <div style="color: #1f2937; font-size: 16px; font-weight: 600;">${bestDay.avgWind} km/h</div>
                  </div>
                  <div>
                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Rain</div>
                    <div style="color: #1f2937; font-size: 16px; font-weight: 600;">${bestDay.precipitation} mm</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          ${speciesNames && speciesNames.length > 0 ? `
          <!-- Species Info -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  Forecast optimized for:
                </h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${speciesNames.map(name => `
                    <span style="background-color: #3b82f6; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                      ${name}
                    </span>
                  `).join('')}
                </div>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Weather Alerts -->
          ${weatherAlerts && weatherAlerts.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                <h3 style="margin: 0 0 12px; color: #92400e; font-size: 16px; font-weight: 600;">
                  ⚠️ Weather Alerts
                </h3>
                ${weatherAlerts.map(alert => `
                  <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #fde68a;">
                    <span style="color: ${getSeverityColor(alert.severity)}; font-weight: 600;">
                      ${alert.type.replace('_', ' ').toUpperCase()}:
                    </span>
                    <span style="color: #78350f;">
                      ${alert.message}
                    </span>
                  </div>
                `).join('')}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- 7-Day Forecast -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 18px; font-weight: 600;">
                7-Day Forecast
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Date</th>
                    <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Score</th>
                    <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Conditions</th>
                  </tr>
                </thead>
                <tbody>
                  ${forecastDays.map((day, index) => `
                    <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                      <td style="padding: 12px; color: #1f2937; font-size: 14px;">
                        ${formatDate(day.date)}
                      </td>
                      <td style="padding: 12px; text-align: center;">
                        <span style="background-color: ${getScoreColor(day.score)}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                          ${day.score}
                        </span>
                      </td>
                      <td style="padding: 12px; text-align: center; color: #4b5563; font-size: 14px;">
                        ${day.conditions}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Regulation Changes -->
          ${regulationChanges && regulationChanges.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 16px; font-weight: 600;">
                  📋 Regulation Updates
                </h3>
                ${regulationChanges.map(change => `
                  <div style="margin-bottom: 12px; padding: 12px; background-color: #ffffff; border-radius: 6px;">
                    <div style="color: #1f2937; font-weight: 600; margin-bottom: 4px;">
                      ${change.species_name}
                    </div>
                    <div style="color: #4b5563; font-size: 14px; margin-bottom: 4px;">
                      ${change.change_type}: ${change.old_value} → ${change.new_value}
                    </div>
                    <div style="color: #6b7280; font-size: 12px;">
                      Effective: ${change.effective_date}
                    </div>
                  </div>
                `).join('')}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reelcaster.com'}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                View Full Forecast
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                You're receiving this because you enabled fishing notifications in your preferences.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reelcaster.com'}/profile/notification-settings" style="color: #3b82f6; text-decoration: none;">
                  Manage Preferences
                </a>
                &nbsp;|&nbsp;
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://reelcaster.com'}/profile" style="color: #3b82f6; text-decoration: none;">
                  Unsubscribe
                </a>
              </p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} ReelCaster. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateNotificationSubject(data: ScheduledNotificationEmailData): string {
  const { bestDay, locationName } = data;
  const scoreLabel = getScoreLabel(bestDay.score);
  const dayName = formatDate(bestDay.date).split(',')[0]; // Get weekday

  return `🎣 ${scoreLabel} Fishing Expected ${dayName} - ${bestDay.score}/100${locationName ? ` in ${locationName}` : ''}`;
}
