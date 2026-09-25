import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function VerifyEmail() {
  const { token } = useParams();
  const [message, setMessage] = useState("Verifying your email…");
  useEffect(() => { fetch(`http://127.0.0.1:8000/api/users/email/verification/${token}/`, { method: "POST" }).then((r) => r.json()).then((d) => setMessage(d.detail || "Verification failed.")).catch(() => setMessage("Verification failed.")); }, [token]);
  return <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4"><div className="rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-2xl font-bold">Email verification</h1><p className="mt-3 text-gray-600">{message}</p></div></main>;
}
export default VerifyEmail;
