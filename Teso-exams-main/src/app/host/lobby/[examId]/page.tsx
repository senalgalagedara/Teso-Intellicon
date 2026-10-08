"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Clock, Users, UserCheck, UserX, Play, Loader2, Sparkles, RefreshCcw, ChevronLeft } from 'lucide-react';
import { getHostSession, getParticipants, updateParticipantStatus, updateSessionStatus } from '@/app/actions/papers';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { io } from 'socket.io-client';

export default function HostLobbyPage() {
  const params = useParams();
  const examCode = Array.isArray(params.examId) ? params.examId[0] : params.examId;
  const router = useRouter();
  
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchSessionAndParticipants = useCallback(async () => {
    if (!examCode) return;
    
    try {
      const sessRes = await getHostSession(examCode);
      if (sessRes.success && sessRes.data) {
        setSession(sessRes.data);
        
        const partRes = await getParticipants(examCode);
        if (partRes.success && partRes.data) {
          setParticipants(partRes.data);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [examCode]);

  useEffect(() => {
    fetchSessionAndParticipants();
  }, [fetchSessionAndParticipants]);

  // Connect to Socket.IO for real-time join/status events
  useEffect(() => {
    if (!examCode) return;

    const socket = io();
    socket.emit('join-host-lobby', { examCode });

    socket.on('participant-joined', (newPart: any) => {
      setParticipants(prev => {
        if (prev.some(p => p.id === newPart.id)) return prev;
        return [newPart, ...prev];
      });
      toast.info(`New join request: ${newPart.fullName}`);
    });

    socket.on('participant-status-changed', ({ participantId, status }: any) => {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, status } : p));
    });

    socket.on('session-status-updated', (updatedSession: any) => {
      setSession(updatedSession);
    });

    return () => {
      socket.disconnect();
    };
  }, [examCode]);

  // Auto-redirect host to monitor page if session is active
  useEffect(() => {
    if (session && session.status === 'ACTIVE') {
      router.push(`/host/monitor/${examCode}`);
    }
  }, [session, examCode, router]);

  const handleCopy = () => {
    if (examCode) {
      navigator.clipboard.writeText(examCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Code copied to clipboard");
    }
  };

  const handleStatusUpdate = async (participantId: string, status: 'ADMITTED' | 'DECLINED') => {
    if (!examCode) return;
    try {
      const res = await updateParticipantStatus(participantId, status, examCode);
      if (res.success) {
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, status } : p));
        toast.success(`Student ${status === 'ADMITTED' ? 'admitted' : 'declined'}`);
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleStartExam = async () => {
    if (!session || !examCode) return;
    setIsStarting(true);
    try {
      const res = await updateSessionStatus(session.id, 'ACTIVE', examCode);
      if (res.success) {
        toast.success("Exam started!");
        router.push(`/host/monitor/${examCode}`);
      }
    } catch (err) {
      toast.error("Failed to start exam");
    } finally {
      setIsStarting(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
        <div className="text-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 animate-pulse" />
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin absolute" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Connecting to session</p>
            <p className="text-xs text-slate-400 mt-0.5">Retrieving live details...</p>
          </div>
        </div>
      </div>
    );
  }

  const waitingStudents = participants.filter(p => p.status === 'WAITING');
  const admittedStudents = participants.filter(p => p.status === 'ADMITTED' || p.status === 'IN_EXAM');
  const canStart = admittedStudents.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/30 text-slate-800 pb-12">
      {/* Redesigned Glassmorphic Header */}
      <div className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Area: Back btn, Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/host')}
              className="rounded-xl border border-slate-200 hover:bg-slate-100/80 transition-all cursor-pointer h-9 w-9"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50/50 text-indigo-600 border-indigo-100/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Live Session
                </Badge>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  <span>Hosting</span>
                </div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                {session?.paper?.title || "Loading session..."}
              </h1>
            </div>
          </div>

          {/* Right Area: Entry Code Card + Sync Indicators */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {/* Live Sync Status */}
            <div className="flex flex-col items-start md:items-end text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <RefreshCcw className={`w-3.5 h-3.5 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
                Syncing Live
              </span>
              <span className="text-[10px] text-slate-400">
                Last update: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            {/* Entry Code Box */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 transition-colors text-white px-4 py-1.5 rounded-xl border border-slate-800 shadow-md">
                    <div className="text-left">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">ENTRY CODE</div>
                      <code className="text-lg font-mono font-bold tracking-wider leading-none">{examCode}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className="h-8 w-8 text-white hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click copy icon to share code with candidates</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metric Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Connected Candidates */}
          <Card className="bg-white border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Connected</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{participants.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Pending Admission */}
          <Card className="bg-white border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Admission</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{waitingStudents.length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          {/* Admitted to Session */}
          <Card className="bg-white border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admitted to Exam</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{admittedStudents.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
                <UserCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Dashboard Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Pending Admission Requests */}
          <Card className="lg:col-span-7 bg-white border-slate-100 shadow-sm flex flex-col min-h-[500px]">
            <CardHeader className="border-b border-slate-100/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Admission Requests
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Review and admit candidates trying to join the session
                  </CardDescription>
                </div>
                {waitingStudents.length > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                    {waitingStudents.length} Pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow flex flex-col">
              <ScrollArea className="h-[400px] pr-2">
                <AnimatePresence mode="popLayout">
                  {waitingStudents.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-[360px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30"
                    >
                      <div className="p-4 bg-slate-100/50 rounded-full mb-4 text-slate-400">
                        <Users className="w-8 h-8" />
                      </div>
                      <h3 className="font-semibold text-slate-700 text-sm">Waiting for candidates...</h3>
                      <p className="text-slate-400 text-xs mt-1 max-w-[280px]">
                        Instruct candidates to enter the code <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">{examCode}</span> on their devices to join.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2.5">
                      {waitingStudents.map((student) => {
                        const initials = student.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                        // Consistent elegant color styles
                        const colors = [
                          'bg-rose-50 text-rose-600 border-rose-100',
                          'bg-indigo-50 text-indigo-600 border-indigo-100',
                          'bg-amber-50 text-amber-600 border-amber-100',
                          'bg-emerald-50 text-emerald-600 border-emerald-100',
                          'bg-sky-50 text-sky-600 border-sky-100',
                          'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
                        ];
                        const hash = student.fullName.charCodeAt(0) + (student.fullName.charCodeAt(student.fullName.length - 1) || 0);
                        const colorClass = colors[hash % colors.length];

                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            key={student.id}
                            className="group flex items-center justify-between p-3 border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 rounded-xl transition-all shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className={`size-10 rounded-xl border flex items-center justify-center font-bold text-sm ${colorClass}`}>
                                <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm text-slate-800 group-hover:text-slate-900 transition-colors">
                                  {student.fullName}
                                </p>
                                <p className="text-xs text-slate-400 font-medium">
                                  Class: <span className="font-bold text-slate-500 uppercase">{student.classCode || 'N/A'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Admit button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusUpdate(student.id, 'ADMITTED')}
                                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/10 active:scale-95 cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Admit</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Allow entry to exam</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* Decline button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleStatusUpdate(student.id, 'DECLINED')}
                                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-lg active:scale-95 transition-all cursor-pointer"
                                    >
                                      <UserX className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Decline entry request</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Admitted Candidates Directory */}
          <Card className="lg:col-span-5 bg-white border-slate-100 shadow-sm flex flex-col min-h-[500px]">
            <CardHeader className="border-b border-slate-100/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Admitted Directory
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Candidates ready to start the examination
                  </CardDescription>
                </div>
                {admittedStudents.length > 0 && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                    {admittedStudents.length} Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow flex flex-col">
              <ScrollArea className="h-[400px] pr-2">
                <AnimatePresence mode="popLayout">
                  {admittedStudents.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-[360px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30"
                    >
                      <div className="p-4 bg-slate-100/50 rounded-full mb-4 text-slate-400">
                        <UserCheck className="w-8 h-8" />
                      </div>
                      <h3 className="font-semibold text-slate-700 text-sm">No admitted candidates</h3>
                      <p className="text-slate-400 text-xs mt-1 max-w-[260px]">
                        Candidates admitted from the requests list will be displayed here as authorized to start.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {admittedStudents.map((student) => {
                        const initials = student.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={student.id}
                            className="flex items-center justify-between p-2.5 border border-emerald-50 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                                <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="text-left overflow-hidden">
                                <p className="font-semibold text-xs text-slate-700 truncate max-w-[100px] sm:max-w-[120px]">
                                  {student.fullName}
                                </p>
                                <p className="text-[9px] text-emerald-600/80 font-bold uppercase truncate">
                                  {student.classCode || 'CLASS'}
                                </p>
                              </div>
                            </div>
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Floating Launch Panel */}
        <div className="mt-8 sticky bottom-6 z-20">
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100 shadow-xl shadow-indigo-900/5 p-4 rounded-2xl max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-sm text-slate-800">
                  {canStart ? 'Lobby Ready to Go!' : 'Awaiting Candidates'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {canStart 
                    ? `Press start to begin the exam session for all ${admittedStudents.length} candidate(s)` 
                    : 'Add at least one candidate to enable the exam session controls'}
                </p>
              </div>

              <Button
                onClick={handleStartExam}
                disabled={!canStart || isStarting}
                className={`w-full sm:w-auto h-11 px-6 rounded-xl font-bold transition-all relative overflow-hidden group shadow-lg cursor-pointer ${
                  canStart
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white shadow-indigo-600/20 active:scale-[0.98]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                }`}
              >
                {isStarting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4 fill-current animate-pulse" />
                    <span>Begin Exam Session</span>
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
