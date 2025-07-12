
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from '@/lib/constants';

// In a real application, this should be a secret stored in environment variables.
const ADMIN_PASSWORD = "password"; 

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = () => {
    setIsLoading(true);
    // Simulate a network request
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        toast({ title: "Admin Login Successful", description: "Redirecting to dashboard..." });
        localStorage.setItem('userRole', 'admin');
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }, 500);
  };

  const handleWorkerLogin = () => {
    setIsLoading(true);
     setTimeout(() => {
        toast({ title: "Worker Login Successful", description: "Redirecting to data entry..." });
        localStorage.setItem('userRole', 'worker');
        router.push('/data-entry');
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <Image src="/logocntl.png" alt={`${APP_NAME} logo`} width={192} height={192} />
      <p className="text-muted-foreground">Select your role to continue</p>
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-2">Admin Login</CardTitle>
            <CardDescription>Access the full dashboard and all features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleAdminLogin} disabled={isLoading || !password}>
              {isLoading ? 'Signing In...' : 'Sign In as Admin'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
              <User className="h-8 w-8 text-secondary-foreground" />
            </div>
            <CardTitle className="mt-2">Worker Login</CardTitle>
            <CardDescription>Access data entry and operational tools.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-8 pb-4">
            <p className="text-sm text-muted-foreground">No password required.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="secondary" onClick={handleWorkerLogin} disabled={isLoading}>
              {isLoading ? 'Logging In...' : 'Log In as Worker'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
    
