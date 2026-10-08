import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const tools = [
  {
    type: "function",
    function: {
      name: "addTodo",
      description: "Add a new todo task to the user's list",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title or description of the task",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTodos",
      description: "Get the list of todo tasks for the user",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "completeTodo",
      description: "Mark a todo task as completed. You should first get the list of todos to find the correct task ID or match by title.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the task to complete (fuzzy match)",
          },
        },
        required: ["title"],
      },
    },
  },
];

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ reply: "System Error: DEEPSEEK_API_KEY is missing in .env" }, { status: 500 });
  }

  const firebaseUser = await getCurrentUser();
  let userId = null;
  
  if (firebaseUser && firebaseUser.email) {
      const user = await prisma.user.findUnique({
          where: { email: firebaseUser.email }
      });
      userId = user?.id || null;
  }

  const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
  });

  try {
    const { messages } = await req.json();

    if (!messages) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    // 1. Direct Command Handler (Bypasses LLM for reliability)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      const content = lastMessage.content.trim();
      
      // Command: /add <task>
      if (content.toLowerCase().startsWith('/add ')) {
        if (!userId) return NextResponse.json({ reply: "Please log in to add tasks." });
        const title = content.slice(5).trim();
        await prisma.todo.create({ data: { title, userId } });
        return NextResponse.json({ reply: `✅ Added task: "${title}"` });
      }
      
      // Command: /todo <task>
      if (content.toLowerCase().startsWith('/todo ')) {
        if (!userId) return NextResponse.json({ reply: "Please log in to add tasks." });
        const title = content.slice(6).trim();
        await prisma.todo.create({ data: { title, userId } });
        return NextResponse.json({ reply: `✅ Added task: "${title}"` });
      }
    }

    const systemMessage = { 
      role: "system", 
      content: "You are a helpful AI assistant for a student learning platform called TESO. You are friendly, encouraging, and concise. Keep your answers short, ideally under 3 sentences. You have access to the user's Todo list. ALWAYS use the `addTodo` function when the user asks to add a task, reminder, or todo item. Use `getTodos` to see what they have to do. Use `completeTodo` when they finish a task." 
    };

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        systemMessage,
        ...messages
      ],
      tools: tools as any,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;

    // Handle tool calls
    if (responseMessage.tool_calls) {
      if (!userId) {
        return NextResponse.json({ reply: "Please log in to manage your todo list." });
      }

      const toolCalls = responseMessage.tool_calls;
      const availableFunctions: Record<string, Function> = {
        addTodo: async (args: { title: string }) => {
          const todo = await prisma.todo.create({
            data: {
              title: args.title,
              userId: userId,
            },
          });
          return `Added task: "${todo.title}"`;
        },
        getTodos: async () => {
          const todos = await prisma.todo.findMany({
            where: { userId: userId, completed: false },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });
          if (todos.length === 0) return "You have no pending tasks.";
          return "Your tasks:\n" + todos.map(t => `- ${t.title}`).join("\n");
        },
        completeTodo: async (args: { title: string }) => {
          // Simple fuzzy match
          const todos = await prisma.todo.findMany({
            where: { 
              userId: userId, 
              completed: false,
              title: { contains: args.title, mode: 'insensitive' }
            },
          });
          
          if (todos.length === 0) return `Could not find a task matching "${args.title}".`;
          if (todos.length > 1) return `Found multiple tasks matching "${args.title}". Please be more specific.`;

          const todo = await prisma.todo.update({
            where: { id: todos[0].id },
            data: { completed: true },
          });
          return `Marked "${todo.title}" as completed.`;
        },
      };

      messages.push(responseMessage); // Add the assistant's message with tool calls

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue;

        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        
        let functionResponse;

        if (!functionToCall) {
          functionResponse = `Error: Function "${functionName}" is not available.`;
        } else {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            functionResponse = await functionToCall(functionArgs);
          } catch (error) {
            console.error(`Error executing ${functionName}:`, error);
            functionResponse = "An error occurred while performing this action.";
          }
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        });
      }

      // Get final response from model
      const secondResponse = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          systemMessage,
          ...messages
        ],
      });

      return NextResponse.json({ reply: secondResponse.choices[0].message.content });
    }

    return NextResponse.json({ reply: responseMessage.content });
  } catch (error: any) {
    console.error('DeepSeek API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
