"use client";

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, X, ChevronDown } from 'lucide-react';

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

export interface StickyNoteData {
    id: string;
    title: string;
    todos: Todo[];
    color: string;
    position: { x: number; y: number };
}

interface StickyNoteProps {
    note: StickyNoteData;
    theme: 'light' | 'dark';
    onUpdatePosition?: (position: { x: number; y: number }) => void;
    onUpdateTitle: (title: string) => void;
    onDelete: () => void;
    onAddTodo: (text: string) => void;
    onUpdateTodo: (todoId: string, updates: Partial<Todo>) => void;
    onDeleteTodo: (todoId: string) => void;
    onMinimize?: () => void;
    isMobileExpanded?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

export function StickyNote({
    note,
    theme,
    onUpdatePosition,
    onUpdateTitle,
    onDelete,
    onAddTodo,
    onUpdateTodo,
    onDeleteTodo,
    onMinimize,
    isMobileExpanded = false,
    style,
    className,
}: StickyNoteProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(!note.title);
    const [newTodoText, setNewTodoText] = useState('');
    const [titleText, setTitleText] = useState(note.title || 'My Note');
    const [isDragging, setIsDragging] = useState(false);
    const [showParticles, setShowParticles] = useState(false);
    const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isMobileExpanded) return;

        const handleMove = (clientX: number, clientY: number) => {
            if (isDragging && onUpdatePosition) {
                const newX = clientX - dragOffset.current.x;
                const newY = clientY - dragOffset.current.y + window.scrollY;
                onUpdatePosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
            }
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        };
        const handleEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, onUpdatePosition, isMobileExpanded]);

    const handleStart = (clientX: number, clientY: number) => {
        if (!onUpdatePosition || isMobileExpanded) return;
        setIsDragging(true);
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            dragOffset.current = {
                x: clientX - note.position.x,
                y: clientY - (note.position.y - window.scrollY),
            };
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('input, button, textarea, .no-drag')) return;
        handleStart(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('input, button, textarea, .no-drag')) return;
        if (e.touches.length > 0) handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleAddTodo = () => {
        if (newTodoText.trim()) {
            onAddTodo(newTodoText.trim());
            setNewTodoText('');
        }
    };

    const handleTitleSave = () => {
        const trimmed = titleText.trim();
        onUpdateTitle(trimmed || 'My Note');
        setTitleText(trimmed || 'My Note');
        setIsEditingTitle(false);
    };

    const handleDeleteTodo = (todoId: string) => {
        setDeletingTodoId(todoId);
        setTimeout(() => {
            onDeleteTodo(todoId);
            setDeletingTodoId(null);
        }, 300);
    };

    const pendingCount = note.todos.filter(t => !t.completed).length;
    const doneCount = note.todos.filter(t => t.completed).length;

    // Darken the color slightly for the header strip
    const darkenColor = (hex: string, amount: number = 30) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0xff) - amount);
        const b = Math.max(0, (num & 0xff) - amount);
        return `rgb(${r},${g},${b})`;
    };

    const containerStyle: React.CSSProperties = isMobileExpanded
        ? { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, width: '90%', maxWidth: '420px', ...style }
        : { left: `${note.position.x}px`, top: `${note.position.y}px`, zIndex: isDragging ? 9999 : 10, ...style };

    return (
        <div
            ref={ref}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`sticky-note-wrapper ${!isMobileExpanded ? 'absolute w-72' : ''} ${onUpdatePosition && !isMobileExpanded ? 'cursor-move' : 'cursor-default'} select-none touch-none ${isDragging ? 'is-dragging' : ''} ${className || ''}`}
            style={containerStyle}
        >
            {/* Push Pin */}
            {!isMobileExpanded && (
                <div className="pin-container">
                    <div className="pin-head" style={{ background: darkenColor(note.color, 60) }} />
                    <div className="pin-shaft" />
                </div>
            )}

            {/* Note Body */}
            <div
                className="note-body"
                style={{ background: note.color }}
            >
                {/* Folded corner decoration */}
                <div className="folded-corner" style={{ borderLeftColor: darkenColor(note.color, 40), borderTopColor: darkenColor(note.color, 40) }} />

                {/* Lined paper lines */}
                <div className="paper-lines" />

                {/* Header */}
                <div className="note-header no-drag">
                    {isEditingTitle ? (
                        <textarea
                            ref={titleRef}
                            value={titleText}
                            onChange={(e) => setTitleText(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); } }}
                            className="title-input"
                            rows={2}
                            autoFocus
                            placeholder="Note title..."
                        />
                    ) : (
                        <h3
                            className="note-title"
                            onClick={() => setIsEditingTitle(true)}
                            title="Click to edit title"
                        >
                            {note.title || 'My Note'}
                        </h3>
                    )}

                    <div className="header-actions">
                        {isMobileExpanded && onMinimize && (
                            <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="icon-btn minimize-btn" title="Minimize">
                                <ChevronDown size={16} />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="icon-btn delete-note-btn" title="Delete note">
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                {note.todos.length > 0 && (
                    <div className="stats-bar">
                        <span className="stat-badge pending">{pendingCount} to do</span>
                        {doneCount > 0 && <span className="stat-badge done">✓ {doneCount}</span>}
                    </div>
                )}

                {/* Divider line */}
                <div className="note-divider" style={{ borderColor: darkenColor(note.color, 25) }} />

                {/* Todo List */}
                <div className={`todo-list no-drag ${isMobileExpanded ? 'todo-list-expanded' : ''}`}>
                    {note.todos.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon">📝</span>
                            <p>Nothing here yet…</p>
                            <p className="empty-hint">Add your first task below</p>
                        </div>
                    )}
                    {note.todos.map((todo) => (
                        <div
                            key={todo.id}
                            className={`todo-item ${todo.completed ? 'todo-done' : ''} ${deletingTodoId === todo.id ? 'todo-deleting' : ''}`}
                        >
                            <label className="todo-check-wrapper">
                                <input
                                    type="checkbox"
                                    checked={todo.completed}
                                    onChange={(e) => {
                                        onUpdateTodo(todo.id, { completed: e.target.checked });
                                        if (e.target.checked) {
                                            setShowParticles(true);
                                            setTimeout(() => setShowParticles(false), 3000);
                                        }
                                    }}
                                    className="todo-checkbox"
                                />
                                <span className="checkmark" />
                            </label>
                            <span className={`todo-text ${todo.completed ? 'todo-text-done' : ''}`}>{todo.text}</span>
                            <button
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="delete-todo-btn"
                                title="Remove task"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Task Input */}
                <div className="add-task-row no-drag">
                    <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                        placeholder="Add a task…"
                        className="add-task-input"
                    />
                    <button onClick={handleAddTodo} className="add-task-btn" title="Add task">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Particle burst */}
            {showParticles && (
                <div className="particle-container">
                    {[...Array(40)].map((_, i) => {
                        const angle = (Math.random() * 360) * (Math.PI / 180);
                        const dist = 80 + Math.random() * 120;
                        return (
                            <div
                                key={i}
                                className="particle"
                                style={{
                                    '--tx': `${Math.cos(angle) * dist}px`,
                                    '--ty': `${Math.sin(angle) * dist}px`,
                                    backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#34d399'][Math.floor(Math.random() * 5)],
                                    animationDelay: `${Math.random() * 0.3}s`,
                                } as React.CSSProperties}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}