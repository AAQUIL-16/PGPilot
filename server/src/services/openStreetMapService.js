
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Calculate straight-line distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

// Search nearby accommodation using OpenStreetMap
async function searchNearbyPGsOSM(destination, latitude, longitude) {
  const radiusMeters = 5000;

  // Find mapped hostels, guest houses, dormitories and PG-related names
  const query = `
  [out:json][timeout:15];
  (
    nwr["tourism"="hostel"](around:2000,${latitude},${longitude});
    nwr["tourism"="guest_house"](around:2000,${latitude},${longitude});
  );
  out center;
`;

  // Use GET instead of POST
  const params = new URLSearchParams({
    data: query,
  });

  const response = await fetch(
    `${OVERPASS_URL}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "PGPilot-StudentProject/1.0",
      },
      signal: AbortSignal.timeout(30000),
    }
  );

  // Show detailed errors for debugging
  if (!response.ok) {
    const errorDetails = (await response.text()).slice(0, 500);

    throw new Error(
      `Overpass API error: ${response.status} - ${errorDetails}`
    );
  }

  const data = await response.json();

  // Convert OpenStreetMap results into PGPilot listings
  const results = (data.elements || [])
    .map((element) => {
      const tags = element.tags || {};

      const pgLatitude = element.lat ?? element.center?.lat;
      const pgLongitude = element.lon ?? element.center?.lon;

      if (
        !Number.isFinite(pgLatitude) ||
        !Number.isFinite(pgLongitude)
      ) {
        return null;
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        pgLatitude,
        pgLongitude
      );

      if (distance > 5) {
        return null;
      }

      return {
        id: `osm-${element.type}-${element.id}`,
        name: tags.name || "Unnamed accommodation",
        address:
          [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:suburb"],
            tags["addr:city"],
          ]
            .filter(Boolean)
            .join(", ") || "Address not available",
        latitude: pgLatitude,
        longitude: pgLongitude,
        distanceKm: Number(distance.toFixed(2)),
        accommodationType:
          tags.tourism || tags.building || "possible PG",
        source: "OpenStreetMap",
        osmType: element.type,
        osmId: element.id,
        googleRating: null,
        googleRatingCount: null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
}

module.exports = { searchNearbyPGsOSM };
