"use client";

import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Check, X, Minus, BookOpen, Calendar, Map as MapIcon, RotateCcw, ArrowLeft, FolderOpen } from 'lucide-react';
import { YearsTable } from './YearsTable';
import { FlowChart } from './FlowChart';
import { HorizontalStudyPlan } from './HorizontalStudyPlan';
import { StudyPlan } from './StudyPlan';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlanInputDialog } from '@/components/focus/PlanInputDialog';
import { LoadPlanDialog } from '@/components/focus/LoadPlanDialog';
import { GeneratedPlanFlowchart } from './GeneratedPlanFlowchart';
import type { PlanResult, PlanInput } from '@/app/actions/study-plan-actions';

// Define status types
type TopicStatus = 'not-started' | 'covered' | 'understand' | 'cant-understand';

interface TopicData {
  id: string;
  label: string;
  weight: number;
  status: TopicStatus;
  isSubTopic?: boolean;
  parentId?: string;
}

interface PlanDay {
  day: number;
  lessons: Array<{ 
    id: string; 
    label: string; 
    status: string;
  }>;
  mcqUnit: string;
  unitPart: string;
}

// Auto-layout function manually handled below
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const lessonNodes = nodes.filter(n => !n.data.isSubTopic);
  const subTopicNodes = nodes.filter(n => n.data.isSubTopic);

  let currentY = 50;
  const LESSON_X = 50;
  const SUBTOPIC_START_X = 400;
  const GRID_COLS = 3; // Number of columns in subtopic grid
  
  const NODE_WIDTH = 200; // Expected node width
  const NODE_HEIGHT = 80; // Expected node height
  const GAP_X = 80;
  const GAP_Y = 60; // Vertical gap between grid rows

  // Group subtopics by parent
  const subTopicsByParent: Record<string, Node[]> = {};
  subTopicNodes.forEach(node => {
    const parentId = node.data.parentId;
    if (parentId) {
      if (!subTopicsByParent[parentId]) subTopicsByParent[parentId] = [];
      subTopicsByParent[parentId].push(node);
    }
  });

  // Calculate positions
  lessonNodes.forEach(lesson => {
    const subs = subTopicsByParent[lesson.id] || [];
    const rows = Math.ceil(subs.length / GRID_COLS);
    
    // Grid block height
    const gridHeight = rows > 0 
      ? rows * NODE_HEIGHT + (rows - 1) * GAP_Y
      : NODE_HEIGHT;
      
    // Center lesson vertically relative to its subtopics
    // If no subtopics, just use currentY
    const lessonY = currentY + (gridHeight - NODE_HEIGHT) / 2;
    
    lesson.position = {
      x: LESSON_X,
      y: lessonY
    };

    // Position subtopics in grid
    subs.forEach((sub, index) => {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      
      sub.position = {
        x: SUBTOPIC_START_X + col * (NODE_WIDTH + GAP_X),
        y: currentY + row * (NODE_HEIGHT + GAP_Y)
      };
    });

    // Advance Y cursor for next lesson block (plus some spacing between lessons)
    currentY += gridHeight + 100; // Extra spacing between lessons
  });

  return { nodes, edges };
};

