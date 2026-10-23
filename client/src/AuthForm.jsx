import { useState } from "react";

export default function AuthForm({ onLogin, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Authentication failed");
      }
      setPassword("");
      if (data.token && data.user) {
        onLogin(data.token, data.user);
      } else if (isRegister) {
        setMode("login");
        setNotice("Account created successfully. Please log in.");
      } else {
        throw new Error("Login response did not include an access token.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
  setMode(isRegister ? "login" : "register");
  setError("");
  setNotice("");
  setPassword("");
  setShowPassword(false);
}

  const fieldClass = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500";
  return (
    <div className="w-full rounded-2xl bg-white p-6 sm:p-8">
      <h2 className="pr-8 text-2xl font-bold text-slate-900">
        {isRegister ? "Create your PGPilot account" : "Welcome back"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {isRegister ? "Register to save your favorite PGs." : "Log in to access your saved PGs."}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isRegister && (
          <div>
            <label htmlFor="auth-name" className="mb-1 block text-sm font-semibold">Full Name</label>
            <input id="auth-name" type="text" value={name} onChange={e => setName(e.target.value)}
              minLength={2} maxLength={100} required autoComplete="name" className={fieldClass} placeholder="Enter your full name" />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="mb-1 block text-sm font-semibold">Email Address</label>
          <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoComplete="email" className={fieldClass} placeholder="Enter your email" />
        </div>
        <div>
  <label
    htmlFor="auth-password"
    className="mb-1 block text-sm font-semibold"
  >
    Password
  </label>

  <div className="relative">
    <input
      id="auth-password"
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      minLength={8}
      maxLength={72}
      required
      autoComplete={isRegister ? "new-password" : "current-password"}
      className={`${fieldClass} pr-14`}
      placeholder="Minimum 8 characters"
    />

    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      aria-pressed={showPassword}
      title={showPassword ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-3 flex items-center justify-center px-2 text-slate-500 hover:text-teal-700"
    >
      {showPassword ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a14 14 0 0 1-3.2 4.1" />
          <path d="M6.6 6.6C3.5 8.5 2 12 2 12s3 7 10 7a10.5 10.5 0 0 0 4.3-.9" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  </div>
</div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {loading ? "Please wait..." : isRegister ? "Create Account" : "Login"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        {isRegister ? "Already have an account?" : "New to PGPilot?"}{" "}
        <button type="button" onClick={switchMode} className="font-bold text-teal-700 hover:underline">
          {isRegister ? "Login" : "Create Account"}
        </button>
      </p>
    </div>
  );
}
