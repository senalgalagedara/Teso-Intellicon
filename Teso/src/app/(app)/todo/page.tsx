"use client";

import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StickyNote, StickyNoteData, Todo } from '@/components/todo/StickyNote';
import { Plus, LayoutGrid } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/providers/AuthProvider';
import {
    getStickyNotes,
    createStickyNote as createStickyNoteAction,
    updateStickyNote as updateStickyNoteAction,
    deleteStickyNote as deleteStickyNoteAction,
    addTodo as addTodoAction,
    updateTodo as updateTodoAction,
    deleteTodo as deleteTodoAction
} from '@/app/actions/sticky-notes';
import './todo.css';

const STICKY_COLORS = [
    '#FFEC99', '#FFD6A5', '#FFAFCC', '#BDE0FE', '#CAFFBF',
    '#C9B8F5', '#FFC8DD', '#A0E7E5', '#FDFFB6', '#D4EDDA',
];

export default function TodoPage() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { user, loading: authLoading } = useAuth();

    const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [expandedMobileNoteId, setExpandedMobileNoteId] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (authLoading || !user) return;
        
        async function loadNotes() {
            try {
                const data = await getStickyNotes();
                setStickyNotes(data);
            } catch (e) {
                console.error('Failed to load notes from DB:', e);
            }
            setIsLoaded(true);
        }
        loadNotes();
    }, [authLoading, user]);

    const updateStickyNoteStateOnly = (id: string, updates: Partial<StickyNoteData>) =>
        setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    const addStickyNote = async () => {
        const defaultColor = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
        const defaultX = 80 + Math.random() * (window.innerWidth > 768 ? 380 : 60);
        const defaultY = 130 + Math.random() * 100;

        // Optimistic insert
        const tempId = `temp-${Date.now()}`;
        const tempNote: StickyNoteData = {
            id: tempId,
            title: '',
            todos: [],
            color: defaultColor,
            position: { x: defaultX, y: defaultY },
        };
        setStickyNotes(prev => [...prev, tempNote]);
        if (isMobile) setExpandedMobileNoteId(tempId);

        try {
            const savedNote = await createStickyNoteAction(defaultColor, defaultX, defaultY);
            setStickyNotes(prev => prev.map(n => n.id === tempId ? savedNote : n));
            if (expandedMobileNoteId === tempId) setExpandedMobileNoteId(savedNote.id);
        } catch (e) {
            console.error("Failed to create note in DB:", e);
            setStickyNotes(prev => prev.filter(n => n.id !== tempId));
        }
    };

    const updateStickyNote = async (id: string, updates: Partial<StickyNoteData>) => {
        // Optimistic update
        updateStickyNoteStateOnly(id, updates);

        try {
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.color !== undefined) dbUpdates.color = updates.color;
            if (updates.position !== undefined) {
                dbUpdates.x = updates.position.x;
                dbUpdates.y = updates.position.y;
            }
            await updateStickyNoteAction(id, dbUpdates);
        } catch (e) {
            console.error("Failed to update note in DB:", e);
        }
    };

    const deleteStickyNote = async (id: string) => {
        const note = stickyNotes.find(n => n.id === id);
        if (!note) return;

        // Optimistic delete
        setStickyNotes(prev => prev.filter(n => n.id !== id));
        if (expandedMobileNoteId === id) setExpandedMobileNoteId(null);

        try {
            await deleteStickyNoteAction(id);
        } catch (e) {
            console.error("Failed to delete note in DB:", e);
            setStickyNotes(prev => [...prev, note]); // rollback
        }
    };

    const addTodo = async (noteId: string, todoText: string) => {
        const note = stickyNotes.find(n => n.id === noteId);
        if (!note) return;

        // Optimistic insert
        const tempTodoId = `temp-todo-${Date.now()}`;
        const tempTodo: Todo = { id: tempTodoId, text: todoText, completed: false };
        updateStickyNoteStateOnly(noteId, { todos: [...note.todos, tempTodo] });

        try {
            const savedTodo = await addTodoAction(noteId, todoText);
            setStickyNotes(prev => prev.map(n => {
                if (n.id === noteId) {
                    return {
                        ...n,
                        todos: n.todos.map(t => t.id === tempTodoId ? savedTodo : t)
                    };
                }
                return n;
            }));
        } catch (e) {
            console.error("Failed to add todo in DB:", e);
            setStickyNotes(prev => prev.map(n => {
                if (n.id === noteId) {
                    return {
                        ...n,
                        todos: n.todos.filter(t => t.id !== tempTodoId)
                    };
                }
                return n;
            }));
        }
    };

    const updateTodo = async (noteId: string, todoId: string, updates: Partial<Todo>) => {
        const note = stickyNotes.find(n => n.id === noteId);
        if (!note) return;

        const idx = note.todos.findIndex(t => t.id === todoId);
        if (idx === -1) return;

        const currentTodo = note.todos[idx];
        const updatedTodo = { ...currentTodo, ...updates };

        if (updatedTodo.completed && !currentTodo.completed) {
            try { new Audio('/celebrate.mp3').play().catch(() => {}); } catch {}
        }

        // Optimistic update
        const others = note.todos.filter(t => t.id !== todoId);
        const reordered = updatedTodo.completed ? [...others, updatedTodo] : [updatedTodo, ...others];
        updateStickyNoteStateOnly(noteId, { todos: reordered });

        try {
            await updateTodoAction(todoId, {
                completed: updates.completed,
                text: updates.text,
            });
        } catch (e) {
            console.error("Failed to update todo in DB:", e);
            // Rollback
            setStickyNotes(prev => prev.map(n => n.id === noteId ? note : n));
        }
    };

    const deleteTodo = async (noteId: string, todoId: string) => {
        const note = stickyNotes.find(n => n.id === noteId);
        if (!note) return;

        const originalTodos = [...note.todos];

        // Optimistic delete
        updateStickyNoteStateOnly(noteId, { todos: note.todos.filter(t => t.id !== todoId) });

        try {
            await deleteTodoAction(todoId);
        } catch (e) {
            console.error("Failed to delete todo in DB:", e);
            // Rollback
            updateStickyNoteStateOnly(noteId, { todos: originalTodos });
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="board-container">
                {/* Texture overlay */}
                <div className="cork-texture" />

                {/* Dark-only: ambient color glow behind each note */}
                {isDark && !isMobile && stickyNotes.map((note) => (
                    <div
                        key={`glow-${note.id}`}
                        className="note-ambient-glow"
                        style={{
                            left: `${note.position.x + 136}px`,
                            top: `${note.position.y + 100}px`,
                            background: note.color,
                        }}
                    />
                ))}

                {/* Toolbar — just the add button */}
                <div className="board-toolbar">
                    <button
                        id="add-note-btn"
                        onClick={addStickyNote}
                        className="add-note-btn"
                        title="Add new sticky note"
                    >
                        <Plus size={16} />
                        <span>New Note</span>
                    </button>
                </div>

                {/* DESKTOP: Draggable canvas */}
                {!isMobile ? (
                    <div className="board-canvas">
                        {stickyNotes.length === 0 && (
                            <div className="empty-board">
                                <div className="empty-board-card">
                                    <span className="empty-board-emoji">🗒️</span>
                                    <h2>Your board is empty</h2>
                                    <p>Click <strong>New Note</strong> to add a sticky note</p>
                                </div>
                            </div>
                        )}
                        {stickyNotes.map((note) => (
                            <StickyNote
                                key={note.id}
                                note={note}
                                theme={isDark ? 'dark' : 'light'}
                                onUpdatePosition={(position) => updateStickyNote(note.id, { position })}
                                onUpdateTitle={(title) => updateStickyNote(note.id, { title })}
                                onDelete={() => deleteStickyNote(note.id)}
                                onAddTodo={(text) => addTodo(note.id, text)}
                                onUpdateTodo={(id, u) => updateTodo(note.id, id, u)}
                                onDeleteTodo={(id) => deleteTodo(note.id, id)}
                            />
                        ))}
                    </div>
                ) : (
                    /* MOBILE: Stacked list */
                    <div className="mobile-list">
                        {stickyNotes.length === 0 && (
                            <div className="empty-board mobile-empty">
                                <div className="empty-board-card">
                                    <span className="empty-board-emoji">🗒️</span>
                                    <h2>No notes yet</h2>
                                    <p>Tap <strong>New Note</strong> to get started</p>
                                </div>
                            </div>
                        )}
                        {stickyNotes.map((note) => (
                            <div
                                key={note.id}
                                className="mobile-note-pill"
                                style={{ borderLeftColor: note.color }}
                                onClick={() => setExpandedMobileNoteId(note.id)}
                            >
                                <div className="mobile-pill-dot" style={{ background: note.color }} />
                                <div className="mobile-pill-info">
                                    <span className="mobile-pill-title">{note.title || 'Untitled'}</span>
                                    <span className="mobile-pill-count">
                                        {note.todos.filter(t => !t.completed).length} tasks remaining
                                    </span>
                                </div>
                                <LayoutGrid size={16} className="mobile-pill-icon" />
                            </div>
                        ))}

                        {expandedMobileNoteId && (
                            <div className="mobile-modal-overlay" onClick={() => setExpandedMobileNoteId(null)}>
                                <div className="mobile-modal-stop" onClick={(e) => e.stopPropagation()}>
                                    {stickyNotes.filter(n => n.id === expandedMobileNoteId).map(note => (
                                        <StickyNote
                                            key={note.id}
                                            note={note}
                                            theme={isDark ? 'dark' : 'light'}
                                            isMobileExpanded
                                            onMinimize={() => setExpandedMobileNoteId(null)}
                                            onUpdateTitle={(title) => updateStickyNote(note.id, { title })}
                                            onDelete={() => deleteStickyNote(note.id)}
                                            onAddTodo={(text) => addTodo(note.id, text)}
                                            onUpdateTodo={(id, u) => updateTodo(note.id, id, u)}
                                            onDeleteTodo={(id) => deleteTodo(note.id, id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DndProvider>
    );
}