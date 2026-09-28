export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const body = req.body || {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    const apiKey = process.env.RESEND_API_KEY || "";
    if (!apiKey) {
      return res.status(503).json({ error: "Signup service is not configured.", code: "RESEND_KEY_MISSING" });
    }

    const response = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        unsubscribed: false
      })
    });

    const data = await response.json().catch(() => ({}));
    const message = String(data?.message || data?.error || "").toLowerCase();

    if (!response.ok) {
      if (response.status === 409 || message.includes("already exists")) {
        return res.status(200).json({ ok: true, message: "Already subscribed." });
      }
      return res.status(502).json({
        error: "Signup service rejected the request.",
        code: "RESEND_" + response.status
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: "Signup request failed.",
      code: "SERVER_ERROR"
    });
  }
}
