
import { useEffect, useState } from "react";

export default function UserProfile({
  user,
  savedCount = 0,
  onClose,
  onProfileUpdated,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  if (!user) return null;

  async function handleSave(event) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Name must contain 2 to 80 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = sessionStorage.getItem("pgpilot:token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update profile."
        );
      }

      sessionStorage.setItem(
        "pgpilot:account",
        JSON.stringify(data.user)
      );

      onProfileUpdated?.(data.user);

      setEditing(false);
      setSuccess("Your profile was updated successfully!");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(user.name || "");
    setEditing(false);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          My Profile
        </h2>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
          aria-label="Close profile"
        >
          ✕
        </button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-700">
          {(user.name || "U").charAt(0).toUpperCase()}
        </div>

        <div>
          <h3 className="text-lg font-bold">
            {user.name || "PGPilot User"}
          </h3>
          <p className="text-sm text-slate-500">
            Registered User
          </p>
        </div>
      </div>

      {success && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            FULL NAME
          </p>

          {editing ? (
            <form onSubmit={handleSave} className="mt-2 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                minLength={2}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Enter your full name"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-medium">
                {user.name || "Not available"}
              </p>

              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setError("");
                  setSuccess("");
                }}
                className="text-sm font-semibold text-teal-700 hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500">
            EMAIL ADDRESS
          </p>
          <p className="mt-1 break-all font-medium">
            {user.email || "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500">
            ACCOUNT ROLE
          </p>
          <p className="mt-1 font-medium">
            {user.role || "USER"}
          </p>
        </div>

        <div className="rounded-xl bg-teal-50 p-4">
          <p className="text-sm font-medium text-teal-700">
            Your Saved PGs
          </p>
          <p className="mt-1 text-3xl font-bold text-teal-900">
            {savedCount}
          </p>
        </div>
      </div>
    </div>
  );
}
