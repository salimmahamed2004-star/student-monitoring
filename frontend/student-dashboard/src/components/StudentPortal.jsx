import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { ThemeToggle } from './ThemeToggle';

const API_BASE = 'http://127.0.0.1:5000';

function tierMeta(tier) {
  if (tier === 'High') return { color: 'hsl(var(--high-risk))', badgeBg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400', label: 'High Risk' };
  if (tier === 'Medium') return { color: 'hsl(var(--medium-risk))', badgeBg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400', label: 'Medium Risk' };
  return { color: 'hsl(var(--low-risk))', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400', label: 'Low Risk' };
}

export function StudentPortal() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/student-portal/${studentId}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch(() => setError('Student ID not found. Please check and try again.'));
  }, [studentId]);

  if (error) {
    return (
      <div className="w-full max-w-[900px] mx-auto p-6 flex flex-col justify-center items-center min-h-[85vh] gap-4">
        <p className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs py-3 px-5 rounded-lg flex items-center gap-2 font-medium shadow-sm">
          <Icons.AlertTriangle className="w-4.5 h-4.5" />
          {error}
        </p>
        <button 
          className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border-0 rounded-lg py-2.5 px-4 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all" 
          onClick={() => navigate('/')}
        >
          Back to login
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-[900px] mx-auto p-6 flex flex-col justify-center items-center min-h-[85vh]">
        <div className="w-8 h-8 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading support inbox...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[900px] mx-auto p-6 flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
            <Icons.User className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-none">Academic Support Inbox</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Logged in Student ID: {data.id_student}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle className="relative" />
          <button 
            className="bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3.5 font-medium text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]" 
            onClick={() => navigate('/')}
          >
            <Icons.LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>

      {data.messages.length === 0 ? (
        <div className="flex flex-col justify-center items-center text-center p-16 text-zinc-400 gap-3 min-h-[260px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm">
          <span className="w-10 h-10 text-zinc-300 dark:text-zinc-600"><Icons.Inbox /></span>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-1">All clear!</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No support messages yet. Keep up the great work!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4.5">
          {data.messages.map((m, i) => {
            const meta = tierMeta(m.risk_tier);
            return (
              <div 
                key={i} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-3 gap-4">
                  <span className="text-[13.5px] font-bold text-zinc-900 dark:text-white truncate">
                    Academic Advising: {m.code_module} ({m.code_presentation})
                  </span>
                  <span 
                    className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border ${meta.badgeBg}`}
                  >
                    {meta.label}
                  </span>
                </div>
                
                <p 
                  className="text-xs leading-relaxed text-zinc-900 dark:text-zinc-200 italic py-3 px-4 bg-zinc-50/50 dark:bg-zinc-800/50 border-l-4 rounded-r-lg shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] whitespace-pre-line"
                  style={{ borderColor: meta.color }}
                >
                  "{m.message_text}"
                </p>
                
                <div className="flex justify-between items-center gap-4 mt-2">
                  <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 py-1 px-3 rounded-full border border-zinc-200 dark:border-zinc-700">
                    Recommended action: {m.recommended_action}
                  </span>
                  {m.sent_at && (
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                      Received: {new Date(m.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
