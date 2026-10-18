
const MATRIX_API_BASE_URL =
  "https://api.openrouteservice.org/v2/matrix";

// Supported travel modes
const ALLOWED_MODES = [
  "driving-car",
  "foot-walking",
  "cycling-regular",
];

async function calculateCommuteMatrix(
  destinationLatitude,
  destinationLongitude,
  pgs,
  mode = "driving-car"
) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouteService API key is missing");
  }

  // Validate travel mode
  if (!ALLOWED_MODES.includes(mode)) {
    throw new Error("Unsupported travel mode");
  }

  // Validate PG list
  if (!Array.isArray(pgs) || pgs.length === 0) {
    throw new Error("At least one PG is required");
  }

  if (pgs.length > 20) {
    throw new Error("Maximum 20 PGs allowed per request");
  }

  // Matrix coordinates must use [longitude, latitude]
  const locations = [
    [
      Number(destinationLongitude),
      Number(destinationLatitude),
    ],
    ...pgs.map((pg) => [
      Number(pg.longitude),
      Number(pg.latitude),
    ]),
  ];

  // Validate coordinate ranges
  const validCoordinates = locations.every(
    ([longitude, latitude]) =>
      Number.isFinite(longitude) &&
      Number.isFinite(latitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      latitude >= -90 &&
      latitude <= 90
  );

  if (!validCoordinates) {
    throw new Error("Invalid destination or PG coordinates");
  }

  // Select API endpoint based on travel mode
  const matrixApiUrl = `${MATRIX_API_BASE_URL}/${mode}`;

  const response = await fetch(matrixApiUrl, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locations,

      // PGs are sources, destination is index 0
      sources: pgs.map((_, index) => index + 1),
      destinations: [0],

      metrics: ["distance", "duration"],
      units: "km",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `Matrix API failed with status ${response.status}`
    );
  }

  if (
    !Array.isArray(data.durations) ||
    !Array.isArray(data.distances)
  ) {
    throw new Error("Invalid Matrix API response");
  }

  // Convert API results into commute information
  return pgs.map((pg, index) => {
    const durationSeconds = data.durations[index]?.[0];
    const distanceKm = data.distances[index]?.[0];

    return {
      googlePlaceId: pg.googlePlaceId,
      name: pg.name,

      roadDistanceKm:
        distanceKm == null
          ? null
          : Number(distanceKm.toFixed(2)),

      commuteMinutes:
        durationSeconds == null
          ? null
          : Number((durationSeconds / 60).toFixed(1)),

      mode,
    };
  });
}

module.exports = {
  calculateCommuteMatrix,
};
