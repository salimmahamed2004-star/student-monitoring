import { useState, useEffect } from 'react';
import { Icons } from './Icons';

export function ThemeToggle({ className = "fixed top-4 right-4 z-50" }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aegis-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('aegis-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('aegis-theme', 'light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className={`${className} w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm cursor-pointer transition-all duration-200 active:scale-95`}
      aria-label="Toggle dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="w-4 h-4">
        {dark ? <Icons.Sun /> : <Icons.Moon />}
      </div>
    </button>
  );
}
