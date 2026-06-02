"use client";

import { useState, useEffect } from 'react';

export function AppFooter() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <footer className="py-3 text-center border-t bg-background/50 backdrop-blur-sm">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
        PartoMa Project Clinical Integrity &copy; {new Date().getFullYear()}
      </p>
    </footer>
  );
}