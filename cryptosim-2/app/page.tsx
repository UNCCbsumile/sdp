'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './context/UserContext';
import Dashboard from "@/components/dashboard";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-400 to-blue-600">
      <div className="container mx-auto px-4">
        {/* Navigation */}
        <nav className="flex justify-end py-6">
          <div className="space-x-4">
            <Button 
              variant="outline" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
            <Button 
              className="bg-white text-blue-600 hover:bg-white/90"
              onClick={() => router.push('/register')}
            >
              Register
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Welcome to CryptoSim!
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
            Practice cryptocurrency trading in a risk-free environment with real-time market data.
          </p>
          <div className="space-x-4">
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-white/90"
              onClick={() => router.push('/register')}
            >
              Get Started
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

