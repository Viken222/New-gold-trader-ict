import React, { useRef } from 'react';
import { ChartImage, TimeframeId } from '../types';
import { UploadCloud, CheckCircle2, AlertTriangle, Eye, Trash2, Plus } from 'lucide-react';

interface ChartUploaderProps {
  charts: ChartImage[];
  onAddCharts: (newCharts: ChartImage[]) => void;
  onRemoveChart: (id: string) => void;
  onViewChart: (chart: ChartImage) => void;
}

const TIMEFRAMES: { id: TimeframeId; label: string; role: string; isBaseline?: boolean }[] = [
  { id: '4H', label: '4-Hour', role: 'HTF Narrative & Outer DOL', isBaseline: true },
  { id: '1H', label: '1-Hour', role: 'HTF Order Flow & Key Arrays', isBaseline: true },
  { id: '30M', label: '30-Min', role: 'Intermediate Range' },
  { id: '15M', label: '15-Min', role: 'Dealing Range & Quadrants', isBaseline: true },
  { id: '5M', label: '5-Min', role: 'Execution MSS & Displacement', isBaseline: true },
  { id: '1M', label: '1-Min', role: 'Silver Bullet & BISI/SIBI FVG' },
  { id: '15S', label: '15-Sec', role: 'Micro OTE Refinement' },
  { id: 'DXY', label: 'DXY Index', role: 'Inverse Proxy Correlation' },
  { id: 'XAGUSD', label: 'Silver (XAG)', role: 'SMT Twin Divergence' },
];

export const ChartUploader: React.FC<ChartUploaderProps> = ({
  charts,
  onAddCharts,
  onRemoveChart,
  onViewChart,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlotTf, setSelectedSlotTf] = React.useState<TimeframeId>('15M');
  const [isDragging, setIsDragging] = React.useState(false);

  // Baseline check: one of 4H/1H + 15M + 5M
  const hasHtf = charts.some((c) => c.timeframe === '4H' || c.timeframe === '1H');
  const has15m = charts.some((c) => c.timeframe === '15M');
  const has5m = charts.some((c) => c.timeframe === '5M');
  const hasBaseline = hasHtf && has15m && has5m;

  const handleFiles = (files: FileList | File[], preferredTf?: TimeframeId) => {
    const newCharts: ChartImage[] = [];
    const fileArray = Array.from(files);

    fileArray.forEach((file, idx) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Guess timeframe from filename if not specified
        let detectedTf: TimeframeId = preferredTf || selectedSlotTf;
        const fn = file.name.toUpperCase();
        if (fn.includes('4H')) detectedTf = '4H';
        else if (fn.includes('1H')) detectedTf = '1H';
        else if (fn.includes('30M')) detectedTf = '30M';
        else if (fn.includes('15M')) detectedTf = '15M';
        else if (fn.includes('5M')) detectedTf = '5M';
        else if (fn.includes('1M')) detectedTf = '1M';
        else if (fn.includes('15S')) detectedTf = '15S';
        else if (fn.includes('DXY')) detectedTf = 'DXY';
        else if (fn.includes('XAG') || fn.includes('SILVER')) detectedTf = 'XAGUSD';

        newCharts.push({
          id: `chart-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          timeframe: detectedTf,
          label: `${detectedTf} Chart Screenshot`,
          dataUrl,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toLocaleTimeString(),
        });

        if (newCharts.length === fileArray.length) {
          onAddCharts(newCharts);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const triggerUploadForTimeframe = (tf: TimeframeId) => {
    setSelectedSlotTf(tf);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-mono font-bold text-slate-100 flex items-center gap-2">
            MULTI-TIMEFRAME CHART INTAKE PROTOCOL
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {charts.length} charts loaded
            </span>
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Upload XAUUSD screenshots captured during NY AM window. Axis & timestamp readings verified.
          </p>
        </div>

        {/* Baseline Status Pill */}
        <div className="flex items-center gap-2">
          {hasBaseline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>FULL-MTF Baseline Met (4H/1H + 15M + 5M)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>QUICK-READ Mode (Baseline incomplete: need 4H/1H, 15M, 5M)</span>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 mb-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
        <p className="text-xs font-mono text-slate-200 font-semibold mb-1">
          Drag and drop chart screenshots here, or click to browse
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Supports PNG, JPEG, SVG, WebP. Recommended: 4H/1H, 15M, 5M, 1M, DXY twin.
        </p>
      </div>

      {/* Timeframe Slots Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {TIMEFRAMES.map((tf) => {
          const matchingCharts = charts.filter((c) => c.timeframe === tf.id);
          const isUploaded = matchingCharts.length > 0;

          return (
            <div
              key={tf.id}
              className={`rounded-lg border p-3 flex flex-col justify-between transition-all ${
                isUploaded
                  ? 'bg-slate-950 border-amber-500/30'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    isUploaded
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tf.id}
                </span>
                {tf.isBaseline && (
                  <span className="text-[9px] font-mono text-amber-400/80 uppercase">
                    Req
                  </span>
                )}
              </div>

              {isUploaded ? (
                <div>
                  {matchingCharts.map((chart) => (
                    <div key={chart.id} className="relative group rounded overflow-hidden mb-1.5 border border-slate-800">
                      <img
                        src={chart.dataUrl}
                        alt={chart.label}
                        className="w-full h-20 object-cover bg-slate-900"
                      />
                      <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewChart(chart);
                          }}
                          className="p-1 rounded bg-slate-800 text-slate-200 hover:text-amber-400"
                          title="View High-Res"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveChart(chart.id);
                          }}
                          className="p-1 rounded bg-slate-800 text-slate-200 hover:text-rose-400"
                          title="Remove Chart"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {matchingCharts[0].label}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerUploadForTimeframe(tf.id)}
                  className="py-3 px-2 rounded border border-dashed border-slate-800 hover:border-slate-600 text-slate-500 hover:text-slate-300 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-mono">Upload {tf.id}</span>
                </button>
              )}

              <div className="mt-2 text-[9.5px] font-mono text-slate-500 truncate" title={tf.role}>
                {tf.role}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
