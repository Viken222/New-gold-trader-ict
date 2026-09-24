import React from 'react';
import { ScorecardCriterion, TradeGrade } from '../types';
import { CheckCircle2, XCircle, AlertCircle, Award } from 'lucide-react';

interface ScorecardMatrixProps {
  scorecard: ScorecardCriterion[];
  confluenceScore: number;
  grade: TradeGrade;
  confidenceScore: number;
}

export const ScorecardMatrix: React.FC<ScorecardMatrixProps> = ({
  scorecard,
  confluenceScore,
  grade,
  confidenceScore,
}) => {
  const getGradeBadge = (g: TradeGrade) => {
    switch (g) {
      case 'A':
        return (
          <span className="px-3 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-sm">
            GRADE A (High Probability • Min 1:2.5 RR)
          </span>
        );
      case 'B':
        return (
          <span className="px-3 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-bold text-sm">
            GRADE B (Moderate • Min 1:3 RR or Halve Risk)
          </span>
        );
      case 'STAND ASIDE':
      default:
        return (
          <span className="px-3 py-1 rounded bg-rose-500/15 border border-rose-500/40 text-rose-400 font-mono font-bold text-sm">
            STAND ASIDE (Capital Preservation • Hard Rule)
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-bold text-slate-100">
              ICT 10-POINT CONFLUENCE SCORECARD & GRADING
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Strict algorithmic point audit. Zero tolerance for unconfirmed setups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono text-slate-400">Total Confluence:</div>
            <div className="text-lg font-mono font-bold text-slate-100">
              <span className="text-amber-400">{confluenceScore}</span> / 10
            </div>
          </div>
          {getGradeBadge(grade)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2 mb-5 overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-500 ${
            grade === 'A'
              ? 'bg-emerald-500'
              : grade === 'B'
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, (confluenceScore / 10) * 100))}%` }}
        />
      </div>

      {/* 10 Criteria Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scorecard.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
              item.met
                ? 'bg-emerald-950/20 border-emerald-500/25'
                : 'bg-slate-950/60 border-slate-800/80'
            }`}
          >
            <div className="mt-0.5">
              {item.met ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-mono font-semibold text-slate-200">
                  {item.id}. {item.label}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    item.met
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.met ? '+1 PT' : '0 PT'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mb-1">{item.description}</p>
              <div className="text-[10px] font-mono text-slate-500 italic truncate" title={item.notes}>
                Audit: {item.notes}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
