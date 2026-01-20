import { Link, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function LandingLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <Outlet /> 
      </main>
    </div>
  );
}