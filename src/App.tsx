/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnalysisResult, ChartImage, OperatingMode, PresetScenario, SessionContext } from './types';
import { PRESET_SCENARIOS } from './data/presets';
import { Navbar } from './components/Navbar';
import { TimelineBar } from './components/TimelineBar';
import { ChartUploader } from './components/ChartUploader';
import { SessionContextCard } from './components/SessionContextCard';
import { ChartModal } from './components/ChartModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AnalysisTerminal } from './components/AnalysisTerminal';
import { TradingViewWidget, LiveQuote } from './components/TradingViewWidget';
import { DealingRangeQuadrantEngine } from './components/DealingRangeQuadrantEngine';
import { MultiDayAsianLiquiditySweepTracker } from './components/MultiDayAsianLiquiditySweepTracker';
import { MT5ExecutionHub } from './components/MT5ExecutionHub';
import { History, ShieldAlert, Sparkles, AlertCircle, Info, Zap, UploadCloud } from 'lucide-react';
import { extractPricesFromDataUrl } from './utils/chartPriceExtractor';
import { getAccurateLiveSession } from './utils/sessionTiming';

const initialSession = getAccurateLiveSession();

const DEFAULT_CONTEXT: SessionContext = {
  captureTimeEAT: initialSession.eatTimeFormatted,
  seasonOffset: initialSession.seasonOffset,
  dayOfWeek: initialSession.dayOfWeek,
  dailyOpenPrice: '4293.00',
  accountEquity: 50000,
  riskPercent: 1.0,
  customNotes: `TradingView Real-Time Feed • ${initialSession.sessionName}`,
};

