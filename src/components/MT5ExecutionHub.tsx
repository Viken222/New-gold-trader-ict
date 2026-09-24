import React, { useEffect, useState, useMemo } from 'react';
import {
  Zap,
  Terminal,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  XCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Code2,
  FileCode,
  Sliders,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Cpu,
} from 'lucide-react';
import { MT5Signal, MT5TerminalStatus, AnalysisResult } from '../types';
import { getCompleteMql5Code } from '../utils/mql5CodeGenerator';

interface MT5ExecutionHubProps {
  currentAnalysis: AnalysisResult | null;
  currentPrice: number;
  onClose?: () => void;
}

export const MT5ExecutionHub: React.FC<MT5ExecutionHubProps> = ({
  currentAnalysis,
  currentPrice,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'blotter' | 'ea-code' | 'python-bot' | 'manual'>('blotter');
  const [terminalStatus, setTerminalStatus] = useState<MT5TerminalStatus>({
    connected: false,
    lastHeartbeat: null,
    terminalType: 'NONE',
  });
  const [signals, setSignals] = useState<MT5Signal[]>([]);
  const [autoExecuteGradeA, setAutoExecuteGradeA] = useState<boolean>(true);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushSuccessMsg, setPushSuccessMsg] = useState<string | null>(null);
  const [copiedEa, setCopiedEa] = useState<boolean>(false);
  const [copiedFullEa, setCopiedFullEa] = useState<boolean>(false);
  const [copiedPy, setCopiedPy] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showFullEaCode, setShowFullEaCode] = useState<boolean>(true);

  // Manual Order Form State
  const [manualSymbol, setManualSymbol] = useState<string>('XAUUSD');
  const [manualAction, setManualAction] = useState<'BUY' | 'SELL' | 'BUY_LIMIT' | 'SELL_LIMIT'>('BUY_LIMIT');
  const [manualEntry, setManualEntry] = useState<string>(currentPrice > 0 ? (currentPrice - 1.5).toFixed(2) : '4284.00');
  const [manualSl, setManualSl] = useState<string>(currentPrice > 0 ? (currentPrice - 5.5).toFixed(2) : '4280.00');
  const [manualTp1, setManualTp1] = useState<string>(currentPrice > 0 ? (currentPrice + 4.5).toFixed(2) : '4290.00');
  const [manualTp2, setManualTp2] = useState<string>(currentPrice > 0 ? (currentPrice + 12.0).toFixed(2) : '4298.00');
  const [manualLots, setManualLots] = useState<string>('0.10');
  const [manualComment, setManualComment] = useState<string>('ICT:Manual_Setup');

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Fetch MT5 status and signals from server
  const fetchMt5Status = async () => {
    try {
      const res = await fetch('/api/mt5/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTerminalStatus(json.terminalStatus);
          setSignals(json.signals || []);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMt5Status();
    const interval = setInterval(fetchMt5Status, 3000);
    return () => clearInterval(interval);
  }, []);

  // Push current analysis setup directly to MT5
  const handlePushCurrentAnalysis = async () => {
    if (!currentAnalysis || currentAnalysis.direction === 'STAND ASIDE') return;

    setIsPushing(true);
    setPushSuccessMsg(null);

    try {
      // Extract numeric prices from analysis
      const entryMatch = currentAnalysis.entryZone.match(/(\d{3,4}\.\d{2})/);
      const slMatch = currentAnalysis.stopLoss.match(/(\d{3,4}\.\d{2})/);
      const tp1Match = currentAnalysis.tp1.match(/(\d{3,4}\.\d{2})/);
      const tp2Match = currentAnalysis.tp2.match(/(\d{3,4}\.\d{2})/);
      const lotsMatch = currentAnalysis.recommendedLots.match(/(\d+(\.\d+)?)/);

      const entry = entryMatch ? parseFloat(entryMatch[1]) : currentPrice;
      const sl = slMatch ? parseFloat(slMatch[1]) : (currentAnalysis.direction === 'LONG' ? entry - 4.5 : entry + 4.5);
      const tp1 = tp1Match ? parseFloat(tp1Match[1]) : (currentAnalysis.direction === 'LONG' ? entry + 6.0 : entry - 6.0);
      const tp2 = tp2Match ? parseFloat(tp2Match[1]) : (currentAnalysis.direction === 'LONG' ? entry + 15.0 : entry - 15.0);
      const lots = lotsMatch ? parseFloat(lotsMatch[1]) : 0.10;

      const action = currentAnalysis.direction === 'LONG' ? 'BUY_LIMIT' : 'SELL_LIMIT';

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
          comment: `ICT:${currentAnalysis.archetype.split('—')[0].trim()}`,
          source: `${currentAnalysis.mode} (${currentAnalysis.grade} Grade)`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPushSuccessMsg(`Order successfully queued! MT5 Bot will execute ${action} @ ${entry.toFixed(2)}`);
        fetchMt5Status();
        setTimeout(() => setPushSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setPushSuccessMsg(`Error pushing signal: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Push manual setup
  const handlePushManualOrder = async () => {
    setIsPushing(true);
    setPushSuccessMsg(null);

    try {
      const res = await fetch('/api/mt5/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: manualSymbol,
          action: manualAction,
          entryPrice: parseFloat(manualEntry) || currentPrice,
          stopLoss: parseFloat(manualSl) || (currentPrice - 5.0),
          takeProfit1: parseFloat(manualTp1) || (currentPrice + 5.0),
          takeProfit2: parseFloat(manualTp2) || (currentPrice + 12.0),
          lots: parseFloat(manualLots) || 0.10,
          comment: manualComment,
          source: 'Manual Dispatch',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPushSuccessMsg(`Dispatched ${manualAction} ${manualLots} lots on ${manualSymbol} to MT5!`);
        fetchMt5Status();
        setTimeout(() => setPushSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setPushSuccessMsg(`Failed to dispatch: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Push quick 0.01 lot test order
  const handlePushTestOrder = async () => {
    setIsPushing(true);
    try {
      const ask = currentPrice > 0 ? currentPrice : 4285.00;
      await fetch('/api/mt5/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'XAUUSD',
          action: 'BUY_LIMIT',
          entryPrice: Number((ask - 1.0).toFixed(2)),
          stopLoss: Number((ask - 4.5).toFixed(2)),
          takeProfit1: Number((ask + 4.0).toFixed(2)),
          takeProfit2: Number((ask + 10.0).toFixed(2)),
          lots: 0.01,
          comment: 'ICT:Ping_Test',
          source: 'Connectivity Test (0.01 Lots)',
        }),
      });
      setPushSuccessMsg('Test 0.01 Lot order dispatched to MT5 queue!');
      fetchMt5Status();
      setTimeout(() => setPushSuccessMsg(null), 4000);
    } finally {
      setIsPushing(false);
    }
  };

  // Cancel a signal
  const handleCancelSignal = async (id: string) => {
    try {
      await fetch(`/api/mt5/signal/${id}`, { method: 'DELETE' });
      fetchMt5Status();
    } catch {
      // ignore
    }
  };

  // Copy helpers
  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                MT5 Institutional Execution Bridge & Bot
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
                Direct WebRequest
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Executes verified ICT algorithmic setups directly into your MetaTrader 5 terminal with zero manual entry delay.
            </p>
          </div>
        </div>

        {/* Live Terminal Connection Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-mono ${
            terminalStatus.connected
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${
              terminalStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`} />
            <div>
              <div className="font-bold leading-tight">
                {terminalStatus.connected ? 'MT5 TERMINAL CONNECTED' : 'AWAITING MT5 BOT'}
              </div>
              <div className="text-[10px] text-slate-400">
                {terminalStatus.connected
                  ? `${terminalStatus.broker || 'Broker'} #${terminalStatus.accountNumber || ''} • Eq: $${terminalStatus.equity?.toFixed(2) || '0'}`
                  : 'Start EA or Python script on desktop'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchMt5Status}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh MT5 Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('blotter')}
            className={`px-3 py-1 rounded transition-colors font-bold ${
              activeTab === 'blotter'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Order Blotter & Queue ({signals.filter(s => s.status === 'PENDING').length} Pending)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ea-code')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center gap-1.5 ${
              activeTab === 'ea-code'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            MQL5 EA (.mq5)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('python-bot')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center gap-1.5 ${
              activeTab === 'python-bot'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Python MT5 Bot (.py)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1 rounded transition-colors font-bold flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Manual Dispatch
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {currentAnalysis && currentAnalysis.direction !== 'STAND ASIDE' && (
            <button
              type="button"
              disabled={isPushing}
              onClick={handlePushCurrentAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Send Active Setup to MT5</span>
            </button>
          )}

          <button
            type="button"
            disabled={isPushing}
            onClick={handlePushTestOrder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition-all border border-slate-700 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Send 0.01 Lot Test Order</span>
          </button>
        </div>
      </div>

      {/* Success Notification Bar */}
      {pushSuccessMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{pushSuccessMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="p-4">
        {/* TAB 1: Order Blotter & Signal Queue */}
        {activeTab === 'blotter' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                ACTIVE MT5 EXECUTION BLOTTER ({signals.length} Recent Orders)
              </span>
              <span className="text-[11px] text-slate-500">
                Poll endpoint: <code className="text-amber-400">/api/mt5/signals</code>
              </span>
            </div>

            {signals.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-lg border border-slate-800/80">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <div className="text-xs font-mono text-slate-400 font-bold">No signals currently in execution queue</div>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Run an analysis or use the "Send Active Setup to MT5" button above to push orders directly to MT5.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Symbol</th>
                      <th className="p-2.5">Entry Price</th>
                      <th className="p-2.5">Stop Loss</th>
                      <th className="p-2.5">TP1 / TP2</th>
                      <th className="p-2.5">Lots</th>
                      <th className="p-2.5">MT5 Ticket</th>
                      <th className="p-2.5">Source</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {signals.map((sig) => {
                      const isBuy = sig.action.includes('BUY');
                      return (
                        <tr key={sig.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-2.5">
                            {sig.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                PENDING
                              </span>
                            )}
                            {sig.status === 'EXECUTED' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-3 h-3 text-emerald-400" />
                                EXECUTED
                              </span>
                            )}
                            {sig.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <XCircle className="w-3 h-3 text-rose-400" />
                                REJECTED
                              </span>
                            )}
                            {sig.status === 'CANCELLED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                                CANCELLED
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className={`font-bold flex items-center gap-1 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isBuy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              {sig.action}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-200">{sig.symbol}</td>
                          <td className="p-2.5 font-bold text-cyan-300">${sig.entryPrice.toFixed(2)}</td>
                          <td className="p-2.5 text-rose-400">${sig.stopLoss.toFixed(2)}</td>
                          <td className="p-2.5 text-slate-300">
                            ${sig.takeProfit1.toFixed(2)} / ${sig.takeProfit2 > 0 ? sig.takeProfit2.toFixed(2) : '—'}
                          </td>
                          <td className="p-2.5 font-bold text-amber-300">{sig.lots.toFixed(2)}</td>
                          <td className="p-2.5">
                            {sig.ticketId ? (
                              <span className="font-bold text-emerald-400">#{sig.ticketId}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-400 truncate max-w-[140px]" title={sig.source}>
                            {sig.source}
                          </td>
                          <td className="p-2.5 text-right">
                            {sig.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleCancelSignal(sig.id)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-[10px] transition-colors border border-slate-700"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MQL5 Expert Advisor (.mq5) */}
        {activeTab === 'ea-code' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  MQL5 EXPERT ADVISOR: ICT_XAUUSD_Executor.mq5
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Complete 560-line automated execution bot with forward declarations, CTrade integration, Breakeven Trailing, and NY Lunch risk stop.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/mt5/download/ea"
                  download="ICT_XAUUSD_Executor.mq5"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Download ICT_XAUUSD_Executor.mq5
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getCompleteMql5Code(appOrigin), setCopiedFullEa)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {copiedFullEa ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedFullEa ? 'Copied Complete File!' : 'Copy Complete EA Code'}
                </button>
              </div>
            </div>

            {/* Error Fix / Compilation Notice */}
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3.5 flex items-start gap-3 text-xs font-mono text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-300">
                  Fixed MetaEditor Error: undeclared identifier 'ManageOpenPositions' / 'PollAndExecuteSignals'
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  MetaEditor requires the <b>complete 560-line MQL5 file</b> containing forward declarations and the full implementations of <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-300">ManageOpenPositions()</code> and <code className="bg-amber-950/80 px-1 py-0.5 rounded text-amber-300">PollAndExecuteSignals()</code>.
                  Do not copy just the first 27 lines. Click <b>"Download ICT_XAUUSD_Executor.mq5"</b> above or <b>"Copy Complete EA Code"</b> and paste it into MetaEditor to compile with <b>0 errors, 0 warnings</b>.
                </p>
              </div>
            </div>

            {/* Quick 3-Step Setup Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-xs font-mono font-bold text-amber-400 mb-1">Step 1: Save Full EA File</div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                  In MetaTrader 5, click <b>File → Open Data Folder</b>, navigate to <b>MQL5/Experts</b>, and save the complete <code className="text-slate-200">ICT_XAUUSD_Executor.mq5</code>.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-xs font-mono font-bold text-amber-400 mb-1">Step 2: Enable WebRequest</div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                  Go to <b>Tools → Options → Expert Advisors</b>. Check <i>Allow WebRequest for listed URL</i> and add this app's URL:
                </p>
                <div className="mt-2 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <code className="text-[11px] font-mono text-cyan-300 truncate flex-1">{appOrigin}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(appOrigin, setCopiedUrl)}
                    className="text-slate-400 hover:text-slate-200"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-xs font-mono font-bold text-amber-400 mb-1">Step 3: Compile & Attach</div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                  Press <b>F7</b> in MetaEditor to compile (0 errors). Back in MT5, drag <b>ICT_XAUUSD_Executor</b> onto any <b>XAUUSD</b> chart and enable <b>Algo Trading</b>.
                </p>
              </div>
            </div>

            {/* Complete Code Viewer */}
            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-bold flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  Complete MQL5 Expert Advisor Source (Ready to Compile)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getCompleteMql5Code(appOrigin), setCopiedFullEa)}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold text-[11px]"
                >
                  {copiedFullEa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFullEa ? 'Copied Full Script!' : 'Copy All 560 Lines'}</span>
                </button>
              </div>
              <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[450px] leading-relaxed bg-slate-950 select-all">
                {getCompleteMql5Code(appOrigin)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: Python MT5 Bridge Bot */}
        {activeTab === 'python-bot' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  PYTHON METATRADER 5 BRIDGE BOT: mt5_bridge_bot.py
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Connects to any running desktop MT5 terminal via the official MetaTrader5 Python API. Perfect for local desktop or VPS setups.
                </p>
              </div>

              <a
                href="/api/mt5/download/python"
                download="mt5_bridge_bot.py"
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download mt5_bridge_bot.py
              </a>
            </div>

            {/* Setup Commands */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-300">Terminal Launch Command:</div>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-200 flex items-center justify-between">
                <code>pip install MetaTrader5 requests && python mt5_bridge_bot.py --url {appOrigin}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`pip install MetaTrader5 requests && python mt5_bridge_bot.py --url ${appOrigin}`, setCopiedPy)}
                  className="text-slate-400 hover:text-slate-200 ml-2"
                >
                  {copiedPy ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Manual Dispatch */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="text-xs font-mono font-bold text-slate-200 mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                MANUAL DISPATCH TO MT5 TERMINAL
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Symbol:</label>
                  <input
                    type="text"
                    value={manualSymbol}
                    onChange={(e) => setManualSymbol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Order Action:</label>
                  <select
                    value={manualAction}
                    onChange={(e) => setManualAction(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  >
                    <option value="BUY_LIMIT">BUY LIMIT (Pending)</option>
                    <option value="SELL_LIMIT">SELL LIMIT (Pending)</option>
                    <option value="BUY">BUY (Market)</option>
                    <option value="SELL">SELL (Market)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Entry Price ($):</label>
                  <input
                    type="number"
                    step="0.10"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Stop Loss ($):</label>
                  <input
                    type="number"
                    step="0.10"
                    value={manualSl}
                    onChange={(e) => setManualSl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-rose-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Take Profit 1 ($):</label>
                  <input
                    type="number"
                    step="0.10"
                    value={manualTp1}
                    onChange={(e) => setManualTp1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Take Profit 2 ($):</label>
                  <input
                    type="number"
                    step="0.10"
                    value={manualTp2}
                    onChange={(e) => setManualTp2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Lot Size:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualLots}
                    onChange={(e) => setManualLots(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-amber-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Order Comment:</label>
                  <input
                    type="text"
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={isPushing}
                  onClick={handlePushManualOrder}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  Dispatch Custom Order to MT5
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
