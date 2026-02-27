import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authService, SignUpData } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface FormData extends SignUpData {
  confirmPassword: string;
}

const CreateAccountForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [boundaryConfirmed, setBoundaryConfirmed] = useState(false);
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

    if (!boundaryConfirmed) {
      toast({
        title: "Confirmation Required",
        description:
          "Please confirm this platform boundary before creating an account.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await authService.signUp({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setBoundaryConfirmed(false);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
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
          <Label htmlFor="name" className="text-white/90">Full Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full bg-white text-black placeholder:text-gray-500 caret-black"
          />
        </div>
        
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
            minLength={6}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white/90">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full bg-white text-black placeholder:text-gray-500 caret-black"
          />
        </div>

        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="boundary-confirmation"
              checked={boundaryConfirmed}
              onCheckedChange={(checked) => setBoundaryConfirmed(checked === true)}
            />
            <Label
              htmlFor="boundary-confirmation"
              className="text-sm leading-relaxed text-white/90"
            >
              By creating an account, you confirm you are a woman (inclusive of
              transgender women and aligned non-binary individuals). This
              platform is not open to men or couples.
            </Label>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          disabled={isLoading || !boundaryConfirmed}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </div>
  );
};

export default CreateAccountForm;
