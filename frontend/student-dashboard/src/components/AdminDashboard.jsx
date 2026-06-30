import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { Icons } from './Icons';
import { RunAgentPanel } from './RunAgentPanel';
import { ModelComparisonPanel } from './ModelComparisonPanel';
import { ThemeToggle } from './ThemeToggle';

const API_BASE = 'http://127.0.0.1:5000';

function tierMeta(tier) {
  if (tier === 'High') return { color: 'hsl(var(--high-risk))', badgeBg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400', label: 'High Risk' };
  if (tier === 'Medium') return { color: 'hsl(var(--medium-risk))', badgeBg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400', label: 'Medium Risk' };
  return { color: 'hsl(var(--low-risk))', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400', label: 'Low Risk' };
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editAction, setEditAction] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const loadStudents = () => {
    fetch(`${API_BASE}/api/students`)
      .then(res => res.json())
      .then(data => {
        setStudents(data);
        if (data.length > 0 && !selected) setSelected(data[0].prediction_id);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not connect to API.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const stud = students.find(s => s.prediction_id === selected);
    if (!stud) return;
    fetch(`${API_BASE}/api/student/${stud.enrollment_id}`)
      .then(res => res.json())
      .then(setDetail);
  }, [selected, students]);

  useEffect(() => {
    if (!detail || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    
    const weekly = detail.weekly_behavior;
    const ctx = canvasRef.current.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    
    const gEng = ctx.createLinearGradient(0, 0, 0, 200);
    gEng.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
    gEng.addColorStop(1, 'rgba(99, 102, 241, 0)');
    
    const gScore = ctx.createLinearGradient(0, 0, 0, 200);
    gScore.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
    gScore.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const gridColor = isDark ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 0.6)';
    const tickColor = isDark ? '#71717a' : '#a1a1aa';
    const legendColor = isDark ? '#a1a1aa' : '#71717a';
    
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: weekly.map(w => 'W' + w.week),
        datasets: [
          {
            label: 'Engagement',
            data: weekly.map(w => w.engagement_score),
            borderColor: '#6366f1',
            borderWidth: 2,
            backgroundColor: gEng,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Cumulative avg',
            data: weekly.map(w => w.cumulative_avg_score),
            borderColor: '#10b981',
            borderWidth: 2,
            backgroundColor: gScore,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 8,
              usePointStyle: true,
              font: { size: 11, weight: '500' },
              color: legendColor
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 10 }, color: tickColor },
            grid: { display: false }
          },
          y: {
            position: 'left',
            title: { display: true, text: 'Clicks', font: { size: 10, weight: '600' }, color: legendColor },
            ticks: { font: { size: 10 }, color: tickColor },
            grid: { color: gridColor }
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Score', font: { size: 10, weight: '600' }, color: legendColor },
            grid: { drawOnChartArea: false },
            min: 0,
            max: 100,
            ticks: { font: { size: 10 }, color: tickColor }
          }
        }
      }
    });
  }, [detail]);

  const stats = {
    total: students.length,
    low: students.filter(s => s.risk_tier === 'Low').length,
    medium: students.filter(s => s.risk_tier === 'Medium').length,
    high: students.filter(s => s.risk_tier === 'High').length,
    avg: students.length ? (students.reduce((a, s) => a + s.risk_score, 0) / students.length).toFixed(2) : 0
  };

  const selectedStudent = students.find(s => s.prediction_id === selected);

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.id_student.toString().includes(q) || s.code_module.toLowerCase().includes(q) || s.code_presentation.toLowerCase().includes(q);
    const matchRisk = riskFilter === 'All' || s.risk_tier === riskFilter;
    const matchStatus = statusFilter === 'All' || (statusFilter === 'Sent' && s.status === 'sent') || (statusFilter === 'Pending' && s.status !== 'sent');
    return matchSearch && matchRisk && matchStatus;
  });

  const startEdit = () => {
    setEditText(selectedStudent.message_text);
    setEditAction(selectedStudent.recommended_action);
    setEditing(true);
  };

  const saveEdit = async () => {
    await fetch(`${API_BASE}/api/interventions/${selectedStudent.prediction_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_text: editText, recommended_action: editAction })
    });
    setEditing(false);
    refreshAfterChange();
  };

  const sendMessage = async () => {
    setSending(true);
    await fetch(`${API_BASE}/api/interventions/${selectedStudent.prediction_id}/send`, { method: 'POST' });
    setSending(false);
    refreshAfterChange();
  };

  const refreshAfterChange = () => {
    fetch(`${API_BASE}/api/students`)
      .then(r => r.json())
      .then(data => {
        setStudents(data);
        const stud = data.find(s => s.prediction_id === selected);
        if (stud) {
          fetch(`${API_BASE}/api/student/${stud.enrollment_id}`)
            .then(r => r.json())
            .then(setDetail);
        }
      });
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto p-6 flex flex-col justify-center items-center min-h-[85vh]">
        <div className="w-8 h-8 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading advisor dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1400px] mx-auto p-6 flex flex-col justify-center items-center min-h-[85vh] gap-3">
        <p className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs py-3 px-5 rounded-lg flex items-center gap-2 font-medium shadow-sm">
          <Icons.AlertTriangle className="w-4.5 h-4.5" />
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1450px] mx-auto p-6 flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg flex items-center justify-center shadow-sm">
            <Icons.Shield className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-none">Academic Monitoring</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Advising center &bull; student risk evaluation dashboard</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Monitored</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-none">{stats.total}</p>
            <span className="text-[10px] font-semibold py-0.5 px-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">Active</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Low Risk</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{stats.low}</p>
            <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Safe</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Medium Risk</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">{stats.medium}</p>
            <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Watch</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">High Risk</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 leading-none">{stats.high}</p>
            <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Alert</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-all">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Avg Risk Score</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-none">{stats.avg}</p>
            <span className="text-[10px] font-semibold py-0.5 px-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">LSTM</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-start">
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          <button 
            className={`cursor-pointer px-4.5 py-1 text-xs font-bold rounded-md transition-all duration-150 ${activeTab === 'students' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm' : 'hover:text-zinc-900 dark:hover:text-zinc-200 text-zinc-500'}`}
            onClick={() => setActiveTab('students')}
          >
            Students ({students.length})
          </button>
          <button 
            className={`cursor-pointer px-4.5 py-1 text-xs font-bold rounded-md transition-all duration-150 ${activeTab === 'run-agent' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm' : 'hover:text-zinc-900 dark:hover:text-zinc-200 text-zinc-500'}`}
            onClick={() => setActiveTab('run-agent')}
          >
            Run Agent
          </button>
          <button 
            className={`cursor-pointer px-4.5 py-1 text-xs font-bold rounded-md transition-all duration-150 ${activeTab === 'model-comparison' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-sm' : 'hover:text-zinc-900 dark:hover:text-zinc-200 text-zinc-500'}`}
            onClick={() => setActiveTab('model-comparison')}
          >
            Model Comparison
          </button>
        </div>
      </div>

      {/* Students tab */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* List Panel */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4 h-[550px] lg:h-[calc(100vh-270px)] lg:min-h-[450px] lg:sticky lg:top-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Enrollments</h2>
                <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{filteredStudents.length} matches</span>
              </div>
              <div className="relative w-full">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  <Icons.Search />
                </div>
                <input 
                  className="w-full py-1.5 pl-9 pr-3 border border-zinc-200 dark:border-zinc-700 bg-transparent rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200" 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder="Search by student ID or course code..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="w-full py-1.5 px-2.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-xs text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200"
                  value={riskFilter} 
                  onChange={e => setRiskFilter(e.target.value)}
                >
                  <option value="All">All Risk levels</option>
                  <option value="High">High Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="Low">Low Risk</option>
                </select>
                <select 
                  className="w-full py-1.5 px-2.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-xs text-zinc-600 dark:text-zinc-300 outline-none cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200"
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Sent">Sent</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto flex-grow pr-1 scrollbar-thin border-t border-zinc-100 dark:border-zinc-800 pt-3">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-12">No matches found.</p>
              ) : (
                filteredStudents.map(s => {
                  const meta = tierMeta(s.risk_tier);
                  const isSelected = s.prediction_id === selected;
                  return (
                    <button 
                      key={s.prediction_id} 
                      className={`w-full text-left flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected ? 'bg-zinc-100/90 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-950 dark:text-white font-medium' : 'bg-transparent border-transparent hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}`} 
                      onClick={() => { setSelected(s.prediction_id); setEditing(false); }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }}></span>
                      <span className="flex flex-col gap-0.5 flex-grow min-w-0">
                        <span className="text-[12.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate">ID: {s.id_student}</span>
                        <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 truncate">{s.code_module} &bull; {s.code_presentation} &bull; {s.status === 'sent' ? 'Sent' : 'Pending'}</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-200 pl-2">{s.risk_score.toFixed(2)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-sm min-h-[calc(100vh-270px)] lg:min-h-[max(450px,calc(100vh-270px))] flex flex-col justify-start">
            {detail && selectedStudent ? (
              <div className="flex flex-col gap-6">
                {/* Panel Header */}
                <div className="flex justify-between items-start gap-4 border-b border-zinc-200/70 dark:border-zinc-800 pb-4.5">
                  <div className="flex flex-col">
                    <p className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2.5">
                      Student {selectedStudent.id_student}
                      <span className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border ${tierMeta(selectedStudent.risk_tier).badgeBg}`}>
                        {tierMeta(selectedStudent.risk_tier).label}
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Course: {selectedStudent.code_module} &middot; Presentation: {selectedStudent.code_presentation} &middot; Enrollment: {selectedStudent.enrollment_id}</p>
                  </div>
                </div>

                {/* Demographics */}
                {detail.enrollment && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-3.5 flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Prior Education</span>
                      <span className="text-[12.5px] font-bold text-zinc-800 dark:text-zinc-200">{detail.enrollment.highest_education || 'N/A'}</span>
                    </div>
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-3.5 flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Age Bracket</span>
                      <span className="text-[12.5px] font-bold text-zinc-800 dark:text-zinc-200">{detail.enrollment.age_band || 'N/A'}</span>
                    </div>
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-3.5 flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Credits Enrolled</span>
                      <span className="text-[12.5px] font-bold text-zinc-800 dark:text-zinc-200">{detail.enrollment.studied_credits || '0'}</span>
                    </div>
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-3.5 flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Attempts</span>
                      <span className="text-[12.5px] font-bold text-zinc-800 dark:text-zinc-200">{detail.enrollment.num_of_prev_attempts ?? '0'}</span>
                    </div>
                  </div>
                )}

                {/* Risk score details */}
                <div className="flex flex-col gap-3 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl p-4.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">{selectedStudent.risk_score.toFixed(2)}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">risk score (week {selectedStudent.week_evaluated})</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 py-0.5 px-2 rounded border border-indigo-200 dark:border-indigo-800 uppercase">
                      {selectedStudent.model_version === 'cnn_v1' ? 'CNN (1D Conv) Output' : 'LSTM Classifier Output'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${selectedStudent.risk_score * 100}%`, background: tierMeta(selectedStudent.risk_tier).color }}></div>
                  </div>
                </div>

                {/* Chart Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold mb-3">Engagement & Score Overview</p>
                  <div className="h-[240px] w-full relative">
                    <canvas ref={canvasRef}></canvas>
                  </div>
                </div>

                {/* Intervention Message Box */}
                <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-800/20 p-5 flex flex-col gap-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-2.5">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <span className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400"><Icons.Inbox /></span>
                      Intervention Message
                    </p>
                    <span className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border ${selectedStudent.status === 'sent' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'}`}>
                      {selectedStudent.status === 'sent' ? 'Sent' : 'Pending'}
                    </span>
                  </div>
                  {!editing ? (
                    <>
                      <p 
                        className="text-xs leading-relaxed text-zinc-900 dark:text-zinc-200 italic py-3 px-4 bg-white dark:bg-zinc-800 border-l-4 rounded-r-lg shadow-sm whitespace-pre-line"
                        style={{ borderColor: tierMeta(selectedStudent.risk_tier).color }}
                      >
                        "{selectedStudent.message_text}"
                      </p>
                      <div className="flex justify-between items-center gap-4 mt-2">
                        <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 py-1 px-3 rounded-full border border-zinc-200 dark:border-zinc-700">
                          Action: {selectedStudent.recommended_action}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            className="bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-4 font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm" 
                            onClick={startEdit}
                          >
                            <span className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400"><Icons.Edit /></span>
                            Edit
                          </button>
                          {selectedStudent.status !== 'sent' && (
                            <button 
                              className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border-0 rounded-lg py-2 px-4 font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all" 
                              onClick={sendMessage} 
                              disabled={sending}
                            >
                              <span className="w-3.5 h-3.5"><Icons.Send /></span>
                              {sending ? 'Sending...' : 'Send message'}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <textarea 
                        className="w-full p-3 border border-zinc-200/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none resize-y focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200" 
                        value={editText} 
                        onChange={e => setEditText(e.target.value)} 
                        rows={4} 
                      />
                      <input 
                        className="w-full py-2 px-3 border border-zinc-200/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition-all duration-200" 
                        value={editAction} 
                        onChange={e => setEditAction(e.target.value)} 
                        placeholder="Recommended action" 
                      />
                      <div className="flex justify-end gap-3 mt-1.5">
                        <button 
                          className="bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-4 font-semibold text-xs cursor-pointer inline-flex items-center gap-2 transition-all duration-200" 
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </button>
                        <button 
                          className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border-0 rounded-lg py-2 px-4 font-semibold text-xs cursor-pointer inline-flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all duration-200" 
                          onClick={saveEdit}
                        >
                          Save changes
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center text-center p-16 text-zinc-400 gap-3 min-h-[300px] flex-grow">
                <span className="w-10 h-10 text-zinc-300 dark:text-zinc-600"><Icons.Inbox /></span>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">Select a student enrollment to inspect</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Run Agent tab */}
      {activeTab === 'run-agent' && (
        <RunAgentPanel onRunComplete={() => { loadStudents(); setActiveTab('students'); }} />
      )}

      {/* Model Comparison tab */}
      {activeTab === 'model-comparison' && (
        <ModelComparisonPanel />
      )}
    </div>
  );
}
