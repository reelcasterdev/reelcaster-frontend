/**
 * Custom Alert Email Template
 *
 * Generates HTML email for custom fishing condition alerts.
 */

import type { ConditionSnapshot } from '@/lib/custom-alert-engine';

interface CustomAlertEmailParams {
  alertName: string;
  locationName: string;
  matchedTriggers: string[];
  conditionSnapshot: ConditionSnapshot;
  logicMode: 'AND' | 'OR';
  forecastUrl: string;
  manageAlertsUrl: string;
}

interface EmailContent {
  subject: string;
  html: string;
}

// Trigger display names
const TRIGGER_LABELS: Record<string, string> = {
  wind: 'Wind Conditions',
  tide: 'Tide Phase',
  pressure: 'Barometric Pressure',
  water_temp: 'Water Temperature',
  solunar: 'Solunar Period',
  fishing_score: 'Fishing Score',
};

// Trigger icons (emoji for email compatibility)
const TRIGGER_ICONS: Record<string, string> = {
  wind: '💨',
  tide: '🌊',
  pressure: '📊',
  water_temp: '🌡️',
  solunar: '🌙',
  fishing_score: '🎣',
};

function formatTriggerValue(trigger: string, snapshot: ConditionSnapshot): string {
  switch (trigger) {
    case 'wind':
      const direction = snapshot.wind_direction !== undefined
        ? ` from ${getWindDirection(snapshot.wind_direction)}`
        : '';
      return `${snapshot.wind_speed_mph?.toFixed(1) || 'N/A'} mph${direction}`;

    case 'tide':
      const phase = snapshot.tide_phase || 'Unknown';
      const height = snapshot.tide_height_m !== undefined
        ? ` (${snapshot.tide_height_m.toFixed(2)}m)`
        : '';
      return `${formatTidePhase(phase)}${height}`;

    case 'pressure':
      const trend = snapshot.pressure_trend || 'steady';
      const change = snapshot.pressure_change_3h !== undefined
        ? ` (${snapshot.pressure_change_3h >= 0 ? '+' : ''}${snapshot.pressure_change_3h.toFixed(1)} mb/3h)`
        : '';
      return `${snapshot.pressure_hpa?.toFixed(1) || 'N/A'} hPa - ${trend}${change}`;

    case 'water_temp':
      return `${snapshot.water_temp_c?.toFixed(1) || 'N/A'}°C`;

    case 'solunar':
      return formatSolunarPhase(snapshot.solunar_phase || 'none');

    case 'fishing_score':
      return `${snapshot.fishing_score?.toFixed(0) || 'N/A'}/100`;

    default:
      return 'Matched';
  }
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return `${directions[index]} (${degrees}°)`;
}

function formatTidePhase(phase: string): string {
  const labels: Record<string, string> = {
    incoming: 'Incoming (Rising)',
    outgoing: 'Outgoing (Falling)',
    high_slack: 'High Slack',
    low_slack: 'Low Slack',
  };
  return labels[phase] || phase;
}

function formatSolunarPhase(phase: string): string {
  const labels: Record<string, string> = {
    major: 'Major Period (Peak Activity)',
    minor: 'Minor Period',
    none: 'No Active Period',
  };
  return labels[phase] || phase;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function generateCustomAlertEmail(params: CustomAlertEmailParams): EmailContent {
  const {
    alertName,
    locationName,
    matchedTriggers,
    conditionSnapshot,
    logicMode,
    forecastUrl,
    manageAlertsUrl,
  } = params;

  const timestamp = conditionSnapshot.timestamp
    ? formatTimestamp(conditionSnapshot.timestamp)
    : formatTimestamp(new Date().toISOString());

  const triggerCount = matchedTriggers.length;
  const triggerText = triggerCount === 1 ? 'condition' : 'conditions';

  // Generate subject
  const subject = `🎣 Alert: ${alertName} - ${triggerCount} ${triggerText} matched at ${locationName}`;

  // Generate trigger rows
  const triggerRows = matchedTriggers
    .map((trigger) => {
      const icon = TRIGGER_ICONS[trigger] || '✓';
      const label = TRIGGER_LABELS[trigger] || trigger;
      const value = formatTriggerValue(trigger, conditionSnapshot);

      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 20px; margin-right: 8px;">${icon}</span>
            <span style="font-weight: 500; color: #374151;">${label}</span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 600;">
            ${value}
          </td>
        </tr>
      `;
    })
    .join('');

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                🎣 Perfect Conditions Alert!
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                ${alertName}
              </p>
            </td>
          </tr>

          <!-- Location & Time -->
          <tr>
            <td style="padding: 24px; background-color: #f0f9ff; border-bottom: 1px solid #e0f2fe;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; font-size: 14px; color: #64748b;">Location</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0369a1;">
                      📍 ${locationName}
                    </p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: #64748b;">Detected</p>
                    <p style="margin: 0; font-size: 14px; color: #475569;">
                      ${timestamp}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Summary -->
          <tr>
            <td style="padding: 24px;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #065f46; font-size: 15px;">
                  <strong>${triggerCount} ${triggerText}</strong> ${logicMode === 'AND' ? '(all required)' : '(any match)'} detected at your fishing spot!
                </p>
              </div>

              <!-- Matched Conditions Table -->
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1f2937;">
                Matched Conditions
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Condition</th>
                    <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Current Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${triggerRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="${forecastUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Full Forecast →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tips Section -->
          <tr>
            <td style="padding: 24px; background-color: #fffbeb; border-top: 1px solid #fef3c7;">
              <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #92400e;">
                💡 Tips for This Alert
              </h3>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
                <li>These conditions may change - check the forecast before heading out</li>
                <li>Always prioritize safety and check local regulations</li>
                <li>This alert won't fire again for ${getApproxCooldown()} hours (cooldown period)</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">
                <a href="${manageAlertsUrl}" style="color: #0284c7; text-decoration: none;">Manage Your Alerts</a>
                &nbsp;|&nbsp;
                <a href="${manageAlertsUrl}" style="color: #0284c7; text-decoration: none;">Disable This Alert</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                ReelCaster • Your Personal Fishing Forecast
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

  return { subject, html };
}

function getApproxCooldown(): number {
  // Default cooldown - in a real implementation, this would come from the profile
  return 12;
}
