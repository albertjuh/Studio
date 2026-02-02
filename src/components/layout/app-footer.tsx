
"use client";

import { useState, useEffect } from 'react';

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
      <div className="space-y-1">
        <p>
          &copy; {new Date().getFullYear()} bomaniTech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
