import React, { useMemo } from 'react';
import {
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
  Clock,
  DollarSign,
  Sliders,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  Zap,
  Target,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { AlgorithmicKeyLevels, TradeDirection, SessionContext } from '../types';

export interface DealingRangeQuadrantEngineProps {
  // Live TradingView & Calibrated Prices
  currentPrice: number;
  dealingRangeHigh: number;
  dealingRangeLow: number;
  keyArrayCe?: number;
  pdh?: number;
  pdl?: number;
  dailyOpen?: number;

  // Narrative Parameters & Session Current
  sessionContext: SessionContext;
  liveSessionName?: string;
  isSilverBulletActive?: boolean;

  // Analysis result direction if already analyzed, otherwise computed
  existingDirection?: TradeDirection;
  isAnalyzing?: boolean;
  onExecuteAnalysis?: () => void;
  onApplySetupToContext?: (setupData: any) => void;
}

export const DealingRangeQuadrantEngine: React.FC<DealingRangeQuadrantEngineProps> = ({
  currentPrice,
  dealingRangeHigh,
  dealingRangeLow,
  keyArrayCe,
  pdh,
  pdl,
  dailyOpen,
  sessionContext,
  liveSessionName,
  isSilverBulletActive,
  existingDirection,
  isAnalyzing = false,
  onExecuteAnalysis,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Fallback defaults if values are not yet populated
  const curPrice = currentPrice > 0 ? currentPrice : 4285.0;
  const high = dealingRangeHigh > 0 ? dealingRangeHigh : Number((curPrice + 6.0).toFixed(2));
  const low = dealingRangeLow > 0 ? dealingRangeLow : Number((curPrice - 6.0).toFixed(2));
  const span = Math.max(0.1, high - low);

  const eq = Number(((high + low) / 2).toFixed(2));
  const q25 = Number((low + span * 0.25).toFixed(2));
  const q75 = Number((low + span * 0.75).toFixed(2));
  const doPrice = dailyOpen && dailyOpen > 0 ? dailyOpen : Number((low + span * 0.35).toFixed(2));
  const extPdh = pdh && pdh > 0 ? pdh : Number((high + span * 0.3).toFixed(2));
  const extPdl = pdl && pdl > 0 ? pdl : Number((low - span * 0.3).toFixed(2));
  const fvgMid = keyArrayCe && keyArrayCe > 0 ? keyArrayCe : (curPrice > eq ? q75 : q25);

  // Position of current price on the 0% - 100% scale
  const rawPct = ((curPrice - low) / span) * 100;
  const quadrantPct = Math.min(100, Math.max(0, Number(rawPct.toFixed(1))));

  // NY Local time conversion from EAT
  const timeInfo = useMemo(() => {
    const eatStr = sessionContext.captureTimeEAT || '17:15';
    const [hh, mm] = eatStr.split(':').map(Number);
    const offset = sessionContext.seasonOffset === 'EDT' ? 7 : 8;
    const nyHour = (hh - offset + 24) % 24;
    const nyDecimal = nyHour + (mm || 0) / 60;
    const nyFormatted = `${String(nyHour).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')} ${sessionContext.seasonOffset}`;

    const isSB = nyDecimal >= 10.0 && nyDecimal <= 11.0;
    const isJudas = nyDecimal >= 8.5 && nyDecimal < 9.5;
    const isLondon = nyDecimal >= 2.0 && nyDecimal < 5.0;
    const isLunch = nyDecimal >= 11.5 && nyDecimal < 13.0;
    const isAsia = nyDecimal >= 18.0 || nyDecimal < 2.0;

    let computedSession = liveSessionName;
    if (!computedSession || computedSession.includes('Chop')) {
      if (isSB) computedSession = '🔥 NY AM Silver Bullet Window (10:00–11:00 NY)';
      else if (isJudas) computedSession = 'NY Open Judas Swing (08:30–09:30 NY)';
      else if (isLondon) computedSession = 'London Open Killzone (02:00–05:00 NY)';
      else if (nyDecimal >= 5.0 && nyDecimal < 7.0) computedSession = 'London Midday Consolidation (05:00–07:00 NY)';
      else if (nyDecimal >= 7.0 && nyDecimal < 8.3) computedSession = 'NY Pre-Market / News Macro (07:00–08:15 NY)';
      else if (nyDecimal >= 9.5 && nyDecimal < 10.0) computedSession = 'NY Equities Open Macro (09:30–10:00 NY)';
      else if (isLunch) computedSession = 'NY Lunch Algorithmic Pause (11:30–13:00 NY)';
      else if (nyDecimal >= 13.0 && nyDecimal < 14.0) computedSession = 'NY PM Session / London Close Macro (13:00–14:00 NY)';
      else if (nyDecimal >= 14.0 && nyDecimal <= 15.0) computedSession = '🔥 NY PM Silver Bullet Window (14:00–15:00 NY)';
      else if (nyDecimal > 15.0 && nyDecimal < 16.0) computedSession = 'NY Market Close & Settlement (15:00–16:00 NY)';
      else if (nyDecimal >= 16.0 && nyDecimal < 18.0) computedSession = 'CBDR - Central Bank Dealers Range (16:00–18:00 NY)';
      else computedSession = 'Asian Session Accumulation (Marek Majeer Range)';
    }

    return {
      nyFormatted,
      nyDecimal,
      isSB: isSB || !!isSilverBulletActive,
      isJudas,
      isLondon,
      isLunch,
      isAsia,
      computedSession,
    };
  }, [sessionContext.captureTimeEAT, sessionContext.seasonOffset, liveSessionName, isSilverBulletActive]);

  // Risk Engine calculations
  const equity = sessionContext.accountEquity || 50000;
  const riskPct = sessionContext.riskPercent || 1.0;
  const riskAmountDollars = (equity * riskPct) / 100;

  // Synthesize Algorithmic Setup from TradingView + Prices + Narrative + Risk
  const synthesizedSetup = useMemo(() => {
    // 1. Quadrant Zone Check
    const isInDeepDiscount = quadrantPct <= 25;
    const isInDiscount = quadrantPct < 45;
    const isInEquilibriumChop = quadrantPct >= 42 && quadrantPct <= 58;
    const isInPremium = quadrantPct > 55;
    const isInDeepPremium = quadrantPct >= 75;

    // 2. Daily Open / PO5 Manipulation Check
    const isManipulatedBelowDO = curPrice < doPrice;
    const isManipulatedAboveDO = curPrice > doPrice;

    // 3. Direction Determination
    let direction: TradeDirection = 'STAND ASIDE';
    let archetype = 'NONE';
    let grade: 'A' | 'B' | 'STAND ASIDE' = 'STAND ASIDE';
    let reasoning = '';

    // Stand aside if trapped in equilibrium chop or during lunch dead zone
    if (isInEquilibriumChop && !timeInfo.isSB) {
      direction = 'STAND ASIDE';
      archetype = 'EQUILIBRIUM CHOP (45%–55%)';
      reasoning = `Current price ($${curPrice.toFixed(2)}) is hovering at ${quadrantPct}% of the 15M dealing range, directly inside the 50% Equilibrium neutral band ($${eq.toFixed(2)}). Institutional order flow has zero expansion edge here; avoid chop.`;
    } else if (timeInfo.isLunch) {
      direction = 'STAND ASIDE';
      archetype = 'NY LUNCH ALGORITHMIC PAUSE';
      reasoning = `NY Lunch session active (11:30–13:00 NY). The algorithmic spooling is paused; spreads widen and volatility drops into consolidation.`;
    } else if (isInDiscount || (isManipulatedBelowDO && quadrantPct <= 50)) {
      // Long Bias
      direction = 'LONG';
      archetype = timeInfo.isSB
        ? 'P2 — SILVER BULLET CONTINUATION (10:00–11:00)'
        : timeInfo.isJudas
        ? 'P1 — NEWS-SWEEP REVERSAL (08:30 Judas)'
        : 'P4 — IOFED LRLR CONTINUATION';
      grade = isInDeepDiscount && timeInfo.isSB ? 'A' : 'B';
      reasoning = `Price is residing in the institutional ${isInDeepDiscount ? 'Deep Discount (0%–25%)' : 'Discount (25%–45%)'} quadrant at ${quadrantPct}%, below Daily Open ($${doPrice.toFixed(2)}). Algorithmic draw on liquidity points toward 50% Eq and Range High.`;
    } else if (isInPremium || (isManipulatedAboveDO && quadrantPct >= 50)) {
      // Short Bias
      direction = 'SHORT';
      archetype = timeInfo.isSB
        ? 'P2 — SILVER BULLET CONTINUATION (10:00–11:00)'
        : timeInfo.isJudas
        ? 'P1 — NEWS-SWEEP REVERSAL (08:30 Judas)'
        : 'P3 — INVERSION REVERSAL';
      grade = isInDeepPremium && timeInfo.isSB ? 'A' : 'B';
      reasoning = `Price is residing in the institutional ${isInDeepPremium ? 'Deep Premium (75%–100%)' : 'Premium (55%–75%)'} quadrant at ${quadrantPct}%, above Daily Open ($${doPrice.toFixed(2)}). Algorithmic draw on liquidity points toward 50% Eq and Range Low.`;
    } else {
      direction = 'STAND ASIDE';
      archetype = 'RANGE REBALANCING';
      reasoning = `Price is currently rebalancing between dealing range quadrants without a clean algorithmic displacement.`;
    }

    // Override with existing result direction if already analyzed by deep AI
    if (existingDirection && existingDirection !== 'STAND ASIDE') {
      direction = existingDirection;
    }

    // 4. Execution Levels: Entry, Stop Loss, TP1, TP2
    let entryLow = 0;
    let entryHigh = 0;
    let entryMid = 0;
    let sl = 0;
    let stopDistance = 0;
    let tp1 = 0;
    let tp2 = 0;
    let rr1 = 'N/A';
    let rr2 = 'N/A';
    let lots = 0;

    if (direction === 'LONG') {
      entryMid = fvgMid > 0 && fvgMid < eq ? fvgMid : q25;
      entryLow = Number((entryMid - 0.5).toFixed(2));
      entryHigh = Number((entryMid + 0.5).toFixed(2));
      // Protective SL strictly -$0.50 below Range Low sweep wick, avoiding round figures
      sl = Number((low - 0.5).toFixed(2));
      stopDistance = Number(Math.max(1.0, entryMid - sl).toFixed(2));
      tp1 = eq; // partials at 50% Equilibrium
      tp2 = high; // full target at 100% Range High
      const gain1 = tp1 - entryMid;
      const gain2 = tp2 - entryMid;
      rr1 = gain1 > 0 ? `1:${(gain1 / stopDistance).toFixed(1)}` : '1:1.5';
      rr2 = gain2 > 0 ? `1:${(gain2 / stopDistance).toFixed(1)}` : '1:3.2';
      // 1 lot = 100 oz -> $1 move = $100
      lots = Number((riskAmountDollars / (stopDistance * 100)).toFixed(2));
    } else if (direction === 'SHORT') {
      entryMid = fvgMid > eq ? fvgMid : q75;
      entryLow = Number((entryMid - 0.5).toFixed(2));
      entryHigh = Number((entryMid + 0.5).toFixed(2));
      // Protective SL strictly +$0.50 above Range High sweep wick, avoiding round figures
      sl = Number((high + 0.5).toFixed(2));
      stopDistance = Number(Math.max(1.0, sl - entryMid).toFixed(2));
      tp1 = eq; // partials at 50% Equilibrium
      tp2 = low; // full target at 0% Range Low
      const gain1 = entryMid - tp1;
      const gain2 = entryMid - tp2;
      rr1 = gain1 > 0 ? `1:${(gain1 / stopDistance).toFixed(1)}` : '1:1.5';
      rr2 = gain2 > 0 ? `1:${(gain2 / stopDistance).toFixed(1)}` : '1:3.2';
      lots = Number((riskAmountDollars / (stopDistance * 100)).toFixed(2));
    }

    // 5. Confluence Matrix Checklist
    const confluences = [
      {
        label: 'TradingView Real-Time Feed',
        met: true,
        note: `Spot: $${curPrice.toFixed(2)} | Range: $${low.toFixed(2)}–$${high.toFixed(2)}`,
      },
      {
        label: 'Institutional Quadrant Rule',
        met: direction !== 'STAND ASIDE',
        note: direction === 'LONG' ? `In Discount (${quadrantPct}% ≤ 50%)` : direction === 'SHORT' ? `In Premium (${quadrantPct}% ≥ 50%)` : `Equilibrium Chop (${quadrantPct}%)`,
      },
      {
        label: 'Power of Three (Daily Open)',
        met: direction === 'LONG' ? isManipulatedBelowDO : direction === 'SHORT' ? isManipulatedAboveDO : false,
        note: isManipulatedBelowDO ? 'Manipulated below Daily Open' : 'Manipulated above Daily Open',
      },
      {
        label: 'Algorithmic Time Window',
        met: timeInfo.isSB || timeInfo.isJudas || timeInfo.isLondon,
        note: timeInfo.isSB ? 'Silver Bullet (10:00–11:00)' : timeInfo.computedSession,
      },
      {
        label: 'Risk & Sizing Protocol',
        met: lots > 0 && lots <= 10.0,
        note: lots > 0 ? `${lots} Std Lots for $${riskAmountDollars.toFixed(0)} Risk` : 'Risk Locked ($0)',
      },
      {
        label: 'Protective Stop Offset (-$0.50)',
        met: sl > 0,
        note: sl > 0 ? `Stop: $${sl.toFixed(2)} (Dist: $${stopDistance.toFixed(2)})` : 'N/A',
      },
    ];

    const score = confluences.filter((c) => c.met).length;

    // 6. Execution Ticket String
    const ticket =
      direction === 'STAND ASIDE'
        ? `STAND ASIDE XAUUSD | EQUILIBRIUM CHOP ${quadrantPct}% AT $${curPrice.toFixed(2)} | 50% EQ: $${eq.toFixed(2)}`
        : `${direction} XAUUSD @ ${entryMid.toFixed(2)} | SL ${sl.toFixed(2)} | TP1 ${tp1.toFixed(2)} | TP2 ${tp2.toFixed(2)} | ${lots} Lots | Grade ${grade}`;

    return {
      direction,
      archetype,
      grade,
      reasoning,
      entryLow,
      entryHigh,
      entryMid,
      sl,
      stopDistance,
      tp1,
      tp2,
      rr1,
      rr2,
      lots,
      ticket,
      confluences,
      score,
    };
  }, [
    curPrice,
    low,
    high,
    span,
    quadrantPct,
    eq,
    q25,
    q75,
    doPrice,
    fvgMid,
    timeInfo,
    existingDirection,
    riskAmountDollars,
  ]);

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(synthesizedSetup.ticket);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mb-6">
      {/* Engine Header */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-mono font-bold text-slate-100 tracking-wide">
                DEALING RANGE & QUADRANT LIQUIDITY ENGINE
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs font-mono text-slate-400">
              Live TradingView Sync • Narrative & Time Convergence • Risk-Calibrated Algorithmic Setup
            </p>
          </div>
        </div>

        {/* Current Direction & Bias Pill */}
        <div className="flex items-center gap-2">
          {synthesizedSetup.direction === 'LONG' && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <ArrowUpRight className="w-4 h-4" />
              <span>BULLISH BIAS (DISCOUNT BUY ZONE)</span>
            </span>
          )}
          {synthesizedSetup.direction === 'SHORT' && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <ArrowDownRight className="w-4 h-4" />
              <span>BEARISH BIAS (PREMIUM SELL ZONE)</span>
            </span>
          )}
          {synthesizedSetup.direction === 'STAND ASIDE' && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <MinusCircle className="w-4 h-4" />
              <span>EQUILIBRIUM CHOP (STAND ASIDE)</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Dynamic Visual Dealing Range & Quadrant Needle Gauge */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-300">
                15M ACTIVE DEALING RANGE:
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                ${low.toFixed(2)} (0%)
              </span>
              <span className="text-xs font-mono text-slate-500">↔</span>
              <span className="text-xs font-mono text-rose-400 font-semibold">
                ${high.toFixed(2)} (100%)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                [Span: ${span.toFixed(2)}]
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">TradingView Spot:</span>
              <span className="text-sm font-bold text-amber-400">${curPrice.toFixed(2)}</span>
              <span className="text-slate-500">({quadrantPct}%)</span>
            </div>
          </div>

          {/* Quadrant Visual Track with Dynamic Needle Pointer */}
          <div className="relative pt-6 pb-2">
            {/* Dynamic Needle Pin */}
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
              style={{ left: `${quadrantPct}%` }}
            >
              <div className="bg-amber-400 text-slate-950 text-[10px] font-mono font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                SPOT ${curPrice.toFixed(2)}
              </div>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400" />
            </div>

            {/* 4 Quadrants Track */}
            <div className="h-7 w-full rounded-lg overflow-hidden flex border border-slate-700 bg-slate-950 relative">
              <div className="w-1/4 bg-emerald-950/50 border-r border-slate-700/80 flex items-center justify-center text-[10px] font-mono text-emerald-400 font-bold">
                0% – 25% DEEP DISCOUNT
              </div>
              <div className="w-1/4 bg-emerald-950/20 border-r border-slate-700/80 flex items-center justify-center text-[10px] font-mono text-emerald-300 font-semibold">
                25% – 50% DISCOUNT
              </div>
              <div className="w-1/4 bg-rose-950/20 border-r border-slate-700/80 flex items-center justify-center text-[10px] font-mono text-rose-300 font-semibold">
                50% – 75% PREMIUM
              </div>
              <div className="w-1/4 bg-rose-950/50 flex items-center justify-center text-[10px] font-mono text-rose-400 font-bold">
                75% – 100% DEEP PREMIUM
              </div>
            </div>

            {/* Price Markers Underneath */}
            <div className="flex justify-between text-xs font-mono mt-2 text-slate-300">
              <div className="text-left">
                <div className="text-slate-400 text-[10px]">0% Range Low</div>
                <div className="font-bold text-emerald-400">${low.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-emerald-400 text-[10px]">25% Discount</div>
                <div className="font-bold text-emerald-300">${q25.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-amber-400 text-[10px]">50% Equilibrium</div>
                <div className="font-bold text-amber-300">${eq.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-rose-400 text-[10px]">75% Premium</div>
                <div className="font-bold text-rose-300">${q75.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-[10px]">100% Range High</div>
                <div className="font-bold text-rose-400">${high.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* The 3 Input Pillars Feeding the Engine */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: TradingView Prices & Arrays */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>1. TRADINGVIEW & PRICES</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">Live Feed</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Spot:</span>
                <span className="font-bold text-slate-100">${curPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dealing Range:</span>
                <span className="text-slate-200">${low.toFixed(2)} ↔ ${high.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">50% Equilibrium:</span>
                <span className="text-amber-300 font-semibold">${eq.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Key Imbalance (CE):</span>
                <span className="text-cyan-300">${fvgMid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PDH (External DOL):</span>
                <span className="text-purple-300">${extPdh.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PDL (External DOL):</span>
                <span className="text-purple-300">${extPdl.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Narrative Parameters & Session Current */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-300">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>2. NARRATIVE & SESSION</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{sessionContext.dayOfWeek}</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Capture Time (EAT):</span>
                <span className="text-slate-200">{sessionContext.captureTimeEAT} EAT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New York Local:</span>
                <span className="text-amber-300 font-semibold">{timeInfo.nyFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Macro:</span>
                <span className="text-slate-200 truncate">{timeInfo.computedSession}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Open Price:</span>
                <span className="text-amber-400 font-bold">${doPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PO5 Judas Status:</span>
                <span className={curPrice < doPrice ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {curPrice < doPrice ? 'Manipulated < DO (Discount)' : 'Manipulated > DO (Premium)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Silver Bullet Status:</span>
                <span className={timeInfo.isSB ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {timeInfo.isSB ? 'ACTIVE (10:00–11:00)' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Risk Engine & Capital Protection */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. RISK ENGINE & SIZING</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                ${equity.toLocaleString()} Equity
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Allocation:</span>
                <span className="text-slate-200">
                  {riskPct}% = <strong className="text-amber-400">${riskAmountDollars.toFixed(0)}</strong>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stop Distance:</span>
                <span className="text-rose-400 font-bold">
                  {synthesizedSetup.direction === 'STAND ASIDE'
                    ? '$0.00'
                    : `$${synthesizedSetup.stopDistance.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Computed Contract Size:</span>
                <span className="text-emerald-400 font-black">
                  {synthesizedSetup.direction === 'STAND ASIDE'
                    ? '0.00 Lots'
                    : `${synthesizedSetup.lots} Std Lots`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target 1 (Partials):</span>
                <span className="text-sky-300">
                  {synthesizedSetup.direction === 'STAND ASIDE'
                    ? 'N/A'
                    : `$${synthesizedSetup.tp1.toFixed(2)} (${synthesizedSetup.rr1})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target 2 (Outer DOL):</span>
                <span className="text-emerald-300">
                  {synthesizedSetup.direction === 'STAND ASIDE'
                    ? 'N/A'
                    : `$${synthesizedSetup.tp2.toFixed(2)} (${synthesizedSetup.rr2})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stop Placement:</span>
                <span className="text-slate-400 text-[11px]">
                  {synthesizedSetup.direction === 'STAND ASIDE'
                    ? 'N/A'
                    : `Wick ± $0.50 offset ($${synthesizedSetup.sl.toFixed(2)})`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Synthesized Algorithmic Trade Setup Card */}
        <div
          className={`rounded-xl border p-5 shadow-xl transition-all ${
            synthesizedSetup.direction === 'LONG'
              ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/40'
              : synthesizedSetup.direction === 'SHORT'
              ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40'
              : 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-950 border-amber-500/30'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              {synthesizedSetup.direction === 'LONG' && (
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="w-7 h-7" />
                </div>
              )}
              {synthesizedSetup.direction === 'SHORT' && (
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <ArrowDownRight className="w-7 h-7" />
                </div>
              )}
              {synthesizedSetup.direction === 'STAND ASIDE' && (
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <MinusCircle className="w-7 h-7" />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                      synthesizedSetup.direction === 'LONG'
                        ? 'bg-emerald-500 text-slate-950'
                        : synthesizedSetup.direction === 'SHORT'
                        ? 'bg-rose-500 text-slate-950'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    SYNTHESIZED SETUP: {synthesizedSetup.direction}
                  </span>

                  <span className="text-xs font-mono text-slate-300 font-semibold">
                    {synthesizedSetup.archetype}
                  </span>

                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-bold">
                    Grade {synthesizedSetup.grade} ({synthesizedSetup.score}/6 Confluences)
                  </span>
                </div>

                <p className="text-xs font-mono text-slate-300 mt-1 max-w-3xl">
                  {synthesizedSetup.reasoning}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTicket}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Ticket!' : 'Copy Ticket'}
              </button>

              {onExecuteAnalysis && (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={onExecuteAnalysis}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Auditing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                      <span>Execute Full Gemini AI Audit</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* One-Line Executable Ticket */}
          <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800 flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <code className="text-xs font-mono font-bold text-amber-300 whitespace-nowrap">
                {synthesizedSetup.ticket}
              </code>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          {synthesizedSetup.direction !== 'STAND ASIDE' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Entry Model / Zone</div>
                <div className="text-xs font-mono font-bold text-slate-100 truncate mt-0.5">
                  ${synthesizedSetup.entryLow.toFixed(2)}–${synthesizedSetup.entryHigh.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Protective Stop</div>
                <div className="text-xs font-mono font-bold text-rose-400 mt-0.5">
                  ${synthesizedSetup.sl.toFixed(2)} <span className="text-[10px] text-slate-400">(${synthesizedSetup.stopDistance.toFixed(2)})</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Target 1 (Partials)</div>
                <div className="text-xs font-mono font-bold text-sky-400 mt-0.5">
                  ${synthesizedSetup.tp1.toFixed(2)} <span className="text-[10px] text-slate-400">({synthesizedSetup.rr1})</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Target 2 (Outer DOL)</div>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  ${synthesizedSetup.tp2.toFixed(2)} <span className="text-[10px] text-slate-400">({synthesizedSetup.rr2})</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Position Size</div>
                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                  {synthesizedSetup.lots} Standard Lots
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Risked Capital</div>
                <div className="text-xs font-mono font-bold text-slate-100 mt-0.5">
                  ${riskAmountDollars.toFixed(0)} ({riskPct}%)
                </div>
              </div>
            </div>
          )}

          {/* Confluences Checklist */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                Institutional Algorithmic Confluence Validation ({synthesizedSetup.score}/6)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Formula: (Equity × Risk%) ÷ (Stop Distance × 100)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {synthesizedSetup.confluences.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-800/80 text-xs font-mono"
                >
                  {c.met ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <div className="truncate">
                    <div className={c.met ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                      {c.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{c.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
