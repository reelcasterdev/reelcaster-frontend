'use client';

import React from 'react';
import { Fish, Check } from 'lucide-react';

interface SpeciesSelectorProps {
  selectedSpecies: string[];
  onChange: (species: string[]) => void;
}

// Species list based on speciesAlgorithms.ts
const SPECIES_OPTIONS = [
  {
    id: 'chinook-salmon',
    name: 'Chinook Salmon',
    scientificName: 'Oncorhynchus tshawytscha',
    description: 'Spring, Summer, Fall runs',
  },
  {
    id: 'coho-salmon',
    name: 'Coho Salmon',
    scientificName: 'Oncorhynchus kisutch',
    description: 'Summer, Fall runs',
  },
  {
    id: 'chum-salmon',
    name: 'Chum Salmon',
    scientificName: 'Oncorhynchus keta',
    description: 'Fall runs',
  },
  {
    id: 'pink-salmon',
    name: 'Pink Salmon',
    scientificName: 'Oncorhynchus gorbuscha',
    description: 'Summer runs (odd years)',
  },
  {
    id: 'sockeye-salmon',
    name: 'Sockeye Salmon',
    scientificName: 'Oncorhynchus nerka',
    description: 'Summer runs',
  },
  {
    id: 'halibut',
    name: 'Pacific Halibut',
    scientificName: 'Hippoglossus stenolepis',
    description: 'Year-round, bottom fishing',
  },
  {
    id: 'lingcod',
    name: 'Lingcod',
    scientificName: 'Ophiodon elongatus',
    description: 'Year-round, bottom fishing',
  },
  {
    id: 'rockfish',
    name: 'Rockfish',
    scientificName: 'Sebastes spp.',
    description: 'Various species, year-round',
  },
];

const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({ selectedSpecies, onChange }) => {
  const handleToggle = (speciesId: string) => {
    if (selectedSpecies.includes(speciesId)) {
      onChange(selectedSpecies.filter((id) => id !== speciesId));
    } else {
      onChange([...selectedSpecies, speciesId]);
    }
  };

  const handleSelectAll = () => {
    onChange(SPECIES_OPTIONS.map((species) => species.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const isAllSelected = selectedSpecies.length === SPECIES_OPTIONS.length;

  return (
    <div className="space-y-4">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Favorite Species</h3>
          <p className="text-xs text-slate-400 mt-1">
            Select species you want to track for notifications
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={isAllSelected}
            className="text-xs px-3 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            disabled={selectedSpecies.length === 0}
            className="text-xs px-3 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Species selection counter */}
      <div className="text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-md border border-blue-500/20">
        {selectedSpecies.length} of {SPECIES_OPTIONS.length} species selected
      </div>

      {/* Species grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SPECIES_OPTIONS.map((species) => {
          const isSelected = selectedSpecies.includes(species.id);

          return (
            <button
              key={species.id}
              onClick={() => handleToggle(species.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? 'border-blue-500/50 bg-blue-600/20'
                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50'
                }
              `}
            >
              {/* Checkmark indicator */}
              <div
                className={`
                absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600 bg-slate-700'}
              `}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Species icon */}
              <div className="flex items-start gap-3">
                <div
                  className={`
                  p-2 rounded-lg
                  ${isSelected ? 'bg-blue-500/20' : 'bg-slate-600/50'}
                `}
                >
                  <Fish className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                </div>

                <div className="flex-1 pr-6">
                  <h4
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-blue-300' : 'text-white'
                    }`}
                  >
                    {species.name}
                  </h4>
                  <p className="text-xs text-slate-400 italic mt-0.5">{species.scientificName}</p>
                  <p className="text-xs text-slate-500 mt-1">{species.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      {selectedSpecies.length === 0 && (
        <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Select at least one species to receive personalized fishing notifications
          </p>
        </div>
      )}
    </div>
  );
};

export default SpeciesSelector;
