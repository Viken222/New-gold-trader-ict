import React, { useEffect, useState } from 'react';
import { Clock, Zap, Target, Lock, AlertOctagon, RefreshCw, Compass, Moon, Sun } from 'lucide-react';
import { getAccurateLiveSession, LiveSessionInfo } from '../utils/sessionTiming';

interface TimelineBarProps {
  captureTimeEAT: string;
  seasonOffset: 'EDT' | 'EST';
  onTimeChange: (eatTime: string) => void;
  onSeasonChange: (season: 'EDT' | 'EST') => void;
  onLiveSync?: (liveDetails: LiveSessionInfo) => void;
}

interface WindowDef {
  eatStart: string;
  eatEnd: string;
  nyEdt: string;
  nyEst: string;
  utcTime: string;
  name: string;
  badge: string;
  type: 'asia' | 'london' | 'pre' | 'judas' | 'equities' | 'silverbullet' | 'lunch' | 'pm';
}

const ALGO_WINDOWS: WindowDef[] = [
  {
    eatStart: '01:00',
    eatEnd: '09:00',
    nyEdt: '18:00–02:00',
    nyEst: '17:00–01:00',
    utcTime: '22:00–06:00',
    name: 'Asian Session (Marek Majeer Range)',
    badge: 'Asia Range',
    type: 'asia',
  },
  {
    eatStart: '09:00',
    eatEnd: '12:00',
    nyEdt: '02:00–05:00',
    nyEst: '01:00–04:00',
    utcTime: '06:00–09:00',
    name: 'London Open Killzone (Asia Sweep)',
    badge: 'London Open KZ',
    type: 'london',
  },
  {
    eatStart: '12:00',
    eatEnd: '14:30',
    nyEdt: '05:00–07:30',
    nyEst: '04:00–06:30',
    utcTime: '09:00–11:30',
    name: 'London Midday Consolidation',
    badge: 'London Midday',
    type: 'london',
  },
  {
    eatStart: '14:30',
    eatEnd: '15:30',
    nyEdt: '07:30–08:30',
    nyEst: '06:30–07:30',
    utcTime: '11:30–12:30',
    name: 'NY Pre-Market / News Macro',
    badge: 'Pre-Market',
    type: 'pre',
  },
  {
    eatStart: '15:30',
    eatEnd: '16:30',
    nyEdt: '08:30–09:30',
    nyEst: '07:30–08:30',
    utcTime: '12:30–13:30',
    name: 'NY Open Judas Swing (08:30)',
    badge: '08:30 Judas',
    type: 'judas',
  },
  {
    eatStart: '16:30',
    eatEnd: '17:00',
    nyEdt: '09:30–10:00',
    nyEst: '08:30–09:00',
    utcTime: '13:30–14:00',
    name: 'US Equities Open (09:50 Macro)',
    badge: '09:30 Open',
    type: 'equities',
  },
  {
    eatStart: '17:00',
    eatEnd: '18:00',
    nyEdt: '10:00–11:00',
    nyEst: '09:00–10:00',
    utcTime: '14:00–15:00',
    name: '🔥 NY AM Silver Bullet + LBMA Fix',
    badge: 'AM Silver Bullet',
    type: 'silverbullet',
  },
  {
    eatStart: '18:30',
    eatEnd: '20:00',
    nyEdt: '11:30–13:00',
    nyEst: '10:30–12:00',
    utcTime: '15:30–17:00',
    name: 'NY Lunch Algorithmic Pause (No Entries)',
    badge: 'No-Entry Lunch',
    type: 'lunch',
  },
  {
    eatStart: '20:00',
    eatEnd: '21:00',
    nyEdt: '13:00–14:00',
    nyEst: '12:00–13:00',
    utcTime: '17:00–18:00',
    name: 'NY PM Session / London Close Macro',
    badge: 'London Close',
    type: 'pm',
  },
  {
    eatStart: '21:00',
    eatEnd: '22:00',
    nyEdt: '14:00–15:00',
    nyEst: '13:00–14:00',
    utcTime: '18:00–19:00',
    name: '🔥 NY PM Silver Bullet Window',
    badge: 'PM Silver Bullet',
    type: 'silverbullet',
  },
  {
    eatStart: '22:00',
    eatEnd: '24:00',
    nyEdt: '15:00–17:00',
    nyEst: '14:00–16:00',
    utcTime: '19:00–21:00',
    name: 'NY Close & Settlement Macro',
    badge: 'Settlement Close',
    type: 'pm',
  },
];

