import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";
import GoogleSignIn from "../../components/auth/GoogleSignIn";

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
            const response = await fetch("http://127.0.0.1:8000/api/users/password/forgot/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: recoveryEmail }),
            });
            const data = await response.json();
            setRecoveryMessage(data.detail || "Please check your email.");
        } catch {
            setRecoveryMessage("Could not send the reset request. Try again.");
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        setError("");

        try {
            const response = await fetch("http://127.0.0.1:8000/api/token/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, ...(requiresOtp ? { otp } : {}) }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Invalid username or password.");
                if ((data.detail || "").toLowerCase().includes("two-factor authentication code is required")) {
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
            setError("Could not connect to the server. Please try again.");
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4 py-10 flex items-center justify-center">
            <div className="w-full max-w-sm">
                <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <FaInstagram className="mx-auto mb-3 text-5xl text-pink-600" aria-hidden="true" />
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">Instagram</h1>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Username, email or phone"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
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
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                                required
                            />
                        )}
                        
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            autoComplete="current-password"
                            required
                        />
                        
                        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}
                        
                        <button 
                            type="submit" 
                            className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 p-3 font-semibold text-white hover:opacity-95 transition-opacity"
                        >
                            Log in
                        </button>
                    </form>

                    {/* Google Sign-In */}
                    <div className="mt-4">
                        <GoogleSignIn />
                    </div>

                    {/* Forgot Password */}
                    <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-gray-200"></div>
                        <span className="text-sm text-gray-500">or</span>
                        <div className="flex-1 border-t border-gray-200"></div>
                    </div>

                    <button 
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className="w-full text-center text-sm font-semibold text-pink-600 hover:text-pink-700"
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
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            />
                            <button 
                                type="button" 
                                onClick={requestPasswordReset} 
                                className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-95 transition-opacity"
                            >
                                Send reset link
                            </button>
                            {recoveryMessage && <p className="text-xs text-blue-600 text-center">{recoveryMessage}</p>}
                        </div>
                    )}
                </section>

                {/* Sign up CTA */}
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-700">
                        Don't have an account? 
                        <button 
                            type="button"
                            onClick={() => navigate("/signup")}
                            className="ml-1 font-semibold text-pink-600 hover:text-pink-700"
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
