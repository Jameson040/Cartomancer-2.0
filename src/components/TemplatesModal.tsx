/**
 * Cartomancer Fantasy Map Maker - Templates & World Presets Modal
 */

import React from 'react';
import { TEMPLATES } from '../data/templates';
import { MapProject } from '../types';
import { X, Sparkles, Compass, MapPin, Mountain } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (templateKey: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="templates-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        id="templates-modal"
        className="bg-[#FDF6E3] border-2 border-[#E2D6B5] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-slate-800 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF7E5F]/15 border border-[#FF7E5F]/40 flex items-center justify-center text-[#FF7E5F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Cinzel'] font-bold text-lg text-slate-800 tracking-wider">
                Cartographer's Realm Templates
              </h2>
              <p className="text-xs text-slate-600">
                Choose the Sundered Realm high-fantasy continent or start with a pristine blank slate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Grid (2-column rich comparison) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(TEMPLATES).map(([key, template]) => {
            const isBlank = key === 'blank_canvas';
            return (
              <div
                key={key}
                onClick={() => {
                  onApplyTemplate(key);
                  onClose();
                }}
                className={`group relative flex flex-col justify-between p-5 rounded-xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-lg ${
                  isBlank
                    ? 'border-dashed border-[#D97706]/70 bg-[#FFFBEB] hover:border-[#D97706] hover:ring-2 hover:ring-[#D97706]/30'
                    : 'border-[#1b4332]/40 bg-white hover:border-[#14532d] hover:ring-2 hover:ring-[#14532d]/30'
                }`}
              >
                {/* Header preview bar */}
                <div
                  className="h-36 rounded-lg mb-4 flex items-center justify-center border border-black/10 shadow-inner relative overflow-hidden"
                  style={{
                    background: isBlank
                      ? 'linear-gradient(135deg, #fef3c7, #e2d6b5)'
                      : `linear-gradient(135deg, #164e63, #134e4a, #0f172a)`,
                  }}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                  {isBlank ? (
                    <div className="text-center z-10">
                      <div className="w-12 h-12 mx-auto rounded-full border-2 border-dashed border-[#92400e] flex items-center justify-center text-[#92400e] group-hover:scale-110 transition-transform">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-[#92400e] tracking-widest uppercase block mt-2">
                        Pristine Canvas
                      </span>
                    </div>
                  ) : (
                    <div className="text-center z-10 flex flex-col items-center">
                      <Compass className="w-12 h-12 text-[#99f6e4] group-hover:scale-110 transition-all drop-shadow-md" />
                      <span className="text-xs font-bold text-teal-100 tracking-wider block mt-2">
                        Glacial North • Verdant Vale • Sun Canyons
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-['Cinzel'] font-bold text-base text-slate-800 group-hover:text-[#14532d] transition-colors">
                      {template.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E2D6B5] flex items-center justify-between text-xs font-bold">
                  <span className={isBlank ? 'text-[#B45309]' : 'text-[#14532d]'}>
                    {isBlank ? 'Load Blank Canvas' : 'Load Sundered Realm'}
                  </span>
                  <span className="group-hover:translate-x-1.5 transition-transform text-sm">→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-[#E2D6B5] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
