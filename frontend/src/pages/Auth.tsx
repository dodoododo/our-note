import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Heart } from "lucide-react";
import { authApi } from '@/api/auth.api'; // Import Service
import { AxiosError } from 'axios';

const Auth = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e : React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let data;
      
      // Sử dụng Service thay vì fetch trực tiếp
      if (isLogin) {
        data = await authApi.login({ email, password });
      } else {
        data = await authApi.register({ name, email, password });
      }

      // Axios interceptor đã trả về data sạch, không cần response.json()
      // Nếu API trả về lỗi, nó sẽ nhảy xuống catch ngay lập tức

      toast.success(isLogin ? "Welcome back!" : "Account created successfully!");
      login(data);

    } catch (error) {// 3. Xử lý lỗi 'unknown' bằng cách kiểm tra kiểu dữ liệu (Type Guard)
      let errorMessage = "An unknown error occurred";

      if (error instanceof AxiosError) {
        // Nếu là lỗi từ Axios, ta có thể truy cập response
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        // Nếu là lỗi Javascript thông thường
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 animate-fade-in w-full min-h-screen bg-slate-50/50">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-600 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-8 border border-slate-100 shadow-xl shadow-sky-100/50 bg-white">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md mx-auto mb-4
                            hover:scale-105 transition-transform duration-300 ease-out">
                <Heart className="w-7 h-7 text-yellow-200 fill-yellow-200 opacity-90" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isLogin ? 'Welcome back!' : 'Create account'}
            </h1>
            <p className="text-slate-500 mt-2">
              {isLogin ? 'Sign in to continue' : 'Start your journey with FamNotes'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="name" 
                    placeholder="Your name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="pl-10 border-slate-200 focus-visible:ring-sky-500" 
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="pl-10 border-slate-200 focus-visible:ring-sky-500" 
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="pl-10 pr-10 border-slate-200 focus-visible:ring-sky-500" 
                  required
                  minLength={6}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200/50 border-none" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-sm text-sky-600 hover:text-sky-700 hover:underline font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;