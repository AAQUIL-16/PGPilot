// Destination-independent PG discovery for Google Places Text Search (New).
// Requires GOOGLE_PLACES_API_KEY; never expose the key to the browser.
const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos';
const RADIUS_KM = 10;

function distanceKm(a,b,c,d) {
  const rad = x => x * Math.PI / 180;
  const x = rad(c-a), y = rad(d-b);
  const z = Math.sin(x/2)**2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(z),Math.sqrt(Math.max(0,1-z)));
}
const excluded = [ /\boyo\b/i, /\btreebo\b/i, /\bsports complex\b/i, /\btennis court\b/i, /\bshopping mall\b/i, /\buniversity\b/i, /\binstitute of technology\b/i, /\bstatue\b/i, /\bswimming pool\b/i ];
const queries = {
  all: ['paying guest accommodation', 'student hostel', 'PG hostel'],
  men: ['mens paying guest hostel', 'gents PG accommodation', 'boys hostel'],
  women: ['womens paying guest hostel', 'ladies PG accommodation', 'girls hostel'],
  coliving: ['co living accommodation', 'shared living accommodation', 'coliving hostel']
};

async function searchNearbyPGs(destination, latitude, longitude, preference='all') {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is missing');
  latitude=Number(latitude); longitude=Number(longitude);
  if (!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180) throw new Error('Invalid destination coordinates');
  const category = Object.prototype.hasOwnProperty.call(queries,preference)?preference:'all';
  const found = new Map();
  // Crucial: queries DO NOT include the destination name. Google may override
  // locationBias if the textQuery names an explicit place. Search around coordinates.
  for (const textQuery of queries[category]) {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':FIELD_MASK},
      body:JSON.stringify({textQuery,pageSize:20,locationBias:{circle:{center:{latitude,longitude},radius:RADIUS_KM*1000}}}),
      signal:AbortSignal.timeout(15000)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || `Google Places error ${response.status}`);
    for (const place of payload.places || []) {
      const name=place.displayName?.text||'';
      const lat=place.location?.latitude, lon=place.location?.longitude;
      if (!place.id||!Number.isFinite(lat)||!Number.isFinite(lon)||excluded.some(rx=>rx.test(name))) continue;
      if (distanceKm(latitude,longitude,lat,lon)>RADIUS_KM) continue;
      const photo=place.photos?.[0];
      found.set(place.id,{
        googlePlaceId:place.id, searchCategory:category, name:name||'Unknown',
        address:place.formattedAddress||'Not available', latitude:lat, longitude:lon,
        googleRating:place.rating??null, googleRatingCount:place.userRatingCount??0,
        photoUrl:photo?.name?`/api/pgs/photo?name=${encodeURIComponent(photo.name)}`:null,
        photoAttributions:(photo?.authorAttributions||[]).map(a=>({displayName:a.displayName||'Photo contributor',uri:a.uri||null}))
      });
    }
    if (found.size>=12) break; // avoid unnecessary billable searches
  }
  return [...found.values()].sort((a,b)=>distanceKm(latitude,longitude,a.latitude,a.longitude)-distanceKm(latitude,longitude,b.latitude,b.longitude)).slice(0,40);
}
module.exports={searchNearbyPGs};
