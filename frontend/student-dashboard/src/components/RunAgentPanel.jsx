import React, { useState } from 'react';
import { Icons } from './Icons';

const API_BASE = 'http://127.0.0.1:5000';

export function RunAgentPanel({ onRunComplete }) {
  const [week, setWeek] = useState(13);
  const [riskFilter, setRiskFilter] = useState('All');
  const [limit, setLimit] = useState('');
  const [modelChoice, setModelChoice] = useState('lstm');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/run-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week,
          risk_filter: riskFilter,
          limit: limit ? parseInt(limit) : null,
          model_choice: modelChoice
        })
      });
      const data = await res.json();
      setResult(data);
      onRunComplete();
    } catch (e) {
      setError('Failed to connect to API. Make sure Flask is running.');
    }
    setRunning(false);
  };

  const formatDuration = (secs) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  };

  return (
    <div className="w-full max-w-[900px] flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Run Agent</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure and launch the early warning prediction pipeline across enrolled students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Model Classifier */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Classifier Model</label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Neural architecture to evaluate student risk</p>
          </div>
          <select
            className="w-full py-1.5 px-2.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200"
            value={modelChoice}
            onChange={e => setModelChoice(e.target.value)}
          >
            <option value="lstm">LSTM (Proposed - Recurrent)</option>
            <option value="cnn">CNN (1D Convolutional)</option>
          </select>
        </div>

        {/* Evaluation Week */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Evaluation Week</label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Behavior data up to this week</p>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <input
                type="range" min={1} max={38} value={week}
                onChange={e => setWeek(parseInt(e.target.value))}
                className="flex-1 accent-zinc-900 dark:accent-zinc-100 cursor-pointer h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-lg appearance-none"
              />
              <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-0.5 px-2 rounded-full whitespace-nowrap">W{week}</span>
            </div>
          </div>
        </div>

        {/* Risk filter */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Risk Filter</label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Target student evaluation tier</p>
          </div>
          <select
            className="w-full py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200"
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
          >
            <option value="All">All students</option>
            <option value="High+Medium">High + Medium risk</option>
            <option value="High">High risk only</option>
            <option value="Medium">Medium risk only</option>
          </select>
        </div>

        {/* Student Limit */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Student Limit</label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Blank for all enrolled</p>
          </div>
          <input
            type="number" min={1}
            className="w-full py-1.5 px-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            placeholder="e.g. 100"
          />
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-4 text-[12px] text-amber-800 dark:text-amber-300 shadow-sm leading-relaxed">
        <span className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"><Icons.AlertTriangle /></span>
        <p>
          <strong>Groq API Constraint:</strong> Rate limit is ~30 requests/minute. The batch agent pauses 1.2s between calls for High and Medium risk students to avoid limits. Low-risk students receive instant template messages.
        </p>
      </div>

      <div>
        <button
          className="inline-flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border-none rounded-lg py-2.5 px-5 text-xs font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm active:scale-[0.98]"
          onClick={handleRun}
          disabled={running}
        >
          {running ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/35 dark:border-zinc-900/35 border-t-white dark:border-t-zinc-900 rounded-full animate-spin"></span>
              Running pipeline...
            </>
          ) : (
            <>
              <div className="w-3.5 h-3.5"><Icons.Play /></div>
              Run batch pipeline
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 text-xs font-medium shadow-sm animate-[fadeIn_0.2s_ease-out]">
          <span className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400"><Icons.AlertTriangle /></span>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Icons.Check className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">Pipeline execution complete</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Week {result.week_evaluated} evaluated &bull; Time taken: {formatDuration(result.duration_seconds)}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-2.5 text-center flex flex-col justify-center">
              <p className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200 leading-none">{result.total_processed}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-bold">Processed</p>
            </div>
            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/50 rounded-xl p-2.5 text-center flex flex-col justify-center text-rose-700 dark:text-rose-400">
              <p className="text-lg font-extrabold leading-none">{result.high_risk}</p>
              <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1 font-bold">High risk</p>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 rounded-xl p-2.5 text-center flex flex-col justify-center text-amber-700 dark:text-amber-400">
              <p className="text-lg font-extrabold leading-none">{result.medium_risk}</p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1 font-bold">Medium risk</p>
            </div>
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl p-2.5 text-center flex flex-col justify-center text-emerald-700 dark:text-emerald-400">
              <p className="text-lg font-extrabold leading-none">{result.low_risk}</p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-bold">Low risk</p>
            </div>
            <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-2.5 text-center flex flex-col justify-center">
              <p className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200 leading-none">{result.skipped}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-bold">Skipped</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">The enrollments risk classification has been updated. Switch back to the Students tab to review the latest results.</p>
        </div>
      )}
    </div>
  );
}
