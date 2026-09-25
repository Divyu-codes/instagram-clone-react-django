import { useState } from "react";
import { authenticatedFetch } from "../../utils/auth";
import { FaInstagram, FaLock, FaEnvelope, FaShieldAlt } from "react-icons/fa";

const API = "http://127.0.0.1:8000/api/users";

function Security() {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");

  const call = async (path, body = {}) => {
    const response = await authenticatedFetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed.");
    return data;
  };

  const run = async (action) => {
    try {
      const data = await action();
      setMessage(data.detail || "Done.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <FaInstagram className="mx-auto mb-3 text-5xl text-pink-600" />
          <h1 className="text-3xl font-bold text-gray-900">Account Security</h1>
          <p className="mt-2 text-gray-600">Manage your account protection and privacy settings</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800 shadow-sm">
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Change Password Section */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <FaLock className="text-2xl text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">Update your password to keep your account secure</p>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              type="password"
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              type="password"
              placeholder="New password (8+ characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 font-semibold text-white hover:opacity-95 transition-opacity"
              onClick={() =>
                run(() =>
                  call("/password/change/", {
                    old_password: oldPassword,
                    new_password: newPassword,
                  })
                )
              }
            >
              Change Password
            </button>
          </div>
        </section>

        {/* Email Verification Section */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <FaEnvelope className="text-2xl text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">Email Verification</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">Verify your email address for account recovery</p>
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-lg border border-gray-300 p-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-95 transition-opacity whitespace-nowrap"
              onClick={() => run(() => call("/email/verification/send/", { email }))}
            >
              Send Email
            </button>
          </div>
        </section>

        {/* Two-Factor Authentication Section */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <FaShieldAlt className="text-2xl text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Add the generated secret to Google Authenticator, Authy, or another authenticator app.
          </p>
          <button
            className="mb-4 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-95 transition-opacity"
            onClick={() =>
              run(async () => {
                const data = await call("/2fa/setup/");
                setSecret(data.secret);
                return {
                  detail: "Secret generated. Enter the code from your authenticator app to confirm.",
                };
              })
            }
          >
            Set Up 2FA
          </button>

          {secret && (
            <div className="rounded-lg bg-gray-50 p-4 space-y-3 border border-gray-200">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Secret Key (scan with authenticator app):</p>
                <code className="block break-all text-sm font-mono bg-white border border-gray-300 p-3 rounded text-gray-800">
                  {secret}
                </code>
              </div>
              <input
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                inputMode="numeric"
                maxLength="6"
                placeholder="Enter 6-digit code from authenticator app"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 transition-colors"
                onClick={() => run(() => call("/2fa/confirm/", { otp }))}
              >
                Enable 2FA
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Security;
