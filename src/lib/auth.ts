import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-me'
);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate access token
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Generate refresh token
export async function generateRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Verify token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Set auth cookies
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });
  
  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

// Clear auth cookies
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}

// Get current user from cookies
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  
  if (!accessToken) {
    return null;
  }
  
  return verifyToken(accessToken);
}

// Alias for backward compatibility
export const getAuthUser = getCurrentUser;

// Get user ID from either NextAuth or custom auth
export async function getAuthenticatedUserId(): Promise<{ userId: string; email: string } | null> {
  const customUser = await getCurrentUser();
  if (customUser) {
    return { userId: customUser.userId, email: customUser.email };
  }

  try {
    const { getAuthenticatedUser } = await import('./auth.config');
    const sessionUser = await getAuthenticatedUser();

    if (sessionUser) {
      return sessionUser;
    }
  } catch (error) {
    console.error('Failed to get NextAuth session:', error);
  }

  return null;
}

// Get refresh token from cookies
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('refreshToken')?.value || null;
}

// Register user
export async function registerUser(email: string, password?: string, name?: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser) {
    return { success: false, error: 'User already exists' };
  }
  
  const hashedPassword = password ? await hashPassword(password) : null;
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
    },
  });
  
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  const accessToken = await generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload);
  
  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });
  
  await setAuthCookies(accessToken, refreshToken);
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
  };
}

// Login user
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  // OAuth users don't have passwords
  if (!user.password) {
    return { success: false, error: 'Please sign in with your OAuth provider' };
  }
  
  const isValid = await verifyPassword(password, user.password);
  
  if (!isValid) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  const accessToken = await generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload);
  
  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });
  
  await setAuthCookies(accessToken, refreshToken);
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
  };
}

// Logout user
export async function logoutUser() {
  const user = await getCurrentUser();
  
  if (user) {
    // Clear refresh token in database
    await prisma.user.update({
      where: { id: user.userId },
      data: { refreshToken: null },
    });
  }
  
  await clearAuthCookies();
  
  return { success: true };
}

// Refresh access token
export async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  
  if (!refreshToken) {
    return { success: false, error: 'No refresh token' };
  }
  
  const payload = await verifyToken(refreshToken);
  
  if (!payload || ((payload as unknown as Record<string, unknown>).type !== 'refresh')) {
    await clearAuthCookies();
    return { success: false, error: 'Invalid refresh token' };
  }
  
  // Check if refresh token matches database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  
  if (!user || user.refreshToken !== refreshToken) {
    await clearAuthCookies();
    return { success: false, error: 'Invalid refresh token' };
  }
  
  const newPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  const newAccessToken = await generateAccessToken(newPayload);
  const newRefreshToken = await generateRefreshToken(newPayload);
  
  // Update refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });
  
  await setAuthCookies(newAccessToken, newRefreshToken);
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
  };
}
