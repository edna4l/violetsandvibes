import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService, LoginData } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';

// TEMPORARY: Enable passwordless login via email magic link
const TEMP_PASSWORDLESS_LOGIN = true;

interface LoginFormProps {
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (TEMP_PASSWORDLESS_LOGIN) {
        await authService.signInWithOtp(email);
        toast({
          title: "Check your email!",
          description: "We've sent you a magic link to log in without a password.",
        });
      } else {
        // Original password-based login
        await authService.signIn({ email, password: '' }); // This won't work, but keeping for structure
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your email and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={handleChange}
            required
            className="w-full"
          />
        </div>
        
        {!TEMP_PASSWORDLESS_LOGIN && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value="" // Not used in passwordless mode
              onChange={() => {}} // Not used
              required
              className="w-full"
            />
          </div>
        )}
        
        {!TEMP_PASSWORDLESS_LOGIN && (
          <div className="text-right">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={onForgotPassword}
            >
              Forgot password?
            </Button>
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          disabled={isLoading}
        >
          {isLoading ? 'Sending magic link...' : TEMP_PASSWORDLESS_LOGIN ? 'Send Magic Link' : 'Sign In'}
        </Button>
      </form>
      
      <SocialLoginButtons />
    </div>
  );
};

export default LoginForm;