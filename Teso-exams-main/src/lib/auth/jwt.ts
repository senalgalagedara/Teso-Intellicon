import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secret_fallback_key_for_development_only'
);

export interface AuthJWTPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function signAccessToken(payload: Omit<AuthJWTPayload, 'iat' | 'exp'>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // 15 minutes expiration
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: Omit<AuthJWTPayload, 'iat' | 'exp'>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days expiration
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<AuthJWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AuthJWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
