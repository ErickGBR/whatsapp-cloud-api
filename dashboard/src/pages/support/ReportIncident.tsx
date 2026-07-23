import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import api from "../../services/api";

export default function ReportIncident() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.post("/activity", {
        action: "incident_reported",
        details: `[${priority.toUpperCase()}] ${title}: ${description}`,
      });
      setSuccess(true);
      setTitle("");
      setDescription("");
      setPriority("medium");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report incident");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Report Incident</h1>
          <p className="mt-1 text-sm text-gray-400">
            Report technical issues or incidents
          </p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/30">
            <AlertTriangle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Incident Reported</h2>
          <p className="mt-2 text-sm text-gray-400">
            Your incident has been reported. The admin team will review it shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-6 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            Report Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Report Incident</h1>
        <p className="mt-1 text-sm text-gray-400">
          Report technical issues, bugs, or operational incidents
        </p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title of the incident"
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Detailed description of what happened..."
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Incident Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
