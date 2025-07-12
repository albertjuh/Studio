
"use client";

import { useState, useEffect } from 'react';
import { APP_NAME } from '@/lib/constants';

export function AppFooter() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Avoids hydration mismatch by not rendering on the server.
    return null;
  }

  return (
    <footer className="p-4 border-t text-center text-sm text-muted-foreground">
      <p>
        &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
