"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Trash2, Loader2 } from "lucide-react";
import { upsertTuitionExam, deleteTuitionExam, getTuitionExams } from "@/app/actions/exam";
import { toast } from "sonner";
import type { TuitionExam } from "@/types/marks";

interface TuitionExamsProps {
  tuitionExams: TuitionExam[];
  setTuitionExams: React.Dispatch<React.SetStateAction<TuitionExam[]>>;
  userSubjects?: string[];
  userId?: string;
}

const COLORS = ["#2563eb", "#0f172a", "#0284c7", "#334155", "#1d4ed8", "#64748b"];

export function TuitionExams({ tuitionExams = [], setTuitionExams, userSubjects = [], userId }: TuitionExamsProps) {
  const [isPending, startTransition] = useTransition();
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [newExam, setNewExam] = useState({
    date: new Date().toISOString().split("T")[0],
    subject: userSubjects[0] || "",
    marks: "",
    totalMarks: "100",
  });

  const [chartSettings, setChartSettings] = useState({
    yAxis: "percentage",
    groupBy: "subject",
  });

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.date || !newExam.subject || !newExam.marks) {
      toast.error("Please fill in all fields");
      return;
    }

    const marksNum = parseFloat(newExam.marks);
    const totalNum = parseFloat(newExam.totalMarks);

    if (marksNum < 0 || totalNum <= 0 || marksNum > totalNum) {
      toast.error("Marks must be between 0 and total marks");
      return;
    }

    startTransition(async () => {
      if (userId) {
        const result = await upsertTuitionExam(userId, {
          date: newExam.date,
          subject: newExam.subject,
          marks: marksNum,
          totalMarks: totalNum,
        });

        if (result.success) {
          toast.success("Exam saved successfully");
          const freshExams = await getTuitionExams(userId);
          setTuitionExams(freshExams);
          setNewExam({
            date: new Date().toISOString().split("T")[0],
            subject: userSubjects[0] || "",
            marks: "",
            totalMarks: "100",
          });
          setIsCustomSubject(false);
        } else {
          toast.error(result.error || "Failed to save exam");
        }
      } else {
        // Fallback for offline/local-only mode
        setTuitionExams([
          ...tuitionExams,
          {
            id: Date.now().toString(),
            date: newExam.date,
            subject: newExam.subject,
            marks: marksNum,
            totalMarks: totalNum,
          },
        ]);
        toast.success("Exam saved locally");
        setNewExam({
          date: new Date().toISOString().split("T")[0],
          subject: userSubjects[0] || "",
          marks: "",
          totalMarks: "100",
        });
        setIsCustomSubject(false);
      }
    });
  };

  const handleDeleteExam = (id: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    startTransition(async () => {
      if (userId) {
        const result = await deleteTuitionExam(id, userId);
        if (result.success) {
          toast.success("Exam deleted successfully");
          const freshExams = await getTuitionExams(userId);
          setTuitionExams(freshExams);
        } else {
          toast.error(result.error || "Failed to delete exam");
        }
      } else {
        setTuitionExams(tuitionExams.filter((exam) => exam.id !== id));
        toast.success("Exam deleted locally");
      }
    });
  };

  const getChartData = () => {
    if (chartSettings.groupBy === "subject") {
      const subjects = Array.from(new Set(tuitionExams.map((exam) => exam.subject)));
      return subjects.map((subject) => {
        const subjectExams = tuitionExams.filter((exam) => exam.subject === subject);
        const avgPercentage =
          subjectExams.reduce((sum, exam) => sum + (exam.marks / exam.totalMarks) * 100, 0) /
          subjectExams.length;
        return {
          name: subject,
          percentage: parseFloat(avgPercentage.toFixed(1)),
          marks: parseFloat((subjectExams.reduce((sum, exam) => sum + exam.marks, 0) / subjectExams.length).toFixed(1)),
        };
      });
    } else {
      return [...tuitionExams]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((exam) => ({
          name: new Date(exam.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          percentage: parseFloat(((exam.marks / exam.totalMarks) * 100).toFixed(1)),
          marks: exam.marks,
          subject: exam.subject,
        }));
    }
  };

  const chartData = getChartData();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* LEFT & CENTER: Charts and Tables */}
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Tuition Class Exams
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Track and analyze your performance in weekly/monthly tuition exams
          </p>
        </div>

        <Card className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-4 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Performance Analysis
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                {chartSettings.groupBy === "subject" ? "Average score by subject" : "Chronological performance"}
              </CardDescription>
            </div>
            {/* Inline controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Select 
                value={chartSettings.groupBy} 
                onValueChange={(v) => setChartSettings({ ...chartSettings, groupBy: v })}
              >
                <SelectTrigger className="h-9 w-[140px] bg-white border-slate-200 text-slate-900 text-xs font-medium shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <SelectValue placeholder="Group By" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  <SelectItem value="subject">By Subject</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={chartSettings.yAxis} 
                onValueChange={(v) => setChartSettings({ ...chartSettings, yAxis: v })}
              >
                <SelectTrigger className="h-9 w-[130px] bg-white border-slate-200 text-slate-900 text-xs font-medium shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <SelectValue placeholder="Metrics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="marks">Raw Marks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      tick={{ fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: chartSettings.yAxis === "percentage" ? "%" : "Marks",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11, fill: "#64748b", fontWeight: 500 },
                        offset: 10
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#cbd5e1",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#0f172a",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      }}
                      itemStyle={{ color: "#0f172a" }}
                      cursor={{ fill: "#f1f5f9", opacity: 0.6 }}
                    />
                    <Bar
                      dataKey={chartSettings.yAxis === "percentage" ? "percentage" : "marks"}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 space-y-1">
                <p className="font-semibold text-sm text-slate-900">No exam data recorded yet</p>
                <p className="text-xs text-slate-500">Add tuition exams to view performance charts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table of exam records */}
        <Card className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-slate-900">Exam Records</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Detailed log of all entered tuition class exams</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-2 sm:px-6 bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-900 text-xs uppercase font-semibold">Date</TableHead>
                    <TableHead className="text-slate-900 text-xs uppercase font-semibold">Subject</TableHead>
                    <TableHead className="text-slate-900 text-xs uppercase font-semibold">Raw Score</TableHead>
                    <TableHead className="text-slate-900 text-xs uppercase font-semibold">Percentage</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tuitionExams.length > 0 ? (
                    [...tuitionExams]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((exam) => (
                        <TableRow key={exam.id} className="border-slate-100 hover:bg-slate-50/70">
                          <TableCell className="font-medium text-slate-900 text-sm">
                            {new Date(exam.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </TableCell>
                          <TableCell className="text-slate-900 text-sm font-semibold">{exam.subject}</TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {exam.marks} / {exam.totalMarks}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-blue-600 text-sm">
                              {((exam.marks / exam.totalMarks) * 100).toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isPending}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              onClick={() => handleDeleteExam(exam.id)}
                              title="Delete record"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                        No exams recorded yet. Enter a record on the right.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT SIDE: Quick Add Form Card */}
      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-slate-900">
              Quick Add Exam
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Record new tuition class exam scores
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 bg-white">
            <form onSubmit={handleAddExam} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="exam-date" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Date</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={newExam.date}
                  onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="exam-subject" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Subject</Label>
                  {userSubjects.length > 0 && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      onClick={() => {
                        setIsCustomSubject(!isCustomSubject);
                        setNewExam({ ...newExam, subject: isCustomSubject ? (userSubjects[0] || "") : "" });
                      }}
                    >
                      {isCustomSubject ? "Select Subject" : "Enter Custom"}
                    </Button>
                  )}
                </div>

                {!isCustomSubject && userSubjects.length > 0 ? (
                  <Select
                    value={newExam.subject}
                    onValueChange={(v) => setNewExam({ ...newExam, subject: v })}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {userSubjects.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="exam-subject"
                    placeholder="e.g. Mathematics"
                    value={newExam.subject}
                    onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="exam-marks" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Obtained</Label>
                  <Input
                    id="exam-marks"
                    type="number"
                    min={0}
                    placeholder="45"
                    value={newExam.marks}
                    onChange={(e) => setNewExam({ ...newExam, marks: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exam-total" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Total</Label>
                  <Input
                    id="exam-total"
                    type="number"
                    min={1}
                    placeholder="50"
                    value={newExam.totalMarks}
                    onChange={(e) => setNewExam({ ...newExam, totalMarks: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm h-10 transition-colors">
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" /> Saving...
                  </>
                ) : (
                  "Add Exam"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}