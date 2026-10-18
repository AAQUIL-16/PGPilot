 const ROUTING_API_URL =
  "https://api.openrouteservice.org/v2/directions";

async function calculateCommute(
  startLatitude,
  startLongitude,
  endLatitude,
  endLongitude,
  mode = "driving-car"
) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouteService API key is missing");
  }

  const allowedModes = [
    "driving-car",
    "foot-walking",
    "cycling-regular",
  ];

  if (!allowedModes.includes(mode)) {
    throw new Error("Unsupported travel mode");
  }

  const coordinates = [
    [Number(startLongitude), Number(startLatitude)],
    [Number(endLongitude), Number(endLatitude)],
  ];

  if (
    coordinates.some((point) =>
      point.some((value) => !Number.isFinite(value))
    )
  ) {
    throw new Error("Invalid routing coordinates");
  }

  const response = await fetch(
    `${ROUTING_API_URL}/${mode}/json`,
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        coordinates,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        data.error ||
        `Routing API failed with status ${response.status}`
    );
  }

  const summary = data.routes?.[0]?.summary;

  if (!summary) {
    throw new Error("No route found between these locations");
  }

  return {
    distanceKm: Number((summary.distance / 1000).toFixed(2)),
    durationMinutes: Number((summary.duration / 60).toFixed(1)),
    mode,
  };
}

module.exports = {
  calculateCommute,
};
