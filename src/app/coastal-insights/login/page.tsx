
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, KeyRound, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from '@/lib/constants';

// Define users and their roles/passwords
const USERS = {
  // Admin User
  'admin': { password: 'admin123', role: 'admin' as const, name: 'Admin' },

  // Worker Users
  'lucy_25': { password: 'lucy_25', role: 'worker' as const, name: 'Lucy' },
  'riki_mahamba': { password: 'riki_mahamba', role: 'worker' as const, name: 'Riki Mahamba' },
  'katie123': { password: 'katie123', role: 'worker' as const, name: 'Katie' },
  'majid_24': { password: 'majid_24', role: 'worker' as const, name: 'Majid' },
  'test': { password: 'test', role: 'worker' as const, name: 'Test User' },
};
type UserId = keyof typeof USERS;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const user = USERS[userId.toLowerCase() as UserId];

    setTimeout(() => {
        if (user && user.password === password) {
            toast({ title: "Login Successful", description: `Welcome, ${user.name}.`, variant: "success" });
            localStorage.setItem('userRole', user.role);
            // For workers, we store their name to be used as the default supervisor/operator name in forms
            if (user.role === 'worker') {
                localStorage.setItem('supervisorName', user.name);
            } else {
                localStorage.removeItem('supervisorName');
            }
            
            const redirectPath = user.role === 'admin' ? '/coastal-insights/dashboard' : '/coastal-insights/data-entry';
            router.push(redirectPath);
        } else {
            toast({
                title: "Login Failed",
                description: "The User ID or password you entered is incorrect.",
                variant: "destructive"
            });
            setIsLoading(false);
        }
    }, 500);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-6">
       <div className="flex flex-col items-center gap-2">
        <Image src="/logocntl.png" alt={`${APP_NAME} logo`} width={80} height={80} className="w-20 h-20" />
        <h1 className="text-xl font-bold text-foreground">{APP_NAME}</h1>
      </div>
      
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
            <CardHeader className="text-center">
                <CardTitle className="mt-2">User Login</CardTitle>
                <CardDescription>Enter your credentials to access the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="userId" 
                            type="text" 
                            placeholder="e.g., lucy_25"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
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
                            placeholder="Enter your password"
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
                <Button type="submit" className="w-full" disabled={isLoading || !userId || !password}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? 'Verifying...' : 'Log In'}
                </Button>
            </CardFooter>
        </form>
      </Card>
      </div>
    </>
  );
}
