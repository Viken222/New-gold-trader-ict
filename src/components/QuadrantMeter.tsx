import React from 'react';
import { AlgorithmicKeyLevels, TradeDirection } from '../types';
import { Sliders, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

interface QuadrantMeterProps {
  keyLevels: AlgorithmicKeyLevels;
  direction: TradeDirection;
}

export const QuadrantMeter: React.FC<QuadrantMeterProps> = ({
  keyLevels,
  direction,
}) => {
  const high = parseFloat(keyLevels.dealingRangeHigh || '4290.00');
  const low = parseFloat(keyLevels.dealingRangeLow || '4275.00');
  const eq = parseFloat(keyLevels.equilibrium50 || ((high + low) / 2).toFixed(2));
  const q25 = parseFloat(keyLevels.discount25 || (low + (high - low) * 0.25).toFixed(2));
  const q75 = parseFloat(keyLevels.premium75 || (low + (high - low) * 0.75).toFixed(2));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-bold text-slate-100">
              DEALING RANGE & QUADRANT LIQUIDITY ENGINE
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            15M Active Dealing Range (0% ↔ 100%) • Strict Premium vs Discount Array Filter
          </p>
        </div>

        <div className="flex items-center gap-2">
          {direction === 'LONG' && (
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">
              <ArrowUpRight className="w-3.5 h-3.5" />
              BULLISH BIAS: DISCOUNT ONLY (≤ 50% / ≤ 25%)
            </span>
          )}
          {direction === 'SHORT' && (
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-rose-400 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30">
              <ArrowDownRight className="w-3.5 h-3.5" />
              BEARISH BIAS: PREMIUM ONLY (≥ 50% / ≥ 75%)
            </span>
          )}
          {direction === 'STAND ASIDE' && (
            <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30">
              EQUILIBRIUM CHOP (40%–60%) • STAND ASIDE
            </span>
          )}
        </div>
      </div>

      {/* Visual Quadrant Bar */}
      <div className="relative pt-6 pb-4">
        {/* Track */}
        <div className="h-6 w-full rounded-lg overflow-hidden flex border border-slate-700 bg-slate-950">
          <div className="w-1/4 bg-emerald-950/40 border-r border-slate-700 flex items-center justify-center text-[10px] font-mono text-emerald-400 font-bold">
            0% – 25% (DEEP DISCOUNT)
          </div>
          <div className="w-1/4 bg-emerald-950/20 border-r border-slate-700 flex items-center justify-center text-[10px] font-mono text-emerald-300 font-semibold">
            25% – 50% (DISCOUNT)
          </div>
          <div className="w-1/4 bg-rose-950/20 border-r border-slate-700 flex items-center justify-center text-[10px] font-mono text-rose-300 font-semibold">
            50% – 75% (PREMIUM)
          </div>
          <div className="w-1/4 bg-rose-950/40 flex items-center justify-center text-[10px] font-mono text-rose-400 font-bold">
            75% – 100% (DEEP PREMIUM)
          </div>
        </div>

        {/* Level Markers */}
        <div className="flex justify-between text-xs font-mono mt-2 text-slate-300">
          <div className="text-left">
            <div className="text-slate-400 text-[10px]">0% Range Low</div>
            <div className="font-bold">{low.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-emerald-400 text-[10px]">25% Discount</div>
            <div className="font-bold text-emerald-300">{q25.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-amber-400 text-[10px]">50% Equilibrium</div>
            <div className="font-bold text-amber-300">{eq.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-rose-400 text-[10px]">75% Premium</div>
            <div className="font-bold text-rose-300">{q75.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-[10px]">100% Range High</div>
            <div className="font-bold">{high.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Institutional Reference Levels Chips */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-slate-400 text-[11px] uppercase mr-1">Liquidity Anchors:</span>
        {keyLevels.dailyOpen && (
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-sky-400">
            Daily Open: <strong className="text-slate-100">{keyLevels.dailyOpen}</strong>
          </span>
        )}
        {keyLevels.primaryDol && (
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400">
            Primary DOL (ERL): <strong className="text-slate-100">{keyLevels.primaryDol}</strong>
          </span>
        )}
        {keyLevels.alternateDol && (
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-amber-400">
            Alternate DOL: <strong className="text-slate-100">{keyLevels.alternateDol}</strong>
          </span>
        )}
      </div>
    </div>
  );
};
