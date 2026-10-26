
import { useCallback, useState } from "react";
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "450px",
};

const defaultCenter = {
  lat: 12.9697498,
  lng: 79.1606601,
};

export default function MapTest({ pgs = [], destinationLocation = null }) {
  const [selectedPg, setSelectedPg] = useState(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "pgpilot-google-map",
    googleMapsApiKey: apiKey || "",
  });

  const center = destinationLocation
    ? {
        lat: Number(destinationLocation.latitude),
        lng: Number(destinationLocation.longitude),
      }
    : defaultCenter;

  const onMapLoad = useCallback(
    (map) => {
      if (!destinationLocation || pgs.length === 0) return;

      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(center);

      pgs.forEach((pg) => {
        if (
          pg.latitude != null &&
          pg.longitude != null &&
          Number.isFinite(Number(pg.latitude)) &&
          Number.isFinite(Number(pg.longitude))
        ) {
          bounds.extend({
            lat: Number(pg.latitude),
            lng: Number(pg.longitude),
          });
        }
      });

      map.fitBounds(bounds);
    },
    [destinationLocation, pgs]
  );

  if (!apiKey) {
    return <p className="p-5 text-red-600">Google Maps API key is missing.</p>;
  }

  if (loadError) {
    return <p className="p-5 text-red-600">Google Maps failed to load.</p>;
  }

  if (!isLoaded) {
    return <p className="p-5">Loading Google Maps...</p>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      onLoad={onMapLoad}
      options={{
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: false,
      }}
    >
      {/* Destination marker */}
      {destinationLocation && (
        <MarkerF
          position={center}
          title="Your destination"
          label="D"
        />
      )}

      {/* PG markers */}
      {pgs
        .filter(
          (pg) =>
            pg.latitude != null &&
            pg.longitude != null &&
            Number.isFinite(Number(pg.latitude)) &&
            Number.isFinite(Number(pg.longitude))
        )
        .map((pg) => (
          <MarkerF
            key={pg.googlePlaceId}
            position={{
              lat: Number(pg.latitude),
              lng: Number(pg.longitude),
            }}
            title={pg.name}
            onClick={() => setSelectedPg(pg)}
          />
        ))}

      {/* Selected PG information */}
      {selectedPg && (
        <InfoWindowF
          position={{
            lat: Number(selectedPg.latitude),
            lng: Number(selectedPg.longitude),
          }}
          onCloseClick={() => setSelectedPg(null)}
        >
          <div style={{ maxWidth: "240px", color: "#111827" }}>
            <h3 style={{ fontWeight: "bold", fontSize: "16px" }}>
              {selectedPg.name}
            </h3>

            <p style={{ marginTop: "8px" }}>
              {selectedPg.address}
            </p>

            <p style={{ marginTop: "8px" }}>
              Rating: {selectedPg.googleRating ?? "Not rated"}
            </p>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                selectedPg.name
              )}&query_place_id=${encodeURIComponent(
                selectedPg.googlePlaceId
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0f766e", fontWeight: "bold" }}
            >
              View on Google Maps
            </a>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
