import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaInstagram } from "react-icons/fa";

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

        // client-side phone validation (optional)
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
            const response = await fetch("http://127.0.0.1:8000/api/users/register/", {
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
                setError(data.detail || Object.values(data)[0]?.[0] || "Signup failed");
                return;
            }

            setVerifyEmail(true);
            setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        } catch (err) {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyEmail(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/api/users/verify-email/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    code: verificationCode,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Verification failed");
                return;
            }

            alert("Email verified! You can now log in.");
            navigate("/login");
        } catch (err) {
            setError("Verification error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (verifyEmail) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4 py-10 flex items-center justify-center">
                <div className="w-full max-w-sm">
                    <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                        <div className="mb-8 text-center">
                            <FaInstagram className="mx-auto mb-3 text-5xl text-pink-600" />
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">Verify Email</h1>
                            <p className="mt-2 text-sm text-gray-600">Enter the code sent to {formData.email}</p>
                        </div>

                        <form onSubmit={handleVerifyEmail} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Verification code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                                required
                            />

                            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 p-3 font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-50"
                            >
                                {loading ? "Verifying..." : "Verify Email"}
                            </button>
                        </form>
                    </section>

                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
                        <p className="text-sm text-gray-700">
                            Already have an account?
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="ml-1 font-semibold text-pink-600 hover:text-pink-700"
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
        <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4 py-10 flex items-center justify-center">
            <div className="w-full max-w-sm">
                <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <FaInstagram className="mx-auto mb-3 text-5xl text-pink-600" aria-hidden="true" />
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">Instagram</h1>
                        <p className="mt-2 text-sm text-gray-600">Create your account</p>
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
                                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            />
                            <input
                                type="text"
                                name="last_name"
                                placeholder="Last name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            />
                        </div>

                        <input
                            type="email"
                            name="email"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            required
                        />

                        <input
                            type="tel"
                            name="phone"
                            placeholder="Phone number (optional)"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                        />

                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password (8+ characters)"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            required
                        />

                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                            required
                        />

                        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 p-3 font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-50"
                        >
                            {loading ? "Creating account..." : "Sign up"}
                        </button>
                    </form>
                </section>

                {/* Login CTA */}
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-700">
                        Have an account?
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="ml-1 font-semibold text-pink-600 hover:text-pink-700"
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