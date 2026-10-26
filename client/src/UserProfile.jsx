import { useEffect, useState } from "react";

const Icon = ({ name, size = 20 }) => {
  const paths = {
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

export default function UserProfile({ user, savedCount = 0, onClose, onProfileUpdated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { setName(user?.name || ""); }, [user?.name]);
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
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.user) throw new Error(data.message || "Unable to update profile.");
      sessionStorage.setItem("pgpilot:account", JSON.stringify(data.user));
      onProfileUpdated?.(data.user);
      setEditing(false);
      setSuccess("Your profile was updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setName(user.name || "");
    setEditing(false);
    setError("");
  }

  const joined = user.createdAt || user.created_at;
  const joinedDate = joined && !Number.isNaN(new Date(joined).getTime())
    ? new Date(joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <section className="w-full overflow-hidden rounded-[26px] border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" aria-labelledby="profile-heading">
      <div className="relative bg-gradient-to-br from-[#102746] via-[#164579] to-[#2563eb] px-6 pb-8 pt-6 text-white sm:px-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Your PGPilot workspace</p><h2 id="profile-heading" className="mt-1 text-2xl font-extrabold sm:text-3xl">My Profile</h2></div>
          <button type="button" onClick={onClose} aria-label="Close profile" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-xl transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">×</button>
        </div>
        <div className="relative mt-7 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] border-4 border-white/30 bg-white/20 text-3xl font-black shadow-lg" aria-label="Profile initial">{(user.name || "U").charAt(0).toUpperCase()}</div>
          <div className="min-w-0"><h3 className="truncate text-xl font-extrabold sm:text-2xl">{user.name || "PGPilot User"}</h3><p className="mt-1 break-all text-sm text-blue-100">{user.email || "Email unavailable"}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Icon name="shield" size={14}/> PGPilot Member</span></div>
        </div>
      </div>
      <div className="space-y-5 px-6 py-6 sm:px-8">
        {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Icon name="check" size={18}/>{success}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-base font-extrabold">Personal information</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manage the details associated with your account.</p></div>{!editing && <button type="button" onClick={() => { setEditing(true); setError(""); setSuccess(""); }} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"><Icon name="edit" size={16}/> Edit name</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon name="user" size={16}/> Full name</p>{editing ? <form id="pgpilot-profile-form" onSubmit={handleSave} className="mt-3"><label htmlFor="pgpilot-profile-name" className="sr-only">Full name</label><input id="pgpilot-profile-name" autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required disabled={saving} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></form> : <p className="mt-3 break-words font-semibold">{user.name || "Not available"}</p>}</div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon name="mail" size={16}/> Email address</p><p className="mt-3 break-all font-semibold">{user.email || "Not available"}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Email changes aren't supported here.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon name="shield" size={16}/> Account role</p><p className="mt-3 font-semibold capitalize">{String(user.role || "User").toLowerCase()}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon name="calendar" size={16}/> Member since</p><p className="mt-3 font-semibold">{joinedDate || "Not available"}</p></div>
        </div>
        {editing && <div className="flex flex-wrap gap-2"><button type="submit" form="pgpilot-profile-form" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving changes…" : "Save changes"}</button><button type="button" onClick={cancelEditing} disabled={saving} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button></div>}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-4 dark:border-blue-900 dark:from-slate-800 dark:to-slate-800"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Your shortlist</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">PGs saved to your wishlist</p></div><div className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><Icon name="heart" size={21}/><span className="text-3xl font-black tabular-nums">{savedCount}</span></div></div>
        <p className="text-center text-xs text-slate-400">Appearance and accessibility preferences are available in Account Settings.</p>
      </div>
    </section>
  );
}
