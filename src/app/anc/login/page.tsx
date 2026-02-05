'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, KeyRound, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const researchAssistants = [
    { id: 'lucy_25', name: 'Lucy', password: 'lucy_25' },
    { id: 'riki_mahamba', name: 'Riki Mahamba', password: 'riki_mahamba' },
    { id: 'katie123', name: 'Katie', password: 'katie123' },
    { id: 'majid_24', name: 'Majid', password: 'majid_24' },
];

export default function AncLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [researcherId, setResearcherId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const user = researchAssistants.find(ra => ra.id === researcherId && ra.password === password);

    if (user) {
        setTimeout(() => {
            toast({ title: "Login Successful", description: `Welcome, ${user.name}. Redirecting...` });
            localStorage.setItem('ancUser', JSON.stringify({ id: user.id, name: user.name }));
            // Redirect to the new ANC home page
            router.push('/anc');
        }, 500);
    } else {
        setTimeout(() => {
            toast({
                title: "Login Failed",
                description: "The ID or password you entered is incorrect.",
                variant: "destructive"
            });
            setIsLoading(false);
        }, 500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-950 bg-repeat bg-[url(&quot;data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3e%3cg fill='none' stroke='%23d4d4d8' stroke-width='0.5'%3e%3cpath d='M20 0 V 40 M0 20 H 40'/%3e%3c/g%3e%3c/svg%3e&quot;)] dark:bg-[url(&quot;data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3e%3cg fill='none' stroke='%2327272a' stroke-width='0.5'%3e%3cpath d='M20 0 V 40 M0 20 H 40'/%3e%3c/g%3e%3c/svg%3e&quot;)]">
      <div className="w-full max-w-md">
         <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">PartoMa Project Cohort</h1>
            <p className="text-muted-foreground">Research Assistant Login</p>
        </div>

        <Card className="shadow-lg">
            <form onSubmit={handleLogin}>
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                    <CardDescription>Please enter your ID and password to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="researcherId">Research Assistant ID</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="researcherId" 
                                type="text" 
                                placeholder="e.g., lucy_25"
                                value={researcherId}
                                onChange={(e) => setResearcherId(e.target.value)}
                                disabled={isLoading}
                                required
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
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading || !researcherId || !password}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? 'Verifying...' : 'Log In'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
            Having trouble logging in? Contact the study coordinator.
        </p>
      </div>
    </div>
  );
}