// Updated syllabus data mapped from CSV
export const initialSyllabusData = [
  {
    id: 'lesson-1',
    label: 'පරමාණුක ව්‍යුහය',
    weight: 5.84,
    subTopics: [
      { id: 'sub-1-1', label: 'කැතෝඩ කිරණ', weight: 1.03 },
      { id: 'sub-1-2', label: 'රදර්ෆර්ඩ් ආකෘතිය', weight: 1.03 },
      { id: 'sub-1-3', label: 'පරමාණුක/ස්කන්ධ ක්‍රමාංක', weight: 1.03 },
      { id: 'sub-1-4', label: 'සමස්ථානික', weight: 1.03 },
      { id: 'sub-1-5', label: 'විද්‍යුත් චුම්බක විකිරණ (E=hν)', weight: 0.91 },
      { id: 'sub-1-6', label: 'වර්ණාවලිය', weight: 0.91 },
      { id: 'sub-1-7', label: 'ඩි බ්‍රෝග්ලි සමීකරණය', weight: 0.91 },
      { id: 'sub-1-8', label: 'අයනීකරණ ශක්තිය', weight: 2.06 },
      { id: 'sub-1-9', label: 'බෝර් ආකෘතිය', weight: 2.06 },
      { id: 'sub-1-10', label: 'ක්වොන්ටම් අංක (n, l, ml, ms)', weight: 2.06 },
      { id: 'sub-1-11', label: 'ඉලෙක්ට්‍රෝන වින්‍යාසය (1s²...)', weight: 2.06 },
      { id: 'sub-1-12', label: 'හුන්ඩ්/පව්ලි/අවුෆ්බා නීති', weight: 2.06 },
      { id: 'sub-1-13', label: 'ආවර්තිතා වගුව', weight: 3.43 },
      { id: 'sub-1-14', label: 'ආවර්තීය ගුණ (අරය, අයනීකරණ ශක්තිය, විද්‍යුත් සෘණතාව)', weight: 3.43 },
    ],
  },
  {
    id: 'lesson-2',
    label: 'ව්‍යුහය හා බන්ධන',
    weight: 5.84,
    subTopics: [
      { id: 'sub-2-1', label: 'රසායනික බන්ධන', weight: 2.06 },
      { id: 'sub-2-2', label: 'ලුවිස් ව්‍යුහ', weight: 2.06 },
      { id: 'sub-2-3', label: 'විද්‍යුත් සෘණතාව', weight: 2.06 },
      { id: 'sub-2-4', label: 'අයනික දැලිස්', weight: 2.06 },
      { id: 'sub-2-5', label: 'VSEPR වාදය', weight: 2.74 },
      { id: 'sub-2-6', label: 'අණුවල හැඩ', weight: 2.74 },
      { id: 'sub-2-7', label: 'මුහුම්කරණය (sp, sp², sp³)', weight: 2.74 },
      { id: 'sub-2-8', label: 'σ/π බන්ධන', weight: 2.74 },
      { id: 'sub-2-9', label: 'ද්විතීයික අන්තර්ක්‍රියා (H-bonds, Van der Waals)', weight: 2.74 },
      { id: 'sub-2-10', label: 'ද්‍රවාංක/තාපාංක', weight: 2.06 },
    ],
  },
  {
    id: 'lesson-3',
    label: 'රසායනික ගණනය',
    weight: 6.17,
    subTopics: [
      { id: 'sub-3-1', label: 'මවුලික ස්කන්ධය', weight: 6.99 },
      { id: 'sub-3-2', label: 'සාන්ද්‍රණය (ppm, ppb)', weight: 6.99 },
      { id: 'sub-3-3', label: 'සංයුතිය ගණනය', weight: 4.0 },
      { id: 'sub-3-4', label: 'රසායනික සමීකරණ තුලනය (ඔක්සිකරණ අංක/අයන-ඉලෙක්ට්‍රෝන)', weight: 4.66 },
      { id: 'sub-3-5', label: 'ස්ටොයිකියෝමිතිය (අම්ල-භස්ම, රෙඩොක්ස්, අවක්ෂේපණ)', weight: 2.33 },
    ],
  },
  {
    id: 'lesson-4',
    label: 'පදාර්ථයේ වායු අවස්ථාව',
    weight: 5.33,
    subTopics: [
      { id: 'sub-4-1', label: 'පරිපූර්ණ වායු සමීකරණය (PV=nRT)', weight: 2.75 },
      { id: 'sub-4-2', label: 'වායු නියම', weight: 2.75 },
      { id: 'sub-4-3', label: 'අණුක චාලක වාදය', weight: 2.75 },
      { id: 'sub-4-4', label: 'මැක්ස්වෙල් බොල්ට්ස්මාන් ව්‍යාප්තිය', weight: 2.75 },
      { id: 'sub-4-5', label: 'ඩෝල්ටන්ගේ ආංශික පීඩන නියමය', weight: 2.75 },
      { id: 'sub-4-6', label: 'තාත්වික වායු', weight: 2.75 },
      { id: 'sub-4-7', label: 'වැන්ඩවාල්ස් සමීකරණය', weight: 2.75 },
      { id: 'sub-4-8', label: 'සම්පීඩ්‍යතා සාධකය', weight: 2.75 },
    ],
  },
  {
    id: 'lesson-5',
    label: 'ශක්ති විද්‍යාව',
    weight: 6.82,
    subTopics: [
      { id: 'sub-5-1', label: 'එන්තැල්පිය', weight: 3.11 },
      { id: 'sub-5-2', label: 'හෙස් නියමය', weight: 3.11 },
      { id: 'sub-5-3', label: 'සම්මත එන්තැල්පි (Born-Haber included)', weight: 3.11 },
      { id: 'sub-5-4', label: 'එන්ට්‍රොපිය', weight: 3.11 },
      { id: 'sub-5-5', label: 'ගිබ්ස් ශක්තිය', weight: 3.11 },
    ],
  },
  {
    id: 'lesson-6',
    label: 's, p හා d මූලද්‍රව්‍ය රසායනය',
    weight: 10.66,
    subTopics: [
      { id: 'sub-6-1', label: 's හා p ගොනු (Trends, Reactions, Solubility, Thermal stability)', weight: 25.0 },
      { id: 'sub-6-2', label: 'd ගොනුවේ මූලද්‍රව්‍ය (Colors, Variable Oxidation States)', weight: 9.62 },
      { id: 'sub-6-3', label: 'සංකීර්ණ සංයෝග (Coordination Chemistry)', weight: 0.48 },
      { id: 'sub-6-4', label: 'කැටායන හඳුනාගැනීම', weight: 0.48 },
    ],
  },
  {
    id: 'lesson-7',
    label: 'කාබනික මූලික සංකල්ප',
    weight: 2.8,
    subTopics: [
      { id: 'sub-7-1', label: 'IUPAC', weight: 0.85 },
      { id: 'sub-7-2', label: 'සමාවයවිකතාව', weight: 0.85 },
      { id: 'sub-7-3', label: 'යාන්ත්‍රණ මූලධර්ම', weight: 0.85 },
    ],
  },
  {
    id: 'lesson-8',
    label: 'හයිඩ්‍රොකාබන',
    weight: 7.7,
    subTopics: [
      { id: 'sub-8-1', label: 'හයිඩ්‍රොකාබන (Alkanes, Alkenes, Alkynes, Benzene, RX, Grignard)', weight: 2.46 },
    ],
  },
  {
    id: 'lesson-9',
    label: 'ඔක්සිජන් අඩංගු කාබනික සංයෝග',
    weight: 7.7,
    subTopics: [
      { id: 'sub-9-1', label: 'ඇල්කොහොල', weight: 2.46 },
      { id: 'sub-9-2', label: 'ෆීනෝල', weight: 2.46 },
      { id: 'sub-9-3', label: 'කාබොනයිල්', weight: 2.46 },
      { id: 'sub-9-4', label: 'අම්ල/ව්‍යුත්පන්න', weight: 2.46 },
    ],
  },
  {
    id: 'lesson-10',
    label: 'නයිට්‍රජන් අඩංගු කාබනික සංයෝග',
    weight: 2.3,
    subTopics: [
      { id: 'sub-10-1', label: 'ඇමයින', weight: 0.69 },
      { id: 'sub-10-2', label: 'ඇනිලින්', weight: 0.69 },
      { id: 'sub-10-3', label: 'ඩයසෝනියම් ලවණ', weight: 0.69 },
    ],
  },
  {
    id: 'lesson-11',
    label: 'චාලක රසායනය',
    weight: 6.84,
    subTopics: [
      { id: 'sub-11-1', label: 'ශීඝ්‍රතා නියමය', weight: 9.56 },
      { id: 'sub-11-2', label: 'අර්ධ ජීව කාලය', weight: 2.96 },
      { id: 'sub-11-3', label: 'අණුක චාලක වාදය', weight: 2.96 },
      { id: 'sub-11-4', label: 'යාන්ත්‍රණ', weight: 2.96 },
      { id: 'sub-11-5', label: 'ශක්ති සටහන්', weight: 2.96 },
    ],
  },
  {
    id: 'lesson-12',
    label: 'සමතුලිතතාව',
    weight: 15.67,
    subTopics: [
      { id: 'sub-12-1', label: 'සමතුලිතතා නියම', weight: 1.94 },
      { id: 'sub-12-2', label: 'අම්ල-භස්ම', weight: 2.94 },
      { id: 'sub-12-3', label: 'අනුමාපන', weight: 2.94 },
      { id: 'sub-12-4', label: 'ද්‍රාව්‍යතා ගුණිතය', weight: 2.09 },
      { id: 'sub-12-5', label: 'පොදු අයන ආචරණය', weight: 2.09 },
      { id: 'sub-12-6', label: 'කලාප', weight: 3.67 },
      { id: 'sub-12-7', label: 'ද්‍රව-ද්‍රව', weight: 5.67 },
      { id: 'sub-12-8', label: 'ව්‍යාප්ති සංගුණකය', weight: 5.67 },
    ],
  },
  {
    id: 'lesson-13',
    label: 'විද්‍යුත් රසායනය',
    weight: 9.33,
    subTopics: [
      { id: 'sub-13-1', label: 'සන්නායකතාව', weight: 4.61 },
      { id: 'sub-13-2', label: 'ඉලෙක්ට්‍රෝඩ විභව', weight: 12.18 },
      { id: 'sub-13-3', label: 'විද්‍යුත් විච්ඡේදනය', weight: 9.21 },
    ],
  },
  {
    id: 'lesson-14',
    label: 'කර්මාන්ත හා පරිසර',
    weight: 10.83,
    subTopics: [
      { id: 'sub-14-1', label: 'අකාබනික කර්මාන්ත (NaOH, NH₃, H₂SO₄, Fe, TiO₂)', weight: 10.57 },
      { id: 'sub-14-2', label: 'කාබනික කර්මාන්ත (Polymers, Soap, Essential Oils)', weight: 10.54 },
      { id: 'sub-14-3', label: 'පරිසර දූෂණය', weight: 14.89 },
    ],
  },
];

