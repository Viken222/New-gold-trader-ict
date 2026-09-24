import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Shield,
  Activity,
  Maximize2,
  Sliders,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ChartImage, SessionContext } from '../types';
import { LiveSessionInfo } from '../utils/sessionTiming';

export interface LiveQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  session: string;
  silverBulletActive: boolean;
  dealingRangeHigh: number;
  dealingRangeLow: number;
  equilibrium: number;
  liveSessionDetails?: LiveSessionInfo;
}

interface TradingViewWidgetProps {
  onRunLiveAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  onLiveChartsExtracted?: (charts: ChartImage[]) => void;
  onLiveContextExtracted?: (contextUpdate: Partial<SessionContext>) => void;
  onLiveQuoteUpdated?: (quote: LiveQuote) => void;
  onViewChartModal?: (chart: ChartImage) => void;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  onRunLiveAnalysis,
  isAnalyzing,
  onLiveChartsExtracted,
  onLiveContextExtracted,
  onLiveQuoteUpdated,
  onViewChartModal,
}) => {
  const [symbol, setSymbol] = useState<string>('OANDA:XAUUSD');
  const [interval, setInterval] = useState<string>('15'); // 15M default for Dealing Range
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(true);
  const [viewTab, setViewTab] = useState<'chart' | 'extracted-mtf'>('chart');
  const [extractedCharts, setExtractedCharts] = useState<any[]>([]);
  const [activeMtfTab, setActiveMtfTab] = useState<string>('15M');

  // Fetch live market quote & data
  const fetchLiveQuote = async () => {
    try {
      const res = await fetch('/api/tradingview/quote');
      const data = await res.json();
      if (data.success && data.quote) {
        setLiveQuote(data.quote);
        if (onLiveQuoteUpdated) {
          onLiveQuoteUpdated(data.quote);
        }
        if (onLiveContextExtracted && data.extractedPrices) {
          onLiveContextExtracted({
            dailyOpenPrice: data.extractedPrices.dailyOpen?.toFixed(2),
            calibratedPrices: {
              currentPrice: data.extractedPrices.currentPrice?.toFixed(2) || '',
              rangeHigh: data.extractedPrices.dealingRangeHigh?.toFixed(2) || '',
              rangeLow: data.extractedPrices.dealingRangeLow?.toFixed(2) || '',
              keyArrayCe: data.extractedPrices.fvgCe?.toFixed(2) || '',
              pdh: data.extractedPrices.pdh?.toFixed(2) || '',
              pdl: data.extractedPrices.pdl?.toFixed(2) || '',
            },
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching quote:', e);
    } finally {
      setIsQuoteLoading(false);
    }
  };

  // Fetch full live package including generated charts
  const fetchLiveCharts = async () => {
    try {
      const res = await fetch('/api/tradingview/market-data');
      const json = await res.json();
      if (json.success && json.data) {
        setExtractedCharts(json.data.charts || []);
        if (onLiveChartsExtracted && json.data.charts) {
          const converted: ChartImage[] = json.data.charts.map((c: any, i: number) => ({
            id: `live-tv-${c.timeframe}-${i}`,
            timeframe: c.timeframe,
            label: c.label,
            dataUrl: c.dataUrl,
            fileName: `TradingView_${c.timeframe}_Live.svg`,
            uploadedAt: new Date().toLocaleTimeString(),
          }));
          onLiveChartsExtracted(converted);
        }
      }
    } catch (e) {
      console.warn('Error fetching live charts:', e);
    }
  };

  useEffect(() => {
    fetchLiveQuote();
    fetchLiveCharts();
    const quoteInterval = window.setInterval(fetchLiveQuote, 15000); // update price ribbon every 15s
    return () => clearInterval(quoteInterval);
  }, []);

  // Auto-scan countdown
  useEffect(() => {
    if (!autoScanEnabled) {
      setCountdown(60);
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (!isAnalyzing) {
            onRunLiveAnalysis();
          }
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoScanEnabled, isAnalyzing, onRunLiveAnalysis]);

  // Isolated TradingView Chart configuration
  const tvIframeSrc = useMemo(() => {
    const config = {
      autosize: true,
      symbol,
      interval,
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#090d16',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: false,
      backgroundColor: 'rgba(9, 13, 22, 1)',
      gridColor: 'rgba(30, 41, 59, 0.4)',
      support_host: 'https://www.tradingview.com',
    };
    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  }, [symbol, interval]);

  // Determine current quadrant
  let quadrantStatus = 'EQUILIBRIUM (45%–55%)';
  let quadrantColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (liveQuote && liveQuote.dealingRangeHigh > liveQuote.dealingRangeLow) {
    const span = liveQuote.dealingRangeHigh - liveQuote.dealingRangeLow;
    const ratio = (liveQuote.price - liveQuote.dealingRangeLow) / span;
    if (ratio >= 0.75) {
      quadrantStatus = 'PREMIUM (≥75% SELL ZONE)';
      quadrantColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    } else if (ratio <= 0.25) {
      quadrantStatus = 'DISCOUNT (≤25% BUY ZONE)';
      quadrantColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    } else if (ratio > 0.55) {
      quadrantStatus = 'UPPER RANGE (55%–75%)';
      quadrantColor = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    } else if (ratio < 0.45) {
      quadrantStatus = 'LOWER RANGE (25%–45%)';
      quadrantColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
  }

  const selectedChart = extractedCharts.find((c) => c.timeframe === activeMtfTab) || extractedCharts[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mb-6">
      {/* Top Header Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono font-bold text-slate-100 text-sm tracking-wide">
              TRADINGVIEW REAL-TIME FEED
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="text-amber-400">Zero Upload Required</span>
            <span>•</span>
            <span>Auto Multi-Timeframe Ingestion</span>
          </div>
        </div>

        {/* View Switcher: Interactive Chart vs Extracted MTF Snapshots */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewTab('chart')}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                viewTab === 'chart'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interactive TV Chart
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTab('extracted-mtf');
                fetchLiveCharts();
              }}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
                viewTab === 'extracted-mtf'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Extracted MTF ({extractedCharts.length || 5})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchLiveQuote();
              fetchLiveCharts();
            }}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Live Market Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isQuoteLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Market Ribbon */}
      <div className="bg-slate-950/70 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        {/* Left: Price and 24h change */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">XAU/USD Spot:</span>
            <span className="text-base font-bold text-slate-100">
              ${liveQuote ? liveQuote.price.toFixed(2) : '2650.00'}
            </span>
            {liveQuote && (
              <span
                className={`flex items-center gap-0.5 font-semibold text-[11px] ${
                  liveQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {liveQuote.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {liveQuote.change >= 0 ? '+' : ''}
                {liveQuote.change.toFixed(2)} ({liveQuote.changePercent.toFixed(2)}%)
              </span>
            )}
          </div>

          {/* Active Session */}
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{liveQuote?.session || 'NY Session Macro'}</span>
          </div>

          {/* 15M Active Dealing Range */}
          {liveQuote && (
            <div className="hidden lg:flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span>15M Range:</span>
              <span className="text-rose-300 font-semibold">${liveQuote.dealingRangeHigh.toFixed(2)}</span>
              <span>↔</span>
              <span className="text-emerald-300 font-semibold">${liveQuote.dealingRangeLow.toFixed(2)}</span>
              <span className="text-slate-500">(50% Eq: ${liveQuote.equilibrium.toFixed(2)})</span>
            </div>
          )}
        </div>

        {/* Right: Quadrant Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline">
            Status:
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${quadrantColor}`}>
            {quadrantStatus}
          </span>
        </div>
      </div>

      {/* Control Strip & Big Action Button */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Symbol & Timeframe selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">Broker Feed:</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="OANDA:XAUUSD">OANDA:XAUUSD (Default Spot)</option>
              <option value="FOREXCOM:XAUUSD">FOREX.COM:XAUUSD</option>
              <option value="TVC:GOLD">TVC:GOLD (Spot Gold Index)</option>
              <option value="BINANCE:PAXGUSDT">BINANCE:PAXGUSDT (LBMA Gold)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded p-0.5">
            {[
              { label: '1m', val: '1' },
              { label: '5m', val: '5' },
              { label: '15m (Range)', val: '15' },
              { label: '1h', val: '60' },
              { label: '4h', val: '240' },
              { label: '1D', val: 'D' },
            ].map((tf) => (
              <button
                key={tf.val}
                type="button"
                onClick={() => setInterval(tf.val)}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                  interval === tf.val
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Panel: Automated Analysis & Auto-Scan */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-scan switch */}
          <button
            type="button"
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              autoScanEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Automatically run analysis every 60 seconds"
          >
            <Activity className={`w-3.5 h-3.5 ${autoScanEnabled ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>Auto-Scan ({autoScanEnabled ? `${countdown}s` : 'Off'})</span>
          </button>

          {/* Primary Big Trigger Button */}
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={onRunLiveAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wide bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Running Algorithmic Audit...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>Run Automated TradingView Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: TradingView Chart OR Extracted Multi-Timeframe Snapshots */}
      {viewTab === 'chart' ? (
        <div className="relative w-full h-[540px] bg-slate-950">
          <iframe
            key={`tv-main-${symbol}-${interval}`}
            src={tvIframeSrc}
            className="w-full h-full border-none"
            title="TradingView Real-Time Chart"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="p-4 bg-slate-950">
          <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Algorithmic Frames Extracted:</span>
              <div className="flex items-center gap-1">
                {['4H', '1H', '15M', '5M', '1M'].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setActiveMtfTab(tf)}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                      activeMtfTab === tf
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              Directly synthesized from live TradingView candles
            </span>
          </div>

          {selectedChart ? (
            <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={selectedChart.dataUrl}
                alt={selectedChart.label}
                className="w-full h-[460px] object-contain bg-[#090d16]"
              />
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-amber-300">
                    {selectedChart.label} [{selectedChart.timeframe}]
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400">{selectedChart.description}</p>
                </div>
                {onViewChartModal && (
                  <button
                    type="button"
                    onClick={() =>
                      onViewChartModal({
                        id: `extracted-${selectedChart.timeframe}`,
                        timeframe: selectedChart.timeframe,
                        label: selectedChart.label,
                        dataUrl: selectedChart.dataUrl,
                        fileName: `TradingView_${selectedChart.timeframe}.svg`,
                        uploadedAt: 'Live Real-Time',
                      })
                    }
                    className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expand</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mb-2" />
              <span>Synthesizing live multi-timeframe candle vector frames...</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Automated analysis extracts Dealing Range, FVG CE, PDH/PDL, and PO5 without needing manual screenshot uploads.
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>Active Window: 10:00–11:00 NY Silver Bullet</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Live Connected</span>
        </div>
      </div>
    </div>
  );
};
