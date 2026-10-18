
const GOOGLE_PLACES_URL =
  "https://places.googleapis.com/v1/places:searchText";

async function geocodeDestination(destination) {
  const query = String(destination || "").trim();

  if (!query) return null;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is missing");
  }

  const response = await fetch(GOOGLE_PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location"
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 10,
      regionCode: "IN",
      languageCode: "en"
    }),
    signal: AbortSignal.timeout(15000)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      `Google Places error: ${response.status}`
    );
  }

  const places = (data.places || []).filter(
    place =>
      Number.isFinite(place.location?.latitude) &&
      Number.isFinite(place.location?.longitude)
  );

  if (places.length === 0) return null;

  // Prefer matching the requested place name.
  const normalize = value =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const requested = normalize(query);

  const ranked = places.map(place => {
    const name = normalize(place.displayName?.text);
    const address = normalize(place.formattedAddress);

    let score = 0;

    if (name === requested) score += 100;
    if (name.includes(requested)) score += 50;
    if (requested.includes(name) && name.length > 3) score += 30;

    const words = requested.split(" ").filter(
      word => word.length > 2
    );

    for (const word of words) {
      if (name.split(" ").includes(word)) score += 5;
      else if (address.split(" ").includes(word)) score += 1;
    }

    return { place, score };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score <= 0) return null;

  return {
    name:
      best.place.displayName?.text ||
      best.place.formattedAddress ||
      query,
    latitude: best.place.location.latitude,
    longitude: best.place.location.longitude
  };
}

module.exports = { geocodeDestination };
