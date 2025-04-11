import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const user = await getUserByEmail(email);
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 