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

function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        phone: "",
        username: "",
        password: "",
        confirmPassword: "",
        first_name: "",
        last_name: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    async function handleSignup(e) {
        e.preventDefault();
        setError("");
        
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        
        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (formData.phone) {
            const phoneClean = formData.phone.replace(/\D/g, "");
            const phoneRe = /^\d{10}$/;
            if (!phoneRe.test(phoneClean)) {
                setError("Phone number must contain exactly 10 digits.");
                return;
            }
            setFormData((prev) => ({ ...prev, phone: phoneClean }));
        }

        setLoading(true);
        try {
            const response = await fetchWithTimeout(`${API_URL}/users/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    phone: formData.phone,
                    username: formData.username,
                    password: formData.password,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(getApiErrorMessage(data, "Signup failed"));
                return;
            }

            setVerifyEmail(true);
            setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        } catch (err) {
            console.error(err);
            if (err?.name === "AbortError") {
                setError("Request timed out. The server is busy, please try again.");
                return;
            }
            setError("Network error. The server might be waking up from sleep. Please wait a minute and try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyEmail(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetchWithTimeout(`${API_URL}/users/verify-email/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    code: verificationCode,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(getApiErrorMessage(data, "Verification failed"));
                return;
            }

            alert("Email verified! You can now log in.");
            navigate("/login");
        } catch (err) {
            console.error(err);
            if (err?.name === "AbortError") {
                setError("Request timed out. The server is busy, please try again.");
                return;
            }
            setError("Network error. The server might be waking up from sleep. Please wait a minute and try again.");
        } finally {
            setLoading(false);
        }
    }

    // =====================================================
    // PIKACHAT THEME CLASSES
    // =====================================================
    const inputClasses = "w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-[#FFCB05] focus:ring-2 focus:ring-yellow-100 transition-all";
    const buttonClasses = "w-full rounded-lg bg-[#FFCB05] p-3 font-bold text-gray-900 hover:bg-[#e6b800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const linkClasses = "ml-1 font-semibold text-yellow-600 hover:text-yellow-700 transition-colors";

    if (verifyEmail) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-[#FFFEF0] to-amber-50 px-4 py-10 flex items-center justify-center">
                <div className="w-full max-w-sm">
                    <section className="rounded-2xl border border-yellow-200 bg-white p-8 shadow-xl">
                        <div className="mb-8 text-center">
                            <div className="mx-auto mb-3 text-6xl drop-shadow-sm">⚡</div>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">PikaChat</h1>
                            <p className="mt-2 text-sm text-gray-600">Enter the code sent to {formData.email}</p>
                        </div>

                        <form onSubmit={handleVerifyEmail} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Verification code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className={inputClasses}
                                required
                            />

                            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className={buttonClasses}
                            >
                                {loading ? "Verifying..." : "Verify Email"}
                            </button>
                        </form>
                    </section>

                    <div className="mt-4 rounded-lg border border-yellow-200 bg-white p-4 text-center shadow-sm">
                        <p className="text-sm text-gray-700">
                            Already have an account?
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className={linkClasses}
                            >
                                Log in
                            </button>
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-[#FFFEF0] to-amber-50 px-4 py-10 flex items-center justify-center">
            <div className="w-full max-w-sm">
                <section className="rounded-2xl border border-yellow-200 bg-white p-8 shadow-xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-3 text-6xl drop-shadow-sm">⚡</div>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">PikaChat</h1>
                        <p className="mt-2 text-sm text-gray-600">Spark up your conversations!</p>
                    </div>

                    {/* Signup Form */}
                    <form onSubmit={handleSignup} className="space-y-3">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                name="first_name"
                                placeholder="First name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                            <input
                                type="text"
                                name="last_name"
                                placeholder="Last name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>

                        <input
                            type="email"
                            name="email"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                        />

                        <input
                            type="tel"
                            name="phone"
                            placeholder="Phone number (optional)"
                            value={formData.phone}
                            onChange={handleChange}
                            className={inputClasses}
                        />

                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={formData.username}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password (8+ characters)"
                            value={formData.password}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                        />

                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                        />

                        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className={buttonClasses}
                        >
                            {loading ? "Creating account..." : "Sign up ⚡"}
                        </button>
                    </form>
                </section>

                {/* Login CTA */}
                <div className="mt-4 rounded-lg border border-yellow-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-700">
                        Have an account?
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className={linkClasses}
                        >
                            Log in
                        </button>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default Signup;