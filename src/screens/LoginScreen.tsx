import { useState } from 'react';
import { PinPad } from '@/components/PinPad';
import { supabase } from '@/lib/supabase';
import { Trophy } from 'lucide-react';

type LoginStep = 'email' | 'pin' | 'otp' | 'set-pin' | 'set-name';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const handleEmailSubmit = async () => {
    if (!email.includes('@') || !email.includes('.')) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, passcode_hash')
      .eq('email', normalizedEmail)
      .single();

    if (profile?.passcode_hash) {
      // Existing user with passcode, go to PIN
      setStep('pin');
    } else {
      // New user or no passcode, send email OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: normalizedEmail });
      if (otpError) {
        setError(otpError.message);
      } else {
        setIsNewUser(!profile);
        setStep('otp');
      }
    }
    setLoading(false);
  };

  const handlePinLogin = async (pin: string) => {
    setError('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error: rpcError } = await supabase.rpc('verify_passcode', {
      p_email: normalizedEmail,
      p_passcode: pin,
    });

    if (rpcError || !data?.valid) {
      setError('Invalid passcode');
      setLoading(false);
      return;
    }

    // Passcode verified — send email OTP for session
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: normalizedEmail });
    if (otpError) {
      setError('Could not send verification email. Try again.');
      setLoading(false);
      return;
    }

    setStep('otp');
    setLoading(false);
  };

  const handleOtpVerify = async () => {
    if (otp.length < 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    if (isNewUser) {
      setStep('set-name');
    } else {
      // Check if passcode is set
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('passcode_hash, display_name')
          .eq('id', user.id)
          .single();

        if (!profile?.passcode_hash) {
          if (!profile?.display_name) {
            setStep('set-name');
          } else {
            setStep('set-pin');
          }
        } else {
          onLogin();
        }
      }
    }
    setLoading(false);
  };

  const handleSetName = async () => {
    if (!displayName.trim()) {
      setError('Enter a display name');
      return;
    }
    setError('');
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const normalizedEmail = email.trim().toLowerCase();

    // Upsert profile
    await supabase.from('profiles').upsert({
      id: user.id,
      email: normalizedEmail,
      display_name: displayName.trim(),
    });

    setStep('set-pin');
    setLoading(false);
  };

  const handleSetPin = async (pin: string) => {
    setError('');
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('set_passcode', {
      new_passcode: pin,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    onLogin();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BrawlT</h1>
          <p className="text-sm text-gray-400">Brawl Stars Tournaments</p>
        </div>

        {/* Email step */}
        {step === 'email' && (
          <div className="w-full flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none text-lg"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              onClick={handleEmailSubmit}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* PIN step */}
        {step === 'pin' && (
          <div className="flex flex-col items-center gap-4">
            <PinPad onComplete={handlePinLogin} label="Enter your 4-digit passcode" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={async () => {
                setIsNewUser(false);
                const normalizedEmail = email.trim().toLowerCase();
                await supabase.auth.signInWithOtp({ email: normalizedEmail });
                setStep('otp');
              }}
              className="text-violet-400 text-sm"
            >
              Forgot passcode?
            </button>
          </div>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <div className="w-full flex flex-col gap-4">
            <p className="text-sm text-gray-400 text-center">
              Enter the 6-digit code sent to {email}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-600 focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={handleOtpVerify}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* Set name step */}
        {step === 'set-name' && (
          <div className="w-full flex flex-col gap-4">
            <p className="text-sm text-gray-400 text-center">
              Choose a display name for tournaments
            </p>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none text-lg"
            />
            <button
              onClick={handleSetName}
              disabled={loading || !displayName.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
            >
              {loading ? 'Saving...' : 'Next'}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* Set PIN step */}
        {step === 'set-pin' && (
          <div className="flex flex-col items-center gap-4">
            <PinPad onComplete={handleSetPin} label="Set a 4-digit passcode" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
