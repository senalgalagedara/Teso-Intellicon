'use client';

import { useState } from 'react';
import {
  TrendingUp, Target, Activity, AlertTriangle, CheckCircle2,
  ChevronLeft, Award, Sparkles, Filter, BarChart3, BarChart4, Clock
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { QuestionAnalytics, StudentSubmission } from '@/app/actions/analytics';

interface PaperAnalyticsProps {
  paperName: string;
  totalMarks: number;
  scores: number[];
  questions: QuestionAnalytics[];
  studentSubmissions?: StudentSubmission[];
  onBack?: () => void;
}

export function PaperAnalytics({
  paperName,
  totalMarks,
  scores,
  questions,
  studentSubmissions = [],
  onBack
}: PaperAnalyticsProps) {
  const [showCorrectAnswersFilter, setShowCorrectAnswersFilter] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  const totalParticipants = scores.length;
  const submissions = studentSubmissions || [];

  // Calculate statistics
  const mean = totalParticipants > 0 ? scores.reduce((sum, score) => sum + score, 0) / totalParticipants : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length > 0 ? (sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]) : 0;
  const highest = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
  const lowest = sorted.length > 0 ? sorted[0] : 0;

  const variance = totalParticipants > 0 ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / totalParticipants : 0;
  const stdDev = Math.sqrt(variance);

  // Time and Pass Rate Calculations
  const passCount = scores.filter(s => totalMarks > 0 && s >= (totalMarks * 0.5)).length;
  const passRate = totalParticipants > 0 ? (passCount / totalParticipants) * 100 : 0;
  const averageTimeTakenMins = submissions.length > 0
    ? submissions.reduce((sum, s) => sum + s.timeTakenMins, 0) / submissions.length
    : 0;

  // Calculate paper difficulty
  const getPaperDifficulty = (averageScore: number) => {
    if (totalMarks === 0) return { label: 'N/A', color: 'text-zinc-650 bg-zinc-50 border-zinc-200', icon: '❓' };
    const percentage = (averageScore / totalMarks) * 100;
    if (percentage >= 75) return { label: 'Easy', color: 'text-emerald-700 border-emerald-200 bg-emerald-50/50', icon: '😊' };
    if (percentage >= 60) return { label: 'Moderate', color: 'text-blue-700 border-blue-200 bg-blue-50/50', icon: '😐' };
    if (percentage >= 45) return { label: 'Challenging', color: 'text-amber-700 border-amber-200 bg-amber-50/50', icon: '😰' };
    return { label: 'Very Hard', color: 'text-rose-700 border-rose-200 bg-rose-50/50', icon: '😱' };
  };

  const paperDifficulty = getPaperDifficulty(mean);

  // Corrected Score Distribution (Histogram)
  const createHistogramData = () => {
    const bins = [];
    for (let i = 0; i < 100; i += 10) {
      const min = i;
      const max = i + 10;
      const count = scores.filter(score => {
        const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
        if (max === 100) {
          return percentage >= min && percentage <= max;
        }
        return percentage >= min && percentage < max;
      }).length;
      bins.push({
        range: `${min}-${max}%`,
        count,
        min,
      });
    }
    return bins.filter(b => b.count > 0);
  };

  // Corrected Score Distribution by Range
  const scoreRangeData = [
    { range: '90-100%', count: scores.filter(s => totalMarks > 0 && (s / totalMarks) * 100 >= 90).length, color: '#10b981' },
    { range: '80-89%', count: scores.filter(s => totalMarks > 0 && (s / totalMarks) * 100 >= 80 && (s / totalMarks) * 100 < 90).length, color: '#3b82f6' },
    { range: '70-79%', count: scores.filter(s => totalMarks > 0 && (s / totalMarks) * 100 >= 70 && (s / totalMarks) * 100 < 80).length, color: '#6366f1' },
    { range: '60-69%', count: scores.filter(s => totalMarks > 0 && (s / totalMarks) * 100 >= 60 && (s / totalMarks) * 100 < 70).length, color: '#f59e0b' },
    { range: '50-59%', count: scores.filter(s => totalMarks > 0 && (s / totalMarks) * 100 >= 50 && (s / totalMarks) * 100 < 60).length, color: '#f97316' },
    { range: '0-49%', count: scores.filter(s => totalMarks > 0 && (s / totalMarks) * 100 < 50).length, color: '#f43f5e' },
  ].filter(r => r.count > 0);

  // Corrected success rates relative to total exam participants
  const processedQuestions = questions.map(q => {
    const denom = totalParticipants > 0 ? totalParticipants : (q.totalStudents > 0 ? q.totalStudents : 1);
    const successRate = (q.correctAnswers / denom) * 100;
    return {
      ...q,
      successRate,
    };
  });

  const selectedQuestionData = processedQuestions[selectedQuestionIndex];

  // Top performing and low performing questions
  const sortedByPerformance = [...processedQuestions].sort((a, b) => b.successRate - a.successRate);
  const topPerformingQuestions = sortedByPerformance.slice(0, 5);
  const lowestPerformingQuestions = [...sortedByPerformance].reverse().slice(0, 5);

  // Question performance data for all questions
  const questionPerformanceData = processedQuestions.map(q => ({
    question: `Q${q.questionNumber}`,
    successRate: q.successRate,
    topic: q.topic || `Topic ${q.questionNumber}`,
  }));

  // Confidence level data for line chart
  const confidenceLevelData = processedQuestions.map(q => ({
    question: `Q${q.questionNumber}`,
    confident: q.confident,
    normal: q.normal,
    notSure: q.notSure,
    correctAnswers: q.correctAnswers,
  }));

  const histogramData = createHistogramData();

  const getBarColor = (min: number) => {
    if (min >= 90) return '#10b981'; // emerald-500
    if (min >= 80) return '#3b82f6'; // blue-500
    if (min >= 70) return '#6366f1'; // indigo-500
    if (min >= 60) return '#f59e0b'; // amber-500
    if (min >= 50) return '#f97316'; // orange-500
    return '#f43f5e'; // rose-500
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 60) return '#3b82f6';
    if (rate >= 40) return '#f59e0b';
    return '#f43f5e';
  };

  const formatScore = (num: number) => num.toFixed(1).replace(/\.0$/, '');

  // Shadcn-like Custom Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs font-semibold text-slate-800">
          <p className="font-bold text-slate-950 mb-1.5">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name || p.dataKey} className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: p.color || p.fill }} />
              <span>{p.name}: <strong className="text-slate-950">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong></span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans antialiased">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-950 transition-colors mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to List
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            {paperName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Comprehensive real-time diagnostic performance metrics
          </p>
        </div>

        {/* Action badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 w-fit">

        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Overview Statistics
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${activeTab === 'questions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Detailed Questions & Confidence
        </button>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI: Candidates */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Candidates</span>
                <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900">{totalParticipants}</h2>
              <p className="text-slate-400 text-xs font-medium mt-1">Submitted responses</p>
            </div>

            {/* KPI: Mean Score */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mean Score</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{formatScore(mean)}</span>
                <span className="text-slate-400 text-sm font-semibold">/ {formatScore(totalMarks)}</span>
              </div>
              <p className="text-indigo-600 text-xs font-bold mt-1">
                Avg: <strong className="text-slate-700">{totalMarks > 0 ? `${((mean / totalMarks) * 100).toFixed(0)}%` : '0%'}</strong> | Std Dev: <strong className="text-slate-700">{stdDev.toFixed(1)}</strong>
              </p>
            </div>

            {/* KPI: Pass Rate */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Pass Rate</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{passRate.toFixed(0)}%</span>
                <span className="text-slate-400 text-xs font-medium">scoring &ge; 50%</span>
              </div>
              <p className="text-slate-400 text-xs font-medium mt-1">
                Highest score: <strong className="text-slate-700">{formatScore(highest)}</strong>
              </p>
            </div>

            {/* KPI: Completion Pace */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Completion Time</span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{averageTimeTakenMins.toFixed(1)}</span>
                <span className="text-slate-400 text-sm font-semibold">minutes</span>
              </div>
              <p className="text-slate-400 text-xs font-medium mt-1">
                Difficulty Class: <span className={`font-bold ${paperDifficulty.color.split(' ')[0]}`}>{paperDifficulty.label}</span>
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Score Distribution Histogram</h3>
              </div>
              {histogramData.length > 0 ? (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="range"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        allowDecimals={false}
                      />
                      <Tooltip content={renderCustomTooltip} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Candidates">
                        {histogramData.map((entry, index) => (
                          <Cell key={`histogram-${index}`} fill={getBarColor(entry.min)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                  No submissions yet to plot distribution
                </div>
              )}
            </div>

            {/* Score Breakdown by Range */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Score Range Groupings</h3>
              </div>
              {scoreRangeData.length > 0 ? (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreRangeData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="range"
                        type="category"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                      <Tooltip content={renderCustomTooltip} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Candidates">
                        {scoreRangeData.map((entry, index) => (
                          <Cell key={`range-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                  No submissions yet to plot ranges
                </div>
              )}
            </div>
          </div>

          {/* Scatter Plot: Pace vs. Performance */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Pace vs. Score Quadrant Analysis</h3>
              </div>
            </div>
            {submissions.length > 0 ? (
              <div className="space-y-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="timeTakenMins"
                        name="Time Taken"
                        unit="m"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="percentage"
                        name="Score"
                        unit="%"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        domain={[0, 100]}
                      />
                      <ZAxis type="number" range={[100, 100]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs font-semibold text-slate-800">
                                <p className="font-bold text-slate-950 mb-1">{data.name}</p>
                                <div className="space-y-0.5">
                                  <p>Score: <strong className="text-slate-950">{data.score.toFixed(1)} ({data.percentage.toFixed(0)}%)</strong></p>
                                  <p>Time Taken: <strong className="text-slate-950">{data.timeTakenMins.toFixed(1)} mins</strong></p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter name="Students" data={submissions} fill="#6366f1">
                        {submissions.map((entry, index) => {
                          const isAccurate = entry.percentage >= 60;
                          const isFast = entry.timeTakenMins <= (averageTimeTakenMins || 30);
                          let color = '#3b82f6'; // Slow & Accurate (Blue)
                          if (isAccurate && isFast) color = '#10b981'; // Fast & Accurate (Emerald)
                          else if (!isAccurate && isFast) color = '#f59e0b'; // Fast & Inaccurate (Amber)
                          else if (!isAccurate && !isFast) color = '#f43f5e'; // Slow & Inaccurate (Rose)
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                {/* Quadrant Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-2 justify-center bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Fast & Accurate</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center bg-blue-50 border border-blue-100 rounded-lg p-2 text-blue-700">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Slow & Accurate</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center bg-amber-50 border border-amber-100 rounded-lg p-2 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Fast & Inaccurate</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center bg-rose-50 border border-rose-100 rounded-lg p-2 text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Slow & Inaccurate</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                No participant records to map pacing data
              </div>
            )}
          </div>

          {/* Performers Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Performing Questions */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Top Performing Questions</h3>
              </div>
              {topPerformingQuestions.length > 0 ? (
                <div className="space-y-3">
                  {topPerformingQuestions.map((q, idx) => (
                    <div key={`top-${q.questionNumber}`} className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-800">Question {q.questionNumber}</span>
                          <span className="text-slate-400 text-xs truncate">- {q.topic || 'General Topic'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600">{q.successRate.toFixed(0)}% success</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${q.successRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 font-semibold text-xs">
                  No student question logs available
                </div>
              )}
            </div>

            {/* Lowest 5 Performing Questions */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Questions Needing Focus</h3>
              </div>
              {lowestPerformingQuestions.length > 0 ? (
                <div className="space-y-3">
                  {lowestPerformingQuestions.map((q, idx) => (
                    <div key={`low-${q.questionNumber}`} className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-800">Question {q.questionNumber}</span>
                          <span className="text-slate-400 text-xs truncate">- {q.topic || 'General Topic'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-rose-600">{q.successRate.toFixed(0)}% success</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${q.successRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 font-semibold text-xs">
                  No student question logs available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions Breakdown Tab Content */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Performance & Pace charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Question Success Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Success Rate per Question</h3>
              </div>
              {questionPerformanceData.length > 0 ? (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={questionPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="question"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        domain={[0, 100]}
                      />
                      <Tooltip content={renderCustomTooltip} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="successRate" radius={[4, 4, 0, 0]} name="Success Rate">
                        {questionPerformanceData.map((entry, index) => (
                          <Cell key={`question-${index}`} fill={getSuccessRateColor(entry.successRate)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                  No question records available
                </div>
              )}
            </div>

            {/* Average Time Spent per Question Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Average Time Spent per Question</h3>
              </div>
              {processedQuestions.length > 0 ? (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedQuestions.map(q => ({ question: `Q${q.questionNumber}`, time: q.averageTimeSpent, topic: q.topic }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="question"
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        label={{ value: 'Time (Seconds)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs font-semibold text-slate-800">
                                <p className="font-bold text-slate-950 mb-1">{label}</p>
                                <p className="text-slate-500 mb-1">{data.topic || 'General Topic'}</p>
                                <p>Avg Time: <strong className="text-slate-950">{data.time.toFixed(1)} seconds</strong></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="time" radius={[4, 4, 0, 0]} name="Average Time">
                        {processedQuestions.map((entry, index) => {
                          const time = entry.averageTimeSpent;
                          let color = '#818cf8'; // indigo-400
                          if (time > 90) color = '#f43f5e'; // rose-500 (very slow)
                          else if (time > 45) color = '#fbbf24'; // amber-400 (moderate)
                          return <Cell key={`time-cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                  No time tracking data available
                </div>
              )}
            </div>
          </div>

          {/* Interactive Option Breakdown / Distractor Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Select Question</h3>
                </div>
                <select
                  value={selectedQuestionIndex}
                  onChange={(e) => setSelectedQuestionIndex(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer mb-4"
                >
                  {processedQuestions.map((q, idx) => (
                    <option key={idx} value={idx}>
                      Q{q.questionNumber}: {q.topic || `Topic ${q.questionNumber}`}
                    </option>
                  ))}
                </select>
                {selectedQuestionData && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Topic Area</span>
                      <p className="text-sm font-bold text-slate-805">{selectedQuestionData.topic || 'General'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Difficulty Rating</span>
                      <p className="text-sm font-bold mt-0.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${selectedQuestionData.difficulty.toLowerCase() === 'easy'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : selectedQuestionData.difficulty.toLowerCase() === 'medium'
                              ? 'text-blue-700 bg-blue-50 border-blue-200'
                              : 'text-rose-700 bg-rose-50 border-rose-200'
                          }`}>
                          {selectedQuestionData.difficulty}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Success Rate</span>
                      <p className="text-sm font-bold text-slate-805">{selectedQuestionData.successRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Time Spent</span>
                      <p className="text-sm font-bold text-slate-805">{selectedQuestionData.averageTimeSpent.toFixed(1)} seconds</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BarChart4 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Option Selection Distribution (Distractor Analysis)</h3>
              </div>
              {selectedQuestionData && selectedQuestionData.optionBreakdown.length > 0 ? (
                <div>
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedQuestionData.optionBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="optionIndex"
                          stroke="#94a3b8"
                          tickFormatter={(val) => `Option ${val}`}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs font-semibold text-slate-800 max-w-sm">
                                  <p className="font-bold text-slate-950 mb-1 flex items-center gap-2">
                                    <span>Option {data.optionIndex}</span>
                                    {data.isCorrect && (
                                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full">Correct Option</span>
                                    )}
                                  </p>
                                  <p className="text-slate-650 mb-1 italic">"{data.text || '(Image or no text description)'}"</p>
                                  <p>Selections: <strong className="text-slate-950">{data.count} students</strong></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Selections">
                          {selectedQuestionData.optionBreakdown.map((entry, index) => {
                            return <Cell key={`opt-cell-${index}`} fill={entry.isCorrect ? '#10b981' : '#3b82f6'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded bg-emerald-500" />
                      <span>Correct Choice</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded bg-blue-500" />
                      <span>Distractors</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[230px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                  No option selection data recorded
                </div>
              )}
            </div>
          </div>

          {/* Student Confidence Line Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Student Confidence Analysis</h3>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswersFilter}
                    onChange={(e) => setShowCorrectAnswersFilter(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Show Correct Answers Line</span>
                </label>
              </div>
            </div>
            {confidenceLevelData.length > 0 ? (
              <div className="h-[280px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={confidenceLevelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="question"
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#0f172a'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '700', color: '#64748b', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="confident"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Confident / Flag Off"
                      dot={{ fill: '#10b981', r: 3.5, strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="notSure"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Not Sure / Flagged"
                      dot={{ fill: '#f59e0b', r: 3.5, strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 5 }}
                    />
                    {showCorrectAnswersFilter && (
                      <Line
                        type="monotone"
                        dataKey="correctAnswers"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        name="Correct Answers Count"
                        dot={{ fill: '#3b82f6', r: 3.5, strokeWidth: 1.5, stroke: '#ffffff' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[285px] sm:h-[350px] flex items-center justify-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-lg">
                No confidence data recorded yet
              </div>
            )}
          </div>

          {/* Detailed Question Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">All Question Records</h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{processedQuestions.length} Questions</span>
            </div>
            {processedQuestions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Question</th>
                      <th className="py-3 px-5">Topic</th>
                      <th className="py-3 px-5">Difficulty</th>
                      <th className="py-3 px-5 text-right">Correct Responses</th>
                      <th className="py-3 px-5 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {processedQuestions.map((q) => {
                      let diffColor = 'text-blue-700 bg-blue-50 border-blue-200';
                      if (q.difficulty.toLowerCase() === 'easy') diffColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                      if (q.difficulty.toLowerCase() === 'hard' || q.difficulty.toLowerCase() === 'very hard') diffColor = 'text-rose-700 bg-rose-50 border-rose-200';

                      return (
                        <tr key={`row-${q.questionNumber}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5 font-bold text-slate-900">Q{q.questionNumber}</td>
                          <td className="py-3 px-5 text-slate-500 font-semibold">{q.topic || `Topic ${q.questionNumber}`}</td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${diffColor}`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-semibold text-slate-600">
                            {q.correctAnswers} / {totalParticipants}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className={`font-bold ${q.successRate >= 75 ? 'text-emerald-600' : q.successRate >= 50 ? 'text-indigo-650' : 'text-rose-600'
                              }`}>
                              {q.successRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 font-semibold text-xs">
                No question records available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer System Indicator */}
      <div className="text-center pt-8 pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200/60 mt-10">
        System precision active. Diagnostic analytics updated in real-time.
      </div>
    </div>
  );
}
