export default function PGComparison({ selectedPGs = [], commutes = {}, destinationLocation, travelMode, matchScores = {}, onRemove, onClear }) {
  if (selectedPGs.length < 2) return null;
  const modeLabels = { "driving-car": "Driving", "foot-walking": "Walking", "cycling-regular": "Cycling" };
  const modeLabel = modeLabels[travelMode] || "Commute";
  const rows = [
    { label: "Smart Match", render: (pg) => matchScores[pg.googlePlaceId] == null ? "Calculating / unavailable" : `${matchScores[pg.googlePlaceId]} / 100` },
    { label: "Google Rating", render: (pg) => pg.googleRating == null ? "Not rated" : `★ ${pg.googleRating}/5 (${Number(pg.googleRatingCount || 0)} reviews)` },
    { label: "Route Distance", render: (pg) => { const c = commutes[pg.googlePlaceId]; return c?.mode === travelMode && c.distanceKm != null ? `${Number(c.distanceKm).toFixed(1)} km` : "Not available"; } },
    { label: `${modeLabel} Time`, render: (pg) => { const c = commutes[pg.googlePlaceId]; return c?.mode === travelMode && c.durationMinutes != null ? `${Number(c.durationMinutes).toFixed(1)} min` : "Not available"; } },
    { label: "Address", render: (pg) => pg.address || "Not available" },
  ];
  return (
    <section id="pg-comparison" className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-2xl font-bold text-slate-900">Compare Selected PGs</h3><p className="mt-1 text-sm text-slate-500">Compare Smart Match, reviews and estimated {modeLabel.toLowerCase()} commutes.</p></div>
        <button type="button" onClick={onClear} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Clear Selection</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left">
        <thead><tr className="border-b border-slate-200"><th scope="col" className="p-4 text-sm text-slate-500">Feature</th>{selectedPGs.map((pg) => <th scope="col" key={pg.googlePlaceId} className="p-4 align-top"><p className="font-bold text-slate-900">{pg.name}</p><button type="button" onClick={() => onRemove(pg.googlePlaceId)} className="mt-2 text-xs font-semibold text-red-600 hover:underline">Remove</button></th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.label} className="border-b border-slate-100"><th scope="row" className="p-4 text-sm font-semibold text-slate-700">{row.label}</th>{selectedPGs.map((pg) => <td key={pg.googlePlaceId} className="p-4 text-sm text-slate-700">{row.render(pg)}</td>)}</tr>)}</tbody>
      </table></div>
      <p className="mt-5 text-xs text-slate-500">Google Places provides ratings. Commute estimates use OpenRouteService; live traffic is not included. Smart Match uses the current ranking preference and available commute data.</p>
    </section>
  );
}
