"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Users, TrendingUp, Search, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface LeaderboardStudent {
    id: string;
    name: string;
    score: number;
    rank: number;
    trend: string;
    status: string;
}

export function LeaderboardPage({
    paperId,
    students = [],
    maxScore
}: {
    paperId?: string;
    students?: LeaderboardStudent[];
    maxScore?: number;
}) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'top50'>('all');

    // Calculate dynamic stats
    const stats = useMemo(() => {
        const total = students.length;
        const topScore = total > 0 ? Math.max(...students.map(s => s.score)) : 0;
        const average = total > 0 ? students.reduce((sum, s) => sum + s.score, 0) / total : 0;
        return { total, topScore, average };
    }, [students]);

    // Filter and search students
    const filteredStudents = useMemo(() => {
        return students
            .filter(student => {
                return student.name.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .slice(0, activeFilter === 'top50' ? 50 : undefined);
    }, [students, searchQuery, activeFilter]);

    const formatScore = (num: number) => num.toFixed(1).replace(/\.0$/, '');

    return (
        <div className="min-h-screen bg-zinc-50/50 p-6 md:p-10 font-sans selection:bg-zinc-100 selection:text-zinc-900 text-zinc-950">
            <div className="max-w-[1000px] mx-auto">

                {/* Back Link */}
                <button
                    onClick={() => router.push('/host/create')}
                    className="group flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition-colors text-xs font-bold uppercase tracking-wider mb-6"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Leaderboard
                        </h1>
                        {paperId && (
                            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mt-1.5">
                                Exam Reference: <span className="text-zinc-900 font-bold">{paperId}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    {/* Stat Card: Total Students */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Candidates</p>
                            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{stats.total}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-650">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Stat Card: Top Score */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Top Score</p>
                            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
                                {formatScore(stats.topScore)}
                                <span className="text-zinc-400 text-sm font-semibold">
                                    /{maxScore !== undefined && maxScore !== null ? formatScore(maxScore) : '100'}
                                </span>
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <Trophy className="w-5 h-5 fill-amber-500/10" />
                        </div>
                    </div>

                    {/* Stat Card: Average Score */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Class Average</p>
                            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
                                {formatScore(stats.average)}
                                <span className="text-zinc-400 text-sm font-semibold">
                                    /{maxScore !== undefined && maxScore !== null ? formatScore(maxScore) : '100'}
                                </span>
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by candidate name..."
                            className="w-full bg-white border border-zinc-200 rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium shadow-sm focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 outline-none text-zinc-900 placeholder:text-zinc-400 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeFilter === 'all'
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                                }`}
                        >
                            All Grades
                        </button>
                        <button
                            onClick={() => setActiveFilter('top50')}
                            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeFilter === 'top50'
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                                }`}
                        >
                            Top 50
                        </button>
                    </div>
                </div>

                {/* Leaderboard Table/List */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                    {filteredStudents.length > 0 ? (
                        <div className="divide-y divide-zinc-100">
                            {filteredStudents.map((student, index) => {
                                const isTop3 = student.rank <= 3;
                                return (
                                    <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.4) }}
                                        className="flex items-center justify-between p-4 hover:bg-zinc-50/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Rank Badge */}
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm border flex-shrink-0 ${student.rank === 1
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : student.rank === 2
                                                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                                                        : student.rank === 3
                                                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                            : 'bg-zinc-50 text-zinc-500 border-zinc-100'
                                                }`}>
                                                {student.rank}
                                            </div>

                                            {/* Name & Badge Status */}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-semibold text-zinc-900 truncate">
                                                        {student.name}
                                                    </h4>
                                                    {isTop3 && (
                                                        <Trophy className={`w-3.5 h-3.5 flex-shrink-0 ${student.rank === 1 ? 'text-amber-500' : student.rank === 2 ? 'text-slate-400' : 'text-orange-500'
                                                            }`} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${student.status === 'Elite'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : student.status === 'Advanced'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                                        }`}>
                                                        {student.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Display */}
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-base font-bold text-zinc-900">
                                                {formatScore(student.score)}
                                            </span>
                                            <span className="text-zinc-400 text-xs font-medium ml-0.5">
                                                /{maxScore !== undefined && maxScore !== null ? formatScore(maxScore) : '100'}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-3 border border-zinc-150">
                                <Search className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h3 className="text-sm font-bold text-zinc-800">No candidates found</h3>
                            <p className="text-zinc-400 text-xs mt-1">Try resetting your search query or choosing another filter.</p>
                        </div>
                    )}
                </div>

                {/* Footer Note */}
                <div className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    System precision active. Final verified scores displayed.
                </div>
            </div>
        </div>
    );
}