export const TimelineBar: React.FC<TimelineBarProps> = ({
  captureTimeEAT,
  seasonOffset,
  onTimeChange,
  onSeasonChange,
  onLiveSync,
}) => {
  const [liveInfo, setLiveInfo] = useState<LiveSessionInfo>(getAccurateLiveSession());
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(true);

  // Keep live time ticking every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const updated = getAccurateLiveSession();
      setLiveInfo(updated);
      if (isLiveTracking) {
        onTimeChange(updated.eatTimeFormatted);
        onSeasonChange(updated.seasonOffset);
        if (onLiveSync) onLiveSync(updated);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isLiveTracking, onTimeChange, onSeasonChange, onLiveSync]);

  // Handle manual sync button
  const handleManualLiveSync = () => {
    const updated = getAccurateLiveSession();
    setLiveInfo(updated);
    setIsLiveTracking(true);
    onTimeChange(updated.eatTimeFormatted);
    onSeasonChange(updated.seasonOffset);
    if (onLiveSync) onLiveSync(updated);
  };

  // Compute NY time
  const eatHours = parseInt(captureTimeEAT.split(':')[0] || '17', 10);
  const eatMinutes = parseInt(captureTimeEAT.split(':')[1] || '00', 10);
  const offset = seasonOffset === 'EDT' ? 7 : 8;
  const nyHours = (eatHours - offset + 24) % 24;
  const nyTimeFormatted = `${String(nyHours).padStart(2, '0')}:${String(eatMinutes).padStart(2, '0')}`;

  // Find active window
  const activeWindow =
    ALGO_WINDOWS.find((w) => {
      if (w.eatStart > w.eatEnd) {
        // Overnight wrap
        return captureTimeEAT >= w.eatStart || captureTimeEAT <= w.eatEnd;
      }
      return captureTimeEAT >= w.eatStart && captureTimeEAT <= w.eatEnd;
    }) || ALGO_WINDOWS[1];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        {/* Time sync status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono text-slate-400">Capture (EAT):</span>
            <input
              type="time"
              value={captureTimeEAT}
              onChange={(e) => {
                setIsLiveTracking(false);
                onTimeChange(e.target.value);
              }}
              className="bg-transparent text-amber-400 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-400">NY Local:</span>
            <span className="text-slate-100 font-mono font-bold text-sm">{nyTimeFormatted}</span>
            <div className="flex items-center gap-1 ml-2 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => onSeasonChange('EDT')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  seasonOffset === 'EDT'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="EDT: UTC-4 (Mid-Mar to Early Nov, Offset: EAT - 7h)"
              >
                EDT (-7h)
              </button>
              <button
                type="button"
                onClick={() => onSeasonChange('EST')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  seasonOffset === 'EST'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="EST: UTC-5 (Nov to Mar, Offset: EAT - 8h)"
              >
                EST (-8h)
              </button>
            </div>
          </div>

          {/* Sync Live Clock button */}
          <button
            type="button"
            onClick={handleManualLiveSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
              isLiveTracking
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Click to sync capture time and session narrative to current real-time clock"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveTracking ? 'animate-spin' : ''}`} />
            <span>{isLiveTracking ? 'Live Clock Synced' : 'Sync Live Clock'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>
              Active: <strong>{activeWindow.badge}</strong> ({seasonOffset === 'EDT' ? activeWindow.nyEdt : activeWindow.nyEst} NY / {activeWindow.utcTime} UTC)
            </span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>UTC: <strong className="text-slate-200">{liveInfo.utcTimeFormatted}</strong></span>
          <span>•</span>
          <span className="text-amber-400 font-semibold">{liveInfo.dayOfWeek} Rhythm</span>
        </div>
      </div>

      {/* Visual Window Track Across 24-Hour Cycle */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-1.5">
        {ALGO_WINDOWS.map((w, idx) => {
          let isActive = false;
          if (w.eatStart > w.eatEnd) {
            isActive = captureTimeEAT >= w.eatStart || captureTimeEAT <= w.eatEnd;
          } else {
            isActive = captureTimeEAT >= w.eatStart && captureTimeEAT <= w.eatEnd;
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsLiveTracking(false);
                onTimeChange(w.eatStart);
              }}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {w.eatStart} EAT
                </span>
                {w.type === 'asia' && <Moon className="w-2.5 h-2.5 text-cyan-400" />}
                {w.type === 'london' && <Sun className="w-2.5 h-2.5 text-amber-400" />}
                {w.type === 'silverbullet' && <Target className="w-2.5 h-2.5 text-cyan-400" />}
                {w.type === 'lunch' && <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />}
                {w.type === 'judas' && <Zap className="w-2.5 h-2.5 text-amber-400" />}
              </div>
              <div className="text-[11px] font-mono font-semibold truncate text-slate-200">
                {w.badge}
              </div>
              <div className="text-[9px] font-mono text-slate-400 truncate">
                NY {seasonOffset === 'EDT' ? w.nyEdt.split('–')[0] : w.nyEst.split('–')[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
