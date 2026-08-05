import { useState, useEffect, useCallback } from 'react';
import { Save, Check } from 'lucide-react';
import api from '../../services/api';
import type { BotConfig as BotConfigType } from '../../types';

const AI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

export default function BotConfig() {
  const [config, setConfig] = useState<BotConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled form state
  const [businessName, setBusinessName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [ticketCommandsRaw, setTicketCommandsRaw] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');

  // Load config
  useEffect(() => {
    api
      .get<BotConfigType>('/admin/bot-config')
      .then((res) => {
        const data = res.data;
        setConfig(data);
        setBusinessName(data.businessName);
        setSystemPrompt(data.systemPrompt);
        setWelcomeMessage(data.welcomeMessage ?? '');
        setTicketCommandsRaw(data.ticketCommands.join('\n'));
        setAiModel(data.aiModel);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load bot configuration');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    // Split ticketCommands by newline or comma, trim, filter empty
    const ticketCommands = ticketCommandsRaw
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      const res = await api.put<BotConfigType>('/admin/bot-config', {
        businessName,
        systemPrompt,
        welcomeMessage: welcomeMessage.trim() || null,
        ticketCommands,
        aiModel,
      });
      setConfig(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save configuration';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [businessName, systemPrompt, welcomeMessage, ticketCommandsRaw, aiModel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bot Configuration</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure your WhatsApp bot's behavior, persona, and AI model
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Config form */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 space-y-6">
        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-1.5">
            Business Name
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="e.g. My Company"
          />
        </div>

        {/* System Prompt */}
        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-300 mb-1.5">
            System Prompt
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Your bot's context, persona and instructions (used by Gemini)
          </p>
          <textarea
            id="systemPrompt"
            rows={12}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
            placeholder="You are a helpful customer service assistant for..."
          />
        </div>

        {/* Welcome Message */}
        <div>
          <label htmlFor="welcomeMessage" className="block text-sm font-medium text-gray-300 mb-1.5">
            Welcome Message
          </label>
          <textarea
            id="welcomeMessage"
            rows={3}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
            placeholder="Hello! How can I help you today?"
          />
        </div>

        {/* Ticket Commands */}
        <div>
          <label htmlFor="ticketCommands" className="block text-sm font-medium text-gray-300 mb-1.5">
            Ticket Commands
          </label>
          <p className="text-xs text-gray-500 mb-2">
            WhatsApp ticket commands (one per line or comma-separated). ticketCommands triggers the bot to open a support ticket directly when a customer sends it in WhatsApp.
          </p>
          <textarea
            id="ticketCommands"
            rows={4}
            value={ticketCommandsRaw}
            onChange={(e) => setTicketCommandsRaw(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y font-mono text-sm"
            placeholder={"help\nsupport\nticket"}
          />
        </div>

        {/* AI Model */}
        <div>
          <label htmlFor="aiModel" className="block text-sm font-medium text-gray-300 mb-1.5">
            AI Model
          </label>
          <select
            id="aiModel"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {AI_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Metadata */}
        {config && (
          <div className="flex gap-6 text-xs text-gray-500 border-t border-gray-700 pt-4">
            <span>Created: {new Date(config.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(config.updatedAt).toLocaleString()}</span>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 border-t border-gray-700 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved ✓
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Configuration
              </>
            )}
          </button>
          {saved && (
            <span className="text-sm text-green-400">Configuration updated successfully.</span>
          )}
        </div>
      </div>
    </div>
  );
}