interface SyllabusFlowchartProps {
  userId: string;
  initialView?: 'flowchart' | 'past-papers' | 'generate-plan';
  onBackToSubjects?: () => void;
}

export default function SyllabusFlowchart({ userId, initialView = 'flowchart', onBackToSubjects }: SyllabusFlowchartProps) {
  const [topicStatuses, setTopicStatuses] = useState<Record<string, TopicStatus>>({});
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [isTableOpen, setIsTableOpen] = useState(initialView === 'past-papers');
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [showDetailedPlan, setShowDetailedPlan] = useState(false);
  const [focusedLessons, setFocusedLessons] = useState<string[]>([]);
  const [backendPlan, setBackendPlan] = useState<PlanResult | null>(null);
  const [backendPlanInput, setBackendPlanInput] = useState<PlanInput | null>(null);
  const [showBackendPlan, setShowBackendPlan] = useState(false);

  // Derive skipped lesson ids from "understand" topics mapped to numeric IDs
  // (lessons the user already knows — feed to algorithm as puluwn)
  const skippedLessonIds = useMemo<number[]>(() => {
    const ids: number[] = [];
    Object.entries(topicStatuses).forEach(([id, status]) => {
      if (status === 'understand') {
        // sub-topic ids look like "sub-1-1" → lesson id 1.1
        const subMatch = id.match(/^sub-(\d+)-(\d+)$/);
        if (subMatch) {
          ids.push(parseFloat(`${subMatch[1]}.${subMatch[2]}`));
        }
      }
    });
    return ids;
  }, [topicStatuses]);

  // Generate study plan order
  const studyPlanOrder = useMemo(() => {
    if (!showStudyPlan) return [];

    const allTopics = initialSyllabusData.flatMap((lesson) => [
      { id: lesson.id, label: lesson.label, weight: lesson.weight },
      ...lesson.subTopics.map((sub) => ({ id: sub.id, label: sub.label, weight: sub.weight })),
    ]);

    // Categorize topics based on priority
    const needHelp = allTopics.filter((t) => topicStatuses[t.id] === 'cant-understand');
    const needReview = allTopics.filter((t) => topicStatuses[t.id] === 'covered');
    const notStarted = allTopics.filter(
      (t) => !topicStatuses[t.id] || topicStatuses[t.id] === 'not-started'
    );

    // Order: Can't Understand → Not Started → Covered
    return [...needHelp, ...notStarted, ...needReview].map(t => t.id);
  }, [topicStatuses, showStudyPlan]);

  // Generate detailed study plan
  const detailedPlan = useMemo((): PlanDay[] => {
    if (!showStudyPlan || studyPlanOrder.length === 0) return [];

    type TopicItem = {
      id: string;
      label: string;
      weight: number;
      isLesson: boolean;
      subTopics?: { id: string; label: string; weight: number }[];
      parentId?: string;
    };

    const allTopicsMap = new Map<string, TopicItem>();

    initialSyllabusData.forEach(lesson => {
      allTopicsMap.set(lesson.id, { ...lesson, isLesson: true });
      lesson.subTopics.forEach(sub => {
        allTopicsMap.set(sub.id, { ...sub, isLesson: false, parentId: lesson.id });
      });
    });

    const plan: PlanDay[] = [];
    let currentDay = 1;
    let topicsInDay: Array<{ id: string; label: string; status: string }> = [];
    
    // Group topics into days (2-3 topics per day)
    studyPlanOrder.forEach((topicId, index) => {
      const topic = allTopicsMap.get(topicId);
      if (!topic) return;

      topicsInDay.push({ 
        id: topicId, 
        label: topic.label, 
        status: topicStatuses[topicId] || 'not-started' 
      });

      // Create a day plan when we have 2-3 topics or reached the end
      if (topicsInDay.length >= 3 || index === studyPlanOrder.length - 1) {
        const lessonIds = topicsInDay.map(t => {
          const topic = allTopicsMap.get(t.id);
          return topic?.isLesson ? t.id : (topic?.parentId ? allTopicsMap.get(topic.parentId)?.id : '') || '';
        }).filter((id, idx, arr) => id && arr.indexOf(id) === idx);

        const mainLesson = lessonIds[0] ? allTopicsMap.get(lessonIds[0]) : null;
        
        plan.push({
          day: currentDay,
          lessons: topicsInDay,
          mcqUnit: mainLesson ? `Unit ${currentDay}: ${mainLesson.label}` : `Unit ${currentDay}`,
          unitPart: `Part ${currentDay} - Practice Exercises`,
        });

        currentDay++;
        topicsInDay = [];
      }
    });

    return plan;
  }, [showStudyPlan, studyPlanOrder, topicStatuses]);

  // Generate initial nodes and edges
  const generateNodesAndEdges = useCallback(() => {
    const nodes: Node<TopicData>[] = [];
    const edges: Edge[] = [];
    let yOffset = 0;

    initialSyllabusData.forEach((lesson, lessonIndex) => {
      const xOffset = lessonIndex * 250;

      // Add main lesson node
      const isInPlan = studyPlanOrder.includes(lesson.id);
      nodes.push({
        id: lesson.id,
        type: 'topic',
        position: { x: xOffset, y: yOffset },
        data: {
          id: lesson.id,
          label: lesson.label,
          weight: lesson.weight,
          status: topicStatuses[lesson.id] || 'not-started',
          isSubTopic: false,
        },
        style: isInPlan ? {
          boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
          borderColor: '#a855f7',
        } : undefined,
      });

      // Add sub-topic nodes
      lesson.subTopics.forEach((subTopic, subIndex) => {
        const subYOffset = yOffset + 120 + subIndex * 100;
        const isSubInPlan = studyPlanOrder.includes(subTopic.id);
        nodes.push({
          id: subTopic.id,
          type: 'topic',
          position: { x: xOffset, y: subYOffset },
          data: {
            id: subTopic.id,
            label: subTopic.label,
            weight: subTopic.weight,
            status: topicStatuses[subTopic.id] || 'not-started',
            isSubTopic: true,
            parentId: lesson.id,
          },
          style: isSubInPlan ? {
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
            borderColor: '#a855f7',
          } : undefined,
        });

        // Add edge from lesson to sub-topic
        edges.push({
          id: `${lesson.id}-${subTopic.id}`,
          source: lesson.id,
          target: subTopic.id,
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 },
        });
      });
    });

    // Add plan path edges connecting topics in order
    if (showStudyPlan && studyPlanOrder.length > 1) {
      for (let i = 0; i < studyPlanOrder.length - 1; i++) {
        const sourceId = studyPlanOrder[i];
        const targetId = studyPlanOrder[i + 1];
        
        edges.push({
          id: `plan-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          animated: true,
          style: { 
            stroke: '#22c55e', 
            strokeWidth: 4,
            strokeDasharray: '5,5',
          },
          label: `${i + 1}`,
          labelStyle: { 
            fill: '#22c55e', 
            fontWeight: 'bold',
            fontSize: '14px',
          },
          labelBgStyle: { 
            fill: '#18181b', 
            fillOpacity: 0.9,
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
        });
      }
    }

    return { nodes, edges };
  }, [topicStatuses, showStudyPlan, studyPlanOrder]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => {
      const { nodes, edges } = generateNodesAndEdges();
      return getLayoutedElements(nodes, edges);
    },
    [generateNodesAndEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when statuses or plan state changes
  React.useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateNodesAndEdges();
    const layouted = getLayoutedElements(newNodes, newEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [topicStatuses, showStudyPlan, generateNodesAndEdges, setNodes, setEdges]);

  // Handle right-click on node
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  // Handle status change
  const handleStatusChange = (nodeId: string, status: TopicStatus) => {
    setTopicStatuses((prev) => ({
      ...prev,
      [nodeId]: status,
    }));
    setContextMenu(null);
  };

  // Close context menu on click outside
  const handlePaneClick = useCallback(() => {
    if (contextMenu) {
      setContextMenu(null);
    }
  }, [contextMenu]);

  // Calculate progress statistics
  const stats = useMemo(() => {
    const allTopics = initialSyllabusData.flatMap((lesson) => [
      { id: lesson.id, weight: lesson.weight },
      ...lesson.subTopics,
    ]);

    const totalTopics = allTopics.length;
    const completedTopics = allTopics.filter(
      (topic) =>
        topicStatuses[topic.id] === 'covered' ||
        topicStatuses[topic.id] === 'understand'
    ).length;

    // Fixed calculation for exam weight
    const totalWeight = allTopics.reduce((sum, topic) => sum + topic.weight, 0);
    const coveredWeight = allTopics
      .filter(
        (topic) =>
          topicStatuses[topic.id] === 'covered' ||
          topicStatuses[topic.id] === 'understand'
      )
      .reduce((sum, topic) => sum + topic.weight, 0);

    return {
      coveragePercentage: ((completedTopics / totalTopics) * 100).toFixed(1),
      examWeight: ((coveredWeight / totalWeight) * 100).toFixed(1),
    };
  }, [topicStatuses]);

  if (showDetailedPlan) {
    return (
      <StudyPlan
        topicStatuses={topicStatuses}
        syllabusData={initialSyllabusData}
        onBack={() => setShowDetailedPlan(false)}
      />
    );
  }

  if (showBackendPlan && backendPlan && backendPlanInput) {
    return (
      <GeneratedPlanFlowchart
        plan={backendPlan}
        planInput={backendPlanInput}
        onBack={() => setShowBackendPlan(false)}
      />
    );
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full bg-background relative flex flex-col">
        {/* Floating Control Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 p-1.5 rounded-2xl shadow-lg">
          {onBackToSubjects && (
            <button
              onClick={onBackToSubjects}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all duration-200 text-xs font-semibold border border-slate-200 cursor-pointer"
              title="Back to Subjects"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Subjects</span>
            </button>
          )}

          {/* Past Papers Coverage */}
          <Dialog open={isTableOpen} onOpenChange={setIsTableOpen}>
            <DialogTrigger asChild>
              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-all duration-200 text-xs font-semibold border border-slate-200 cursor-pointer"
                title="Past Papers Coverage"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Past Papers</span>
              </button>
            </DialogTrigger>
            <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none overflow-hidden bg-white border-0 text-slate-900 flex flex-col p-0 [&>button]:hidden">
              <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex flex-row items-center gap-4">
                <button
                  onClick={() => {
                    setIsTableOpen(false);
                    if (initialView === 'past-papers' && onBackToSubjects) {
                      onBackToSubjects();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all duration-200 text-xs font-semibold border border-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <DialogTitle className="text-slate-900 text-base font-bold">Past Paper Coverage (2000–2025)</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <YearsTable syllabusData={initialSyllabusData} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Load Saved Plan */}
          <LoadPlanDialog
            userId={userId}
            onPlanLoaded={(plan, input) => {
              setBackendPlan(plan);
              setBackendPlanInput(input);
              setShowBackendPlan(true);
            }}
          />

          {/* Generate Plan — single entry point */}
          <PlanInputDialog
            userId={userId}
            skippedLessonIds={skippedLessonIds}
            defaultOpen={initialView === 'generate-plan'}
            onPlanGenerated={(plan, input) => {
              setBackendPlan(plan);
              setBackendPlanInput(input);
              setShowBackendPlan(true);
            }}
            onPlanSaved={(planId) => {
              console.log("Plan saved:", planId);
            }}
            trigger={
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs shadow-sm shadow-blue-500/20 cursor-pointer">
                <Calendar className="w-3.5 h-3.5" />
                Generate Plan
              </button>
            }
          />

          {/* View Full Plan Button (local flowchart path) */}
          {showStudyPlan && (
            <button
              onClick={() => setShowDetailedPlan(true)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 px-3 rounded-xl transition-colors border border-slate-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="View Detailed Plan"
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>View Plan</span>
            </button>
          )}

          {/* Reset local syllabus path if active */}
          {showStudyPlan && (
            <button
              onClick={() => { setShowStudyPlan(false); setFocusedLessons([]); }}
              className="bg-slate-50 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 font-semibold py-1.5 px-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1 w-full h-full pt-0">
          <FlowChart
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={handlePaneClick}
            lessons={initialSyllabusData.map(l => ({ id: l.id, label: l.label }))}
            focusOnNode={showStudyPlan && studyPlanOrder.length > 0 ? studyPlanOrder[0] : null}
            focusOnNodes={focusedLessons}
          />
        </div>

        {/* Horizontal Study Plan */}
        {showStudyPlan && detailedPlan.length > 0 && !showDetailedPlan && (
          <HorizontalStudyPlan 
            plan={detailedPlan}
            onDayClick={(dayIndex, lessonIds) => {
              setFocusedLessons(lessonIds);
            }}
            onMarkCovered={(lessonId) => {
              handleStatusChange(lessonId, 'covered');
            }}
          />
        )}

        {/* Context Menu */}
        {contextMenu && contextMenu.show && (
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={() => handleStatusChange(contextMenu.nodeId, 'understand')}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-green-500/10 hover:text-green-500 flex items-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4 text-green-500" />
              Mark as Understand
            </button>
            <button
              onClick={() => handleStatusChange(contextMenu.nodeId, 'covered')}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-blue-500/10 hover:text-blue-500 flex items-center gap-2 transition-colors"
            >
              <Minus className="w-4 h-4 text-blue-500" />
              Mark as Covered
            </button>
            <button
              onClick={() => handleStatusChange(contextMenu.nodeId, 'cant-understand')}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-red-500/10 hover:text-red-500 flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4 text-red-500" />
              Can't Understand
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => handleStatusChange(contextMenu.nodeId, 'not-started')}
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors"
            >
              Reset Status
            </button>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
