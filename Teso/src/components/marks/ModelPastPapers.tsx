"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Plus, Trash2, FileText, Edit2, Save, X, Maximize2, Minimize2, TrendingUp, GitCompare, Calendar } from "lucide-react";
import type { ModelPaper, PaperPart } from "@/types/marks";
import { upsertPastPaperMark } from "@/app/actions/exam";
import { toast } from "sonner";

interface ModelPastPapersProps {
  modelPapers: ModelPaper[];
  setModelPapers: (papers: ModelPaper[]) => void;
  userSubjects?: string[];
  userId?: string;
}

const COLORS = ["#2563eb", "#0f172a", "#0284c7", "#334155", "#1d4ed8", "#64748b", "#1e3a8a", "#475569"];

export function ModelPastPapers({ modelPapers, setModelPapers, userSubjects = [], userId }: ModelPastPapersProps) {
  const [open, setOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const [editingPaper, setEditingPaper] = useState<string | null>(null);
  const [editedParts, setEditedParts] = useState<any[]>([]);

  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [selectedYearForDetail, setSelectedYearForDetail] = useState<number | null>(null);
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  const [newPaper, setNewPaper] = useState({
    type: "past" as const,
    year: new Date().getFullYear(),
    subject: userSubjects[0] || "",
    date: new Date().toISOString().split("T")[0],
  });

  const [parts, setParts] = useState<{ name: string; marks: number | string; totalMarks: number | string }[]>([
    { name: "Part A", marks: "", totalMarks: "" },
  ]);

  const handleAddPart = () => setParts([...parts, { name: "", marks: "", totalMarks: "" }]);
  const handleUpdatePart = (index: number, field: string, value: string | number) => {
    const updated = [...parts];
    // @ts-ignore
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };
  const handleRemovePart = (index: number) => setParts(parts.filter((_, i) => i !== index));

  const handleAddPaper = () => {
    if (!newPaper.subject || newPaper.subject.trim() === "" || !newPaper.date || parts.length === 0) {
      toast.error("Please fill in all details");
      return;
    }

    const cleanParts = parts.map((part, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: part.name || `Part ${idx + 1}`,
      marks: typeof part.marks === "string" && part.marks === "" ? 0 : Number(part.marks),
      totalMarks: typeof part.totalMarks === "string" && part.totalMarks === "" ? 0 : Number(part.totalMarks),
    }));

    const totalMarks = cleanParts.reduce((sum, part) => sum + part.totalMarks, 0);
    const obtainedMarks = cleanParts.reduce((sum, part) => sum + part.marks, 0);
    const newId = Date.now().toString();

    startTransition(async () => {
      if (userId) {
        try {
          const part1 = cleanParts[0];
          const part2 = cleanParts[1];
          const res = await upsertPastPaperMark(
            userId,
            newId,
            Number(part1.marks || 0),
            Number(part1.totalMarks || 0),
            newPaper.subject,
            `${newPaper.subject} ${newPaper.year}`,
            part2 ? Number(part2.marks || 0) : undefined,
            part2 ? Number(part2.totalMarks || 0) : undefined
          );

          if (res.success) {
            toast.success("Past paper marks saved successfully");
            setModelPapers([
              ...modelPapers,
              {
                id: newId,
                type: "past",
                year: newPaper.year,
                subject: newPaper.subject,
                date: newPaper.date,
                parts: cleanParts,
                totalMarks,
                obtainedMarks,
              },
            ]);
            setNewPaper({ type: "past", year: new Date().getFullYear(), subject: userSubjects[0] || "", date: new Date().toISOString().split("T")[0] });
            setParts([{ name: "Part A", marks: "", totalMarks: "" }]);
            setIsCustomSubject(false);
            setOpen(false);
          } else {
            toast.error(res.error || "Failed to save marks");
          }
        } catch (e) {
          toast.error("Error saving paper to database");
        }
      } else {
        setModelPapers([
          ...modelPapers,
          {
            id: newId,
            type: "past",
            year: newPaper.year,
            subject: newPaper.subject,
            date: newPaper.date,
            parts: cleanParts,
            totalMarks,
            obtainedMarks,
          },
        ]);
        toast.success("Saved past paper locally");
        setOpen(false);
      }
    });
  };

  const handleDeletePaper = (id: string) => {
    if (!confirm("Are you sure you want to delete this past paper record?")) return;
    setModelPapers(modelPapers.filter((paper) => paper.id !== id));
    setSelectedPapers(selectedPapers.filter((paperId) => paperId !== id));
    if (expandedPaper === id) setExpandedPaper(null);
    toast.success("Paper record deleted locally");
  };

  const toggleExpand = (id: string) => setExpandedPaper(expandedPaper === id ? null : id);

  const startEditing = (paper: ModelPaper) => {
    setEditingPaper(paper.id);
    setEditedParts([...paper.parts]);
    setExpandedPaper(paper.id);
  };

  const cancelEditing = () => {
    setEditingPaper(null);
    setEditedParts([]);
  };

  const saveEditing = (paperId: string) => {
    const cleanParts: PaperPart[] = editedParts.map(part => ({
      ...part,
      marks: part.marks === "" ? 0 : Number(part.marks),
      totalMarks: part.totalMarks === "" ? 0 : Number(part.totalMarks)
    }));

    const totalMarks = cleanParts.reduce((sum, part) => sum + part.totalMarks, 0);
    const obtainedMarks = cleanParts.reduce((sum, part) => sum + part.marks, 0);

    const updatedPapers = modelPapers.map((paper) => {
      if (paper.id === paperId) {
        return { ...paper, parts: cleanParts, totalMarks, obtainedMarks };
      }
      return paper;
    });

    startTransition(async () => {
      if (userId) {
        try {
          const p1 = cleanParts[0];
          const p2 = cleanParts[1];
          const paper = modelPapers.find(p => p.id === paperId);
          const res = await upsertPastPaperMark(
            userId,
            paperId,
            Number(p1.marks || 0),
            Number(p1.totalMarks || 0),
            paper?.subject,
            `${paper?.subject} ${paper?.year}`,
            p2 ? Number(p2.marks || 0) : undefined,
            p2 ? Number(p2.totalMarks || 0) : undefined
          );

          if (res.success) {
            toast.success("Paper marks updated successfully");
            setModelPapers(updatedPapers);
            setEditingPaper(null);
            setEditedParts([]);
          } else {
            toast.error(res.error || "Failed to update marks");
          }
        } catch (e) {
          toast.error("Error saving paper to database");
        }
      } else {
        setModelPapers(updatedPapers);
        setEditingPaper(null);
        setEditedParts([]);
        toast.success("Updated paper locally");
      }
    });
  };

  const updateEditedPart = (index: number, field: keyof PaperPart, value: string | number) => {
    const updated = [...editedParts];
    updated[index] = { ...updated[index], [field]: value };
    setEditedParts(updated);
  };

  const addEditedPart = (paperId?: string) => {
    const next = editedParts.length + 1;
    setEditedParts([...editedParts, { id: `${paperId || "edited"}-part-${next}`, name: `Part ${next}`, marks: "", totalMarks: "" }]);
  };

  const removeEditedPart = (index: number) => setEditedParts(editedParts.filter((_, i) => i !== index));

  const togglePaperSelection = (id: string) => {
    if (selectedPapers.includes(id)) setSelectedPapers(selectedPapers.filter((paperId) => paperId !== id));
    else setSelectedPapers([...selectedPapers, id]);
  };

  const getFilteredPapers = () => {
    return modelPapers.filter(
      (paper) =>
        paper.type === "past" &&
        (filterSubject === "all" || paper.subject === filterSubject) &&
        (filterYear === "all" || paper.year.toString() === filterYear)
    );
  };

  const allSubjects = (userSubjects && userSubjects.length > 0) ? userSubjects : Array.from(new Set(modelPapers.map((p) => p.subject)));

  const getYearWiseData = () => {
    const pastPapers = modelPapers.filter((p) => p.type === "past");
    const startYear = 2000;
    const endYear = 2025;
    const yearsRange: number[] = [];
    for (let y = startYear; y <= endYear; y++) yearsRange.push(y);

    return yearsRange.map((year) => {
      const yearPapers = pastPapers.filter((p) => p.year === year);
      let avgPercentage = 0;
      if (yearPapers.length > 0) {
        avgPercentage = yearPapers.reduce(
          (sum, paper) => sum + (paper.totalMarks > 0 ? (paper.obtainedMarks / paper.totalMarks) * 100 : 0), 0
        ) / yearPapers.length;
      }
      return { year: `${year}`, yearNum: year, percentage: parseFloat(avgPercentage.toFixed(1)), papers: yearPapers.length };
    });
  };

  const getYearDetailData = (year: number) => {
    const yearPapers = modelPapers.filter((p) => p.type === "past" && p.year === year);
    return yearPapers.map((paper) => ({
      name: `${paper.subject}\n${new Date(paper.date).toLocaleDateString()}`,
      percentage: parseFloat(((paper.obtainedMarks / paper.totalMarks) * 100).toFixed(1)),
      marks: paper.obtainedMarks,
      total: paper.totalMarks,
      paper: paper,
    }));
  };

  const PaperCard = ({ paper }: { paper: ModelPaper }) => {
    const percentage = ((paper.obtainedMarks / paper.totalMarks) * 100).toFixed(1);
    const isSelected = selectedPapers.includes(paper.id);
    const isExpanded = expandedPaper === paper.id;
    const isEditing = editingPaper === paper.id;
    const displayParts = isEditing ? editedParts : paper.parts;

    const chartData = displayParts.map((part: any) => ({
      name: part.name,
      percentage: part.totalMarks ? parseFloat(((Number(part.marks) / Number(part.totalMarks)) * 100).toFixed(1)) : 0,
      marks: Number(part.marks),
      total: Number(part.totalMarks),
    }));

    return (
      <Card
        className={`border border-border/80 bg-card text-foreground transition-all duration-300 ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${isExpanded ? "shadow-lg" : ""} ${compareMode ? "" : "cursor-pointer"}`}
        onClick={(e) => {
          if (!compareMode && !isEditing && !(e.target as HTMLElement).closest("button") && !(e.target as HTMLElement).closest("input")) {
            toggleExpand(paper.id);
          }
        }}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1 overflow-hidden">
              {compareMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => togglePaperSelection(paper.id)}
                  className="mt-1 border-border data-[state=checked]:bg-primary flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg truncate">
                  <FileText className="size-4 sm:size-5 text-indigo-500 flex-shrink-0" />
                  <span className="truncate font-semibold">{paper.subject}</span>
                </CardTitle>
                <CardDescription className="mt-1 text-muted-foreground text-xs sm:text-sm">
                  {paper.year} • {new Date(paper.date).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>

            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              {!compareMode && !isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(paper.id);
                    }}
                  >
                    {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted text-blue-500 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(paper);
                    }}
                  >
                    <Edit2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted text-destructive hover:text-destructive/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePaper(paper.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-3 sm:p-4 border border-border/65">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-xs sm:text-sm">Total Score</span>
              <Badge className={`${parseFloat(percentage) >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {percentage}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                {isEditing ? editedParts.reduce((s, p) => s + Number(p.marks || 0), 0) : paper.obtainedMarks}
                <span className="text-muted-foreground text-base sm:text-lg font-normal">
                  {" "}
                  / {isEditing ? editedParts.reduce((s, p) => s + Number(p.totalMarks || 0), 0) : paper.totalMarks}
                </span>
              </span>
            </div>
          </div>

          {!isEditing && (
            <div>
              <h4 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-indigo-500" /> Breakdown Performance
              </h4>
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--popover-foreground))",
                        fontSize: "11px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <Separator className="bg-border/60" />

          <div className="space-y-2">
            {displayParts.map((part, index) => {
              const partPercentage = part.totalMarks ? ((Number(part.marks) / Number(part.totalMarks)) * 100).toFixed(1) : "0.0";
              return (
                <div
                  key={part.id || index}
                  className={`flex flex-col sm:flex-row justify-between sm:items-center py-2.5 px-3 bg-muted/20 rounded-lg border gap-2 sm:gap-0 ${
                    isEditing ? "border-primary bg-background" : "border-border/40"
                  }`}
                >
                  {isEditing ? (
                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase">Part Name</Label>
                        {displayParts.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEditedPart(index);
                            }}
                          >
                            <X className="size-3" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={part.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateEditedPart(index, "name", e.target.value)}
                        className="h-8 bg-background border-border text-sm"
                        placeholder="e.g. MCQ, Paper 2"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground mb-1 block uppercase font-semibold">Marks</Label>
                          <Input
                            type="number"
                            value={part.marks}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateEditedPart(index, "marks", e.target.value)}
                            className="h-8 bg-background border-border text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground mb-1 block uppercase font-semibold">Total</Label>
                          <Input
                            type="number"
                            value={part.totalMarks}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateEditedPart(index, "totalMarks", e.target.value)}
                            className="h-8 bg-background border-border text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-foreground text-sm font-medium">{part.name}</span>
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        <span className="text-muted-foreground text-xs">{part.marks} / {part.totalMarks}</span>
                        <span className={`text-sm font-semibold ${parseFloat(partPercentage) >= 75 ? "text-emerald-600" : "text-blue-600"}`}>
                          {partPercentage}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {isEditing && (
              <div className="pt-3 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    addEditedPart(paper.id);
                  }}
                >
                  <Plus className="size-3.5 mr-1" /> Add Breakdown Part
                </Button>
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    size="sm"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEditing(paper.id);
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-semibold"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEditing();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const PastPapersSection = () => {
    const papers = getFilteredPapers();
    const yearWiseData = getYearWiseData();
    const detailData = selectedYearForDetail ? getYearDetailData(selectedYearForDetail) : [];
    const sortedPapers = [...papers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/80 backdrop-blur-sm">
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <span className="text-muted-foreground text-xs font-semibold uppercase mr-1 hidden sm:inline">Filter:</span>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background border-border">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-full sm:w-[120px] bg-background border-border">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Array.from({ length: 26 }, (_, i) => 2000 + i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={compareMode ? "default" : "outline"}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedPapers([]);
            }}
            className={`w-full sm:w-auto gap-2 font-semibold ${compareMode ? "bg-indigo-600 text-white" : ""}`}
          >
            <GitCompare className="size-4" /> {compareMode ? "Exit Compare" : "Compare Papers"}
          </Button>
        </div>

        {yearWiseData.some((d) => d.papers > 0) && (
          <Card className="bg-card border border-border/80 shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="size-5 text-indigo-500" /> Timeline Progress
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Average percentage by year. Click on a bar to view details.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] sm:h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearWiseData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.6} />
                    <XAxis dataKey="yearNum" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={25} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--popover-foreground))",
                        borderRadius: "var(--radius)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="percentage"
                      radius={[4, 4, 0, 0]}
                      onClick={(data: any) => setSelectedYearForDetail(data.yearNum)}
                      cursor="pointer"
                      barSize={18}
                    >
                      {yearWiseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? "#10b981" : "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedYearForDetail && detailData.length > 0 && (
          <Card className="bg-card border border-border/80 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-lg font-bold">{selectedYearForDetail} Details</CardTitle>
                <CardDescription className="text-xs">Performance in papers of the year {selectedYearForDetail}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedYearForDetail(null)}>
                <X className="size-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detailData} layout="vertical" margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} opacity={0.6} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 9 }}
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--popover-foreground))",
                        borderRadius: "var(--radius)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={15}>
                      {detailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPapers.length > 0 ? (
            sortedPapers.map((paper) => (
              <div key={paper.id} className={`transition-all duration-300 ${expandedPaper === paper.id ? "md:col-span-2" : ""}`}>
                <PaperCard paper={paper} />
              </div>
            ))
          ) : (
            <Card className="md:col-span-3 bg-muted/20 border-border/80 border-dashed hover:bg-muted/30 transition-colors duration-200">
              <CardContent className="py-16 text-center text-muted-foreground/60">
                <FileText className="size-14 mx-auto mb-4 opacity-30 text-indigo-500" />
                <h3 className="text-lg font-bold text-foreground">No paper records found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                  Filter doesn't match or you haven't uploaded any past paper marks yet.
                </p>
                <Button variant="link" className="mt-4 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer" onClick={() => setOpen(true)}>
                  Add Past Paper Now
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const AddPaperModal = () => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onOpenAutoFocus={(e: any) => e.preventDefault()}
        className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border text-foreground shadow-2xl rounded-xl"
      >
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Add Past Paper Record
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter marks breakdown for a school test, model paper, or past paper
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Year</Label>
              <Select
                value={newPaper.year.toString()}
                onValueChange={(value) => setNewPaper({ ...newPaper, year: parseInt(value) })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 26 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Subject</Label>
                {userSubjects.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    onClick={() => {
                      setIsCustomSubject(!isCustomSubject);
                      setNewPaper({ ...newPaper, subject: isCustomSubject ? (userSubjects[0] || "") : "" });
                    }}
                  >
                    {isCustomSubject ? "Select Subject" : "Enter Custom"}
                  </Button>
                )}
              </div>

              {!isCustomSubject && userSubjects.length > 0 ? (
                <Select
                  value={newPaper.subject}
                  onValueChange={(v) => setNewPaper({ ...newPaper, subject: v })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {userSubjects.map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="e.g. Physics"
                  value={newPaper.subject}
                  onChange={(e) => setNewPaper({ ...newPaper, subject: e.target.value })}
                  className="bg-background border-border"
                />
              )}
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Test Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={newPaper.date}
                  onChange={(e) => setNewPaper({ ...newPaper, date: e.target.value })}
                  className="bg-background border-border pr-10"
                />
                <Calendar className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <Separator className="bg-border/60" />

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold text-foreground">Parts Breakdown</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPart}
                className="text-primary font-semibold text-xs h-8"
              >
                <Plus className="size-3.5 mr-1" /> Add Part
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[190px] overflow-y-auto pr-1">
              {parts.map((part, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-muted/20 p-3 rounded-lg border border-border/40">
                  <div className="flex-1 w-full space-y-2">
                    <Input
                      placeholder="Part Name (e.g. Part 1, Essay)"
                      value={part.name}
                      onChange={(e) => handleUpdatePart(index, "name", e.target.value)}
                      className="h-8 bg-background border-border text-xs text-foreground font-semibold"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={part.marks}
                          onChange={(e) => handleUpdatePart(index, "marks", e.target.value)}
                          className="h-8 bg-background border-border text-xs text-emerald-600 dark:text-emerald-400 font-semibold"
                          placeholder="Score"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={part.totalMarks}
                          onChange={(e) => handleUpdatePart(index, "totalMarks", e.target.value)}
                          className="h-8 bg-background border-border text-xs text-muted-foreground font-semibold"
                          placeholder="Out of"
                        />
                      </div>
                    </div>
                  </div>
                  {parts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePart(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive self-end sm:self-center"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200/80 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-slate-800 font-semibold">Total Paper Score</span>
            <div className="text-right">
              <span className="text-xl font-bold text-blue-600">
                {parts.reduce((sum, p) => sum + Number(p.marks || 0), 0)}
              </span>
              <span className="text-slate-500 text-sm font-medium">
                {" "}
                / {parts.reduce((sum, p) => sum + Number(p.totalMarks || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 pt-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-semibold">
            Cancel
          </Button>
          <Button
            onClick={handleAddPaper}
            disabled={isPending || !newPaper.subject || parts.length === 0}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            Save Paper Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Past Papers Records
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Track composite performance with part-wise breakdown analysis
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all duration-200">
          <Plus className="size-4" /> Add Paper Record
        </Button>
      </div>
      <AddPaperModal />
      <PastPapersSection />
    </div>
  );
}