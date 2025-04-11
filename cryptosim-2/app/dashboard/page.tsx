'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { Button } from "@/components/ui/button";
import Dashboard from "@/components/dashboard";

export default function DashboardPage() {
  const { user, logout } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </div>
      <Dashboard />
    </div>
  );
} 