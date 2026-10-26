import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, InfoWindowF, useJsApiLoader } from "@react-google-maps/api";

const defaultCenter = { lat: 12.9697498, lng: 79.1606601 };
const validCoordinates = (item) => item && item.latitude != null && item.longitude != null && Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
const point = (item) => ({ lat: Number(item.latitude), lng: Number(item.longitude) });

export default function MapTest({ pgs = [], destinationLocation = null, onSelectPG, commutes = {}, travelMode = "driving-car", matchScores = {} }) {
  const [selectedPg, setSelectedPg] = useState(null);
  const mapRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ id: "pgpilot-google-map", googleMapsApiKey: apiKey || "" });
  const validPGs = pgs.filter(validCoordinates);
  const center = validCoordinates(destinationLocation) ? point(destinationLocation) : defaultCenter;

  const fitMap = useCallback((map) => {
    if (!window.google?.maps || !map) return;
    const bounds = new window.google.maps.LatLngBounds();
    if (validCoordinates(destinationLocation)) bounds.extend(point(destinationLocation));
    validPGs.forEach((pg) => bounds.extend(point(pg)));
    if (validPGs.length || validCoordinates(destinationLocation)) {
      map.fitBounds(bounds, 65);
      if (validPGs.length === 0) map.setZoom(13);
    }
  }, [destinationLocation?.latitude, destinationLocation?.longitude, ...validPGs.map((pg) => `${pg.googlePlaceId}:${pg.latitude}:${pg.longitude}`)]);

  useEffect(() => { if (isLoaded && mapRef.current) fitMap(mapRef.current); }, [isLoaded, fitMap]);
  useEffect(() => {
    if (selectedPg && !validPGs.some((pg) => pg.googlePlaceId === selectedPg.googlePlaceId)) setSelectedPg(null);
  }, [pgs, selectedPg]);

  if (!apiKey) return <p role="alert" className="p-6 text-sm text-rose-700">Google Maps API key is missing. Configure VITE_GOOGLE_MAPS_API_KEY.</p>;
  if (loadError) return <p role="alert" className="p-6 text-sm text-rose-700">Google Maps could not load. Please retry.</p>;
  if (!isLoaded) return <div role="status" className="flex h-[460px] items-center justify-center gap-3 text-sm text-slate-600"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />Loading the map…</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <GoogleMap mapContainerStyle={{ width: "100%", height: "min(64vh, 560px)", minHeight: "360px" }} center={center} zoom={13}
        onLoad={(map) => { mapRef.current = map; fitMap(map); }} onUnmount={() => { mapRef.current = null; }}
        options={{ fullscreenControl: true, streetViewControl: false, mapTypeControl: false, clickableIcons: false }}>
        {validCoordinates(destinationLocation) && <MarkerF position={center} title="Your destination" label={{ text: "D", color: "#ffffff", fontWeight: "bold" }} />}
        {validPGs.map((pg) => (
          <MarkerF key={pg.googlePlaceId} position={point(pg)} title={pg.name} onClick={() => setSelectedPg(pg)} />
        ))}
        {selectedPg && validCoordinates(selectedPg) && (
          <InfoWindowF position={point(selectedPg)} onCloseClick={() => setSelectedPg(null)}>
            <div className="max-w-[250px] space-y-2 p-1 text-slate-900">
              <h3 className="text-base font-bold">{selectedPg.name}</h3>
              <p className="text-xs text-slate-600">{selectedPg.address || "Address unavailable"}</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-800">★ {selectedPg.googleRating ?? "Unrated"}/5</span>
                {matchScores[selectedPg.googlePlaceId] != null && <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-800">Match {matchScores[selectedPg.googlePlaceId]}/100</span>}
              </div>
              {commutes[selectedPg.googlePlaceId]?.mode === travelMode && commutes[selectedPg.googlePlaceId]?.durationMinutes != null && (
                <p className="text-xs text-slate-600">Estimated commute: {Number(commutes[selectedPg.googlePlaceId].durationMinutes).toFixed(1)} min</p>
              )}
              <button type="button" onClick={() => { onSelectPG?.(selectedPg); setSelectedPg(null); }} className="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">View PG details</button>
              <a className="block text-center text-xs font-semibold text-blue-700 underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPg.name)}&query_place_id=${encodeURIComponent(selectedPg.googlePlaceId || "")}`} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-xs text-slate-600"><span><strong>{validPGs.length}</strong> matching PGs on map</span><span>Click a pin to view details</span></div>
    </div>
  );
}
