import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { ThemeToggle } from './ThemeToggle';

export function EntryPage() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [mode, setMode] = useState(null);
  const [error, setError] = useState('');

  const handleStudentLogin = () => {
    if (!studentId.trim()) {
      setError('Please enter your student ID.');
      return;
    }
    navigate(`/student/${studentId.trim()}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-zinc-50 via-white to-indigo-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/30">
      <ThemeToggle />
      <div className="max-w-[440px] w-full animate-[entrySlide_0.4s_ease-out]">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-5">
            <div className="w-8 h-8"><Icons.GraduationCap /></div>
          </div>
          <h1 className="text-[28px] font-extrabold text-zinc-900 dark:text-white tracking-tight">Welcome to Aegis</h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">Student Academic Monitoring System</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 rounded-2xl shadow-lg shadow-zinc-900/[0.04] dark:shadow-black/20 p-7">
          {!mode && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Select your role</p>

              <button
                className="group w-full text-left flex items-center gap-4 p-4.5 rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-50/50 dark:bg-zinc-800/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                onClick={() => navigate('/admin')}
              >
                <div className="w-11 h-11 bg-white dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/20 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-all duration-200 flex-shrink-0">
                  <div className="w-5 h-5"><Icons.Shield /></div>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-[14px] font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Advising Staff</p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">Review risk signals and coordinate interventions</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <button
                className="group w-full text-left flex items-center gap-4 p-4.5 rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 bg-zinc-50/50 dark:bg-zinc-800/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                onClick={() => setMode('student')}
              >
                <div className="w-11 h-11 bg-white dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/20 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-all duration-200 flex-shrink-0">
                  <div className="w-5 h-5"><Icons.User /></div>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-[14px] font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Student Portal</p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">Access messages and customized learning actions</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}

          {mode === 'student' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">Student ID</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={e => { setStudentId(e.target.value); setError(''); }}
                  placeholder="e.g. 8462"
                  onKeyDown={e => e.key === 'Enter' && handleStudentLogin()}
                  className="w-full h-10 px-3.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs py-2.5 px-3.5 rounded-lg flex items-center gap-2 font-medium">
                  <span className="w-4 h-4 flex-shrink-0"><Icons.AlertTriangle /></span>
                  {error}
                </p>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  className="h-9 px-4 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg font-semibold text-[13px] cursor-pointer transition-all"
                  onClick={() => { setMode(null); setError(''); }}
                >
                  Back
                </button>
                <button
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[13px] cursor-pointer shadow-sm shadow-indigo-500/20 active:scale-[0.98] transition-all"
                  onClick={handleStudentLogin}
                >
                  Verify identity
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 mt-6 font-medium">Aegis &middot; LSTM-powered early warning system</p>
      </div>
    </div>
  );
}
