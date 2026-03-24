
"use client";

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface IdBadgeProps {
  id: string;
  className?: string;
  hideLabel?: boolean;
}

/**
 * A reusable component to display Participant IDs in their actual case
 * with a built-in copy functionality.
 */
export function IdBadge({ id, className, hideLabel = false }: IdBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id) return;
    
    navigator.clipboard.writeText(id);
    setCopied(true);
    
    // Reset icon after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  if (!id) return null;

  return (
    <div className={cn("inline-flex items-center gap-1.5 group/id-badge", className)}>
      {!hideLabel && (
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 shrink-0">
          ID:
        </span>
      )}
      <Badge 
        variant="outline" 
        className="bg-background font-mono font-bold text-[9px] px-2 py-0.5 border-2 normal-case shrink-0 whitespace-nowrap"
      >
        {id}
      </Badge>
      <button 
        onClick={handleCopy}
        className="p-1 hover:bg-primary/10 rounded-md transition-all active:scale-95 flex items-center justify-center shrink-0"
        type="button"
        title={`Copy ID: ${id}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in duration-200" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover/id-badge:text-primary transition-colors" />
        )}
      </button>
    </div>
  );
}
