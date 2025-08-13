const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        unit_amount: 1490,
        product_data: { name: "Accès carte privée (coordonnées exactes)" }
      },
      quantity: 1
    }],
    success_url: `${process.env.SITE_URL}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_URL}/achat.html`,
  });
  return { statusCode: 200, body: JSON.stringify({ checkoutUrl: session.url }) };
};
