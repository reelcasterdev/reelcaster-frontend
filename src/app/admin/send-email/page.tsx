'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmailComposer from '@/app/components/admin/email-composer';
import EmailPreview from '@/app/components/admin/email-preview';
import Sidebar from '@/app/components/common/sidebar';
import { AdminBroadcastEmailData } from '@/lib/email-templates/admin-broadcast';

export default function AdminSendEmailPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 min-h-screen overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

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
              <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-medium text-white">Generating preview...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
