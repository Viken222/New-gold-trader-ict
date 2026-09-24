import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Copy, Check, FileDown, Terminal, ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight, MinusCircle, Zap } from 'lucide-react';
import { ScorecardMatrix } from './ScorecardMatrix';
import { QuadrantMeter } from './QuadrantMeter';

interface AnalysisTerminalProps {
  result: AnalysisResult;
  onOpenMt5Hub?: () => void;
}

export const AnalysisTerminal: React.FC<AnalysisTerminalProps> = ({ result, onOpenMt5Hub }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'setup' | 'structure' | 'arrays' | 'triggers' | 'audit'>('all');
  const [isSendingMt5, setIsSendingMt5] = useState(false);
  const [mt5SentMsg, setMt5SentMsg] = useState<string | null>(null);

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(result.ticket);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToMt5 = async () => {
    if (result.direction === 'STAND ASIDE') return;
    setIsSendingMt5(true);
    setMt5SentMsg(null);

    try {
      const entryMatch = result.entryZone.match(/(\d{3,4}\.\d{2})/);
      const slMatch = result.stopLoss.match(/(\d{3,4}\.\d{2})/);
      const tp1Match = result.tp1.match(/(\d{3,4}\.\d{2})/);
      const tp2Match = result.tp2.match(/(\d{3,4}\.\d{2})/);
      const lotsMatch = result.recommendedLots.match(/(\d+(\.\d+)?)/);

      const entry = entryMatch ? parseFloat(entryMatch[1]) : 4285.00;
      const sl = slMatch ? parseFloat(slMatch[1]) : (result.direction === 'LONG' ? entry - 4.5 : entry + 4.5);
      const tp1 = tp1Match ? parseFloat(tp1Match[1]) : (result.direction === 'LONG' ? entry + 6.0 : entry - 6.0);
      const tp2 = tp2Match ? parseFloat(tp2Match[1]) : (result.direction === 'LONG' ? entry + 15.0 : entry - 15.0);
      const lots = lotsMatch ? parseFloat(lotsMatch[1]) : 0.10;

      const action = result.direction === 'LONG' ? 'BUY_LIMIT' : 'SELL_LIMIT';

      const res = await fetch('/api/mt5/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'XAUUSD',
          action,
          entryPrice: entry,
          stopLoss: sl,
          takeProfit1: tp1,
          takeProfit2: tp2,
          lots: Math.max(0.01, lots),
          comment: `ICT:${result.archetype.split('—')[0].trim()}`,
          source: `${result.mode} (${result.grade} Grade)`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMt5SentMsg('Dispatched to MT5!');
        if (onOpenMt5Hub) onOpenMt5Hub();
        setTimeout(() => setMt5SentMsg(null), 3000);
      }
    } catch {
      setMt5SentMsg('Failed to push');
      setTimeout(() => setMt5SentMsg(null), 3000);
    } finally {
      setIsSendingMt5(false);
    }
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([result.rawOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICT_XAUUSD_${result.mode}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Institutional Execution Header Banner */}
      <div className={`rounded-xl border p-5 transition-all shadow-xl ${
        result.direction === 'LONG'
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40'
          : result.direction === 'SHORT'
          ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40'
          : 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-950 border-amber-500/30'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {result.direction === 'LONG' && (
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ArrowUpRight className="w-7 h-7" />
              </div>
            )}
            {result.direction === 'SHORT' && (
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <ArrowDownRight className="w-7 h-7" />
              </div>
            )}
            {result.direction === 'STAND ASIDE' && (
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <MinusCircle className="w-7 h-7" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                  result.direction === 'LONG'
                    ? 'bg-emerald-500 text-slate-950'
                    : result.direction === 'SHORT'
                    ? 'bg-rose-500 text-slate-950'
                    : 'bg-amber-500 text-slate-950'
                }`}>
                  {result.direction}
                </span>

                <span className="text-xs font-mono text-slate-300 font-semibold">
                  {result.archetype}
                </span>

                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Mode: {result.mode}
                </span>

                {result.engineSource && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Engine: {result.engineSource}
                  </span>
                )}
              </div>

              <div className="text-sm font-mono text-slate-200 font-semibold mt-1">
                Spot Gold (XAUUSD) • New York AM Algorithmic Execution
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result.direction !== 'STAND ASIDE' && (
              <button
                type="button"
                disabled={isSendingMt5}
                onClick={handleSendToMt5}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                {isSendingMt5 ? 'Sending...' : mt5SentMsg || 'Send to MT5'}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export MD
            </button>
            <button
              type="button"
              onClick={handleCopyTicket}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Ticket!' : 'Copy Ticket'}
            </button>
          </div>
        </div>

        {/* Executable One-Line Ticket Bar */}
        <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
            <code className="text-xs font-mono font-bold text-amber-300 whitespace-nowrap">
              {result.ticket}
            </code>
          </div>
        </div>
      </div>

      {/* Quick Trade Setup Metrics Strip */}
      {result.direction !== 'STAND ASIDE' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Entry Model / Zone</div>
            <div className="text-xs font-mono font-bold text-slate-100 truncate mt-0.5">
              {result.entryZone}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Protective Stop</div>
            <div className="text-xs font-mono font-bold text-rose-400 mt-0.5">
              {result.stopLoss} <span className="text-[10px] text-slate-400 font-normal">({result.stopDistanceDollars})</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Target 1 (Partials)</div>
            <div className="text-xs font-mono font-bold text-sky-400 mt-0.5">
              {result.tp1} <span className="text-[10px] text-slate-400 font-normal">({result.rrToTp1})</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Target 2 (Outer DOL)</div>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
              {result.tp2} <span className="text-[10px] text-slate-400 font-normal">({result.rrToTp2})</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Computed Lot Size</div>
            <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
              {result.recommendedLots}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Risked Capital</div>
            <div className="text-xs font-mono font-bold text-slate-100 mt-0.5">
              {result.riskAmountDollars}
            </div>
          </div>
        </div>
      )}

      {/* Quadrant Meter */}
      <QuadrantMeter keyLevels={result.keyLevels} direction={result.direction} />

      {/* 10-Point Scorecard */}
      <ScorecardMatrix
        scorecard={result.scorecard}
        confluenceScore={result.confluenceScore}
        grade={result.grade}
        confidenceScore={result.confidenceScore}
      />

      {/* Complete 6-Section Institutional Report */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-bold text-slate-100">
              OFFICIAL 6-SECTION ICT AUDIT DOSSIER
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {new Date(result.timestamp).toLocaleTimeString()} UTC
          </span>
        </div>

        <div className="p-5 space-y-6">
          {/* Section 1 */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300">
                1
              </span>
              SECTION 1: SESSION CONTEXT & TIME ALIGNMENT
            </div>
            <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.sections.section1}
            </div>
          </div>

          {/* Section 2 */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300">
                2
              </span>
              SECTION 2: MULTI-TIMEFRAME STRUCTURE & DRAW ON LIQUIDITY
            </div>
            <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.sections.section2}
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300">
                3
              </span>
              SECTION 3: ALGORITHMIC PRICE ARRAY ANALYSIS
            </div>
            <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.sections.section3}
            </div>
          </div>

          {/* Section 4 */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300">
                4
              </span>
              SECTION 4: STEP-BY-STEP TRADE SETUP & SIZING
            </div>
            <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.sections.section4}
            </div>
          </div>

          {/* Section 5 */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300">
                5
              </span>
              SECTION 5: EXECUTION TRIGGERS & INVALIDATION CONDITIONS
            </div>
            <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.sections.section5}
            </div>
          </div>

          {/* Section 6 */}
          <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-300">
                6
              </span>
              SECTION 6: ASSUMPTIONS, MISSING DATA & CONFIDENCE
            </div>
            <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.sections.section6}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
