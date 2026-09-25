import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

export default function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleDemoGoogle() {
    const email = window.prompt("Enter your Google email (demo):");
    if (!email) return;
    const name = window.prompt("Display name (optional):") || "";
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/users/google/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || "Google sign-in failed");
        return;
      }
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("logged_in_username", data.username || email.split("@")[0]);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Network error during Google sign-in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDemoGoogle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white p-3 text-sm font-semibold hover:bg-gray-50"
    >
      <FcGoogle size={20} />
      <span>{loading ? "Signing in..." : "Continue with Google (demo)"}</span>
    </button>
  );
}
