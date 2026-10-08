"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trash2, Loader2 } from "lucide-react";
import { upsertTermTestMark, deleteTermTestMark, type TermTestInput } from "@/app/actions/term-test";
import { toast } from "sonner";

type TermTestMark = {
  id: string;
  grade: number;
  term: number;
  subject: string;
  marks: number;
  totalMarks: number;
};

interface TermTestGraphsProps {
  initialData: TermTestMark[];
  userSubjects?: string[];
  userId: string;
}

// Focused Black & Blue palette for high readability in light mode
const COLORS = ["#2563eb", "#0f172a", "#0284c7", "#334155", "#1d4ed8", "#64748b"];

export function TermTestGraphs({ initialData = [], userSubjects = [], userId }: TermTestGraphsProps) {
  const [isPending, startTransition] = useTransition();
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const safeData = initialData || [];

  const [formData, setFormData] = useState<TermTestInput>({
    grade: 12,
    term: 1,
    subject: userSubjects[0] || "",
    marks: 0,
    totalMarks: 100,
  });

  const getChartData = (grade: number) => {
    const gradeData = safeData.filter((d) => d.grade === grade);
    const terms = [1, 2, 3];
    return terms.map((term) => {
      const entry: any = { name: `Term ${term}` };
      gradeData.filter((d) => d.term === term).forEach((d) => {
        entry[d.subject] = parseFloat(((d.marks / d.totalMarks) * 100).toFixed(1));
      });
      return entry;
    });
  };

  const allSubjects = Array.from(new Set(safeData.map((d) => d.subject)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || formData.subject.trim() === "") {
      toast.error("Please select or enter a subject");
      return;
    }
    if (formData.marks < 0 || formData.totalMarks <= 0 || formData.marks > formData.totalMarks) {
      toast.error("Please enter valid marks (Marks must be less than or equal to total)");
      return;
    }

    startTransition(async () => {
      const result = await upsertTermTestMark(formData, userId);
      if (result.success) {
        toast.success("Marks saved successfully");
        if (isCustomSubject) {
          setIsCustomSubject(false);
        }
      } else {
        toast.error(result.error || "Failed to save marks");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this mark?")) return;
    startTransition(async () => {
      const result = await deleteTermTestMark(id, userId);
      if (result.success) {
        toast.success("Mark deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete mark");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* LEFT & CENTER: Graphs Area */}
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            A/L Term Test Performance
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Visualize and track your progress across Grade 12 &amp; Grade 13
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[12, 13].map((grade) => {
            const chartData = getChartData(grade);
            const hasData = safeData.some((d) => d.grade === grade);

            return (
              <Card key={grade} className="border border-slate-200 bg-white shadow-sm rounded-xl flex flex-col overflow-hidden">
                <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Grade {grade}
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs">
                    Term test progress by subject (%)
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-5 flex-1 flex flex-col justify-between min-h-[300px] bg-white">
                  {hasData ? (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            fontSize={12} 
                            fontWeight={500}
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={12} 
                            fontWeight={500}
                            tickLine={false} 
                            axisLine={false} 
                            domain={[0, 100]} 
                            width={30} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#ffffff', 
                              borderColor: '#e2e8f0', 
                              borderRadius: '8px',
                              color: '#0f172a',
                              fontSize: '12px',
                              fontWeight: '600',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }} 
                            itemStyle={{ color: '#0f172a' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 500, color: '#334155' }} />
                          {allSubjects.map((subject, idx) => (
                            <Line 
                              key={subject} 
                              type="monotone" 
                              dataKey={subject} 
                              stroke={COLORS[idx % COLORS.length]} 
                              strokeWidth={2.5} 
                              dot={{ r: 4, fill: '#ffffff', strokeWidth: 2, stroke: COLORS[idx % COLORS.length] }} 
                              activeDot={{ r: 6 }} 
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 space-y-1">
                      <p className="font-semibold text-sm text-slate-900">No marks recorded yet</p>
                      <p className="text-xs text-slate-500">Add Grade {grade} marks to view your chart</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE: Quick Add Form & Recent Marks List */}
      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-slate-900">
              Quick Add Marks
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Add or update term test results instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 bg-white">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="grade" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Grade</Label>
                  <Select 
                    value={formData.grade.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, grade: parseInt(v) })}
                  >
                    <SelectTrigger id="grade" className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="12">Grade 12</SelectItem>
                      <SelectItem value="13">Grade 13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="term" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Term</Label>
                  <Select 
                    value={formData.term.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, term: parseInt(v) })}
                  >
                    <SelectTrigger id="term" className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="1">1st Term</SelectItem>
                      <SelectItem value="2">2nd Term</SelectItem>
                      <SelectItem value="3">3rd Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="subject" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Subject</Label>
                  {userSubjects.length > 0 && (
                    <Button 
                      type="button" 
                      variant="link" 
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      onClick={() => {
                        setIsCustomSubject(!isCustomSubject);
                        setFormData({ ...formData, subject: isCustomSubject ? (userSubjects[0] || "") : "" });
                      }}
                    >
                      {isCustomSubject ? "Select Subject" : "Enter Custom"}
                    </Button>
                  )}
                </div>

                {!isCustomSubject && userSubjects.length > 0 ? (
                  <Select 
                    value={formData.subject} 
                    onValueChange={(v) => setFormData({ ...formData, subject: v })}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue placeholder="Select enrolled subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {userSubjects.map((sub) => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    placeholder="e.g. Chemistry, Physics" 
                    value={formData.subject} 
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })} 
                    className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="marks" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Marks</Label>
                  <Input 
                    id="marks"
                    type="number" 
                    min={0}
                    value={formData.marks || ""} 
                    onChange={(e) => setFormData({ ...formData, marks: parseFloat(e.target.value) || 0 })} 
                    className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="85"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="totalMarks" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Total Marks</Label>
                  <Input 
                    id="totalMarks"
                    type="number" 
                    min={1}
                    value={formData.totalMarks || ""} 
                    onChange={(e) => setFormData({ ...formData, totalMarks: parseFloat(e.target.value) || 100 })} 
                    className="bg-white border-slate-200 text-slate-900 font-medium h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="100"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm h-10 transition-colors rounded-lg cursor-pointer">
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" /> Saving...
                  </>
                ) : (
                  "Save Marks"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {safeData.length > 0 && (
          <Card className="border border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-900">Recent Entries</CardTitle>
              <CardDescription className="text-xs text-slate-500">Quick management of test records</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 px-4 bg-white">
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {safeData.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 text-sm hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {item.subject}
                      </span>
                      <span className="text-slate-500 text-xs">
                        Grade {item.grade} • Term {item.term}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-blue-600 text-sm">
                        {((item.marks / item.totalMarks) * 100).toFixed(1)}%
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete mark"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}