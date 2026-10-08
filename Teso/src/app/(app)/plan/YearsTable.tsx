"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { fetchPaperCoverage, togglePaperCoverage } from '@/app/actions/paper-coverage';

interface SubTopic {
  id: string;
  label: string;
  weight: number;
}

interface Lesson {
  id: string;
  label: string;
  weight: number;
  subTopics: SubTopic[];
}

interface YearsTableProps {
  syllabusData: Lesson[];
}

type ViewMode = 'mcq' | 'part2';

// Part 2 section definitions
const PART2_SECTIONS = [
  { key: 'structure', label: 'Structure', count: 4, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'essay-a', label: 'Essay Part A', count: 3, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'essay-b', label: 'Essay Part B', count: 3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
] as const;

export function YearsTable({ syllabusData }: YearsTableProps) {
  const years = Array.from({ length: 26 }, (_, i) => 2000 + i);

  const [viewMode, setViewMode] = useState<ViewMode>('mcq');
  const [isPending, startTransition] = useTransition();

  // Which lesson rows are expanded (MCQ view)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Checked cells – keyed differently for MCQ vs Part 2
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load persisted coverage from DB on mount
  useEffect(() => {
    fetchPaperCoverage().then(({ cellKeys }) => {
      setCheckedCells(new Set(cellKeys));
      setDbLoaded(true);
    });
  }, []);

  /* ── MCQ helpers ── */
  const toggleExpand = (lessonId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const toggleMcqCell = (topicId: string, year: number) => {
    const key = `mcq|${topicId}|${year}`;
    // Optimistic update
    setCheckedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    startTransition(async () => {
      const result = await togglePaperCoverage(key);
      if (result.error) {
        // Revert on error
        setCheckedCells((prev) => {
          const next = new Set(prev);
          if (result.done) next.add(key); else next.delete(key);
          return next;
        });
      }
    });
  };

  const isMcqChecked = (topicId: string, year: number) =>
    checkedCells.has(`mcq|${topicId}|${year}`);

  /* ── Part 2 helpers ── */
  const togglePart2Cell = (year: number, colKey: string) => {
    const key = `p2|${year}|${colKey}`;
    // Optimistic update
    setCheckedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    startTransition(async () => {
      const result = await togglePaperCoverage(key);
      if (result.error) {
        setCheckedCells((prev) => {
          const next = new Set(prev);
          if (result.done) next.add(key); else next.delete(key);
          return next;
        });
      }
    });
  };

  const isPart2Checked = (year: number, colKey: string) =>
    checkedCells.has(`p2|${year}|${colKey}`);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      {/* ── Toggle ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-b border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground mr-1">View:</span>
        <button
          onClick={() => setViewMode('mcq')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            viewMode === 'mcq'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
          }`}
        >
          MCQ
        </button>
        <button
          onClick={() => setViewMode('part2')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            viewMode === 'part2'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
          }`}
        >
          Part 2
        </button>

        {/* Saving indicator */}
        {isPending && (
          <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">saving…</span>
        )}
        {!dbLoaded && (
          <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">loading…</span>
        )}

        {/* Legend for Part 2 */}
        {viewMode === 'part2' && (
          <div className="ml-4 flex items-center gap-3">
            {PART2_SECTIONS.map((s) => (
              <span key={s.key} className={`text-[10px] font-medium ${s.color} flex items-center gap-1`}>
                <span className={`inline-block w-2 h-2 rounded-sm ${s.bg} border border-current`} />
                {s.label} ({s.count}Q)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Tables ── */}
      <div className="overflow-auto flex-1 bg-background text-foreground">

        {/* ════════════════ MCQ TABLE ════════════════ */}
        {viewMode === 'mcq' && (
          <table className="border-collapse w-full" style={{ minWidth: `${26 * 52 + 240}px` }}>
            <thead className="sticky top-0 z-20">
              <tr>
                <th
                  className="sticky left-0 z-30 border border-border bg-secondary px-4 py-1.5 text-left text-xs font-semibold text-foreground"
                  style={{ minWidth: 240 }}
                >
                  Lesson / Topic
                </th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="border border-border bg-secondary px-1 py-1.5 text-center text-xs font-semibold text-foreground"
                    style={{ minWidth: 48, width: 52 }}
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {syllabusData.map((lesson) => {
                const isExpanded = expanded.has(lesson.id);
                return (
                  <React.Fragment key={lesson.id}>
                    {/* Main lesson row */}
                    <tr className="bg-card">
                      <td
                        className="sticky left-0 z-10 border border-border bg-card px-3 py-1"
                        style={{ minWidth: 240 }}
                      >
                        <button
                          onClick={() => toggleExpand(lesson.id)}
                          className="flex items-center gap-2 w-full text-left group"
                        >
                          <ChevronRight
                            className={`w-4 h-4 flex-shrink-0 text-purple-500 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary">
                            {lesson.label}
                          </span>
                          <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                            {lesson.subTopics.length}
                          </span>
                        </button>
                      </td>
                      {years.map((year) => {
                        const checked = isMcqChecked(lesson.id, year);
                        return (
                          <td
                            key={`${lesson.id}-${year}`}
                            className={`border border-border text-center cursor-pointer transition-colors select-none ${
                              checked
                                ? 'bg-purple-500/25 hover:bg-purple-500/40'
                                : 'hover:bg-muted/80'
                            }`}
                            style={{ width: 52, minWidth: 48, height: 36 }}
                            onClick={() => toggleMcqCell(lesson.id, year)}
                          >
                            {checked && (
                              <Check className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Sub-topic rows */}
                    {isExpanded &&
                      lesson.subTopics.map((sub) => (
                        <tr key={sub.id} className="bg-muted/10">
                          <td
                            className="sticky left-0 z-10 border border-border bg-muted/30 pl-10 pr-4 py-1 text-xs text-muted-foreground"
                            style={{ minWidth: 240 }}
                          >
                            <span className="border-l-2 border-border pl-3">{sub.label}</span>
                          </td>
                          {years.map((year) => {
                            const checked = isMcqChecked(sub.id, year);
                            return (
                              <td
                                key={`${sub.id}-${year}`}
                                className={`border border-border text-center cursor-pointer transition-colors select-none ${
                                  checked
                                    ? 'bg-purple-500/20 hover:bg-purple-500/35'
                                    : 'hover:bg-muted/50'
                                }`}
                                style={{ width: 52, minWidth: 48 }}
                                onClick={() => toggleMcqCell(sub.id, year)}
                              >
                                {checked && (
                                  <Check className="w-3 h-3 text-purple-500 dark:text-purple-400 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ════════════════ PART 2 TABLE ════════════════ */}
        {viewMode === 'part2' && (
          <table
            className="border-collapse w-full"
            style={{ minWidth: `${26 * 44 + 160}px` }}
          >
            <thead className="sticky top-0 z-20">
              <tr>
                <th
                  className="sticky left-0 z-30 border border-border bg-secondary px-3 py-1.5 text-left text-xs font-semibold text-foreground"
                  style={{ minWidth: 160, width: 160 }}
                >
                  Section / Question
                </th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="border border-border bg-secondary px-1 py-1.5 text-center text-xs font-semibold text-foreground"
                    style={{ minWidth: 40, width: 44 }}
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PART2_SECTIONS.map((section) => (
                <React.Fragment key={section.key}>
                  {/* Section group header row */}
                  <tr>
                    <td
                      colSpan={27}
                      className={`sticky left-0 border border-border px-4 py-1 text-xs font-bold ${section.color} ${section.bg}`}
                    >
                      {section.label}
                      <span className="ml-1.5 opacity-60 font-normal">({section.count} questions)</span>
                    </td>
                  </tr>
                  {/* One row per question */}
                  {Array.from({ length: section.count }, (_, i) => {
                    const qKey = `${section.key}-q${i + 1}`;
                    return (
                      <tr key={qKey} className="bg-card hover:bg-card/60 transition-colors">
                        <td
                          className={`sticky left-0 z-10 border border-border bg-card pl-8 pr-4 py-1 text-xs font-semibold ${section.color}`}
                          style={{ minWidth: 160, width: 160 }}
                        >
                          Q{i + 1}
                        </td>
                        {years.map((year) => {
                          const checked = isPart2Checked(year, qKey);
                          const checkedBg =
                            section.key === 'structure'
                              ? 'bg-blue-500/25 hover:bg-blue-500/40'
                              : section.key === 'essay-a'
                              ? 'bg-emerald-500/25 hover:bg-emerald-500/40'
                              : 'bg-amber-500/25 hover:bg-amber-500/40';
                          const checkColor =
                            section.key === 'structure'
                              ? 'text-blue-500 dark:text-blue-400'
                              : section.key === 'essay-a'
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-amber-500 dark:text-amber-400';
                          return (
                            <td
                              key={year}
                              className={`border border-border text-center cursor-pointer transition-colors select-none ${
                                checked ? checkedBg : 'hover:bg-muted'
                              }`}
                              style={{ width: 44, minWidth: 40, height: 34 }}
                              onClick={() => togglePart2Cell(year, qKey)}
                            >
                              {checked && (
                                <Check className={`w-3 h-3 mx-auto ${checkColor}`} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}
