import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const response = await fetch(`http://127.0.0.1:8000/api/users/password/reset/${uid}/${token}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json();
    setMessage(data.detail || "Request failed.");
    if (response.ok) setTimeout(() => navigate("/login"), 1200);
  };
  return <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow"><h1 className="text-2xl font-bold">Reset password</h1><input required minLength="8" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" className="mt-4 w-full rounded border p-3" /><button className="mt-3 w-full rounded bg-pink-600 p-3 font-semibold text-white">Save new password</button>{message && <p className="mt-3 text-sm">{message}</p>}</form></main>;
}
export default ResetPassword;
