import { useState, useEffect, useCallback } from 'react';
import { Phone, Check, RefreshCw, Power } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import type { WhatsAppStatus } from '../../types';

export default function WhatsApp() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    connecting: false,
    state: 'disconnected',
  });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const { socket } = useSocket();

  // Fetch initial status
  useEffect(() => {
    api
      .get<WhatsAppStatus>('/whatsapp/status')
      .then((res) => setStatus(res.data))
      .catch(() => {
        // Silently handle — status defaults to disconnected
      })
      .finally(() => setLoading(false));
  }, []);

  // Subscribe to socket events
  useEffect(() => {
    if (!socket) return;

    const onQr = (data: { qr: string }) => {
      setStatus((prev) => ({
        ...prev,
        qr: data.qr,
        state: 'connecting',
        connecting: true,
        connected: false,
      }));
    };

    const onStatus = (data: {
      state: WhatsAppStatus['state'];
      phone?: string | null;
      connected: boolean;
      connecting: boolean;
    }) => {
      setStatus((prev) => ({
        ...prev,
        state: data.state,
        phone: data.phone ?? prev.phone,
        connected: data.connected,
        connecting: data.connecting,
        qr: data.connected ? null : prev.qr,
      }));
    };

    socket.on('wa:qr', onQr);
    socket.on('wa:status', onStatus);
    return () => {
      socket.off('wa:qr', onQr);
      socket.off('wa:status', onStatus);
    };
  }, [socket]);

  const handleLogout = useCallback(async () => {
    if (!window.confirm('Log out of WhatsApp? A new QR code will be generated.')) return;
    setLoggingOut(true);
    try {
      await api.post('/whatsapp/logout');
      // Status will update via socket; also refetch to be safe
      const res = await api.get<WhatsAppStatus>('/whatsapp/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<WhatsAppStatus>('/whatsapp/status');
      setStatus(res.data);
    } catch {
      // Keep current status
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const stateColor = {
    connected: 'bg-green-900/50 text-green-300 border-green-700',
    connecting: 'bg-blue-900/50 text-blue-300 border-blue-700',
    disconnected: 'bg-gray-700 text-gray-300 border-gray-600',
    loggedOut: 'bg-amber-900/50 text-amber-300 border-amber-700',
  }[status.state];

  const stateLabel = {
    connected: `Connected — ${status.phone || 'Unknown'}`,
    connecting: 'Waiting for QR scan…',
    disconnected: 'Disconnected — reconnecting',
    loggedOut: 'Logged out',
  }[status.state];

  const showLogout = status.state === 'connected' || status.state === 'loggedOut';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">WhatsApp Connection</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor and manage the WhatsApp connection for your bot
        </p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
              <Phone className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Connection Status</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${stateColor}`}
              >
                {status.state === 'connected' ? (
                  <Check className="h-3 w-3" />
                ) : status.state === 'connecting' ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : status.state === 'loggedOut' ? (
                  <Power className="h-3 w-3" />
                ) : (
                  <Phone className="h-3 w-3" />
                )}
                {stateLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {showLogout && (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                <Power className="h-4 w-4 inline-block mr-1" />
                {loggingOut ? 'Logging out…' : 'Log out & generate new QR'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR / Connection area */}
      {status.state === 'connected' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
          <Check className="mx-auto h-12 w-12 text-green-400" />
          <p className="mt-4 text-lg font-medium text-white">Connected</p>
          <p className="mt-1 text-sm text-gray-400">
            WhatsApp is connected and the bot is operational.
          </p>
          {status.phone && (
            <p className="mt-2 text-sm text-gray-500">
              Phone: {status.phone}
            </p>
          )}
        </div>
      )}

      {status.state === 'connecting' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8">
          {status.qr ? (
            <div className="flex flex-col items-center">
              <p className="mb-4 text-sm font-medium text-white">
                Scan this QR code with your phone
              </p>
              <div className="rounded-xl border border-gray-600 bg-white p-4">
                <img
                  src={status.qr}
                  alt="WhatsApp QR Code"
                  className="h-64 w-64 object-contain"
                />
              </div>
              <div className="mt-6 rounded-lg border border-gray-700 bg-gray-700/50 p-4 max-w-md">
                <p className="text-sm font-medium text-gray-300">How to connect:</p>
                <ol className="mt-2 space-y-1 text-sm text-gray-400 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to <span className="font-medium text-gray-300">Settings → Linked Devices</span></li>
                  <li>Tap <span className="font-medium text-gray-300">Link a Device</span></li>
                  <li>Point your camera at this QR code</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
              <p className="mt-4 text-sm text-gray-400">Generating QR code…</p>
            </div>
          )}
        </div>
      )}

      {status.state === 'loggedOut' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
          <Power className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-lg font-medium text-white">Logged Out</p>
          <p className="mt-1 text-sm text-gray-400">
            The WhatsApp session has been logged out. Click the button above to reconnect.
          </p>
        </div>
      )}

      {status.state === 'disconnected' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
          <Phone className="mx-auto h-12 w-12 text-gray-500" />
          <p className="mt-4 text-lg font-medium text-white">Disconnected</p>
          <p className="mt-1 text-sm text-gray-400">
            Attempting to reconnect automatically…
          </p>
        </div>
      )}
    </div>
  );
}
