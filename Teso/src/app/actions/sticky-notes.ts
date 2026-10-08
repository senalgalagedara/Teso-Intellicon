'use server'

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function getUserId() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.id;
}

export async function getStickyNotes() {
  const userId = await getUserId();
  if (!userId) return [];

  const notes = await prisma.stickyNote.findMany({
    where: { userId },
    include: {
      todos: {
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Map database format to frontend interface
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    color: note.color,
    position: { x: note.x, y: note.y },
    todos: note.todos.map(todo => ({
      id: todo.id,
      text: todo.title, // Map database "title" to frontend "text"
      completed: todo.completed,
    })),
  }));
}

export async function createStickyNote(color: string, x: number, y: number) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const note = await prisma.stickyNote.create({
    data: {
      title: "",
      color,
      x: Math.round(x),
      y: Math.round(y),
      userId,
    },
    include: {
      todos: true
    }
  });

  return {
    id: note.id,
    title: note.title,
    color: note.color,
    position: { x: note.x, y: note.y },
    todos: [],
  };
}

export async function updateStickyNote(id: string, updates: { title?: string; color?: string; x?: number; y?: number }) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const data: any = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.color !== undefined) data.color = updates.color;
  if (updates.x !== undefined) data.x = Math.round(updates.x);
  if (updates.y !== undefined) data.y = Math.round(updates.y);

  await prisma.stickyNote.update({
    where: { id, userId },
    data,
  });
}

export async function deleteStickyNote(id: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  await prisma.stickyNote.delete({
    where: { id, userId },
  });
}

export async function addTodo(stickyNoteId: string, text: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership of the note first
  const note = await prisma.stickyNote.findUnique({
    where: { id: stickyNoteId, userId }
  });
  if (!note) throw new Error("Note not found or unauthorized");

  const todo = await prisma.todo.create({
    data: {
      title: text, // Map frontend "text" to database "title"
      completed: false,
      userId,
      stickyNoteId,
    }
  });

  return {
    id: todo.id,
    text: todo.title,
    completed: todo.completed,
  };
}

export async function updateTodo(todoId: string, updates: { completed?: boolean; text?: string }) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  const data: any = {};
  if (updates.completed !== undefined) data.completed = updates.completed;
  if (updates.text !== undefined) data.title = updates.text; // Map frontend "text" to database "title"

  await prisma.todo.update({
    where: { id: todoId, userId },
    data,
  });
}

export async function deleteTodo(todoId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  await prisma.todo.delete({
    where: { id: todoId, userId },
  });
}