export default function App() {
  const [intakeSource, setIntakeSource] = useState<'tradingview' | 'upload'>('tradingview');
  const [mode, setMode] = useState<OperatingMode>('FULL-MTF');
  const [charts, setCharts] = useState<ChartImage[]>([]);
  const [sessionContext, setSessionContext] = useState<SessionContext>(DEFAULT_CONTEXT);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeModalChart, setActiveModalChart] = useState<ChartImage | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null);
  const [isMt5Connected, setIsMt5Connected] = useState<boolean>(false);

  // Poll MT5 connection status
  useEffect(() => {
    const checkMt5 = () => {
      fetch('/api/mt5/status')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.terminalStatus) {
            setIsMt5Connected(d.terminalStatus.connected);
          }
        })
        .catch(() => {});
    };
    checkMt5();
    const interval = setInterval(checkMt5, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial live quote on mount
  useEffect(() => {
    fetch('/api/tradingview/quote')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.quote) {
          setLiveQuote(data.quote);
          const liveDetails = data.quote.liveSessionDetails || getAccurateLiveSession();
          setSessionContext((prev) => ({
            ...prev,
            captureTimeEAT: liveDetails.eatTimeFormatted || prev.captureTimeEAT,
            dayOfWeek: liveDetails.dayOfWeek || prev.dayOfWeek,
            seasonOffset: liveDetails.seasonOffset || prev.seasonOffset,
            customNotes: `TradingView Real-Time Feed • ${liveDetails.sessionName || data.quote.session}`,
            dailyOpenPrice: data.extractedPrices?.dailyOpen?.toFixed(2) || prev.dailyOpenPrice,
            calibratedPrices: {
              currentPrice: data.extractedPrices?.currentPrice?.toFixed(2) || '',
              rangeHigh: data.extractedPrices?.dealingRangeHigh?.toFixed(2) || '',
              rangeLow: data.extractedPrices?.dealingRangeLow?.toFixed(2) || '',
              keyArrayCe: data.extractedPrices?.fvgCe?.toFixed(2) || '',
              pdh: data.extractedPrices?.pdh?.toFixed(2) || '',
              pdl: data.extractedPrices?.pdl?.toFixed(2) || '',
            },
          }));
        }
      })
      .catch((e) => console.warn('Initial quote fetch:', e));
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ict_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (result: AnalysisResult) => {
    setHistory((prev) => {
      const updated = [result, ...prev.filter((item) => item.id !== result.id)].slice(0, 20);
      try {
        localStorage.setItem('ict_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Load initial preset (Silver Bullet) on first boot if no charts
  useEffect(() => {
    if (charts.length === 0) {
      loadPreset('preset-silver-bullet-bullish');
    }
  }, []);

  // Auto-calibrate prices from charts whenever charts change
  useEffect(() => {
    if (charts.length === 0) return;

    let detectedCurrent: number | undefined;
    let detectedHigh: number | undefined;
    let detectedLow: number | undefined;
    let detectedOpen: number | undefined;
    let detectedPdh: number | undefined;
    let detectedPdl: number | undefined;
    let detectedCe: number | undefined;
    const allPrices: number[] = [];

    for (const c of charts) {
      if (c.dataUrl) {
        const extracted = extractPricesFromDataUrl(c.dataUrl);
        extracted.allDetectedPrices.forEach((p) => allPrices.push(p));
        if (extracted.currentPrice && !detectedCurrent) detectedCurrent = extracted.currentPrice;
        if (extracted.dealingRangeHigh && !detectedHigh) detectedHigh = extracted.dealingRangeHigh;
        if (extracted.dealingRangeLow && !detectedLow) detectedLow = extracted.dealingRangeLow;
        if (extracted.dailyOpen && !detectedOpen) detectedOpen = extracted.dailyOpen;
        if (extracted.pdh && !detectedPdh) detectedPdh = extracted.pdh;
        if (extracted.pdl && !detectedPdl) detectedPdl = extracted.pdl;
        if (extracted.fvgCe && !detectedCe) detectedCe = extracted.fvgCe;
      }
    }

    if (allPrices.length > 0) {
      allPrices.sort((a, b) => b - a);
      if (!detectedHigh) detectedHigh = allPrices[0];
      if (!detectedLow) detectedLow = allPrices[allPrices.length - 1];
    }

    setSessionContext((prev) => ({
      ...prev,
      dailyOpenPrice: detectedOpen ? detectedOpen.toFixed(2) : prev.dailyOpenPrice,
      calibratedPrices: {
        currentPrice: detectedCurrent ? detectedCurrent.toFixed(2) : (prev.calibratedPrices?.currentPrice || ''),
        rangeHigh: detectedHigh ? detectedHigh.toFixed(2) : (prev.calibratedPrices?.rangeHigh || ''),
        rangeLow: detectedLow ? detectedLow.toFixed(2) : (prev.calibratedPrices?.rangeLow || ''),
        keyArrayCe: detectedCe ? detectedCe.toFixed(2) : (prev.calibratedPrices?.keyArrayCe || ''),
        pdh: detectedPdh ? detectedPdh.toFixed(2) : (prev.calibratedPrices?.pdh || ''),
        pdl: detectedPdl ? detectedPdl.toFixed(2) : (prev.calibratedPrices?.pdl || ''),
      },
    }));
  }, [charts]);

  const loadPreset = (presetId: string) => {
    const preset = PRESET_SCENARIOS.find((p: PresetScenario) => p.id === presetId) || PRESET_SCENARIOS[0];
    const convertedCharts: ChartImage[] = preset.charts.map((c, idx) => ({
      id: `preset-chart-${preset.id}-${idx}`,
      timeframe: c.timeframe,
      label: c.label,
      dataUrl: c.url,
      fileName: `${c.timeframe}_${preset.id}.svg`,
      uploadedAt: new Date().toLocaleTimeString(),
    }));
    setCharts(convertedCharts);
    setSessionContext((prev) => ({ ...prev, ...preset.defaultContext }));
    setMode(preset.mode);
    setErrorMsg(null);
  };

  const handleReset = () => {
    setCharts([]);
    setSessionContext(DEFAULT_CONTEXT);
    setAnalysisResult(null);
    setErrorMsg(null);
  };

  const handleAddCharts = (newCharts: ChartImage[]) => {
    setCharts((prev) => {
      // Replace existing timeframe if re-uploaded or append
      const updated = [...prev];
      newCharts.forEach((nc) => {
        const existingIdx = updated.findIndex((c) => c.timeframe === nc.timeframe);
        if (existingIdx >= 0) {
          updated[existingIdx] = nc;
        } else {
          updated.push(nc);
        }
      });
      return updated;
    });
  };

  const handleRemoveChart = (id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleContextChange = (updated: Partial<SessionContext>) => {
    setSessionContext((prev) => ({ ...prev, ...updated }));
  };

  // Baseline check
  const hasHtf = charts.some((c) => c.timeframe === '4H' || c.timeframe === '1H');
  const has15m = charts.some((c) => c.timeframe === '15M');
  const has5m = charts.some((c) => c.timeframe === '5M');
  const hasBaseline = hasHtf && has15m && has5m;

  const handleExecuteAnalysis = async () => {
    if (charts.length === 0) {
      setErrorMsg('Please upload or select at least one timeframe chart screenshot to analyze.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/analyze-charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: charts.map((c) => ({
            timeframe: c.timeframe,
            dataUrl: c.dataUrl,
            label: c.label,
          })),
          sessionContext,
          mode,
          outcomeContext: sessionContext.reviewOutcomeNotes,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete ICT algorithmic analysis.');
      }

      setAnalysisResult(json.data);
      saveToHistory(json.data);

      // Smooth scroll to analysis results
      setTimeout(() => {
        const resultsEl = document.getElementById('analysis-results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteLiveTradingViewAnalysis = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/analyze-live-tradingview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionContext,
          mode,
          outcomeContext: sessionContext.reviewOutcomeNotes,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete automated TradingView analysis.');
      }

      setAnalysisResult(json.data);
      saveToHistory(json.data);

      // Synchronize live generated charts and prices
      if (json.livePackage) {
        if (json.livePackage.charts) {
          const convertedCharts: ChartImage[] = json.livePackage.charts.map((c: any, idx: number) => ({
            id: `live-tv-${c.timeframe}-${idx}`,
            timeframe: c.timeframe,
            label: c.label,
            dataUrl: c.dataUrl,
            fileName: `TradingView_${c.timeframe}_Live.svg`,
            uploadedAt: new Date().toLocaleTimeString(),
          }));
          setCharts(convertedCharts);
        }

        if (json.livePackage.quote) {
          setLiveQuote(json.livePackage.quote);
        }

        if (json.livePackage.extractedPrices) {
          setSessionContext((prev) => ({
            ...prev,
            dailyOpenPrice: json.livePackage.extractedPrices.dailyOpen?.toFixed(2) || prev.dailyOpenPrice,
            calibratedPrices: {
              currentPrice: json.livePackage.extractedPrices.currentPrice?.toFixed(2) || '',
              rangeHigh: json.livePackage.extractedPrices.dealingRangeHigh?.toFixed(2) || '',
              rangeLow: json.livePackage.extractedPrices.dealingRangeLow?.toFixed(2) || '',
              keyArrayCe: json.livePackage.extractedPrices.fvgCe?.toFixed(2) || '',
              pdh: json.livePackage.extractedPrices.pdh?.toFixed(2) || '',
              pdl: json.livePackage.extractedPrices.pdl?.toFixed(2) || '',
            },
          }));
        }
      }

      // Smooth scroll to analysis results
      setTimeout(() => {
        const resultsEl = document.getElementById('analysis-results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during live analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        mode={mode}
        onModeChange={(m) => setMode(m)}
        activeWindow="10:00–11:00 Silver Bullet"
        hasBaselineCharts={hasBaseline}
        onLoadPreset={loadPreset}
        onReset={handleReset}
        isMt5Connected={isMt5Connected}
        onToggleMt5={() => {
          document.getElementById('mt5-execution-hub')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Timeline & EAT/NY Local Clock Track */}
        <TimelineBar
          captureTimeEAT={sessionContext.captureTimeEAT}
          seasonOffset={sessionContext.seasonOffset}
          onTimeChange={(t) => handleContextChange({ captureTimeEAT: t })}
          onSeasonChange={(s) => handleContextChange({ seasonOffset: s })}
          onLiveSync={(live) =>
            handleContextChange({
              captureTimeEAT: live.eatTimeFormatted,
              seasonOffset: live.seasonOffset,
              dayOfWeek: live.dayOfWeek,
              customNotes: `TradingView Real-Time Feed • ${live.sessionName}`,
            })
          }
        />

        {/* Top Info Banner for Mentorship Standards */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Algorithmic Law:</strong> No indicator lagging. Price & Time only. 0%–100% Dealing Range & Consequent Encroachment (CE) rules enforced.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Audit History ({history.length})</span>
          </button>
        </div>

        {/* Error notification if any */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Intake Mode Switcher: TradingView Live vs Manual Upload */}
        <div className="mb-4 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIntakeSource('tradingview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                intakeSource === 'tradingview'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Zap className="w-3.5 h-3.5" />
              <span>TRADINGVIEW LIVE AUTO-ANALYSIS</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 bg-slate-950/40 rounded font-semibold text-slate-900">
                RECOMMENDED
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIntakeSource('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                intakeSource === 'upload'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>MANUAL CHART UPLOAD & PRESETS</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 pr-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-semibold">Live Market Synchronized</span>
            </div>
            <span>•</span>
            <span className="text-amber-400/90">XAU/USD Spot Gold</span>
          </div>
        </div>

        {/* 1. Multi-Timeframe Chart Intake: Live TradingView vs Manual Upload */}
        {intakeSource === 'tradingview' ? (
          <TradingViewWidget
            onRunLiveAnalysis={handleExecuteLiveTradingViewAnalysis}
            isAnalyzing={isLoading}
            onLiveChartsExtracted={(extracted) => setCharts(extracted)}
            onLiveContextExtracted={(update) => handleContextChange(update)}
            onLiveQuoteUpdated={(quote) => setLiveQuote(quote)}
            onViewChartModal={(chart) => setActiveModalChart(chart)}
          />
        ) : (
          <ChartUploader
            charts={charts}
            onAddCharts={handleAddCharts}
            onRemoveChart={handleRemoveChart}
            onViewChart={(chart) => setActiveModalChart(chart)}
          />
        )}

        {/* 2. MULTI-DAY ASIAN LIQUIDITY SWEEP TRACKER (Marek Majeer Indicator & Strategy on TradingView) */}
        <MultiDayAsianLiquiditySweepTracker
          currentPrice={
            Number(sessionContext.calibratedPrices?.currentPrice) ||
            liveQuote?.price ||
            4285.50
          }
          symbol="OANDA:XAUUSD"
          liveSession={liveQuote?.liveSessionDetails || getAccurateLiveSession()}
          onApplySweepSetup={(ticket) => {
            handleContextChange({ customNotes: ticket });
          }}
        />

        {/* 3. DEALING RANGE & QUADRANT LIQUIDITY ENGINE (Direct Real-Time Feed from TradingView, Prices, Narrative & Risk Engine) */}
        <DealingRangeQuadrantEngine
          currentPrice={
            Number(sessionContext.calibratedPrices?.currentPrice) ||
            liveQuote?.price ||
            4285.50
          }
          dealingRangeHigh={
            Number(sessionContext.calibratedPrices?.rangeHigh) ||
            liveQuote?.dealingRangeHigh ||
            4290.00
          }
          dealingRangeLow={
            Number(sessionContext.calibratedPrices?.rangeLow) ||
            liveQuote?.dealingRangeLow ||
            4278.00
          }
          keyArrayCe={
            Number(sessionContext.calibratedPrices?.keyArrayCe) ||
            liveQuote?.equilibrium ||
            undefined
          }
          pdh={Number(sessionContext.calibratedPrices?.pdh) || undefined}
          pdl={Number(sessionContext.calibratedPrices?.pdl) || undefined}
          dailyOpen={Number(sessionContext.dailyOpenPrice) || undefined}
          sessionContext={sessionContext}
          liveSessionName={liveQuote?.session}
          isSilverBulletActive={liveQuote?.silverBulletActive}
          existingDirection={analysisResult?.direction}
          isAnalyzing={isLoading}
          onExecuteAnalysis={
            intakeSource === 'tradingview'
              ? handleExecuteLiveTradingViewAnalysis
              : handleExecuteAnalysis
          }
        />

        {/* 3. Narrative Parameters, Dealing Range & Sizing */}
        <SessionContextCard
          context={sessionContext}
          mode={mode}
          onChange={handleContextChange}
          onExecuteAnalysis={
            intakeSource === 'tradingview'
              ? handleExecuteLiveTradingViewAnalysis
              : handleExecuteAnalysis
          }
          isLoading={isLoading}
          canExecute={intakeSource === 'tradingview' || charts.length > 0}
        />

        {/* 4. MT5 Institutional Execution Bridge & Bot */}
        <div id="mt5-execution-hub" className="pt-4 scroll-mt-20">
          <MT5ExecutionHub
            currentAnalysis={analysisResult}
            currentPrice={
              Number(sessionContext.calibratedPrices?.currentPrice) ||
              liveQuote?.price ||
              4285.50
            }
          />
        </div>

        {/* 5. Institutional Output Terminal */}
        {analysisResult && (
          <div id="analysis-results" className="pt-2">
            <AnalysisTerminal
              result={analysisResult}
              onOpenMt5Hub={() => {
                document.getElementById('mt5-execution-hub')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </main>

      {/* Chart Lightbox / Modal */}
      <ChartModal
        chart={activeModalChart}
        onClose={() => setActiveModalChart(null)}
      />

      {/* History Drawer */}
      <HistoryDrawer
        history={history}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={(item) => {
          setAnalysisResult(item);
          setMode(item.mode);
        }}
        onClear={() => {
          setHistory([]);
          localStorage.removeItem('ict_history');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs font-mono text-slate-500">
        <p>
          ICT 2024 Mentorship Algorithmic Assistant • XAUUSD Spot Gold Specialist • Strict Confluence & Sizing Protocol
        </p>
      </footer>
    </div>
  );
}
