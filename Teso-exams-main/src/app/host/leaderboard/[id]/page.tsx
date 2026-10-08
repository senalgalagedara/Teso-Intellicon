import React from 'react';
import { LeaderboardPage } from '@/components/host/leaderboard/LeaderboardPage';
import { getLeaderboard } from '@/app/actions/analytics';
import { getPaperQuestions } from '@/app/actions/exam';

// Always fetch fresh data — never serve from cache
export const dynamic = 'force-dynamic';

export default async function DynamicLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const students = await getLeaderboard(resolvedParams.id);
  const questions = await getPaperQuestions(resolvedParams.id);

  let maxScore = 100;
  if (questions && questions.length > 0) {
    let maxPossiblePoints = 0;
    questions.forEach((q: any) => {
      const numAnswers = q.correctAnswer2 !== undefined && q.correctAnswer2 !== null ? 2 : 1;
      maxPossiblePoints += 1 / numAnswers;
    });
    maxScore = maxPossiblePoints * questions.length;
  }

  return <LeaderboardPage paperId={resolvedParams.id} students={students} maxScore={maxScore} />;
}
