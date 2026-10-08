"use client";

import { getLeaderboardPapers, getLeaderboardData, getUserSubjectsAndProfile } from '@/app/actions/leaderboard';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Sparkles, Target } from "lucide-react";
import { LeaderboardTable } from "./LeaderboardTable";

interface Student {
  id: string;
  rank: number;
  name: string;
  username: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  avatar: string;
  timeCompleted: string;
  attempts: number;
  correctAnswers: number;
}

interface Paper {
  id: string;
  name: string;
}

type PaperType = "tuition" | "past_paper";

export function Leaderboard() {
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tuitionModalOpen, setTuitionModalOpen] = useState(false);
  const [tuitionPaperCode, setTuitionPaperCode] = useState("");

  // Fetch papers when subject changes
  useEffect(() => {
    const fetchPapers = async () => {
      if (!selectedSubject) {
        setPapers([]);
        setSelectedPaperId("");
        return;
      }
      // Defaults to TUITION based on internal state
      const fetchedPapers = await getLeaderboardPapers(selectedSubject, "TUITION");
      setPapers(fetchedPapers);
      
      // Auto-select the latest paper since filters are removed
      if (fetchedPapers.length > 0) {
        setSelectedPaperId(fetchedPapers[0].id);
      } else {
        setSelectedPaperId("");
        setStudents([]);
      }
    };

    fetchPapers();
  }, [selectedSubject]);

  // Fetch leaderboard data when paper changes
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!selectedPaperId) return;
      const data = await getLeaderboardData(selectedPaperId);
      setStudents(data as any);
    };
    fetchLeaderboard();
  }, [selectedPaperId]);

  // Init
  useEffect(() => {
    const init = async () => {
      const res = await getUserSubjectsAndProfile();
      const subs = res?.subjects || [];
      setAvailableSubjects(subs);
      if (subs.length > 0) setSelectedSubject(subs[0]);
    };
    init();
  }, []);

  const topThree = students.slice(0, 3);

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1: return "from-yellow-400/20 to-yellow-600/5 border-yellow-500 text-yellow-500 shadow-yellow-500/20";
      case 2: return "from-slate-300/20 to-slate-500/5 border-slate-300 text-slate-300 shadow-slate-400/20";
      case 3: return "from-amber-600/20 to-amber-800/5 border-amber-600 text-amber-600 shadow-amber-600/20";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Gradients - Adjusted for mobile overflow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[300px] md:h-[400px] bg-indigo-500/20 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 relative z-10">
        
        {/* Header Section */}
        {/* RESPONSIVE: Stack vertically on mobile (flex-col), row on md+ */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12 gap-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Leaderboard</h1>
          </div>

          {/* Subject Pills */}
          {/* RESPONSIVE: Wrap on mobile, rounded corners adjust */}
          <div className="flex flex-wrap justify-center bg-slate-900/50 p-1.5 rounded-2xl md:rounded-full border border-slate-800 backdrop-blur-md gap-1">
            {availableSubjects.length === 0 ? (
               <span className="px-4 py-1 text-sm text-slate-500">No subjects</span>
            ) : (
              availableSubjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 md:px-5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 capitalize ${
                    selectedSubject === subject 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {subject}
                </button>
              ))
            )}
          </div>

          {/* Paper Code Entry */}
          <Dialog open={tuitionModalOpen} onOpenChange={setTuitionModalOpen}>
            <DialogTrigger asChild> 
              <Button variant="outline" className="w-full md:w-auto border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-indigo-950 hover:text-white hover:border-indigo-500/50 transition-all">
                <Sparkles className="size-4 mr-2 text-indigo-400" />
                Enter Code
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white w-[90%] sm:max-w-md rounded-xl">
              <DialogHeader>
                <DialogTitle>Enter Paper Code</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter your tuition paper code to load a specific leaderboard.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <input
                  className="w-full bg-slate-950 text-white px-4 py-3 rounded-lg border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="e.g. PHY-2025-01"
                  value={tuitionPaperCode}
                  onChange={(e) => setTuitionPaperCode(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                  onClick={() => {
                    if (tuitionPaperCode) setSelectedPaperId(tuitionPaperCode);
                    setTuitionModalOpen(false);
                  }}
                >
                  Load Leaderboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Podium Section */}
        {students.length > 0 && (
          // RESPONSIVE: Reduced gap on mobile (gap-2) to fit 3 items
          <div className="flex items-end justify-center gap-2 sm:gap-8 mb-12 sm:mb-20 px-2 min-h-[250px] sm:min-h-[300px]">
            {/* 2nd Place */}
            <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100 fade-in w-1/3 sm:w-auto">
              <div className="relative mb-2 sm:mb-4 group">
                {/* RESPONSIVE: Smaller avatar on mobile */}
                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-2 border-slate-300 shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                  <AvatarImage src={topThree[1]?.avatar} />
                  <AvatarFallback className="bg-slate-800 text-slate-300">{topThree[1]?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-900 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-900">
                  #2
                </div>
              </div>
              <div className="text-center mb-2 sm:mb-3 w-full overflow-hidden">
                <div className="text-slate-200 font-medium text-xs sm:text-base mb-1 truncate px-1">{topThree[1]?.username}</div>
                <div className="text-indigo-400 font-bold text-xs sm:text-base">{topThree[1]?.score || 0} pts</div>
              </div>
              {/* RESPONSIVE: Width and Height adjusted for mobile */}
              <div className={`w-full max-w-[80px] sm:max-w-none sm:w-32 h-24 sm:h-40 rounded-t-xl bg-gradient-to-b ${getRankStyles(2)} border-t backdrop-blur-sm relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center z-10 animate-in slide-in-from-bottom-12 duration-700 fade-in w-1/3 sm:w-auto">
              <div className="relative mb-4 sm:mb-6 group">
                <div className="absolute -top-8 sm:-top-10 left-1/2 -translate-x-1/2 animate-bounce duration-[2000ms]">
                  <Trophy className="size-6 sm:size-8 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </div>
                <Avatar className="h-20 w-20 sm:h-36 sm:w-36 border-4 border-yellow-500 shadow-[0_0_50px_-10px_rgba(234,179,8,0.5)] group-hover:scale-105 transition-transform">
                  <AvatarImage src={topThree[0]?.avatar} />
                  <AvatarFallback className="bg-yellow-900/50 text-yellow-500">{topThree[0]?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 rounded-full border border-yellow-950">
                  #1
                </div>
              </div>
              <div className="text-center mb-2 sm:mb-3 w-full overflow-hidden">
                <div className="text-white font-bold text-sm sm:text-lg mb-1 truncate px-1">{topThree[0]?.username}</div>
                <div className="text-yellow-400 font-bold text-sm sm:text-lg">{topThree[0]?.score || 0} pts</div>
              </div>
              <div className={`w-full max-w-[100px] sm:max-w-none sm:w-40 h-32 sm:h-56 rounded-t-xl bg-gradient-to-b ${getRankStyles(1)} border-t backdrop-blur-sm relative overflow-hidden`}>
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_3s_infinite]" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-200 fade-in w-1/3 sm:w-auto">
              <div className="relative mb-2 sm:mb-4 group">
                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-2 border-amber-600 shadow-[0_0_30px_-10px_rgba(217,119,6,0.3)] group-hover:scale-105 transition-transform">
                  <AvatarImage src={topThree[2]?.avatar} />
                  <AvatarFallback className="bg-amber-900/30 text-amber-600">{topThree[2]?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-900">
                  #3
                </div>
              </div>
              <div className="text-center mb-2 sm:mb-3 w-full overflow-hidden">
                <div className="text-slate-200 font-medium text-xs sm:text-base mb-1 truncate px-1">{topThree[2]?.username}</div>
                <div className="text-indigo-400 font-bold text-xs sm:text-base">{topThree[2]?.score || 0} pts</div>
              </div>
              <div className={`w-full max-w-[80px] sm:max-w-none sm:w-32 h-16 sm:h-32 rounded-t-xl bg-gradient-to-b ${getRankStyles(3)} border-t backdrop-blur-sm relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="max-w-3xl mx-auto mb-8 md:mb-10">
          <div className="bg-gradient-to-r from-slate-900/50 via-indigo-900/20 to-slate-900/50 border border-slate-800 rounded-xl p-4 text-center backdrop-blur-sm shadow-xl">
            <div className="text-slate-400 text-xs md:text-sm flex flex-wrap items-center justify-center gap-2">
              <Target className="size-3 md:size-4 text-indigo-400" />
              <span>Current Leaderboard: <span className="text-white font-medium break-all">{selectedPaperId || "None"}</span></span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="animate-in fade-in zoom-in-95 duration-500 delay-300">
          {/* RESPONSIVE: Horizontal scroll wrapper */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/20">
             <div className="overflow-x-auto">
                {/* Ensure table has a minimum width so it doesn't squish on mobile */}
                <div className="min-w-[600px]">
                   <LeaderboardTable students={students} />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}