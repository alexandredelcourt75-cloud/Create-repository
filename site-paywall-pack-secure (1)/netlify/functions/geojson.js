const jwt = require("jsonwebtoken");

function jitter([lng, lat], seed, meters=12) {
  function s2n(s){ let h=0; for (let i=0;i<s.length;i++) h=(h*31 + s.charCodeAt(i))>>>0; return h; }
  const r = s2n(seed) / 0xffffffff;
  const angle = 2 * Math.PI * r;
  const d = meters * (0.3 + 0.7 * r);
  const dLat = d / 111111;
  const dLng = d / (111111 * Math.cos(lat * Math.PI/180));
  return [lng + Math.cos(angle)*dLng, lat + Math.sin(angle)*dLat];
}

const BASE = {
  type: "FeatureCollection",
  features: [
    { type:"Feature", properties:{ id:"A", name:"Chênaie claire", essence:"chêne", saison:"sept.-nov." }, geometry:{ type:"Point", coordinates:[3.708,50.205] } },
    { type:"Feature", properties:{ id:"B", name:"Hêtraie drainée", essence:"hêtre", saison:"fin août-oct." }, geometry:{ type:"Point", coordinates:[3.432,50.463] } },
  ]
};

exports.handler = async (event) => {
  const cookie = event.headers.cookie || "";
  const match = cookie.match(/(?:^|; )session=([^;]+)/);
  if (!match) return { statusCode: 401, body: JSON.stringify({ error:"no session" }) };

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    const ua = event.headers["user-agent"] || "na";
    const ip = (event.headers["x-forwarded-for"] || "").split(",")[0] || "0.0.0.0";
    const ipPrefix = ip.split(".").slice(0,2).join(".");

    if (payload.ua !== ua || payload.ipPrefix !== ipPrefix) {
      return { statusCode: 403, body: JSON.stringify({ error:"fingerprint_mismatch" }) };
    }

    const withWM = {
      type: "FeatureCollection",
      features: BASE.features.map(f => {
        const [lng, lat] = f.geometry.coordinates;
        const coords = jitter([lng,lat], `${payload.sub}:${f.properties.id}`, 12);
        return { ...f, geometry: { type:"Point", coordinates: coords } };
      })
    };
    return { statusCode: 200, body: JSON.stringify(withWM) };
  } catch {
    return { statusCode: 403, body: JSON.stringify({ error:"invalid session" }) };
  }
};
