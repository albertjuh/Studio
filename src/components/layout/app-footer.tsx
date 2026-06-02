
"use client";

import { useState, useEffect } from 'react';

export function AppFooter() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <footer className="py-2 text-center border-t bg-background/50 backdrop-blur-sm shrink-0">
      <p className="text-[7px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
        PartoMa Project Clinical Integrity &copy; {new Date().getFullYear()}
      </p>
    </footer>
  );
}
