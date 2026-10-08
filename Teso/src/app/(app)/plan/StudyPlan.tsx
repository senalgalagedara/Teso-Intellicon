"use client";

import React, { useMemo } from 'react';
import { ArrowLeft, Calendar, Clock, Target, AlertCircle, BookOpen, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type TopicStatus = 'not-started' | 'covered' | 'understand' | 'cant-understand';

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

interface StudyPlanProps {
  topicStatuses: Record<string, TopicStatus>;
  syllabusData: Lesson[];
  onBack: () => void;
}

interface StudyPhase {
  id: string;
  phase: string;
  title: string;
  topics: Array<{ id: string; label: string; parentLabel?: string; weight: number; status: TopicStatus }>;
  duration: string;
  startDay: number;
  color: string;
  icon: React.ReactNode;
}

export function StudyPlan({ topicStatuses, syllabusData, onBack }: StudyPlanProps) {
  const studyPhases: StudyPhase[] = useMemo(() => {
    const allTopics = syllabusData.flatMap((lesson) => [
      { id: lesson.id, label: lesson.label, weight: lesson.weight, parentLabel: undefined },
      ...lesson.subTopics.map((sub) => ({
        id: sub.id,
        label: sub.label,
        weight: sub.weight,
        parentLabel: lesson.label,
      })),
    ]);

    // Categorize topics
    const needHelp = allTopics.filter((t) => topicStatuses[t.id] === 'cant-understand');
    const needReview = allTopics.filter((t) => topicStatuses[t.id] === 'covered');
    const notStarted = allTopics.filter(
      (t) => !topicStatuses[t.id] || topicStatuses[t.id] === 'not-started'
    );

    const phases: StudyPhase[] = [];
    let currentDay = 1;

    // Phase 1: Foundation Building (Can't Understand topics)
    if (needHelp.length > 0) {
      const daysNeeded = Math.max(Math.ceil(needHelp.length * 2.5), 7);
      phases.push({
        id: 'foundation',
        phase: 'Phase 1',
        title: 'Foundation Building',
        topics: needHelp.map((t) => ({ ...t, status: topicStatuses[t.id] })),
        duration: `${daysNeeded} days`,
        startDay: currentDay,
        color: 'from-red-500 to-orange-500',
        icon: <AlertCircle className="w-5 h-5" />,
      });
      currentDay += daysNeeded;
    }

    // Phase 2: New Material (Not Started topics)
    if (notStarted.length > 0) {
      const daysNeeded = Math.max(Math.ceil(notStarted.length * 2), 10);
      phases.push({
        id: 'learning',
        phase: `Phase ${phases.length + 1}`,
        title: 'Learning New Material',
        topics: notStarted.map((t) => ({ ...t, status: topicStatuses[t.id] || 'not-started' })),
        duration: `${daysNeeded} days`,
        startDay: currentDay,
        color: 'from-blue-500 to-cyan-500',
        icon: <BookOpen className="w-5 h-5" />,
      });
      currentDay += daysNeeded;
    }

    // Phase 3: Review & Practice (Covered topics)
    if (needReview.length > 0) {
      const daysNeeded = Math.max(Math.ceil(needReview.length * 1.5), 5);
      phases.push({
        id: 'review',
        phase: `Phase ${phases.length + 1}`,
        title: 'Review & Practice',
        topics: needReview.map((t) => ({ ...t, status: topicStatuses[t.id] })),
        duration: `${daysNeeded} days`,
        startDay: currentDay,
        color: 'from-purple-500 to-pink-500',
        icon: <Target className="w-5 h-5" />,
      });
      currentDay += daysNeeded;
    }

    // Phase 4: Final Review (All topics)
    const finalReviewDays = 7;
    phases.push({
      id: 'final',
      phase: `Phase ${phases.length + 1}`,
      title: 'Final Review & Mock Tests',
      topics: [],
      duration: `${finalReviewDays} days`,
      startDay: currentDay,
      color: 'from-green-500 to-emerald-500',
      icon: <CheckCircle2 className="w-5 h-5" />,
    });

    return phases;
  }, [topicStatuses, syllabusData]);

  const totalDays = studyPhases[studyPhases.length - 1]?.startDay + 7 || 0;

  // Calculate curve path for timeline
  const generateCurvePath = (phases: StudyPhase[]) => {
    const width = 1200;
    const height = 200;
    const segmentWidth = width / (phases.length + 1);

    let path = `M 0,${height / 2}`;

    phases.forEach((_, index) => {
      const x1 = segmentWidth * (index + 1);
      const y1 = index % 2 === 0 ? height * 0.3 : height * 0.7;
      const cpX = segmentWidth * (index + 0.5);
      const cpY = index % 2 === 0 ? height * 0.1 : height * 0.9;

      path += ` Q ${cpX},${cpY} ${x1},${y1}`;
    });

    return path;
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card/50 border-b border-border sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-secondary hover:bg-muted border border-border transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Your Personalized Study Plan</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete your syllabus in {totalDays} days with structured learning
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-secondary border border-border px-4 py-2 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-foreground">{totalDays} Days Total</span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Study Journey Timeline */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-8 flex items-center gap-2 text-foreground">
              <Target className="w-6 h-6 text-purple-400" />
              Study Journey Map
            </h2>

            {/* Timeline Visualization */}
            <div className="relative overflow-x-auto pb-8">
              <div className="relative min-w-[1200px] h-[250px]">
                {/* Curved Path */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 1200 200"
                  preserveAspectRatio="none"
                >
                  <path
                    d={generateCurvePath(studyPhases)}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    className="opacity-50"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="33%" stopColor="#3b82f6" />
                      <stop offset="66%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Phase Markers */}
                {studyPhases.map((phase, index) => {
                  const x = (1200 / (studyPhases.length + 1)) * (index + 1);
                  const y = index % 2 === 0 ? 60 : 140;

                  return (
                    <div
                      key={phase.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${x}px`, top: `${y}px` }}
                    >
                      <div className={`bg-gradient-to-r ${phase.color} p-1 rounded-full`}>
                        <div className="bg-card rounded-full p-3">
                          {phase.icon}
                        </div>
                      </div>
                      <div className={`absolute ${index % 2 === 0 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 transform -translate-x-1/2 text-center min-w-[150px]`}>
                        <div className="text-xs font-semibold text-muted-foreground">{phase.phase}</div>
                        <div className="text-sm font-bold text-foreground mt-1">{phase.title}</div>
                        <div className="text-xs text-muted-foreground/80 mt-1 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          {phase.duration}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Phase Cards */}
          <div className="space-y-6">
            {studyPhases.map((phase) => (
              <div
                key={phase.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className={`bg-gradient-to-r ${phase.color} p-4`}>
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      {phase.icon}
                      <div>
                        <div className="text-sm opacity-90">{phase.phase}</div>
                        <div className="text-xl font-bold">{phase.title}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90">Duration</div>
                      <div className="text-lg font-semibold">{phase.duration}</div>
                      <div className="text-xs opacity-75">Day {phase.startDay} onwards</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {phase.topics.length > 0 ? (
                    <>
                      <h4 className="font-semibold mb-4 text-foreground/95">
                        Topics to Cover ({phase.topics.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {phase.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="bg-secondary/40 border border-border rounded-lg p-3 hover:border-purple-500/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {topic.parentLabel && (
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {topic.parentLabel}
                                  </div>
                                )}
                                <div className="text-sm font-medium text-foreground">
                                  {topic.label}
                                </div>
                              </div>
                              <div className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
                                {topic.weight}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p className="font-medium text-foreground">Comprehensive revision of all topics</p>
                      <p className="text-sm mt-1">Practice with mock tests and solve past papers</p>
                    </div>
                  )}

                  {/* Study Tips */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h5 className="font-medium text-sm text-muted-foreground mb-3">Recommended Activities</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                      {phase.id === 'foundation' && (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2" />
                            <span>Watch video tutorials and take detailed notes</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2" />
                            <span>Practice basic problems and examples</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2" />
                            <span>Seek help from mentors or study groups</span>
                          </div>
                        </>
                      )}
                      {phase.id === 'learning' && (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                            <span>Read textbook chapters thoroughly</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                            <span>Complete practice exercises</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                            <span>Create summary notes and flashcards</span>
                          </div>
                        </>
                      )}
                      {phase.id === 'review' && (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
                            <span>Solve previous year questions</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
                            <span>Practice time-bound problem solving</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
                            <span>Review and strengthen weak areas</span>
                          </div>
                        </>
                      )}
                      {phase.id === 'final' && (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                            <span>Take full-length mock exams</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                            <span>Quick revision using notes and flashcards</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                            <span>Focus on high-weightage topics</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Success Tips */}
          <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Target className="w-5 h-5 text-purple-400" />
              Tips for Success
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 rounded-full p-2 mt-0.5">
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Stay Consistent</div>
                  <div className="text-muted-foreground text-xs">Dedicate 2-3 hours daily for focused study</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 rounded-full p-2 mt-0.5">
                  <Target className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Track Progress</div>
                  <div className="text-muted-foreground text-xs">Mark topics as complete in the flowchart</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 rounded-full p-2 mt-0.5">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Active Learning</div>
                  <div className="text-muted-foreground text-xs">Practice problems, don't just read theory</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 rounded-full p-2 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Regular Breaks</div>
                  <div className="text-muted-foreground text-xs">Use the Pomodoro technique for better focus</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
