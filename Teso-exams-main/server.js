const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Make io globally accessible in Next.js Server Actions
  global.io = io;

  // Set up Redis Adapter for Socket.IO
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL || process.env.STORAGE_URL || 'redis://localhost:6379';
  try {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('> Redis Pub/Sub Adapter configured for Socket.IO');

    // Keep track of active server-side countdown timers
    const examTimers = new Map();

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on('join-lobby', ({ examCode, participantId }) => {
        socket.join(`exam:${examCode}`);
        socket.join(`participant:${participantId}`);
        console.log(`Socket ${socket.id} joined lobby for ${examCode}, participant ${participantId}`);
      });

      socket.on('join-host-lobby', ({ examCode }) => {
        socket.join(`exam:${examCode}:host`);
        console.log(`Host joined lobby room for ${examCode}`);
      });

      socket.on('join-exam-room', ({ examCode, participantId }) => {
        socket.join(`exam:${examCode}`);
        socket.join(`participant:${participantId}`);
        console.log(`Student ${participantId} joined exam room for ${examCode}`);
        
        // If there is an active timer, emit a sync immediately
        syncTimerForExam(examCode);
      });

      socket.on('join-host-monitor', ({ examCode }) => {
        socket.join(`exam:${examCode}:host`);
        console.log(`Host joined live monitor room for ${examCode}`);
        syncTimerForExam(examCode);
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    // Timer Synchronization Helper
    async function syncTimerForExam(examCode) {
      const sessionKey = `exam:session:${examCode}`;
      try {
        const session = await pubClient.hGetAll(sessionKey);
        if (session && session.status === 'ACTIVE' && session.startedAt) {
          const startTimeMs = new Date(session.startedAt).getTime();
          const durationMins = parseInt(session.durationMins || '60', 10);
          const durationMs = durationMins * 60 * 1000;
          const endTimeMs = startTimeMs + durationMs;
          const remainingSeconds = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
          
          io.to(`exam:${examCode}`).emit('timer-sync', { remainingSeconds });
          io.to(`exam:${examCode}:host`).emit('timer-sync', { remainingSeconds });

          // Start server-side countdown if not already running
          if (!examTimers.has(examCode) && remainingSeconds > 0) {
            startServerTimer(examCode, endTimeMs);
          }
        }
      } catch (err) {
        console.error('Error in syncTimerForExam:', err);
      }
    }

    function startServerTimer(examCode, endTimeMs) {
      if (examTimers.has(examCode)) {
        clearInterval(examTimers.get(examCode));
      }

      const interval = setInterval(async () => {
        const remainingSeconds = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
        
        io.to(`exam:${examCode}`).emit('timer-sync', { remainingSeconds });
        io.to(`exam:${examCode}:host`).emit('timer-sync', { remainingSeconds });

        if (remainingSeconds <= 0) {
          clearInterval(interval);
          examTimers.delete(examCode);
          
          // Time is up! Broadcast end session.
          console.log(`Exam ${examCode} time is up! Ending session.`);
          io.to(`exam:${examCode}`).emit('exam-ended');
          io.to(`exam:${examCode}:host`).emit('exam-ended');
        }
      }, 5000); // Sync every 5 seconds

      examTimers.set(examCode, interval);
    }

    global.startExamTimer = (examCode, durationMins) => {
      const endTimeMs = Date.now() + durationMins * 60 * 1000;
      startServerTimer(examCode, endTimeMs);
    };

    global.stopExamTimer = (examCode) => {
      if (examTimers.has(examCode)) {
        clearInterval(examTimers.get(examCode));
        examTimers.delete(examCode);
      }
    };

  } catch (adapterErr) {
    console.error('> Redis connection error in Socket.IO custom server:', adapterErr);
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
