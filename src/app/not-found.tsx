
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <ClipboardCheck className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mt-4">404 - Page Not Found</h1>
          <p className="text-muted-foreground max-w-sm mx-auto font-medium">
            The study module you are looking for does not exist or has been moved to a different unit.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline" className="h-12 rounded-xl font-bold border-2">
            <Link href="/anc/activities">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
            </Link>
          </Button>
          <Button asChild className="h-12 rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90">
            <Link href="/anc/dashboard">
              Clinical Dashboard
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="mt-12 opacity-20">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">PartoMa Project Clinical Integrity</p>
      </div>
    </div>
  );
}
