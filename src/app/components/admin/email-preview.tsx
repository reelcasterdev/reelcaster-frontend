'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface EmailPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  subject: string;
}

export default function EmailPreview({ isOpen, onClose, html, subject }: EmailPreviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Email Preview</h2>
            <p className="text-sm text-slate-400 mt-1">Subject: {subject}</p>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900">
          <div className="bg-white shadow-lg rounded">
            <iframe
              srcDoc={html}
              title="Email Preview"
              className="w-full h-[70vh] border-0 rounded"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
