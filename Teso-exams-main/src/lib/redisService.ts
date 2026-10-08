import redis from './redis';

// --- Rate Limiting ---
export async function checkRateLimit(ip: string, limit: number, windowSeconds: number) {
  const key = `rate:${ip}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      success: current <= limit,
      count: current,
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fail-open for user experience, or fail-closed. Standard is fail-open.
    return { success: true, count: 0 };
  }
}

// --- Session Cache (User profiles) ---
export async function getCachedUser(userId: string) {
  try {
    const data = await redis.get(`user:session:${userId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Redis getCachedUser error:', error);
    return null;
  }
}

export async function cacheUser(userId: string, user: any, ttlSeconds = 600) {
  try {
    await redis.set(`user:session:${userId}`, JSON.stringify(user), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error('Redis cacheUser error:', error);
  }
}

export async function invalidateCachedUser(userId: string) {
  try {
    await redis.del(`user:session:${userId}`);
  } catch (error) {
    console.error('Redis invalidateCachedUser error:', error);
  }
}

// --- Live Exam Sessions ---
export interface RedisSession {
  id: string;
  paperId: string;
  title: string;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  startedAt: string | null;
  endedAt: string | null;
  durationMins: number;
}

const SESSION_TTL = 86400; // 24 hours TTL for live states

export async function getRedisSession(examCode: string): Promise<RedisSession | null> {
  try {
    const data = await redis.hGetAll(`exam:session:${examCode}`);
    if (!data || !data.id) return null;
    return {
      id: data.id,
      paperId: data.paperId,
      title: data.title,
      status: data.status as any,
      startedAt: data.startedAt || null,
      endedAt: data.endedAt || null,
      durationMins: parseInt(data.durationMins || '60', 10),
    };
  } catch (error) {
    console.error('Redis getRedisSession error:', error);
    return null;
  }
}

export async function createRedisSession(examCode: string, session: RedisSession) {
  const key = `exam:session:${examCode}`;
  try {
    await redis.hSet(key, {
      id: session.id,
      paperId: session.paperId,
      title: session.title,
      status: session.status,
      startedAt: session.startedAt || '',
      endedAt: session.endedAt || '',
      durationMins: session.durationMins.toString(),
    });
    await redis.expire(key, SESSION_TTL);
  } catch (error) {
    console.error('Redis createRedisSession error:', error);
  }
}

export async function updateRedisSessionStatus(
  examCode: string,
  status: 'ACTIVE' | 'ENDED',
  startedAt?: Date,
  endedAt?: Date
) {
  const key = `exam:session:${examCode}`;
  try {
    const updates: Record<string, string> = { status };
    if (startedAt) {
      updates.startedAt = startedAt.toISOString();
    }
    if (endedAt) {
      updates.endedAt = endedAt.toISOString();
    }
    await redis.hSet(key, updates);
    await redis.expire(key, SESSION_TTL);
  } catch (error) {
    console.error('Redis updateRedisSessionStatus error:', error);
  }
}

// --- Participant Tracking ---
export interface RedisParticipant {
  id: string;
  sessionId: string;
  userId: string;
  fullName: string;
  classCode: string;
  status: 'WAITING' | 'ADMITTED' | 'DECLINED' | 'IN_EXAM' | 'SUBMITTED' | 'KICKED';
  answeredCount: number;
  totalQuestions: number;
  score: number | null;
  admittedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  lastSeenAt: string;
}

export async function getRedisParticipants(examCode: string): Promise<RedisParticipant[]> {
  const key = `exam:session:${examCode}:participants`;
  try {
    const data = await redis.hGetAll(key);
    if (!data) return [];
    return Object.values(data).map((val) => JSON.parse(val));
  } catch (error) {
    console.error('Redis getRedisParticipants error:', error);
    return [];
  }
}

export async function getRedisParticipant(examCode: string, userId: string): Promise<RedisParticipant | null> {
  const key = `exam:session:${examCode}:participants`;
  try {
    const data = await redis.hGet(key, userId);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Redis getRedisParticipant error:', error);
    return null;
  }
}

export async function getRedisParticipantById(examCode: string, participantId: string): Promise<RedisParticipant | null> {
  try {
    const participants = await getRedisParticipants(examCode);
    return participants.find((p) => p.id === participantId) || null;
  } catch (error) {
    console.error('Redis getRedisParticipantById error:', error);
    return null;
  }
}

export async function addOrUpdateRedisParticipant(examCode: string, participant: RedisParticipant) {
  const key = `exam:session:${examCode}:participants`;
  try {
    await redis.hSet(key, participant.userId, JSON.stringify(participant));
    await redis.expire(key, SESSION_TTL);
  } catch (error) {
    console.error('Redis addOrUpdateRedisParticipant error:', error);
  }
}

export async function updateRedisParticipantStatus(
  examCode: string,
  participantId: string,
  status: RedisParticipant['status'],
  score: number | null = null,
  submittedAt?: Date
) {
  try {
    const p = await getRedisParticipantById(examCode, participantId);
    if (p) {
      p.status = status;
      p.lastSeenAt = new Date().toISOString();
      if (status === 'ADMITTED') {
        p.admittedAt = new Date().toISOString();
      }
      if (status === 'IN_EXAM' && !p.startedAt) {
        p.startedAt = new Date().toISOString();
      }
      if (status === 'SUBMITTED') {
        p.submittedAt = submittedAt ? submittedAt.toISOString() : new Date().toISOString();
        if (score !== null) p.score = score;
      }
      await addOrUpdateRedisParticipant(examCode, p);
      return p;
    }
    return null;
  } catch (error) {
    console.error('Redis updateRedisParticipantStatus error:', error);
    return null;
  }
}

export async function updateRedisParticipantProgress(examCode: string, participantId: string, answeredCount: number) {
  try {
    const p = await getRedisParticipantById(examCode, participantId);
    if (p) {
      p.answeredCount = answeredCount;
      p.lastSeenAt = new Date().toISOString();
      await addOrUpdateRedisParticipant(examCode, p);
      return p;
    }
    return null;
  } catch (error) {
    console.error('Redis updateRedisParticipantProgress error:', error);
    return null;
  }
}

// --- Live Answers Cache ---
export interface RedisAnswer {
  selectedOptions: number[];
  numericAnswer: number | null;
  timeSpent: number;
}

export async function saveRedisAnswer(
  examCode: string,
  userId: string,
  paperDetailId: string,
  answer: RedisAnswer
) {
  const key = `exam:session:${examCode}:answers:${userId}`;
  try {
    await redis.hSet(key, paperDetailId, JSON.stringify(answer));
    await redis.expire(key, SESSION_TTL);
  } catch (error) {
    console.error('Redis saveRedisAnswer error:', error);
  }
}

export async function getRedisAnswers(examCode: string, userId: string): Promise<Record<string, RedisAnswer>> {
  const key = `exam:session:${examCode}:answers:${userId}`;
  try {
    const data = await redis.hGetAll(key);
    if (!data) return {};
    const result: Record<string, RedisAnswer> = {};
    for (const [keyField, val] of Object.entries(data)) {
      result[keyField] = JSON.parse(val);
    }
    return result;
  } catch (error) {
    console.error('Redis getRedisAnswers error:', error);
    return {};
  }
}

export async function clearRedisAnswers(examCode: string, userId: string) {
  const key = `exam:session:${examCode}:answers:${userId}`;
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis clearRedisAnswers error:', error);
  }
}
