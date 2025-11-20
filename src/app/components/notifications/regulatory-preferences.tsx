'use client';

import React from 'react';
import { FileText, Info } from 'lucide-react';

interface RegulatoryPreferencesProps {
  includeRegulationChanges: boolean;
  onChange: (include: boolean) => void;
}

const RegulatoryPreferences: React.FC<RegulatoryPreferencesProps> = ({
  includeRegulationChanges,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-white">Regulatory Notifications</h3>
        <p className="text-xs text-slate-400 mt-1">
          Get notified about fishing regulation changes in your area
        </p>
      </div>

      {/* Main toggle */}
      <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-600">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              Include Regulation Changes
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Receive updates about limit changes, closures, and new regulations
            </div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={includeRegulationChanges}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
      </label>

      {/* Info box */}
      <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-xs text-blue-300 font-medium">
            How Regulatory Notifications Work
          </p>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li>
              Regulation changes are <strong className="text-white">bundled with your scheduled notifications</strong>
            </li>
            <li>
              Updates include: size/bag limit changes, gear restrictions, closures, and effective dates
            </li>
            <li>
              Covers DFO Area 19 (Victoria, Sidney) and Area 20 (Sooke, Port Renfrew)
            </li>
            <li>
              Regulations are checked daily and changes are detected automatically
            </li>
          </ul>
        </div>
      </div>

      {/* Examples of what's tracked */}
      {includeRegulationChanges && (
        <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
          <h4 className="text-xs font-medium text-white mb-3">You&apos;ll be notified about:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-green-500">✓</span>
              <span>Daily limit changes</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-green-500">✓</span>
              <span>Annual limit changes</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-green-500">✓</span>
              <span>Size restrictions (min/max)</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-green-500">✓</span>
              <span>Gear restrictions</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-green-500">✓</span>
              <span>Season openings/closures</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-green-500">✓</span>
              <span>Status changes (Open/Closed)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegulatoryPreferences;
