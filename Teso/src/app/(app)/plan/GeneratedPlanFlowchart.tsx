"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  NodeProps,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import {
  ChevronLeft,
  BookOpen,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  TrendingUp,
  Save,
  Map as MapIcon,
  CalendarDays,
  Trophy,
  ClipboardList,
  FileText,
} from "lucide-react";
import {
  saveStudyPlan,
  getPlanProgress,
  type PlanResult,
  type DayPlan,
  type PlanInput,
  type DayProgressRecord,
} from "@/app/actions/study-plan-actions";
import { ALL_LESSONS_DATA, UNIT_LABELS, getSubLessonLabel, groupByUnit } from "@/lib/chemistry-lessons";
import { DailyPlanView } from "@/components/focus/DailyPlanView";

// node data types
interface UnitNodeData {
  type: "unit";
  unit: number;
  label: string;
  totalLessons: number;
  inPlanCount: number;
  totalTimeCost: number;
  mcqWt: number;
}

interface LessonNodeData {
  type: "lesson";
  lessonId: number;
  unit: number;
  label: string;
  estTime: number;
  syllabusP: number;
  mcqWt: number;
  order: number;
  inPlan: boolean;
  skipped: boolean;
  // per-day MCQ / Part-2 context (populated when inPlan)
  dayNum?: number | null;
  mcqUnit?: number | null;
  mcqTimeCost?: number | null;
  p2Unit?: number | null;
  p2TimeCost?: number | null;
}

