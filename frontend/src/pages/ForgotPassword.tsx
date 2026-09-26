import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Boxes, AlertCircle, CheckCircle2, Mail, KeyRound, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'request_otp' | 'verify_reset'>('request_otp');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered account email.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const msg = await forgotPassword(email);
      setSuccessMessage(msg || 'An OTP verification code has been dispatched to your email.');
      setStep('verify_reset');
    } catch (err: any) {
      console.error('Request OTP error:', err);
      const apiMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Could not request password reset OTP. Please check your backend connection.';
      setError(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP & Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setError('Please enter the OTP code and your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const msg = await resetPassword({ email, otp, new_password: newPassword });
      setSuccessMessage(msg || 'Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      const apiMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Invalid or expired OTP code. Please try again.';
      setError(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mb-3">
            <Boxes className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Account Password</h2>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'request_otp'
              ? 'Receive an OTP code to verify your identity'
              : 'Enter your verification OTP code & new password'}
          </p>
        </div>

        {/* Status Indicators */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 leading-snug">{successMessage}</div>
          </div>
        )}

        {/* Step 1: Request OTP Form */}
        {step === 'request_otp' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              label="Registered Email Address"
              type="email"
              placeholder="operator@stocksense.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
              helperText="We will send a 6-digit verification OTP code to this email."
            />

            <Button
              type="submit"
              className="w-full mt-3"
              size="lg"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Send OTP Code
            </Button>
          </form>
        )}

        {/* Step 2: Verify OTP & Reset Password Form */}
        {step === 'verify_reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              value={email}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Verification OTP Code"
              type="text"
              placeholder="e.g. 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4" />}
              required
              maxLength={10}
              autoComplete="one-time-code"
              helperText="Enter the verification code received via email/backend."
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              className="w-full mt-3"
              size="lg"
              isLoading={isLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Reset & Save Password
            </Button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep('request_otp')}
                className="text-slate-500 hover:text-slate-700 underline"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-indigo-600 hover:text-indigo-800 font-medium underline"
                disabled={isLoading}
              >
                Resend OTP Code
              </button>
            </div>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
