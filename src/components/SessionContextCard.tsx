import React from 'react';
import { SessionContext, OperatingMode } from '../types';
import { DollarSign, ShieldAlert, Calendar, Layers, Calculator } from 'lucide-react';

interface SessionContextCardProps {
  context: SessionContext;
  mode: OperatingMode;
  onChange: (updated: Partial<SessionContext>) => void;
  onExecuteAnalysis: () => void;
  isLoading: boolean;
  canExecute: boolean;
}

const DAYS_OF_WEEK = [
  { day: 'Monday', note: 'Range establishment; beware Judas manipulation against true weekly trend' },
  { day: 'Tuesday', note: 'High reversal / continuation probability; weekly high/low formation' },
  { day: 'Wednesday', note: 'Classic weekly expansion / macro news injection day' },
  { day: 'Thursday', note: 'Continuation or second-chance retracements; high trend velocity' },
  { day: 'Friday', note: 'Weekly DOL completion; PM profit-taking and early session wrap' },
];

export const SessionContextCard: React.FC<SessionContextCardProps> = ({
  context,
  mode,
  onChange,
  onExecuteAnalysis,
  isLoading,
  canExecute,
}) => {
  const [stopDistanceInput, setStopDistanceInput] = React.useState<number>(4.5);

  // Calculate position sizing according to ICT rules:
  // Risk = Equity * Risk%
  // 1 standard lot on XAUUSD = 100 oz -> $1.00 move = $100 per lot.
  // Lot size = Risk in $ / (Stop Distance in $ * 100)
  const riskAmount = (context.accountEquity * context.riskPercent) / 100;
  const calculatedLots = stopDistanceInput > 0
    ? (riskAmount / (stopDistanceInput * 100)).toFixed(2)
    : '0.00';

  const selectedDayInfo = DAYS_OF_WEEK.find((d) => d.day === context.dayOfWeek) || DAYS_OF_WEEK[1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-mono font-bold text-slate-100">
            NARRATIVE PARAMETERS & RISK ENGINE
          </h2>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Gold Standard: $1.00 move = $100 per standard lot (100 oz)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Day of Week */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Day of Week (Rhythm)
          </label>
          <select
            value={context.dayOfWeek}
            onChange={(e) => onChange({ dayOfWeek: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.day} value={d.day}>
                {d.day}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] font-mono text-slate-500 truncate" title={selectedDayInfo.note}>
            {selectedDayInfo.note}
          </p>
        </div>

        {/* Daily Open Price */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            Daily Open (PO5 Anchor)
          </label>
          <input
            type="text"
            value={context.dailyOpenPrice}
            onChange={(e) => onChange({ dailyOpenPrice: e.target.value })}
            placeholder="e.g. 2651.00"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <p className="mt-1 text-[10px] font-mono text-slate-500">
            Bullish: Buy BELOW open. Bearish: Sell ABOVE open.
          </p>
        </div>

        {/* Account Equity */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            Account Equity ($)
          </label>
          <input
            type="number"
            value={context.accountEquity}
            onChange={(e) => onChange({ accountEquity: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <p className="mt-1 text-[10px] font-mono text-slate-500">
            Risk at {context.riskPercent}%: <strong className="text-amber-400">${riskAmount.toFixed(2)}</strong>
          </p>
        </div>

        {/* Risk % per trade */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5">
            Risk Per Trade (0.5%–1.0%)
          </label>
          <div className="flex items-center gap-2">
            {[0.5, 0.75, 1.0].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChange({ riskPercent: r })}
                className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all ${
                  context.riskPercent === r
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] font-mono text-slate-500">
            ICT Rule: Max 1.0% per trade, 2 loss circuit breaker.
          </p>
        </div>
      </div>

      {/* Lot Sizing Live Estimator */}
      <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Calculator className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono text-slate-300 font-medium">Quick Lot Sizing Drill:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">Stop Dist:</span>
            <input
              type="number"
              step="0.1"
              value={stopDistanceInput}
              onChange={(e) => setStopDistanceInput(parseFloat(e.target.value) || 1)}
              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-amber-300 text-right focus:outline-none"
            />
            <span className="text-[11px] font-mono text-slate-400">$/oz</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400">Risked Amount: </span>
            <span className="text-slate-100 font-bold">${riskAmount.toFixed(2)}</span>
          </div>
          <div className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
            Computed Size: {calculatedLots} Standard Lots
          </div>
        </div>
      </div>

      {/* Detected & Calibrated Chart Price Levels */}
      <div className="bg-slate-950 rounded-lg p-3.5 border border-amber-500/20 mb-4">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-mono font-bold text-amber-300">
              DETECTED CHART PRICES & CALIBRATION (AUTO-EXTRACTED FROM UPLOADED CHARTS)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Guarantees analysis uses actual chart prices
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Current Price</label>
            <input
              type="text"
              value={context.calibratedPrices?.currentPrice || ''}
              onChange={(e) =>
                onChange({
                  calibratedPrices: {
                    ...context.calibratedPrices,
                    currentPrice: e.target.value,
                  },
                })
              }
              placeholder="e.g. 4285.50"
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Range High (100%)</label>
            <input
              type="text"
              value={context.calibratedPrices?.rangeHigh || ''}
              onChange={(e) =>
                onChange({
                  calibratedPrices: {
                    ...context.calibratedPrices,
                    rangeHigh: e.target.value,
                  },
                })
              }
              placeholder="e.g. 4290.50"
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Range Low (0%)</label>
            <input
              type="text"
              value={context.calibratedPrices?.rangeLow || ''}
              onChange={(e) =>
                onChange({
                  calibratedPrices: {
                    ...context.calibratedPrices,
                    rangeLow: e.target.value,
                  },
                })
              }
              placeholder="e.g. 4278.00"
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">Key FVG CE</label>
            <input
              type="text"
              value={context.calibratedPrices?.keyArrayCe || ''}
              onChange={(e) =>
                onChange({
                  calibratedPrices: {
                    ...context.calibratedPrices,
                    keyArrayCe: e.target.value,
                  },
                })
              }
              placeholder="e.g. 4284.50"
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">PDH (External DOL)</label>
            <input
              type="text"
              value={context.calibratedPrices?.pdh || ''}
              onChange={(e) =>
                onChange({
                  calibratedPrices: {
                    ...context.calibratedPrices,
                    pdh: e.target.value,
                  },
                })
              }
              placeholder="e.g. 4303.40"
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">PDL (External DOL)</label>
            <input
              type="text"
              value={context.calibratedPrices?.pdl || ''}
              onChange={(e) =>
                onChange({
                  calibratedPrices: {
                    ...context.calibratedPrices,
                    pdl: e.target.value,
                  },
                })
              }
              placeholder="e.g. 4273.80"
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Context notes or Outcome notes for Review Mode */}
      {mode === 'REVIEW' ? (
        <div className="mb-4">
          <label className="block text-xs font-mono text-amber-400 mb-1">
            Session Review Mode — Outcome Notes & Follow-up Chart Context:
          </label>
          <textarea
            rows={2}
            value={context.reviewOutcomeNotes || ''}
            onChange={(e) => onChange({ reviewOutcomeNotes: e.target.value })}
            placeholder="Describe what occurred after the session: Did price tap entry? Hit TP1 or TP2? Was stop triggered or did the 11:30 time-stop fire?"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-xs font-mono text-slate-400 mb-1">
            Optional Macro / News Notes (e.g., CPI release at 08:30, DXY SMT divergence, FOMC):
          </label>
          <input
            type="text"
            value={context.customNotes || ''}
            onChange={(e) => onChange({ customNotes: e.target.value })}
            placeholder="e.g. 08:30 Core CPI release, DXY sweeping previous week high, XAG SMT confirmation"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
      )}

      {/* Primary Execution CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs font-mono text-slate-400">
          Strict ICT 2024 algorithmic delivery • Zero price fabrication • Hard invalidation checks
        </div>

        <button
          type="button"
          disabled={!canExecute || isLoading}
          onClick={onExecuteAnalysis}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
            canExecute && !isLoading
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Multi-Timeframe Charts...</span>
            </>
          ) : (
            <>
              <span>Execute ICT Algorithmic Audit</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
