
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Loader2, KeyRound } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const USERS = {
    clinician: { password: 'password', name: 'Clinician' },
    'data-clerk': { password: 'password', name: 'Data Clerk' },
};

export default function AncLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'clinician' | 'data-clerk'>('clinician');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const userCredentials = USERS[role];
    let isLoginValid = false;
    let loggedInUserName = '';

    if (userCredentials && password === userCredentials.password) {
        isLoginValid = true;
        loggedInUserName = userCredentials.name;
    }

    if (isLoginValid) {
        setTimeout(() => {
            toast({ title: 'Login Successful', description: `Welcome, ${loggedInUserName}.` });
            localStorage.setItem('ancUser', JSON.stringify({ name: loggedInUserName, role: role }));
            router.push('/anc/dashboard');
        }, 500);
    } else {
        setTimeout(() => {
            toast({
                title: 'Login Failed',
                description: 'The password you entered is incorrect.',
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
                        <CardDescription>Select your role and enter the password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="role">Your Role</Label>
                             <Select onValueChange={(v) => setRole(v as any)} defaultValue={role}>
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="clinician">Clinician</SelectItem>
                                    <SelectItem value="data-clerk">Data Clerk</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <Button type="submit" className="w-full" disabled={isLoading || !password}>
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
