
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
  'test': { password: 'test', role: 'clinician' as const, name: 'Test User' },
  'admin': { password: 'admin', role: 'admin' as const, name: 'Admin' },
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
            router.push('/anc/dashboard');
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
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-sm px-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <ClipboardCheck className="h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">PartoMa Project Cohort</h1>
                <p className="text-muted-foreground">Log in to manage study data.</p>
            </div>
        
            <Card className="w-full">
                <form onSubmit={handleLogin}>
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>Enter your username and password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
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
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="password" 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    placeholder="password"
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading || !username || !password}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isLoading ? 'Verifying...' : 'Log In'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    </div>
  );
}
