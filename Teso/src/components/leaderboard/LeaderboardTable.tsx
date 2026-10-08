import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Target, Clock } from "lucide-react";

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

interface LeaderboardTableProps {
  students: Student[];
}

export function LeaderboardTable({ students }: LeaderboardTableProps) {
  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/30 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-slate-800/50">
            <TableHead className="text-slate-400 w-20">RANK</TableHead>
            <TableHead className="text-slate-400">PLAYER</TableHead>
            <TableHead className="text-slate-400 text-center">SCORE</TableHead>
            <TableHead className="text-slate-400 text-center">ATTEMPTS</TableHead>
            <TableHead className="text-slate-400 text-center">ACCURACY</TableHead>
            <TableHead className="text-slate-400 text-center">TIME</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const isTopThree = student.rank <= 3;
            const isYou = student.rank === 0; // Placeholder for current user

            return (
              <TableRow 
                key={student.id} 
                className={`border-slate-800 hover:bg-slate-800/50 ${isYou ? 'bg-orange-500/10' : ''}`}
              >
                <TableCell>
                  <div className="flex items-center justify-center">
                    {isYou ? (
                      <Badge variant="secondary" className="bg-orange-500 text-white border-none">
                        UNRANKED
                      </Badge>
                    ) : isTopThree ? (
                      <span className="text-emerald-400">[{student.rank}]</span>
                    ) : (
                      <span className="text-slate-400">[{student.rank}]</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-slate-700">
                      <AvatarImage src={student.avatar} alt={student.name} />
                      <AvatarFallback>{student.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className={`${isYou ? 'text-orange-400' : isTopThree ? 'text-emerald-400' : 'text-white'}`}>
                        {student.name}
                      </div>
                      <div className="text-slate-500 text-sm">{student.username}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Target className="size-4 text-indigo-400" />
                    <span className="text-white">{student.score.toFixed(2)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-white">{student.attempts}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-white">{student.percentage.toFixed(2)}%</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="size-4 text-slate-400" />
                    <span className="text-white">{student.timeCompleted}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
