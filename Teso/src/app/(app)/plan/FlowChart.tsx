"use client";

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import { Check, X, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';

type TopicStatus = 'not-started' | 'covered' | 'understand' | 'cant-understand';

interface TopicData {
  id: string;
  label: string;
  weight: number;
  status: TopicStatus;
  isSubTopic?: boolean;
  parentId?: string;
}

// Custom node component
const TopicNode: React.FC<NodeProps<TopicData>> = ({ data }) => {
  const getStatusColor = (status: TopicStatus) => {
    switch (status) {
      case 'covered':
        return 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'understand':
        return 'bg-green-500/10 dark:bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
      case 'cant-understand':
        return 'bg-red-500/10 dark:bg-red-500/20 border-red-500 text-red-700 dark:text-red-300';
      default:
        return 'bg-card border-border text-foreground';
    }
  };

  const getStatusIcon = (status: TopicStatus) => {
    switch (status) {
      case 'covered':
        return <Minus className="w-3 h-3 text-blue-500 dark:text-blue-400" />;
      case 'understand':
        return <Check className="w-3 h-3 text-green-500 dark:text-green-400" />;
      case 'cant-understand':
        return <X className="w-3 h-3 text-red-500 dark:text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${getStatusColor(
        data.status
      )} transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 min-w-[180px] ${
        data.isSubTopic ? 'text-sm' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{data.label}</span>
        {getStatusIcon(data.status)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Weight: {data.weight}%</div>
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
    </div>
  );
};

const nodeTypes = {
  topic: TopicNode,
};

interface FlowChartProps {
  initialNodes: Node<TopicData>[];
  initialEdges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  lessons: Array<{ id: string; label: string }>;
  focusOnNode: string | null;
  focusOnNodes: string[];
}

export function FlowChart({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeContextMenu,
  onPaneClick,
  lessons,
  focusOnNode,
  focusOnNodes,
}: FlowChartProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const { setCenter, getNode, fitBounds } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Update nodes when initialNodes change
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when initialEdges change
  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Auto-focus on node when focusOnNode changes
  React.useEffect(() => {
    if (focusOnNode) {
      const node = getNode(focusOnNode);
      if (node) {
        setTimeout(() => {
          // Position node left of center (subtract from x position)
          setCenter(node.position.x + 100 - 300, node.position.y + 40, {
            duration: 800,
          });
        }, 100);
      }
    }
  }, [focusOnNode, getNode, setCenter]);

  // Auto-focus on multiple nodes when focusOnNodes changes
  React.useEffect(() => {
    if (focusOnNodes && focusOnNodes.length > 0) {
      const targetNodes = focusOnNodes.map(id => getNode(id)).filter(Boolean) as Node[];
      
      if (targetNodes.length > 0) {
        // Calculate bounding box for all target nodes
        const xs = targetNodes.map(n => n.position.x);
        const ys = targetNodes.map(n => n.position.y);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + 200; // add node width
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + 80; // add node height
        
        setTimeout(() => {
          // Center the bounding box but shift it left
          const centerX = (minX + maxX) / 2 - 300;
          const centerY = (minY + maxY) / 2;
          setCenter(centerX, centerY, { duration: 800 });
        }, 100);
      }
    }
  }, [focusOnNodes, getNode, setCenter]);

  const goToLesson = useCallback((index: number, animated = true) => {
    const lesson = lessons[index];
    if (!lesson) return;

    setCurrentLessonIndex(index);

    // Gather the lesson node + all its sub-topic nodes
    const lessonNode = getNode(lesson.id);
    if (!lessonNode) return;

    const lessonNodes = nodes.filter(
      (n) => n.id === lesson.id || (n.data as TopicData).parentId === lesson.id
    );

    const NODE_W = 220;
    const NODE_H = 80;

    const xs = lessonNodes.map((n) => n.position.x);
    const ys = lessonNodes.map((n) => n.position.y);

    const bounds = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) + NODE_W - Math.min(...xs),
      height: Math.max(...ys) + NODE_H - Math.min(...ys),
    };

    fitBounds(bounds, { padding: 0.25, duration: animated ? 800 : 0 });
  }, [lessons, getNode, nodes, fitBounds]);

  const goToPrevLesson = () => {
    const newIndex = currentLessonIndex > 0 ? currentLessonIndex - 1 : lessons.length - 1;
    goToLesson(newIndex);
  };

  const goToNextLesson = () => {
    const newIndex = currentLessonIndex < lessons.length - 1 ? currentLessonIndex + 1 : 0;
    goToLesson(newIndex);
  };

  return (
    <div className="relative w-full h-full">
      {/* Lesson Navigation */}
      <div className="absolute top-16 left-4 z-10 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={goToPrevLesson}
            className="p-1.5 rounded bg-secondary hover:bg-purple-600 text-muted-foreground hover:text-white transition-colors border border-border"
            title="Previous Lesson"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="text-center min-w-[150px]">
            <div className="text-xs text-muted-foreground/80">Lesson {currentLessonIndex + 1} of {lessons.length}</div>
            <div className="text-sm font-semibold text-foreground">{lessons[currentLessonIndex]?.label}</div>
          </div>

          <button
            onClick={goToNextLesson}
            className="p-1.5 rounded bg-secondary hover:bg-purple-600 text-muted-foreground hover:text-white transition-colors border border-border"
            title="Next Lesson"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Jump Buttons */}
        <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border">
          {lessons.map((lesson, index) => (
            <button
              key={lesson.id}
              onClick={() => goToLesson(index)}
              className={`px-2 py-1 text-xs rounded transition-colors border ${
                index === currentLessonIndex
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-secondary text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              }`}
              title={lesson.label}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChangeInternal(changes);
          onNodesChange(changes);
        }}
        onEdgesChange={(changes) => {
          onEdgesChangeInternal(changes);
          onEdgesChange(changes);
        }}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        onInit={() => {
          setTimeout(() => goToLesson(0, false), 50);
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
        className="bg-background"
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background className="bg-background" color={isDark ? "#27272a" : "#e2e8f0"} gap={16} />
        <Controls className="!bg-card !border-border [&_button]:!bg-secondary [&_button]:!border-border [&_button]:!text-muted-foreground [&_button:hover]:!bg-muted [&_button:hover]:!text-foreground" />
        <MiniMap
          className="!bg-card !border-border"
          nodeColor={(node) => {
            const status = (node.data as TopicData).status;
            switch (status) {
              case 'understand':
                return '#22c55e';
              case 'covered':
                return '#3b82f6';
              case 'cant-understand':
                return '#ef4444';
              default:
                return isDark ? '#52525b' : '#a1a1aa';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
