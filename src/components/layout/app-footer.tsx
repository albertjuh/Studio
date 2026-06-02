"use client";

import { useState, useEffect } from 'react';

export function AppFooter() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <footer className="p-2 border-t text-center text-[10px] text-muted-foreground/40 bg-background/30 backdrop-blur-sm">
      <p>
        &copy; {new Date().getFullYear()} PartoMa Project Clinical Integrity
      </p>
    </footer>
  );
}
