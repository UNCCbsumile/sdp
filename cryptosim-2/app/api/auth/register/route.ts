import { NextResponse } from 'next/server';
import { getUserByEmail, saveUser } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      password,
      name,
    };

    await saveUser(newUser);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 