
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ShieldCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [workerName, setWorkerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleWorkerLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
        toast({ title: "Login Successful", description: `Welcome, ${workerName}. Redirecting to data entry...` });
        localStorage.setItem('userRole', 'worker');
        localStorage.setItem('supervisorName', workerName);
        router.push('/data-entry');
    }, 500);
  };
  
  const handleAdminLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
        toast({ title: "Admin Login Successful", description: "Welcome back, Admin. Redirecting to dashboard..." });
        localStorage.setItem('userRole', 'admin');
        localStorage.removeItem('supervisorName');
        router.push('/dashboard');
    }, 500);
  };

  return (
    <>
      <div className="absolute top-4 right-4">
        <Button variant="ghost" onClick={handleAdminLogin} disabled={isLoading}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          Admin Login
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center space-y-6">
       <div className="flex flex-col items-center gap-2">
        <Image src="/logocntl.png" alt={`${APP_NAME} logo`} width={80} height={80} className="w-20 h-20" />
        <h1 className="text-xl font-bold text-foreground">{APP_NAME}</h1>
      </div>
      
      <Card className="w-full max-w-sm">
        <form onSubmit={handleWorkerLogin}>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                    <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-2">Worker / Supervisor Login</CardTitle>
                <CardDescription>Enter your name to access data entry forms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="workerName">Your Name</Label>
                    <Input 
                    id="workerName" 
                    type="text" 
                    placeholder="Enter your full name"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    disabled={isLoading}
                    required
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading || !workerName}>
                    {isLoading ? 'Logging In...' : 'Log In & Start Entry'}
                </Button>
            </CardFooter>
        </form>
      </Card>
      </div>
    </>
  );
}
    
