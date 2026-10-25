import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoogleSignIn from "../../components/auth/GoogleSignIn";

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
    const [error, setError] = useState("");
    const [otp, setOtp] = useState("");
    const [requiresOtp, setRequiresOtp] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [recoveryMessage, setRecoveryMessage] = useState("");

    async function requestPasswordReset() {
        try {
            const response = await fetchWithTimeout(`${API_URL}/users/password/forgot/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: recoveryEmail }),
            });
            const data = await response.json();
            setRecoveryMessage(response.ok ? (data.detail || "Please check your email.") : getApiErrorMessage(data, "Please check your email."));
        } catch (requestError) {
            console.error(requestError);
            if (requestError?.name === "AbortError") {
                setRecoveryMessage("Request timed out. The server is busy, please try again.");
                return;
            }
            setRecoveryMessage("Network error. The server might be waking up from sleep. Please wait a minute and try again.");
        }
    }

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
                        
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClasses}
                            autoComplete="current-password"
                            required
                        />
                        
                        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}
                        
                        <button 
                            type="submit" 
                            className={buttonClasses}
                        >
                            Log in ⚡
                        </button>
                    </form>

                    {/* Google Sign-In */}
                    <div className="mt-4">
                        <GoogleSignIn />
                    </div>

                    {/* Forgot Password */}
                    <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-yellow-200"></div>
                        <span className="text-sm text-gray-500">or</span>
                        <div className="flex-1 border-t border-yellow-200"></div>
                    </div>

                    <button 
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className={`w-full text-center text-sm ${linkClasses}`}
                    >
                        Forgot password?
                    </button>

                    {showForgotPassword && (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs text-gray-600 mb-2">Enter your email to receive a password reset link:</p>
                            <input 
                                type="email" 
                                value={recoveryEmail} 
                                onChange={(e) => setRecoveryEmail(e.target.value)} 
                                placeholder="Your account email" 
                                className={inputClasses}
                            />
                            <button 
                                type="button" 
                                onClick={requestPasswordReset} 
                                className="w-full rounded-lg bg-[#FFCB05] px-3 py-2 text-sm font-bold text-gray-900 hover:bg-[#e6b800] transition-colors"
                            >
                                Send reset link
                            </button>
                            {recoveryMessage && <p className="text-xs text-blue-600 text-center">{recoveryMessage}</p>}
                        </div>
                    )}
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