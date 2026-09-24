import React from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { ChartImage } from '../types';

interface ChartModalProps {
  chart: ChartImage | null;
  onClose: () => void;
}

export const ChartModal: React.FC<ChartModalProps> = ({ chart, onClose }) => {
  const [scale, setScale] = React.useState(1);

  if (!chart) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-xs">
              {chart.timeframe}
            </span>
            <span className="font-mono text-sm text-slate-200 font-semibold">{chart.label}</span>
            <span className="text-xs text-slate-400 font-mono">({chart.fileName})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.75, s - 0.25))}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale(1)}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 ml-1"
              title="Reset Zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 ml-2"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60">
          <img
            src={chart.dataUrl}
            alt={chart.label}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 max-w-full rounded border border-slate-800 shadow-lg"
          />
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950 text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>ICT 2024 Tolerance: ±$0.30–$0.50 on screenshot price readings</span>
          <span>Click outside or Esc to close</span>
        </div>
      </div>
    </div>
  );
};
