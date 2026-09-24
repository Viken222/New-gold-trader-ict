import React from 'react';
import { AnalysisResult } from '../types';
import { History, X, Clock, ArrowUpRight, ArrowDownRight, MinusCircle, Trash2 } from 'lucide-react';

interface HistoryDrawerProps {
  history: AnalysisResult[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: AnalysisResult) => void;
  onClear: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  isOpen,
  onClose,
  onSelect,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="font-mono font-bold text-slate-100 text-sm">
              SESSION AUDIT ARCHIVE ({history.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="p-1 text-slate-400 hover:text-rose-400 rounded"
                title="Clear History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No previous session analyses saved. Run an algorithmic audit to store records.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-amber-500/50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {item.direction === 'LONG' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
                    {item.direction === 'SHORT' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                    {item.direction === 'STAND ASIDE' && <MinusCircle className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="text-xs font-mono font-bold text-slate-200">{item.direction}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      Grade {item.grade}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs font-mono text-amber-400 truncate mb-1">
                  {item.ticket}
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Score: {item.confluenceScore}/10</span>
                  <span>{item.archetype.split('(')[0]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
