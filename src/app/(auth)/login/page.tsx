
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [workerName, setWorkerName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
  
  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    // This is a simple client-side check for a prototype.
    // In a real application, this should be a secure server-side check.
    if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        setTimeout(() => {
            toast({ title: "Admin Login Successful", description: "Welcome back, Admin. Redirecting to dashboard..." });
            localStorage.setItem('userRole', 'admin');
            localStorage.removeItem('supervisorName');
            setIsDialogOpen(false);
            router.push('/dashboard');
        }, 500);
    } else {
        toast({
            title: "Login Failed",
            description: "The password you entered is incorrect.",
            variant: "destructive"
        });
        setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div className="absolute top-4 right-4">
              <Button variant="ghost" onClick={() => setIsDialogOpen(true)} disabled={isLoading}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Login
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAdminLogin}>
              <DialogHeader>
                <DialogTitle>Admin Access</DialogTitle>
                <DialogDescription>
                  Enter the administrator password to access the full dashboard.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password"className="text-right">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    className="col-span-3" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading || !adminPassword}>
                    {isLoading ? 'Verifying...' : 'Log In'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      
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
    