function UnitNode({ data }: NodeProps<UnitNodeData>) {
  const covered = data.inPlanCount;
  const total = data.totalLessons;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return (
    <div className="rounded-xl border-2 px-4 py-3 min-w-[180px] select-none text-slate-900 bg-white"
      style={{ borderColor: covered > 0 ? "#2563eb" : "#e2e8f0", boxShadow: covered > 0 ? "0 4px 14px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.05)" }}>
      <Handle type="target" position={Position.Left} style={{opacity:0}} />
      <Handle type="source" position={Position.Right} style={{opacity:0}} />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: covered > 0 ? "#2563eb" : "#f1f5f9", color: covered > 0 ? "#ffffff" : "#0f172a" }}>{data.unit}</div>
        <span className="text-xs font-bold leading-tight text-slate-900">{data.label}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: covered > 0 ? "#2563eb" : "#cbd5e1" }} />
        </div>
        <span className="shrink-0 tabular-nums">{covered}/{total}</span>
      </div>
      <div className="mt-1.5 flex gap-3 text-[10px] text-slate-500 font-medium">
        <span>{data.totalTimeCost.toFixed(0)}h total</span>
        <span>MCQ x{data.mcqWt.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function LessonNode({ data }: NodeProps<LessonNodeData>) {
  const isInPlan = data.inPlan;
  const isSkipped = data.skipped;
  const hasDetail = isInPlan && (data.mcqUnit != null || data.p2Unit != null);
  let borderColor = "#e2e8f0";
  let bgGlow = "0 1px 3px rgba(0,0,0,0.04)";
  let badge: React.ReactNode = null;
  if (isSkipped) {
    borderColor = "#10b981"; bgGlow = "0 2px 10px rgba(16,185,129,0.15)";
    badge = <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-bold">SKIP</span>;
  } else if (isInPlan) {
    borderColor = "#2563eb"; bgGlow = "0 2px 10px rgba(37,99,235,0.15)";
    badge = <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-bold">#{data.order}</span>;
  }
  return (
    <div className="rounded-xl border overflow-hidden select-none bg-white text-slate-900 shadow-sm"
      style={{ borderColor, boxShadow: bgGlow, opacity: !isInPlan && !isSkipped ? 0.45 : 1, minWidth: hasDetail ? "290px" : "150px", maxWidth: hasDetail ? "330px" : "200px" }}>
      <Handle type="target" position={Position.Top} style={{opacity:0}} />
      <Handle type="source" position={Position.Bottom} style={{opacity:0}} />
      <div className="flex items-stretch">
        {/* ── Lesson info ── */}
        <div className="flex-1 px-3 py-2.5">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[11px] font-bold leading-tight flex-1 text-slate-900">{data.label}</span>
            {badge}
          </div>
          <div className="flex gap-3 text-[9px] text-slate-500 font-medium tabular-nums">
            <span>T {data.estTime}h</span>
            <span>S {data.syllabusP}%</span>
          </div>
          {data.dayNum != null && (
            <div className="mt-1 text-[9px] font-semibold text-blue-600">Day {data.dayNum}</div>
          )}
        </div>
        {/* ── MCQ + Part-2 chips ── */}
        {hasDetail && (
          <div className="border-l border-slate-100 flex flex-col divide-y divide-slate-100 min-w-[95px]">
            {data.mcqUnit != null ? (
              <div className="flex-1 flex flex-col justify-center gap-0.5 px-2.5 py-2 bg-blue-50/40">
                <div className="flex items-center gap-1">
                  <ClipboardList className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">MCQ</span>
                </div>
                <span className="text-[9px] font-medium leading-tight text-slate-900">{UNIT_LABELS[data.mcqUnit] ?? `Unit ${data.mcqUnit}`}</span>
                {data.mcqTimeCost != null && (
                  <span className="text-[8px] text-slate-500 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5 text-blue-600" />{data.mcqTimeCost.toFixed(1)}h</span>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center px-2.5 py-2 bg-slate-50 opacity-40">
                <span className="text-[8px] text-slate-400">No MCQ</span>
              </div>
            )}
            {data.p2Unit != null ? (
              <div className="flex-1 flex flex-col justify-center gap-0.5 px-2.5 py-2 bg-blue-50/20">
                <div className="flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                  <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">Part 2</span>
                </div>
                <span className="text-[9px] font-medium leading-tight text-slate-900">{UNIT_LABELS[data.p2Unit] ?? `Unit ${data.p2Unit}`}</span>
                {data.p2TimeCost != null && (
                  <span className="text-[8px] text-slate-500 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5 text-blue-600" />{data.p2TimeCost.toFixed(1)}h</span>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center px-2.5 py-2 bg-slate-50 opacity-40">
                <span className="text-[8px] text-slate-400">No P2</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { unitNode: UnitNode, lessonNode: LessonNode };

// ── Read-only day preview (unsaved state) ─────────────────────────────────────

// ── Context menu for right-click ────────────────────────────────────────────
interface CtxMenu { x: number; y: number; field: "lessonDone" | "mcqDone" | "p2Done"; }

interface UnsavedDayCardProps {
  day: import("@/app/actions/study-plan-actions").DayPlan;
  done: { lessonDone: boolean; mcqDone: boolean; p2Done: boolean };
  onToggle: (field: "lessonDone" | "mcqDone" | "p2Done") => void;
}

function UnsavedDayCard({ day, done, onToggle }: UnsavedDayCardProps) {
  const lessonLabel = day.lesson_id != null ? getSubLessonLabel(day.lesson_id) : null;
  const unitLabel = day.lesson_unit != null ? (UNIT_LABELS[day.lesson_unit] ?? `Unit ${day.lesson_unit}`) : null;
  const mcqUnitLabel = day.mcq_unit != null ? (UNIT_LABELS[day.mcq_unit] ?? `Unit ${day.mcq_unit}`) : null;
  const p2UnitLabel = day.p2_unit != null ? (UNIT_LABELS[day.p2_unit] ?? `Unit ${day.p2_unit}`) : null;

  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctx) return;
    const handler = () => setCtx(null);
    window.addEventListener("click", handler);
    window.addEventListener("contextmenu", handler);
    return () => { window.removeEventListener("click", handler); window.removeEventListener("contextmenu", handler); };
  }, [ctx]);

  function openCtx(e: React.MouseEvent, field: CtxMenu["field"]) {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, field });
  }

  const dayDone = done.lessonDone && done.mcqDone && done.p2Done;

  // Section config
  const sections: Array<{
    field: CtxMenu["field"];
    label: string;
    icon: React.ReactNode;
    iconBg: string;
    border: string;
    doneColor: string;
    content: React.ReactNode;
  }> = [
    {
      field: "lessonDone",
      label: "Lesson",
      icon: <BookOpen className="w-3.5 h-3.5 text-blue-600" />,
      iconBg: "bg-blue-50 border border-blue-100",
      border: done.lessonDone ? "border-emerald-300" : "border-slate-200",
      doneColor: "bg-emerald-50/50",
      content: day.lesson_id != null && lessonLabel ? (
        <div className="space-y-1.5">
          <p className="text-[17px] text-slate-900 font-semibold leading-snug font-noto-sans-sinhala">📚 {day.lesson_id} — {lessonLabel}</p>
          <div className="flex flex-wrap items-center gap-x-3 text-[14px] text-slate-600 font-medium font-noto-sans-sinhala">
            {unitLabel && <span>{unitLabel}</span>}
            {day.lesson_time_cost != null && (
              <span className="flex items-center gap-1 font-sans text-xs text-slate-500"><Clock className="w-3 h-3 text-blue-600" />{day.lesson_time_cost.toFixed(1)}h</span>
            )}
          </div>
        </div>
      ) : <p className="text-xs text-slate-400">Review / rest day.</p>,
    },
    {
      field: "mcqDone",
      label: "MCQ Practice",
      icon: <ClipboardList className="w-3.5 h-3.5 text-blue-600" />,
      iconBg: "bg-blue-50 border border-blue-100",
      border: done.mcqDone ? "border-emerald-300" : "border-slate-200",
      doneColor: "bg-emerald-50/50",
      content: mcqUnitLabel ? (
        <div className="space-y-1.5">
          <p className="text-[17px] text-slate-900 font-semibold leading-snug font-noto-sans-sinhala">🗂️ {mcqUnitLabel}</p>
          {day.mcq_time_cost != null && (
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 font-sans"><Clock className="w-3 h-3 text-blue-600" />{day.mcq_time_cost.toFixed(1)}h</p>
          )}
        </div>
      ) : <p className="text-xs text-slate-400">No MCQ today.</p>,
    },
    {
      field: "p2Done",
      label: "Part 2",
      icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
      iconBg: "bg-blue-50 border border-blue-100",
      border: done.p2Done ? "border-emerald-300" : "border-slate-200",
      doneColor: "bg-emerald-50/50",
      content: p2UnitLabel ? (
        <div className="space-y-1.5">
          <p className="text-[17px] text-slate-900 font-semibold leading-snug font-noto-sans-sinhala">📝 {p2UnitLabel}</p>
          {day.p2_time_cost != null && (
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1 font-sans"><Clock className="w-3 h-3 text-blue-600" />{day.p2_time_cost.toFixed(1)}h</p>
          )}
        </div>
      ) : <p className="text-xs text-slate-400">No Part 2 today.</p>,
    },
  ];

  return (
    <div ref={cardRef} className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${dayDone ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}>
      {/* Day header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b transition-colors ${dayDone ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50/70"}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${dayDone ? "bg-emerald-100 border-emerald-300" : "bg-blue-50 border-blue-200"}`}>
          {dayDone
            ? <Trophy className="w-4 h-4 text-emerald-600" />
            : <span className="text-xs font-bold text-blue-600">{day.day}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${dayDone ? "text-emerald-700" : "text-slate-900"}`}>Day {day.day}</span>
            {dayDone && <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-bold">Complete!</span>}
          </div>
          {day.lesson_id != null && lessonLabel ? (
            <p className="text-[17px] text-slate-700 truncate mt-0.5 font-medium font-noto-sans-sinhala leading-snug">Lesson {day.lesson_id} · {lessonLabel}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">Free / Review Day</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {sections.map(s => (
            <div key={s.field} className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${done[s.field] ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-slate-400"}`}>
              {done[s.field] ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : s.icon}
            </div>
          ))}
        </div>
        {day.total_day_time > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium shrink-0">
            <Clock className="w-3.5 h-3.5 text-blue-600" />{day.total_day_time.toFixed(1)}h
          </div>
        )}
      </div>

      {/* Section cards */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white">
        {sections.map(s => (
          <div
            key={s.field}
            onContextMenu={(e) => openCtx(e, s.field)}
            title="Right-click to mark done / undone"
            className={`rounded-xl border p-3 cursor-context-menu select-none transition-all duration-200 ${s.border} ${done[s.field] ? s.doneColor : "bg-slate-50/60 hover:bg-slate-50 hover:border-blue-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>{s.icon}</div>
              <span className="text-xs font-semibold text-slate-900">{s.label}</span>
              {done[s.field] && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
            </div>
            {done[s.field]
              ? <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">✓ Done</p>
              : s.content
            }
          </div>
        ))}
      </div>

      {/* Right-click context menu */}
      {ctx && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-40 text-sm overflow-hidden"
          style={{ top: ctx.y, left: ctx.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
            {ctx.field === "lessonDone" ? "Lesson" : ctx.field === "mcqDone" ? "MCQ" : "Part 2"}
          </div>
          <button
            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center gap-2 text-slate-800 text-xs font-medium"
            onClick={() => { onToggle(ctx.field); setCtx(null); }}
          >
            {done[ctx.field]
              ? <><span className="text-slate-400">↩</span> <span className="text-slate-700">Mark as Undone</span></>
              : <><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> <span className="text-blue-700 font-semibold">Mark as Done</span></>
            }
          </button>
        </div>
      )}
    </div>
  );
}

function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(()=>({}));
  g.setGraph({ rankdir:"TB", nodesep:70, ranksep:110, marginx:40, marginy:40 });
  nodes.forEach(n=>{
    if (n.type==="unitNode") { g.setNode(n.id,{width:200,height:90}); }
    else {
      const d = n.data as LessonNodeData;
      const hasDetail = d.inPlan && (d.mcqUnit != null || d.p2Unit != null);
      g.setNode(n.id,{width: hasDetail?310:180, height: hasDetail?110:80});
    }
  });
  edges.forEach(e=>g.setEdge(e.source,e.target));
  dagre.layout(g);
  return nodes.map(n=>{
    const pos=g.node(n.id);
    let halfW: number;
    if (n.type==="unitNode") halfW=100;
    else { const d=n.data as LessonNodeData; halfW=d.inPlan&&(d.mcqUnit!=null||d.p2Unit!=null)?155:90; }
    return {...n,position:{x:pos.x-halfW,y:pos.y-45}};
  });
}

interface Props { plan: PlanResult; planInput: PlanInput; onBack: () => void; }
type Tab = "path" | "daily";

export function GeneratedPlanFlowchart({ plan, planInput, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const [saving, setSaving] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [saved, setSaved] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string|null>(plan.plan_id ?? null);
  const [saveError, setSaveError] = useState<string|null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonNodeData|null>(null);
  const [progress, setProgress] = useState<DayProgressRecord[]>([]);

  // Local (unsaved) progress tracking
  type LocalDayDone = { lessonDone: boolean; mcqDone: boolean; p2Done: boolean };
  const [localProgress, setLocalProgress] = useState<Record<number, LocalDayDone>>({});

  function toggleLocal(dayNum: number, field: keyof LocalDayDone) {
    setLocalProgress(prev => {
      const cur = prev[dayNum] ?? { lessonDone: false, mcqDone: false, p2Done: false };
      return { ...prev, [dayNum]: { ...cur, [field]: !cur[field] } };
    });
  }

  const localDoneSections = useMemo(() => {
    const total = plan.daily_plan.length * 3;
    const done = Object.values(localProgress).reduce((s, d) => s + (d.lessonDone?1:0) + (d.mcqDone?1:0) + (d.p2Done?1:0), 0);
    const daysComplete = plan.daily_plan.filter(d => {
      const p = localProgress[d.day];
      return p?.lessonDone && p.mcqDone && p.p2Done;
    }).length;
    return { total, done, pct: total > 0 ? Math.round((done/total)*100) : 0, daysComplete };
  }, [localProgress, plan.daily_plan]);

  useEffect(()=>{
    if(savedPlanId){ getPlanProgress(savedPlanId).then(setProgress).catch(()=>{}); }
  },[savedPlanId]);

  const planLessonIdsSet = useMemo(()=>new Set(plan.lessons_in_plan.map(l=>l.id)),[plan.lessons_in_plan]);
  const planOrderMap = useMemo(()=>{ const m=new Map<number,number>(); plan.lessons_in_plan.forEach((l,i)=>m.set(l.id,i+1)); return m; },[plan.lessons_in_plan]);
  const skippedSet = useMemo(()=>new Set(planInput.skipped_lesson_ids),[planInput.skipped_lesson_ids]);

  const { initialNodes, initialEdges } = useMemo(()=>{
    const nodes: Node[] = []; const edges: Edge[] = [];
    const byUnit = groupByUnit(ALL_LESSONS_DATA);
    // Build lesson_id → DayPlan map for MCQ/P2 lookup
    const lessonDayMap = new Map<number, import("@/app/actions/study-plan-actions").DayPlan>();
    for (const day of plan.daily_plan) {
      if (day.lesson_id != null) lessonDayMap.set(day.lesson_id, day);
    }
    let colIdx=0;
    byUnit.forEach((allLessons,unit)=>{
      // Filter to only show lessons that are connected in the plan
      const lessons = allLessons.filter(l => planLessonIdsSet.has(l.id));
      if (lessons.length === 0) return;

      const unitId=`unit-${unit}`;
      const inPlanCount=lessons.length;
      const totalTimeCost=allLessons.reduce((s,l)=>s+l.total_time_cost,0);
      const mcqWt=allLessons[0]?.mcq_wt??0;
      
      nodes.push({ id:unitId, type:"unitNode", position:{x:colIdx*260,y:0},
        data:{ type:"unit", unit, label:UNIT_LABELS[unit]??`Unit ${unit}`, totalLessons:allLessons.length, inPlanCount, totalTimeCost, mcqWt } as UnitNodeData });
        
      lessons.forEach((l,li)=>{
        const lessonId=`lesson-${l.id}`;
        const inPlan=true;
        const skipped=skippedSet.has(l.id);
        const dayEntry = lessonDayMap.get(l.id);

        nodes.push({ id:lessonId, type:"lessonNode", position:{x:colIdx*260,y:120+li*110},
          data:{ type:"lesson", lessonId:l.id, unit:l.unit, label:getSubLessonLabel(l.id), estTime:l.est_time, syllabusP:l.syllabus_p, mcqWt:l.mcq_wt, order:planOrderMap.get(l.id)??0, inPlan, skipped,
            dayNum: dayEntry?.day ?? null,
            mcqUnit: dayEntry?.mcq_unit ?? null,
            mcqTimeCost: dayEntry?.mcq_time_cost ?? null,
            p2Unit: dayEntry?.p2_unit ?? null,
            p2TimeCost: dayEntry?.p2_time_cost ?? null,
          } as LessonNodeData });

        edges.push({ id:`${unitId}-${lessonId}`, source:unitId, target:lessonId,
          style:{ stroke:"#2563eb", strokeWidth:2, opacity:1 },
          markerEnd:{type:MarkerType.ArrowClosed,color:"#2563eb"} });
      });
      colIdx++;
    });
    const orderedById=[...plan.lessons_in_plan];
    for(let i=0;i<orderedById.length-1;i++){
      const src=`lesson-${orderedById[i].id}`; const tgt=`lesson-${orderedById[i+1].id}`;
      edges.push({ id:`path-${src}-${tgt}`, source:src, target:tgt, animated:true,
        style:{stroke:"#3b82f6",strokeWidth:2.5,strokeDasharray:"6 3"},
        label:`${i+1}->${i+2}`, labelStyle:{fill:"#2563eb",fontSize:10,fontWeight:"bold"},
        labelBgStyle:{fill:"#ffffff",fillOpacity:0.95,stroke:"#bfdbfe",strokeWidth:1} as React.CSSProperties,
        labelBgPadding:[4,2] as [number,number], labelBgBorderRadius:4,
        markerEnd:{type:MarkerType.ArrowClosed,color:"#3b82f6"} });
    }
    const laid=layoutGraph(nodes,edges);
    return { initialNodes:laid, initialEdges:edges };
  },[plan,planLessonIdsSet,planOrderMap,skippedSet]);

  const [nodes,,onNodesChange]=useNodesState(initialNodes);
  const [edges,,onEdgesChange]=useEdgesState(initialEdges);
  const onNodeClick=useCallback((_:React.MouseEvent,node:Node)=>{ if(node.type==="lessonNode") setSelectedLesson(node.data as LessonNodeData); else setSelectedLesson(null); },[]);

  const handleSave=async()=>{
    setSaving(true); setSaveError(null);
    try{
      const result=await saveStudyPlan(planInput);
      setSavedPlanId(result.plan_id); setSaved(true);
      try {
        localStorage.setItem("teso_cached_plan", JSON.stringify({ plan: { ...plan, plan_id: result.plan_id }, input: planInput }));
      } catch {
        // ignore
      }
      getPlanProgress(result.plan_id).then(setProgress).catch(()=>{});
    } catch(e:unknown){ setSaveError(e instanceof Error?e.message:"Failed to save"); }
    finally{ setSaving(false); }
  };

  const completedDays=progress.filter(p=>p.dayCompleted).length;
  const totalDays=plan.daily_plan.length;

  return (
    <div className="w-full h-full flex flex-col bg-white text-slate-900 animate-fade-in-up">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shrink-0 border border-slate-200">
          <ChevronLeft className="w-4 h-4 text-slate-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight text-slate-900">Generated Study Plan</h1>
          <p className="text-xs text-slate-500 font-medium">{plan.months}mo · {plan.hours_per_day}h/day · {plan.off_days} off day{plan.off_days!==1?"s":""}/wk</p>
        </div>
        <div className="hidden md:flex items-center gap-6 mr-2">
          <Stat icon={<Clock className="w-4 h-4 text-blue-600"/>} value={`${plan.total_days}`} label="Days"/>
          <Stat icon={<BookOpen className="w-4 h-4 text-blue-600"/>} value={`${plan.lessons_in_plan.length}`} label="Lessons"/>
          <Stat icon={<TrendingUp className="w-4 h-4 text-blue-600"/>} value={`${plan.total_hours.toFixed(0)}h`} label="Hours"/>
          {savedPlanId&&<Stat icon={<Trophy className="w-4 h-4 text-amber-500"/>} value={`${completedDays}/${totalDays}`} label="Done"/>}
        </div>
        <button onClick={handleSave} disabled={saving||saved}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
            saved
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          }`}>
          {saved?(<><CheckCircle2 className="w-4 h-4 text-emerald-600"/>Saved</>):saving?(<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</>):(<><Save className="w-4 h-4"/>Save Plan</>)}
        </button>
      </div>
      {saveError&&<div className="shrink-0 bg-red-50 border-b border-red-200 px-5 py-2 text-sm text-red-600 font-medium">{saveError}</div>}
      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 flex items-center gap-1">
        <TabButton active={activeTab==="daily"} onClick={()=>setActiveTab("daily")} icon={<CalendarDays className="w-4 h-4 text-blue-600"/>} label="Daily Plan" badge={savedPlanId?`${completedDays}/${totalDays}`:undefined}/>
        <TabButton active={activeTab==="path"} onClick={()=>setActiveTab("path")} icon={<MapIcon className="w-4 h-4 text-blue-600"/>} label="Path Map"/>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab==="daily"&&(
          savedPlanId?(
            <DailyPlanView days={plan.daily_plan} planId={savedPlanId} userId={planInput.user_id} initialProgress={progress}/>
          ):(
            <div className="h-full flex flex-col overflow-hidden bg-white">
              {/* Save banner */}
              <div className="shrink-0 bg-blue-50/70 border-b border-blue-100 px-5 py-3 flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-900 font-medium flex-1">
                  Save your plan to persist progress. Right-click any section card to mark it done.
                </p>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors shrink-0">
                  {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-3 h-3"/>}
                  {saving ? "Saving…" : "Save Plan"}
                </button>
              </div>
              {/* Progress tracker */}
              <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Overall Progress</span>
                    <span className="text-sm font-bold text-slate-900">{localDoneSections.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 border border-slate-200/60 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500"
                      style={{ width: `${localDoneSections.pct}%` }}/>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500"/>
                    <span><strong className="text-slate-900">{localDoneSections.daysComplete}</strong> / {plan.daily_plan.length} days</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600"/>
                    <span><strong className="text-slate-900">{localDoneSections.done}</strong> / {localDoneSections.total} tasks</span>
                  </div>
                </div>
              </div>
              {/* Day preview */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/40">
                {plan.daily_plan.map((day) => {
                  const done = localProgress[day.day] ?? { lessonDone: false, mcqDone: false, p2Done: false };
                  return (
                    <UnsavedDayCard
                      key={day.day}
                      day={day}
                      done={done}
                      onToggle={(field) => toggleLocal(day.day, field)}
                    />
                  );
                })}
              </div>
            </div>
          )
        )}
        {activeTab==="path"&&(
          <div className="relative h-full flex flex-col bg-white">
            <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 font-medium">
              <LegendItem color="#2563eb" label="In your plan (path order)" dashed/>
              <LegendItem color="#10b981" label="Skipped (already mastered)"/>
              <LegendItem color="#cbd5e1" label="Not in plan" dim/>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block"/>MCQ practice</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block"/>Part 2 paper</span>
              <span className="text-slate-400">Click a lesson node to see details</span>
            </div>
            <div className="flex-1 relative overflow-hidden bg-slate-50/30">
              <ReactFlowProvider>
                <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes} fitView fitViewOptions={{padding:0.15}} minZoom={0.15} maxZoom={2} className="bg-slate-50/20">
                  <Background color="#cbd5e1" gap={24}/>
                  <Controls className="!bg-white !border-slate-200 !shadow-sm [&_button]:!bg-white [&_button]:!border-slate-200 [&_button]:!text-slate-700 [&_button:hover]:!bg-blue-50 [&_button:hover]:!text-blue-600" />
                  <MiniMap className="!bg-white !border !border-slate-200 !shadow-sm"
                    nodeColor={(n)=>{ if(n.type==="unitNode") return "#2563eb"; const d=n.data as LessonNodeData; if(d.inPlan) return "#3b82f6"; if(d.skipped) return "#10b981"; return "#e2e8f0"; }}
                    maskColor="rgba(248,250,252,0.75)"/>
                </ReactFlow>
              </ReactFlowProvider>
              {selectedLesson&&(
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200 rounded-xl shadow-xl px-5 py-4 flex gap-6 items-start min-w-[340px] max-w-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button onClick={()=>setSelectedLesson(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors text-xs font-bold">✕</button>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {selectedLesson.inPlan?<span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-bold">Plan Order #{selectedLesson.order}</span>:selectedLesson.skipped?<span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 font-bold">SKIPPED</span>:<span className="text-[10px] bg-slate-100 text-slate-500 rounded px-2 py-0.5 font-medium">NOT IN PLAN</span>}
                      <span className="text-xs text-slate-500 font-medium">Unit {selectedLesson.unit}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{selectedLesson.label}</p>
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <MiniStat icon={<Clock className="w-3.5 h-3.5 text-blue-600"/>} label="Study Time" value={`${selectedLesson.estTime}h`}/>
                      <MiniStat icon={<Target className="w-3.5 h-3.5 text-blue-600"/>} label="Syllabus %" value={`${selectedLesson.syllabusP}%`}/>
                      <MiniStat icon={<Zap className="w-3.5 h-3.5 text-blue-600"/>} label="MCQ Weight" value={`${selectedLesson.mcqWt}%`}/>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 bg-white border-t border-slate-200 px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 font-medium">
              <span><span className="text-blue-600 font-bold">{plan.lessons_in_plan.length}</span> lessons in plan</span>
              <span><span className="text-emerald-600 font-bold">{planInput.skipped_lesson_ids.length}</span> skipped</span>
              <span><span className="text-blue-600 font-bold">{plan.total_hours.toFixed(1)}h</span> total</span>
              <span>Avg <span className="text-slate-900 font-bold">{(plan.total_hours/plan.total_days).toFixed(1)}h</span>/day</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active:boolean; onClick:()=>void; icon:React.ReactNode; label:string; badge?:string; }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${active?"border-blue-600 text-blue-600":"border-transparent text-slate-500 hover:text-slate-900"}`}>
      {icon}{label}
      {badge&&<span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-1.5 py-0.5 font-bold">{badge}</span>}
    </button>
  );
}

function Stat({ icon, value, label }: { icon:React.ReactNode; value:string; label:string }) {
  return (
    <div className="flex items-center gap-2">{icon}
      <div><div className="text-sm font-bold leading-none text-slate-900">{value}</div><div className="text-[10px] text-slate-500 font-medium">{label}</div></div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon:React.ReactNode; label:string; value:string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-medium">{icon} {label}</div>
      <div className="text-slate-900 text-xs font-bold">{value}</div>
    </div>
  );
}

function LegendItem({ color, label, dashed, dim }: { color:string; label:string; dashed?:boolean; dim?:boolean }) {
  return (
    <div className="flex items-center gap-1.5" style={{opacity:dim?0.5:1}}>
      <div className="w-5 h-0.5 rounded-full" style={{ background:color, backgroundImage:dashed?`repeating-linear-gradient(90deg,${color} 0,${color} 4px,transparent 4px,transparent 7px)`:undefined }}/>
      <span>{label}</span>
    </div>
  );
}
