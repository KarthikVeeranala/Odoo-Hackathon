import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Boxes, AlertCircle, Mail, Lock, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  // Pre-filled with demo credentials by default for seamless evaluator experience
  const [email, setEmail] = useState('admin@stocksense.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const doLogin = async (eMailToUse: string, pwdToUse: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await login({ email: eMailToUse, password: pwdToUse });
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const apiMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to authenticate with backend server.';
      setError(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    await doLogin(email, password);
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    await doLogin(demoEmail, demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900/95 p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mb-3">
            <Boxes className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">StockSense IMS</h2>
          <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Odoo × GCET Hyderabad Hackathon 2026
          </p>
        </div>

        {/* Hackathon Evaluator Quick Access Card */}
        <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/70 border border-indigo-100 rounded-xl text-xs space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Demo Evaluator Credentials
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Ready
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-indigo-100/60 font-mono">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans">Email</span>
              admin@stocksense.com
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans">Password</span>
              Password@123
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@stocksense.com', 'Password@123')}
              className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              disabled={isLoading}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              1-Click Admin Login
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('operator@stocksense.com', 'Password@123')}
              className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium text-xs transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              Operator
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@stocksense.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isLoading}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to StockSense
          </Button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          Don't have an operator account?{' '}
          <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
            Register new account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
