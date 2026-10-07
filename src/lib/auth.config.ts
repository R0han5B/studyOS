import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const providers: any[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user || !user.password) {
        return null;
      }

      const isValid = await bcrypt.compare(
        credentials.password as string,
        user.password
      );

      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatar,
      };
    },
  })
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split('@')[0],
              avatar: user.image,
              oauthProvider: account.provider,
              oauthId: account.providerAccountId,
              password: null,
              role: 'user',
            },
          });
        } else if (!existingUser.oauthProvider) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              oauthProvider: account.provider,
              oauthId: account.providerAccountId,
              avatar: user.image || existingUser.avatar,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
});

// Helper function to get authenticated user in API routes
// Checks both NextAuth session (OAuth) and custom JWT tokens
export async function getAuthenticatedUser(): Promise<{ userId: string; email: string } | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return { userId: session.user.id, email: session.user.email || '' };
    }
  } catch (e) {
    console.log('Failed to get session from auth()', e);
  }

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    
    if (accessToken) {
      const { jwtVerify } = await import('jose');
      const JWT_SECRET = new TextEncoder().encode(
        process.env.JWT_SECRET || 'development-secret-change-me'
      );
      
      try {
        const { payload } = await jwtVerify(accessToken, JWT_SECRET);
        const jwtPayload = payload as unknown as { userId: string; email: string };
        if (jwtPayload.userId && jwtPayload.email) {
          return { userId: jwtPayload.userId, email: jwtPayload.email };
        }
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError);
      }
    }
  } catch (cookieError) {
    console.log('Failed to access cookies:', cookieError);
  }
  
  return null;
}
