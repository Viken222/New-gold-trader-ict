import React from 'react';
import { OperatingMode } from '../types';
import { ShieldCheck, Flame, RotateCcw, Clock, AlertTriangle, Zap } from 'lucide-react';

interface NavbarProps {
  mode: OperatingMode;
  onModeChange: (m: OperatingMode) => void;
  activeWindow: string;
  hasBaselineCharts: boolean;
  onLoadPreset: (presetId: string) => void;
  onReset: () => void;
  onToggleMt5?: () => void;
  isMt5Connected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onModeChange,
  activeWindow,
  hasBaselineCharts,
  onLoadPreset,
  onReset,
  onToggleMt5,
  isMt5Connected = false,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-400/30">
            <span className="font-mono font-black text-slate-950 text-base">AU</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-slate-100 text-base tracking-tight">
                ICT XAUUSD ALGORITHMIC ANALYST
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                v3 Mentorship
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Core NY AM Session (14:30–18:30 EAT / 07:30–11:30 NY) • Spot Gold Specialist
            </p>
          </div>
        </div>

        {/* Operating Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onModeChange('FULL-MTF')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded transition-all ${
              mode === 'FULL-MTF'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FULL-MTF
          </button>
          <button
            type="button"
            onClick={() => onModeChange('QUICK-READ')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded transition-all ${
              mode === 'QUICK-READ'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QUICK-READ
          </button>
          <button
            type="button"
            onClick={() => onModeChange('REVIEW')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded transition-all ${
              mode === 'REVIEW'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            REVIEW MODE
          </button>
        </div>

        {/* Quick Demo Presets & MT5 Bridge */}
        <div className="flex items-center gap-2">
          {onToggleMt5 && (
            <button
              type="button"
              onClick={onToggleMt5}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                isMt5Connected
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
              }`}
              title="Open MT5 Institutional Execution Hub"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>MT5 BOT</span>
              <span className={`w-2 h-2 rounded-full ${isMt5Connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">Demos:</span>
            <button
              type="button"
              onClick={() => onLoadPreset('preset-silver-bullet-bullish')}
              className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition-colors"
              title="Load Silver Bullet Bullish BISI Setup"
            >
              P2: Silver Bullet
            </button>
            <button
              type="button"
              onClick={() => onLoadPreset('preset-judas-news-reversal')}
              className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 transition-colors"
              title="Load 08:30 Judas News Sweep Reversal"
            >
              P1: Judas Sweep
            </button>
            <button
              type="button"
              onClick={() => onLoadPreset('preset-consolidation-stand-aside')}
              className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 transition-colors"
              title="Load Consolidation Stand Aside Example"
            >
              Stand Aside
            </button>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded border border-slate-800 transition-colors"
            title="Reset Workspace"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
