import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService, LoginData } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { useLocation, useNavigate } from 'react-router-dom';

interface LoginFormProps {
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authService.signIn(formData);
      toast({
        title: "Success!",
        description: "You have been logged in successfully.",
      });
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      const target = redirect && redirect.startsWith('/') ? redirect : '/social';
      navigate(target, { replace: true });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
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
          <Label htmlFor="email" className="text-white/90">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full bg-white text-black placeholder:text-gray-500 caret-black"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/90">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full bg-white text-black placeholder:text-gray-500 caret-black"
          />
        </div>
        
        <div className="text-right">
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-white/80 hover:text-white"
            onClick={onForgotPassword}
          >
            Forgot password?
          </Button>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <SocialLoginButtons />
    </div>
  );
};

export default LoginForm;
