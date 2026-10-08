"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Users, CheckCircle, Timer, Activity, Loader2, Search, Filter, RefreshCw, Trophy, ChevronLeft } from 'lucide-react';
import { getHostSession, getParticipants, updateSessionStatus } from '@/app/actions/papers';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

export default function LiveMonitorPage() {
  const params = useParams();
  const examCode = Array.isArray(params.examId) ? params.examId[0] : params.examId;
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'ALL' | 'IN_EXAM' | 'SUBMITTED'>('ALL');
  const [timeRemaining, setTimeRemaining] = useState(0);

  const fetchData = useCallback(async () => {
    if (!examCode) return;
    try {
      const sessRes = await getHostSession(examCode);
      if (sessRes.success && sessRes.data) {
        setSession(sessRes.data);

        // Timer calculation
        if (sessRes.data.status === 'ACTIVE' && sessRes.data.startedAt) {
          const startTime = new Date(sessRes.data.startedAt).getTime();
          const durationMs = sessRes.data.durationMins * 60 * 1000;
          const endTime = startTime + durationMs;
          const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
          setTimeRemaining(remaining);
        }

        const partRes = await getParticipants(examCode);
        if (partRes.success) {
          // Filter out NULL/Garbage values if any, ensure only active participants
          const validParticipants = (partRes.data || []).filter((p: any) => p.fullName && p.status !== 'DECLINED');
          setParticipants(validParticipants);
        }
      }
    } catch (err) {
      console.error("Monitor fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [examCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Connect to Socket.IO for real-time timer sync and candidate progress
  useEffect(() => {
    if (!examCode) return;

    const socket = io();
    socket.emit('join-host-monitor', { examCode });

    socket.on('progress-update', (data: any) => {
      setParticipants(prev => 
        prev.map(p => p.id === data.participantId ? { ...p, answeredCount: data.answeredCount, status: data.status } : p)
      );
    });

    socket.on('participant-submitted', (data: any) => {
      setParticipants(prev => 
        prev.map(p => p.id === data.participantId ? { ...p, status: 'SUBMITTED', score: data.score } : p)
      );
    });

    socket.on('timer-sync', (data: any) => {
      if (data.remainingSeconds !== undefined) {
        setTimeRemaining(data.remainingSeconds);
      }
    });

    socket.on('exam-ended', () => {
      setTimeRemaining(0);
      toast.info("Exam time is up!");
    });

    return () => {
      socket.disconnect();
    };
  }, [examCode]);

  const handleEndExam = async () => {
    if (!session || !examCode) return;
    if (!confirm("Are you sure you want to end this exam session for all students?")) return;

    try {
      const res = await updateSessionStatus(session.id, 'ENDED', examCode);
      if (res.success) {
        toast.success("Exam ended successfully");
        router.push('/host/create');
      }
    } catch (err) {
      toast.error("Failed to end exam");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.classCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' ||
      (filter === 'IN_EXAM' && (p.status === 'IN_EXAM' || p.status === 'ADMITTED')) ||
      (filter === 'SUBMITTED' && p.status === 'SUBMITTED');
    return matchesSearch && matchesFilter;
  });

  const submittedCount = participants.filter((s) => s.status === 'SUBMITTED').length;
  const inProgressCount = participants.filter((s) => s.status === 'IN_EXAM' || s.status === 'ADMITTED').length;

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header HUD */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-black px-6 py-4 shadow-[0_4px_0_0_rgba(0,0,0,0.05)]">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push('/host')}
              className="p-2 text-black hover:bg-slate-50 transition-colors bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-black tracking-tight text-black truncate max-w-md uppercase">
                  {session?.paper?.title || "Live Monitoring"}
                </h1>
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-black rounded text-[10px] font-black uppercase border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                  {examCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse border border-black" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Live Stream Active
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* Timer */}
            <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-center border-r-2 border-black pr-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time Left</p>
                <p className={`text-2xl font-black font-mono leading-none ${timeRemaining < 300 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Active</p>
                  <p className="text-lg font-black text-blue-600 leading-none">{inProgressCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Done</p>
                  <p className="text-lg font-black text-emerald-600 leading-none">{submittedCount}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleEndExam}
              className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-2 border-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* Control Bar & Search */}
      <div className="bg-white border-b border-slate-200/60 px-8 py-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['ALL', 'IN_EXAM', 'SUBMITTED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredParticipants.map((student) => {
              const progress = (student.answeredCount / (student.totalQuestions || 1)) * 100;
              const isFinished = student.status === 'SUBMITTED';

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={student.id}
                  className={`relative overflow-hidden border rounded-3xl p-6 transition-all duration-300 ${isFinished
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5'
                    }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg text-slate-900 truncate leading-tight mb-1">{student.fullName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.classCode}</p>
                    </div>
                    {isFinished ? (
                      <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
                        <Activity className="w-5 h-5 text-white animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                        <p className="text-2xl font-black font-mono text-slate-900">
                          {student.answeredCount}<span className="text-slate-400 text-sm ml-1">/ {student.totalQuestions}</span>
                        </p>
                      </div>
                      <div className={`text-xl font-black font-mono ${isFinished ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {Math.round(progress)}%
                      </div>
                    </div>

                    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${isFinished
                            ? 'from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                          }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span className="text-slate-400">Status</span>
                      <span className={isFinished ? 'text-emerald-600' : 'text-blue-600'}>
                        {isFinished ? 'Completed' : 'Solving...'}
                      </span>
                    </div>
                  </div>

                  {/* Decorative faint grid bg */}
                  <div className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {filteredParticipants.length === 0 && !loading && (
        <div className="text-center py-40">
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em]">No matching candidates detected</p>
        </div>
      )}
    </div>
  );
}
