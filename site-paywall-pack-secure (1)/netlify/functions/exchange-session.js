const Stripe = require("stripe");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  const { session_id } = event.queryStringParameters || {};
  if (!session_id) return { statusCode: 400, body: JSON.stringify({ error:"missing session_id" }) };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return { statusCode: 402, body: JSON.stringify({ error:"unpaid" }) };
    }
    const ua = event.headers["user-agent"] || "na";
    const ip = (event.headers["x-forwarded-for"] || "").split(",")[0] || "0.0.0.0";
    const ipPrefix = ip.split(".").slice(0,2).join(".");
    const subject = session.customer || session.customer_email || session.id;
    const token = jwt.sign({ sub: subject, ua, ipPrefix, scope:"map_access" },
      process.env.JWT_SECRET, { expiresIn: "24h" });

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
      },
      body: JSON.stringify({ ok:true })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error:"stripe_error" }) };
  }
};
