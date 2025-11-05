'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Send, Eye, Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { AdminBroadcastEmailData } from '@/lib/email-templates/admin-broadcast';

interface EmailComposerProps {
  onPreview?: (emailData: AdminBroadcastEmailData & { subject: string }) => void;
  onSend?: (emailData: AdminBroadcastEmailData & { subject: string }) => void;
}

// Available locations
const LOCATIONS = [
  { value: 'victoria', label: 'Victoria, Sidney' },
  { value: 'sooke', label: 'Sooke, Port Renfrew' },
];

export default function EmailComposer({ onPreview }: EmailComposerProps) {
  const [subject, setSubject] = useState('Update from ReelCaster');
  const [customMessage, setCustomMessage] = useState('');
  const [locationName, setLocationName] = useState<string>('');

  // Data toggles
  const [includeForecast, setIncludeForecast] = useState(false);
  const [includeWeather, setIncludeWeather] = useState(false);
  const [includeTides, setIncludeTides] = useState(false);
  const [includeReports, setIncludeReports] = useState(false);

  // Status states
  const [userCount, setUserCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    sent: number;
    failed: number;
  } | null>(null);

  const loadUserCount = async () => {
    setIsLoadingCount(true);
    try {
      const response = await fetch('/api/admin/send-broadcast');
      const data = await response.json();
      if (data.success) {
        setUserCount(data.validEmails);
      }
    } catch (error) {
      console.error('Error loading user count:', error);
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Load user count on mount
  useEffect(() => {
    loadUserCount();
  }, []);

  const getEmailData = (): AdminBroadcastEmailData & { subject: string } => {
    return {
      subject,
      customMessage,
      locationName: locationName || undefined,
      includeForecast,
      includeWeather,
      includeTides,
      includeReports,
      // Note: For now, data will need to be fetched separately
      // This is just the structure
      forecastDays: includeForecast ? [] : undefined,
      weatherHighlights: includeWeather ? undefined : undefined,
      tideInfo: includeTides ? [] : undefined,
      fishingReports: includeReports ? [] : undefined,
    };
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(getEmailData());
    }
  };

  const handleSend = async () => {
    if (!customMessage.trim()) {
      alert('Please enter a custom message before sending.');
      return;
    }

    if (!window.confirm(`Are you sure you want to send this email to ${userCount || 0} users?`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const emailData = getEmailData();
      const response = await fetch('/api/admin/send-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (result.success) {
        setSendResult({
          success: true,
          sent: result.sent,
          failed: result.failed,
        });
      } else {
        throw new Error(result.error || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      setSendResult({
        success: false,
        sent: 0,
        failed: userCount || 0,
      });
      alert('Error sending emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <Mail className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            Send Email Broadcast
          </h1>
          <p className="text-slate-400 mt-1">
            {isLoadingCount ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading user count...
              </span>
            ) : userCount !== null ? (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {userCount} registered user{userCount === 1 ? '' : 's'}
              </span>
            ) : (
              'Compose and send email to all users'
            )}
          </p>
        </div>
      </div>

      {/* Send Result Alert */}
      {sendResult && (
        <Alert className={sendResult.success ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}>
          <div className="flex items-start gap-3">
            {sendResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            )}
            <div>
              <h4 className="font-semibold mb-1 text-white">
                {sendResult.success ? 'Emails Sent Successfully!' : 'Email Send Failed'}
              </h4>
              <p className="text-sm text-slate-400">
                Sent: {sendResult.sent} | Failed: {sendResult.failed}
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Email Subject & Message */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Email Content</CardTitle>
          <CardDescription className="text-slate-400">Compose your message and subject line</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-white font-medium text-sm">
              Email Subject
            </Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMessage" className="text-white font-medium text-sm">
              Custom Message <span className="text-red-400">*</span>
            </Label>
            <p className="text-sm text-slate-500 mb-2">
              This message will be highlighted at the top of the email
            </p>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter your message here...

Example:
Hey everyone! We've just updated our forecast system with even more accurate predictions. Check out this week's conditions below!"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 min-h-[150px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Sections */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Include in Email</CardTitle>
          <CardDescription className="text-slate-400">Select which data sections to include</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location Selector */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-white font-medium text-sm">
              Location for Data
            </Label>
            <Select value={locationName} onValueChange={setLocationName}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="Select a location..." />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.label}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Select a location to fetch forecast and tide data</p>
          </div>

          {/* Data Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <label className="flex items-start gap-3 p-4 bg-slate-700/50 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={includeForecast}
                onChange={(e) => setIncludeForecast(e.target.checked)}
                className="mt-0.5 h-5 w-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 bg-slate-600 border-slate-500"
              />
              <div>
                <div className="font-medium text-white">Weekly Forecast Summary</div>
                <div className="text-sm text-slate-400">Best 3 days this week</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-slate-700/50 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={includeWeather}
                onChange={(e) => setIncludeWeather(e.target.checked)}
                className="mt-0.5 h-5 w-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 bg-slate-600 border-slate-500"
              />
              <div>
                <div className="font-medium text-white">Weather Highlights</div>
                <div className="text-sm text-slate-400">Temperature, wind, conditions</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-slate-700/50 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={includeTides}
                onChange={(e) => setIncludeTides(e.target.checked)}
                className="mt-0.5 h-5 w-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 bg-slate-600 border-slate-500"
              />
              <div>
                <div className="font-medium text-white">Tide Information</div>
                <div className="text-sm text-slate-400">High/low tide times</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 bg-slate-700/50 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={includeReports}
                onChange={(e) => setIncludeReports(e.target.checked)}
                className="mt-0.5 h-5 w-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 bg-slate-600 border-slate-500"
              />
              <div>
                <div className="font-medium text-white">Recent Fishing Reports</div>
                <div className="text-sm text-slate-400">Latest fishing activity</div>
              </div>
            </label>
          </div>

          {(includeForecast || includeWeather || includeTides || includeReports) && !locationName && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <p className="text-sm text-yellow-400">
                ⚠️ Please select a location to include forecast data
              </p>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex-1 border-slate-600 !text-white hover:bg-slate-700 hover:!text-white h-11"
              disabled={!customMessage.trim() || isSending}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Email
            </Button>

            <Button
              onClick={handleSend}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-11"
              disabled={!customMessage.trim() || isSending || userCount === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {userCount || 0} User{userCount === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </div>

          <p className="text-sm text-slate-500 mt-4 text-center">
            💡 Tip: Use &quot;Preview Email&quot; to see how your message will look before sending
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
