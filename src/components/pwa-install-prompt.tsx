'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string; }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const { toast, dismiss } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const handleInstallClick = useCallback(async (toastId: string) => {
    dismiss(toastId);

    if (installPromptEvent) {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setInstallPromptEvent(null);
    }
  }, [installPromptEvent, dismiss]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (installPromptEvent) {
      const { id } = toast({
        title: 'Install App',
        description: 'For a better experience, install this app on your device.',
        duration: Infinity,
        action: (
          <ToastAction altText="Install" onClick={() => handleInstallClick(id)}>
            <Download className="mr-2 h-4 w-4" />
            Install
          </ToastAction>
        ),
      });
    }
  }, [installPromptEvent, toast, handleInstallClick]);

  return null;
}
