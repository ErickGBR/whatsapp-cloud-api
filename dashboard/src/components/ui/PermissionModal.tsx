import { useState } from "react";
import { X } from "lucide-react";
import api from "../../services/api";
import type { PermissionType } from "../../types";

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const permissionTypes: { value: PermissionType; label: string }[] = [
  { value: "break", label: "Break" },
  { value: "bathroom", label: "Bathroom" },
  { value: "eating", label: "Eating" },
  { value: "other", label: "Other" },
];

export function PermissionModal({ isOpen, onClose }: PermissionModalProps) {
  const [type, setType] = useState<PermissionType>("break");
  const [duration, setDuration] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.post("/permissions", { type, maxDuration: duration });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request permission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-gray-800 border border-gray-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Request Permission</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PermissionType)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {permissionTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {submitting ? "Requesting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
