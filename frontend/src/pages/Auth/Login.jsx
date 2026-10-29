import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://instagram-clone-react-django.onrender.com/api";

const getApiErrorMessage = (data, fallback) => {
    if (typeof data?.detail === "string" && data.detail.trim()) {
        return data.detail;
    }

    if (typeof data?.error === "string" && data.error.trim()) {
        return data.error;
    }

    for (const value of Object.values(data || {})) {
        if (Array.isArray(value) && value.length) {
            const first = value[0];
            if (typeof first === "string" && first.trim()) return first;
        }

        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }

    return fallback;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false); // ✅ NEW: Password visibility toggle
    const [error, setError] = useState("");
    const [otp, setOtp] = useState("");
    const [requiresOtp, setRequiresOtp] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError("");

        try {
            const response = await fetchWithTimeout(`${API_URL}/token/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, ...(requiresOtp ? { otp } : {}) }),
            });
            const data = await response.json();

            if (!response.ok) {
                const backendError = getApiErrorMessage(data, "Invalid username or password.");
                setError(backendError);
                if ((backendError || "").toLowerCase().includes("two-factor authentication code is required")) {
                    setRequiresOtp(true);
                }
                return;
            }

            localStorage.setItem("access_token", data.access);
            localStorage.setItem("refresh_token", data.refresh);
            localStorage.setItem("logged_in_username", username.trim());
            navigate("/");
        } catch (requestError) {
            console.error("Login Error:", requestError);
            if (requestError?.name === "AbortError") {
                setError("Request timed out. The server is busy, please try again.");
                return;
            }
            setError("Network error. The server might be waking up from sleep. Please wait a minute and try again.");
        }
    }

    // =====================================================
    // PIKACHAT THEME CLASSES
    // =====================================================
    const inputClasses = "w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-[#FFCB05] focus:ring-2 focus:ring-yellow-100 transition-all";
    const buttonClasses = "w-full rounded-lg bg-[#FFCB05] p-3 font-bold text-gray-900 hover:bg-[#e6b800] transition-colors disabled:opacity-50";
    const linkClasses = "font-semibold text-yellow-600 hover:text-yellow-700 transition-colors";

    return (
        <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-[#FFFEF0] to-amber-50 px-4 py-10 flex items-center justify-center">
            <div className="w-full max-w-sm">
                <section className="rounded-2xl border border-yellow-200 bg-white p-8 shadow-xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-3 text-6xl drop-shadow-sm">⚡</div>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">PikaChat</h1>
                        <p className="mt-2 text-sm text-gray-600">Welcome back, Trainer!</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Username, email or phone"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={inputClasses}
                            autoComplete="username"
                            required
                        />
                        
                        {/* ✅ PASSWORD FIELD WITH EYE ICON */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`${inputClasses} pr-10`} // pr-10 adds space for the icon
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    // Eye Slash Icon (Hide)
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    // Eye Icon (Show)
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        
                        {requiresOtp && (
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength="6"
                                placeholder="Authenticator app code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className={inputClasses}
                                required
                            />
                        )}
                        
                        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}
                        
                        <button 
                            type="submit" 
                            className={buttonClasses}
                        >
                            Log in ⚡
                        </button>
                    </form>

                    {/* ✅ Google Sign-In & Forgot Password REMOVED for a clean, working demo */}

                </section>

                {/* Sign up CTA */}
                <div className="mt-4 rounded-lg border border-yellow-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-700">
                        Don't have an account? 
                        <button 
                            type="button"
                            onClick={() => navigate("/signup")}
                            className={`ml-1 ${linkClasses}`}
                        >
                            Sign up
                        </button>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default Login;