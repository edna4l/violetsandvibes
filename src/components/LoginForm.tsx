import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService, LoginData } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword }) => {
  const [formData, setFormData] = useState<LoginData>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.signIn(formData);
      toast({ title: "Success!", description: "You have been logged in successfully." });
      window.location.href = '/social';
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

  const inputClass =
    "pl-10 bg-black/30 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus-visible:ring-purple-400/30";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/80 text-sm">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-white/80 text-sm">Password</Label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Sign In button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 font-semibold gap-2 mt-2"
          disabled={isLoading}
        >
          {!isLoading && <Sparkles className="w-4 h-4" />}
          {isLoading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
