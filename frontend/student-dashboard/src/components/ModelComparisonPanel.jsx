import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Icons } from './Icons';

const API_BASE = 'http://127.0.0.1:5000';

export function ModelComparisonPanel() {
  const [modelsData, setModelsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/model-comparison`)
      .then(res => res.json())
      .then(data => {
        setModelsData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!modelsData.length || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 0.6)';
    const tickColor = isDark ? '#a1a1aa' : '#71717a';

    const metrics = ['auc', 'accuracy', 'precision', 'recall', 'f1'];
    const metricLabels = ['AUC', 'Accuracy', 'Precision', 'Recall', 'F1 Score'];
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

    const datasets = metrics.map((metricKey, idx) => ({
      label: metricLabels[idx],
      data: modelsData.map(m => (m[metricKey] * 100).toFixed(2)),
      backgroundColor: colors[idx],
      borderRadius: 4
    }));

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: modelsData.map(m => m.model),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 10,
              font: { size: 11, weight: '600' },
              color: tickColor
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 11, weight: '600' }, color: tickColor },
            grid: { display: false }
          },
          y: {
            min: 80,
            max: 100,
            ticks: { font: { size: 10 }, color: tickColor, callback: (v) => v + '%' },
            grid: { color: gridColor }
          }
        }
      }
    });
  }, [modelsData]);

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <div className="w-8 h-8 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1250px] flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800 pb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Model Architecture Benchmarking & Comparison</h2>
          <span className="text-[10px] font-bold py-0.5 px-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Held-out Test Set</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Evaluating deep learning temporal models (LSTM vs 1D CNN) and classical baseline classifiers on student risk prediction</p>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modelsData.map((m) => (
          <div 
            key={m.key} 
            className={`rounded-2xl p-5 flex flex-col justify-between gap-3 transition-all duration-200 ${
              m.is_proposed 
                ? 'bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-900 text-white shadow-lg shadow-indigo-950/20 border border-indigo-700/50' 
                : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  m.is_proposed ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {m.is_proposed ? 'Proposed Architecture' : 'Baseline Model'}
                </span>
              </div>
              <h3 className="text-base font-bold leading-tight mt-1">{m.model}</h3>
              <p className={`text-[11px] leading-relaxed line-clamp-3 ${m.is_proposed ? 'text-indigo-200/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {m.description}
              </p>
            </div>

            <div className="pt-3 border-t border-current/10 grid grid-cols-2 gap-2">
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${m.is_proposed ? 'text-indigo-300' : 'text-zinc-400'}`}>ROC AUC</span>
                <p className="text-xl font-black leading-tight">{(m.auc * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${m.is_proposed ? 'text-indigo-300' : 'text-zinc-400'}`}>Accuracy</span>
                <p className="text-xl font-black leading-tight">{(m.accuracy * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Comparative Metric Visualization</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Side-by-side metric comparison across all evaluated model architectures</p>
        </div>
        <div className="h-[300px] w-full relative">
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>

      {/* Detailed Benchmark Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Detailed Evaluation Metrics Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Model Architecture</th>
                <th className="py-3.5 px-4">AUC</th>
                <th className="py-3.5 px-4">Accuracy</th>
                <th className="py-3.5 px-4">Precision</th>
                <th className="py-3.5 px-4">Recall</th>
                <th className="py-3.5 px-4">F1 Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs font-medium">
              {modelsData.map((m) => (
                <tr 
                  key={m.key} 
                  className={m.is_proposed ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-semibold text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40'}
                >
                  <td className="py-4 px-5 flex items-center gap-2">
                    {m.model}
                    {m.is_proposed && (
                      <span className="text-[9px] font-extrabold py-0.5 px-2 rounded-full bg-indigo-600 text-white">
                        Selected
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{(m.auc * 100).toFixed(2)}%</td>
                  <td className="py-4 px-4 font-mono font-bold">{(m.accuracy * 100).toFixed(2)}%</td>
                  <td className="py-4 px-4 font-mono">{(m.precision * 100).toFixed(2)}%</td>
                  <td className="py-4 px-4 font-mono">{(m.recall * 100).toFixed(2)}%</td>
                  <td className="py-4 px-4 font-mono font-bold">{(m.f1 * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Takeaways Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col gap-3">
        <div className="flex items-center gap-2 text-indigo-400">
          <div className="w-5 h-5"><Icons.Shield /></div>
          <h3 className="text-sm font-bold text-white">Key Takeaways & Architectural Analysis</h3>
        </div>
        <p className="text-xs leading-relaxed text-zinc-300">
          While 1D Convolutional Networks (CNN) extract efficient localized patterns across short temporal windows, the <strong>LSTM architecture</strong> achieves superior predictive power (<strong>AUC: 0.9841, Accuracy: 94.22%</strong>). LSTM's recurrent memory cells effectively capture long-term sequential dependencies and subtle trajectory shifts in student clickstream engagement across consecutive weeks.
        </p>
      </div>
    </div>
  );
}
