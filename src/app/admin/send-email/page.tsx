'use client';

import { useState } from 'react';
import EmailComposer from '@/app/components/admin/email-composer';
import EmailPreview from '@/app/components/admin/email-preview';
import { AppShell } from '@/app/components/layout';
import DashboardHeader from '@/app/components/forecast/dashboard-header';
import { AdminBroadcastEmailData } from '@/lib/email-templates/admin-broadcast';

export default function AdminSendEmailPage() {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handlePreview = async (emailData: AdminBroadcastEmailData & { subject: string }) => {
    setIsLoadingPreview(true);

    try {
      const response = await fetch('/api/admin/preview-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const data = await response.json();

      if (data.success) {
        setPreviewHtml(data.html);
        setPreviewSubject(data.subject);
        setIsPreviewOpen(true);
      } else {
        alert('Failed to generate preview: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <AppShell showLocationPanel={false}>
      <div className="flex-1 min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
        <DashboardHeader
          title="Send Email Broadcast"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="max-w-5xl mx-auto space-y-6">
          <EmailComposer onPreview={handlePreview} />

          {/* Email Preview Modal */}
          <EmailPreview
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            html={previewHtml}
            subject={previewSubject}
          />

          {/* Loading Overlay */}
          {isLoadingPreview && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
              <div className="bg-rc-bg-dark rounded-lg p-6 shadow-xl border border-rc-bg-light">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-medium text-rc-text">Generating preview...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
