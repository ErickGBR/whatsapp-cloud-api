import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [demo, setDemo] = useState<{
    enabled: boolean;
    admin?: { email: string; password: string } | null;
    support?: { email: string; password: string } | null;
  }>({ enabled: false, admin: null, support: null });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/auth/demo')
      .then((res) => setDemo(res.data))
      .catch(() => setDemo({ enabled: false, admin: null, support: null }));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/support/tickets');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setSeedMsg(null);
      await api.post('/auth/seed');
      setSeedMsg('Admin user created! Use the admin credentials set via ADMIN_EMAIL / ADMIN_PASSWORD');
    } catch (err) {
      setSeedMsg(
        err instanceof Error ? err.message : 'Failed to seed admin user'
      );
    } finally {
      setSeeding(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError(null);
    setSeedMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 shadow-lg shadow-purple-600/30">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WhatsBot</h1>
          <p className="mt-1 text-gray-400">Sales Dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
          <h2 className="mb-6 text-lg font-semibold text-white">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='you@example.com'
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 pr-10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {demo.enabled && (demo.admin || demo.support) && (
          <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1">Demo accounts</h3>
            <p className="text-xs text-gray-400 mb-4">
              Use a demo account below to sign in as Admin or Support.
            </p>

            <div className="space-y-3">
              {demo.admin && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-700/50 px-4 py-3">
                  <span className="shrink-0 rounded-md bg-purple-600/20 px-2 py-0.5 text-xs font-medium text-purple-300">
                    Admin
                  </span>
                  <span className="truncate font-mono text-xs text-gray-300">{demo.admin.email}</span>
                  <span className="shrink-0 font-mono text-xs text-gray-500">••••••••</span>
                  <button
                    type="button"
                    onClick={() => fillDemo(demo.admin!.email, demo.admin!.password)}
                    className="ml-auto shrink-0 rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    Use
                  </button>
                </div>
              )}

              {demo.support && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-700/50 px-4 py-3">
                  <span className="shrink-0 rounded-md bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                    Support
                  </span>
                  <span className="truncate font-mono text-xs text-gray-300">{demo.support.email}</span>
                  <span className="shrink-0 font-mono text-xs text-gray-500">••••••••</span>
                  <button
                    type="button"
                    onClick={() => fillDemo(demo.support!.email, demo.support!.password)}
                    className="ml-auto shrink-0 rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    Use
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {seedMsg && (
          <p className="mt-3 text-center text-xs text-gray-400">{seedMsg}</p>
        )}

        <button
          type="button"
          disabled={seeding}
          onClick={handleSeed}
          className="mt-2 block w-full text-center text-xs text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-50"
        >
          {seeding ? 'Seeding...' : 'Seed Admin'}
        </button>

        <p className="mt-6 text-center text-xs text-gray-500">
          WhatsApp Bot Sales Dashboard v2.0
        </p>
      </div>
    </div>
  );
}
