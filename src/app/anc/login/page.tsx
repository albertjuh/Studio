
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Loader2, KeyRound, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const USERS = {
  'lucy_25': { password: 'lucy_25', role: 'clinician' as const, name: 'Lucy' },
  'riki_mahamba': { password: 'riki_mahamba', role: 'clinician' as const, name: 'Riki Mahamba' },
  'katie123': { password: 'katie123', role: 'clinician' as const, name: 'Katie' },
  'majid_24': { password: 'majid_24', role: 'clinician' as const, name: 'Majid' },
  'shploghers': { password: 'majid_24', role: 'clinician' as const, name: 'Majid' }, 
  'victor': { password: 'victor_idi', role: 'clinician' as const, name: 'Victor' },
  'test': { password: 'test', role: 'clinician' as const, name: 'Test User' },
  'admin': { password: 'admin', role: 'admin' as const, name: 'Admin' },
  'viewer_2026': { password: 'viewer_password', role: 'viewer' as const, name: 'Study Observer' },
};

export default function AncLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const userCredentials = USERS[username.toLowerCase() as keyof typeof USERS];

    if (userCredentials && password === userCredentials.password) {
        setTimeout(() => {
            toast({ title: 'Login Successful', description: `Welcome, ${userCredentials.name}.`, variant: "success" });
            localStorage.setItem('ancUser', JSON.stringify({ name: userCredentials.name, role: userCredentials.role }));
            
            // Set Admin Bypass Cookie if applicable
            if (userCredentials.role === 'admin') {
              document.cookie = "admin_bypass=true; path=/; max-age=31536000; samesite=lax";
            } else {
              document.cookie = "admin_bypass=false; path=/; max-age=0";
            }

            // Pre-fetch key pages for offline use if possible
            if ('caches' in window && navigator.onLine) {
              caches.open('partoma-v3').then(cache => {
                const urlsToCache = [
                  '/anc/activities',
                  '/anc/dashboard',
                  '/anc/register',
                  '/anc/login'
                ];
                cache.addAll(urlsToCache).catch(() => {});
              });
            }
            
            router.push('/anc/activities');
        }, 500);
    } else {
        setTimeout(() => {
            toast({
                title: 'Login Failed',
                description: 'The username or password you entered is incorrect.',
                variant: "destructive"
            });
            setIsLoading(false);
        }, 500);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-muted/40 overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-sm px-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <ClipboardCheck className="h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold text-foreground font-black tracking-tighter uppercase">PartoMa <span className="text-primary">Project</span></h1>
                <p className="text-muted-foreground text-sm font-medium">Study Data Intelligence System</p>
            </div>
        
            <Card className="w-full shadow-2xl border-none ring-1 ring-border rounded-[2rem] overflow-hidden">
                <form onSubmit={handleLogin}>
                    <CardHeader className="bg-primary/5 border-b py-8">
                        <CardTitle className="text-2xl font-black tracking-tight">Staff Login</CardTitle>
                        <CardDescription className="font-medium">Enter your credentials to access study modules.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-8 p-8">
                         <div className="space-y-2">
                            <Label htmlFor="username" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Username</Label>
                             <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="username" 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    placeholder="e.g., lucy_25"
                                    className="pl-10 h-12 rounded-xl border-2"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="password" 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    placeholder="••••••••"
                                    className="pl-10 h-12 rounded-xl border-2"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-8 pt-0">
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-white" disabled={isLoading || !username || !password}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLoading ? 'Verifying...' : 'Access Intelligence'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    </div>
  );
}
