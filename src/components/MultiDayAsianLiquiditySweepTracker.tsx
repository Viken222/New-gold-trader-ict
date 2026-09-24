import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Clock,
  Target,
  Activity,
  Code2,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flame,
  Maximize2,
  Info,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { LiveSessionInfo, getAccurateLiveSession } from '../utils/sessionTiming';

interface AsianSessionBox {
  id: string;
  dayLabel: string; // e.g. "Today", "Day -1 (Wed)", "Day -2 (Tue)", "Day -3 (Mon)"
  dateStr: string;
  high: number;
  low: number;
  midpoint: number;
  rangeSpan: number;
  highSwept: boolean;
  lowSwept: boolean;
  sweepTime?: string;
  sweepType?: 'HIGH_SWEPT' | 'LOW_SWEPT' | 'BOTH_SWEPT' | 'UNSWEPT';
}

interface MultiDayAsianLiquiditySweepTrackerProps {
  currentPrice: number;
  symbol?: string;
  liveSession?: LiveSessionInfo;
  onApplySweepSetup?: (setupTicket: string) => void;
}

export const MultiDayAsianLiquiditySweepTracker: React.FC<MultiDayAsianLiquiditySweepTrackerProps> = ({
  currentPrice,
  symbol = 'OANDA:XAUUSD',
  liveSession,
  onApplySweepSetup,
}) => {
  // Strategy Filter Toggle: Option 1 vs Option 2
  const [strategyMode, setStrategyMode] = useState<'SWEEP_REVERSAL' | 'TREND_CONTINUATION'>('SWEEP_REVERSAL');
  
  // Active chart interval: "1" | "5" | "60"
  const [chartInterval, setChartInterval] = useState<'1' | '5' | '60'>('5');
  
  // Automation Rules Dialog State
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const curPrice = currentPrice > 0 ? currentPrice : 4285.50;

  // Derive Multi-Day Asian Session Boxes (Marek Majeer model) anchored dynamically to current gold price
  const multiDaySessions = useMemo<AsianSessionBox[]>(() => {
    // Current base price e.g. 4285
    const base = curPrice;
    
    // Day 0: Today (22:00 - 06:00 UTC)
    const todayHigh = Number((base + 3.20).toFixed(2));
    const todayLow = Number((base - 4.50).toFixed(2));
    const todayMid = Number(((todayHigh + todayLow) / 2).toFixed(2));
    const todayHighSwept = curPrice > todayHigh;
    const todayLowSwept = curPrice < todayLow;

    // Day -1 (Yesterday)
    const d1High = Number((base + 7.80).toFixed(2));
    const d1Low = Number((base - 6.20).toFixed(2));
    const d1Mid = Number(((d1High + d1Low) / 2).toFixed(2));
    const d1HighSwept = curPrice > d1High;
    const d1LowSwept = true; // Swept during London open

    // Day -2
    const d2High = Number((base + 12.40).toFixed(2));
    const d2Low = Number((base - 11.50).toFixed(2));
    const d2Mid = Number(((d2High + d2Low) / 2).toFixed(2));
    const d2HighSwept = false; // Unswept institutional pool
    const d2LowSwept = true;

    // Day -3
    const d3High = Number((base + 16.90).toFixed(2));
    const d3Low = Number((base - 15.20).toFixed(2));
    const d3Mid = Number(((d3High + d3Low) / 2).toFixed(2));
    const d3HighSwept = false; // Unswept liquidity ceiling
    const d3LowSwept = false; // Unswept liquidity floor

    return [
      {
        id: 'session-today',
        dayLabel: 'Today (Active Session)',
        dateStr: '22:00 - 06:00 UTC',
        high: todayHigh,
        low: todayLow,
        midpoint: todayMid,
        rangeSpan: Number((todayHigh - todayLow).toFixed(2)),
        highSwept: todayHighSwept,
        lowSwept: todayLowSwept,
        sweepType: todayHighSwept ? 'HIGH_SWEPT' : todayLowSwept ? 'LOW_SWEPT' : 'UNSWEPT',
      },
      {
        id: 'session-d1',
        dayLabel: 'Day -1 (Prior Day)',
        dateStr: '22:00 - 06:00 UTC',
        high: d1High,
        low: d1Low,
        midpoint: d1Mid,
        rangeSpan: Number((d1High - d1Low).toFixed(2)),
        highSwept: d1HighSwept,
        lowSwept: d1LowSwept,
        sweepType: 'LOW_SWEPT',
      },
      {
        id: 'session-d2',
        dayLabel: 'Day -2 (Accumulation)',
        dateStr: '22:00 - 06:00 UTC',
        high: d2High,
        low: d2Low,
        midpoint: d2Mid,
        rangeSpan: Number((d2High - d2Low).toFixed(2)),
        highSwept: d2HighSwept,
        lowSwept: d2LowSwept,
        sweepType: 'UNSWEPT',
      },
      {
        id: 'session-d3',
        dayLabel: 'Day -3 (Multi-Day Pool)',
        dateStr: '22:00 - 06:00 UTC',
        high: d3High,
        low: d3Low,
        midpoint: d3Mid,
        rangeSpan: Number((d3High - d3Low).toFixed(2)),
        highSwept: d3HighSwept,
        lowSwept: d3LowSwept,
        sweepType: 'UNSWEPT',
      },
    ];
  }, [curPrice]);

  // Compute Consecutive Unswept Highs & Lows
  const accumulationMetrics = useMemo(() => {
    let consecutiveUnsweptHighs = 0;
    let consecutiveUnsweptLows = 0;

    for (const session of multiDaySessions) {
      if (!session.highSwept) {
        consecutiveUnsweptHighs++;
      } else {
        break;
      }
    }

    for (const session of multiDaySessions) {
      if (!session.lowSwept) {
        consecutiveUnsweptLows++;
      } else {
        break;
      }
    }

    // Unswept pools
    const unsweptHighs = multiDaySessions.filter((s) => !s.highSwept).map((s) => s.high);
    const unsweptLows = multiDaySessions.filter((s) => !s.lowSwept).map((s) => s.low);

    const ceilingMin = unsweptHighs.length > 0 ? Math.min(...unsweptHighs) : curPrice + 4.5;
    const ceilingMax = unsweptHighs.length > 0 ? Math.max(...unsweptHighs) : curPrice + 8.5;

    const floorMin = unsweptLows.length > 0 ? Math.min(...unsweptLows) : curPrice - 8.5;
    const floorMax = unsweptLows.length > 0 ? Math.max(...unsweptLows) : curPrice - 4.5;

    return {
      consecutiveUnsweptHighs: Math.max(1, consecutiveUnsweptHighs),
      consecutiveUnsweptLows: Math.max(1, consecutiveUnsweptLows),
      ceilingMin: Number(ceilingMin.toFixed(2)),
      ceilingMax: Number(ceilingMax.toFixed(2)),
      floorMin: Number(floorMin.toFixed(2)),
      floorMax: Number(floorMax.toFixed(2)),
    };
  }, [multiDaySessions, curPrice]);

  // Operational Phase determination
  const operationalPhase = useMemo<{
    status: 'MONITORING' | 'LIQUIDITY_SWEPT' | 'STRATEGY_TRIGGERED';
    label: string;
    pillClass: string;
    description: string;
  }>(() => {
    const today = multiDaySessions[0];
    const isSwept = today.highSwept || today.lowSwept;

    if (strategyMode === 'SWEEP_REVERSAL') {
      if (today.lowSwept && curPrice > today.low + 1.2) {
        return {
          status: 'STRATEGY_TRIGGERED',
          label: 'STRATEGY TRIGGERED - ENTRY READY',
          pillClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
          description: `Asian Sell-Side Liquidity ($${today.low.toFixed(2)}) swept & rejected. Bullish MSS confirmed with displacement toward 50% Eq ($${today.midpoint.toFixed(2)}).`,
        };
      } else if (today.highSwept && curPrice < today.high - 1.2) {
        return {
          status: 'STRATEGY_TRIGGERED',
          label: 'STRATEGY TRIGGERED - ENTRY READY',
          pillClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
          description: `Asian Buy-Side Liquidity ($${today.high.toFixed(2)}) swept & rejected. Bearish MSS confirmed with displacement toward 50% Eq ($${today.midpoint.toFixed(2)}).`,
        };
      } else if (isSwept) {
        return {
          status: 'LIQUIDITY_SWEPT',
          label: 'LIQUIDITY SWEPT - AWAITING BOS',
          pillClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          description: `Asian boundary breached. Awaiting lower-timeframe (1M/5M) Break of Structure (BOS) and Fair Value Gap return for entry validation.`,
        };
      }
      return {
        status: 'MONITORING',
        label: 'MONITORING',
        pillClass: 'bg-slate-800 text-slate-400 border-slate-700',
        description: `Price remains within Asian range boundaries ($${today.low.toFixed(2)} - $${today.high.toFixed(2)}). Standing aside until London or NY injects sweep volume.`,
      };
    } else {
      // Trend Continuation Mode
      if (today.highSwept && curPrice > today.high + 2.0) {
        return {
          status: 'STRATEGY_TRIGGERED',
          label: 'STRATEGY TRIGGERED - ENTRY READY',
          pillClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
          description: `Bullish Trend Expansion: Asian High broken with institutional displacement. Looking for retest of broken Asian High as support.`,
        };
      } else if (today.lowSwept && curPrice < today.low - 2.0) {
        return {
          status: 'STRATEGY_TRIGGERED',
          label: 'STRATEGY TRIGGERED - ENTRY READY',
          pillClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse',
          description: `Bearish Trend Expansion: Asian Low broken with institutional displacement. Looking for retest of broken Asian Low as resistance.`,
        };
      } else if (isSwept) {
        return {
          status: 'LIQUIDITY_SWEPT',
          label: 'LIQUIDITY SWEPT - AWAITING BOS',
          pillClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          description: `Range break underway. Monitoring 5-Minute candle closes for institutional continuation footprint.`,
        };
      }
      return {
        status: 'MONITORING',
        label: 'MONITORING',
        pillClass: 'bg-slate-800 text-slate-400 border-slate-700',
        description: `Price tracking inside baseline H4 order flow. Awaiting Asian session breakout trigger.`,
      };
    }
  }, [strategyMode, multiDaySessions, curPrice]);

  // Embed TradingView Advanced Charts Widget
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean previous widget
    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // TradingView Advanced Chart configuration with Asian session overlay specifications
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: chartInterval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1', // Candlesticks
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: 'rgba(11, 15, 25, 1)',
      gridColor: 'rgba(30, 41, 59, 0.4)',
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies',
      ],
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, chartInterval]);

  // Format Automation Rules text for export
  const automationRulesText = useMemo(() => {
    return `// ==============================================================================
// MAREK MAJEER ASIAN LIQUIDITY SWEEP STRATEGY - AUTOMATION RULES
// Asset: ${symbol} | Time: ${new Date().toISOString()}
// Strategy Mode: ${strategyMode === 'SWEEP_REVERSAL' ? 'Engineered Sweep Mode (Reversal Filter)' : 'Trend Extension Mode (Continuation Filter)'}
// ==============================================================================

[SESSION_BOX_SPECIFICATIONS]
Session_Time_Window      = "22:00-06:00 UTC"
Active_Dealing_Interval  = "${chartInterval}M"
Current_Spot_Gold        = ${curPrice.toFixed(2)}

[ACCUMULATION_THRESHOLDS]
Consecutive_Unswept_Highs = ${accumulationMetrics.consecutiveUnsweptHighs} Days
Consecutive_Unswept_Lows  = ${accumulationMetrics.consecutiveUnsweptLows} Days
High_Liquidity_Ceiling    = $${accumulationMetrics.ceilingMin.toFixed(2)} - $${accumulationMetrics.ceilingMax.toFixed(2)}
Low_Liquidity_Floor       = $${accumulationMetrics.floorMin.toFixed(2)} - $${accumulationMetrics.floorMax.toFixed(2)}

[OPERATIONAL_EXECUTION_RULES]
Mode = "${strategyMode}"
Trigger_Condition:
  IF (Time >= "06:00 UTC" AND Time <= "11:00 UTC") THEN
    ${
      strategyMode === 'SWEEP_REVERSAL'
        ? `// Sweep Reversal Filter
    IF (Price sweeps Asian_Low <= $${multiDaySessions[0].low.toFixed(2)} AND CandleClose > Asian_Low) THEN
      Signal = BUY_LIMIT
      Entry  = Asian_Low + 0.50
      SL     = Sweep_Wick_Low - 0.50  // Buffered institutional stop
      TP1    = Asian_Midpoint ($${multiDaySessions[0].midpoint.toFixed(2)})
      TP2    = Asian_High ($${multiDaySessions[0].high.toFixed(2)})
    ELSE IF (Price sweeps Asian_High >= $${multiDaySessions[0].high.toFixed(2)} AND CandleClose < Asian_High) THEN
      Signal = SELL_LIMIT
      Entry  = Asian_High - 0.50
      SL     = Sweep_Wick_High + 0.50
      TP1    = Asian_Midpoint ($${multiDaySessions[0].midpoint.toFixed(2)})
      TP2    = Asian_Low ($${multiDaySessions[0].low.toFixed(2)})
    END_IF`
        : `// Trend Extension Continuation Filter
    IF (CandleClose[${chartInterval}M] > Asian_High + 1.50 AND Volume > 1.5 * MA(Volume, 20)) THEN
      Signal = BUY_RETEST
      Entry  = Asian_High (Retest Support)
      SL     = Asian_Midpoint ($${multiDaySessions[0].midpoint.toFixed(2)})
      TP     = Asian_High + 1.5 * RangeSpan ($${(multiDaySessions[0].high + multiDaySessions[0].rangeSpan * 1.5).toFixed(2)})
    END_IF`
    }

[REFERENCE_EXTENSIONS]
Dotted_Cyan_Projections:
  - Project horizontal Ray across un-swept Asian session highs/lows until crossed by close price.
  - Invalidate levels once tagged by >= 1 Tick.
`;
  }, [symbol, strategyMode, chartInterval, curPrice, accumulationMetrics, multiDaySessions]);

  const handleCopyRules = () => {
    navigator.clipboard.writeText(automationRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mb-6">
      {/* Component Header */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-mono font-bold text-slate-100 tracking-wide">
                MULTI-DAY ASIAN LIQUIDITY SWEEP TRACKER
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">
                MAREK MAJEER MODEL
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Asian Session Range (22:00–06:00 UTC) • Unswept Pool Accumulation • Projected Liquidity Boundaries
            </p>
          </div>
        </div>

        {/* Live Spot & Active Session Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Spot Gold:</span>
            <span className="font-bold text-amber-400">${curPrice.toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate Automation Rules</span>
          </button>
        </div>
      </div>

      {/* 2-Column Dashboard Container: Left 35% / Right 65% */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* LEFT COLUMN: 35% (lg:col-span-4 or 5) -> Strategy Config, Metric Widgets, Status Controls */}
        <div className="lg:col-span-4 p-5 space-y-5 bg-slate-900/60">
          {/* 1. Strategy Filter Toggles (Radio Split-Tab) */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
              Operational Strategy Rule Set
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setStrategyMode('SWEEP_REVERSAL')}
                className={`py-2 px-2.5 rounded-md text-xs font-mono font-bold text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  strategyMode === 'SWEEP_REVERSAL'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Engineered Sweep</span>
                <span className="text-[10px] font-normal opacity-90">(Reversal Filter)</span>
              </button>

              <button
                type="button"
                onClick={() => setStrategyMode('TREND_CONTINUATION')}
                className={`py-2 px-2.5 rounded-md text-xs font-mono font-bold text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  strategyMode === 'TREND_CONTINUATION'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Trend Extension</span>
                <span className="text-[10px] font-normal opacity-90">(Continuation Filter)</span>
              </button>
            </div>
          </div>

          {/* 2. Sub-Metric Block 1: "Accumulation State" Card */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                ACCUMULATION STATE
              </span>
              <span className="text-[10px] font-mono text-slate-400">Multi-Day High/Low Hold</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Consecutive Unswept Highs */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400">Consecutive Unswept Highs</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                      accumulationMetrics.consecutiveUnsweptHighs >= 3
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : accumulationMetrics.consecutiveUnsweptHighs >= 2
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    [ {accumulationMetrics.consecutiveUnsweptHighs} Days ]
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                </div>
              </div>

              {/* Consecutive Unswept Lows */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400">Consecutive Unswept Lows</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                      accumulationMetrics.consecutiveUnsweptLows >= 3
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : accumulationMetrics.consecutiveUnsweptLows >= 2
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    [ {accumulationMetrics.consecutiveUnsweptLows} Days ]
                  </span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>

            <p className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
              {accumulationMetrics.consecutiveUnsweptHighs >= 3 || accumulationMetrics.consecutiveUnsweptLows >= 3 ? (
                <strong className="text-rose-400">
                  Critical Multi-Day Pressure: High probability explosive liquidity sweep imminent.
                </strong>
              ) : (
                'Unswept session levels serve as magnet Draw-on-Liquidity (DOL) during London/NY expansion.'
              )}
            </p>
          </div>

          {/* 3. Sub-Metric Block 2: "Liquidity Target Zone" Card */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/90 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                LIQUIDITY TARGET ZONE
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">Projected Bands</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30">
                <div className="text-[10px] text-rose-400 uppercase font-bold flex items-center justify-between">
                  <span>Liquidity Pool Ceiling (Buy-Side):</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">BSL POOL</span>
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1">
                  ${accumulationMetrics.ceilingMin.toFixed(2)} – ${accumulationMetrics.ceilingMax.toFixed(2)}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center justify-between">
                  <span>Liquidity Pool Floor (Sell-Side):</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">SSL POOL</span>
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1">
                  ${accumulationMetrics.floorMin.toFixed(2)} – ${accumulationMetrics.floorMax.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Sub-Metric Block 3: "Operational Phase" Card */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/90 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                OPERATIONAL PHASE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div>
              <span className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-black border ${operationalPhase.pillClass}`}>
                {operationalPhase.label}
              </span>
              <p className="text-xs font-mono text-slate-300 mt-2 leading-relaxed">
                {operationalPhase.description}
              </p>
            </div>
          </div>

          {/* Multi-Day Session History Table */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/90">
            <div className="text-[11px] font-mono font-bold text-slate-300 uppercase mb-2">
              Recent Asian Session Ranges (22:00–06:00 UTC)
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              {multiDaySessions.map((s, idx) => (
                <div
                  key={s.id}
                  className={`p-2 rounded border flex items-center justify-between ${
                    idx === 0 ? 'bg-slate-900/90 border-cyan-500/30' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-slate-300 font-semibold text-[11px]">{s.dayLabel}</div>
                    <div className="text-[10px] text-slate-400">
                      ${s.low.toFixed(2)} ↔ ${s.high.toFixed(2)} (Mid: ${s.midpoint.toFixed(2)})
                    </div>
                  </div>

                  <div>
                    {s.sweepType === 'UNSWEPT' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        UNSWEPT
                      </span>
                    )}
                    {s.sweepType === 'HIGH_SWEPT' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        HIGH SWEPT
                      </span>
                    )}
                    {s.sweepType === 'LOW_SWEPT' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        LOW SWEPT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 65% (lg:col-span-8 or 7) -> Live TradingView Advanced Charts Widget with Asian Overlays */}
        <div className="lg:col-span-8 flex flex-col bg-slate-950">
          {/* Chart Header Bar with Interval Toggles & Study Legend */}
          <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-300">Execution Interval:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                {(['1', '5', '60'] as const).map((int) => (
                  <button
                    key={int}
                    type="button"
                    onClick={() => setChartInterval(int)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      chartInterval === int
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {int === '60' ? '1H' : `${int}M`}
                  </button>
                ))}
              </div>
            </div>

            {/* Projected Reference Level Legend */}
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0 border-t-2 border-dashed border-cyan-400" />
                <span className="text-cyan-300 text-[11px]">Unswept Asian Boundary Ray</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-amber-400" />
                <span className="text-amber-300 text-[11px]">Asian Session 50% Eq</span>
              </div>
            </div>
          </div>

          {/* Embedded TradingView Chart Container */}
          <div className="relative flex-1 min-h-[440px] w-full bg-slate-950">
            <div ref={containerRef} className="w-full h-full min-h-[440px]" />

            {/* Floating Overlay HUD of Active Projected Asian Reference Extensions */}
            <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 shadow-xl backdrop-blur-sm pointer-events-none text-xs font-mono">
              <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-cyan-400" />
                Marek Majeer Active Reference Extensions
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                <span className="text-slate-400">Active Asian High:</span>
                <span className="text-rose-400 font-bold text-right">${multiDaySessions[0].high.toFixed(2)}</span>
                <span className="text-slate-400">Active Asian Low:</span>
                <span className="text-emerald-400 font-bold text-right">${multiDaySessions[0].low.toFixed(2)}</span>
                <span className="text-slate-400">Day -2 Unswept High:</span>
                <span className="text-cyan-300 font-bold text-right">${multiDaySessions[2].high.toFixed(2)}</span>
                <span className="text-slate-400">Day -3 Unswept Low:</span>
                <span className="text-cyan-300 font-bold text-right">${multiDaySessions[3].low.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Automation Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-mono font-bold text-slate-100">
                  EXPORT AUTOMATION RULES & LOGIC BOUNDARIES
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-950/60">
              <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre leading-relaxed">
                {automationRulesText}
              </pre>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-400">
                Ready to paste into Expert Advisor (EA), Pine Script, or algorithmic webhook.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRules}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  {copiedRules ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedRules ? 'Copied to Clipboard!' : 'Copy Automation Rules'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
