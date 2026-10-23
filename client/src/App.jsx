import { useEffect, useRef, useState } from "react";



import UserProfile from "./UserProfile";



import MapTest from "./MapTest";



import PGComparison from "./PGComparison";



import AuthForm from "./AuthForm";



const TRAVEL_MODES = {



  "driving-car": {



    label: "Driving",



    icon: "🚗",



  },



  "foot-walking": {



    label: "Walking",



    icon: "🚶",



  },



  "cycling-regular": {



    label: "Cycling",



    icon: "🚲",



  },



};



// Calculate straight-line distance in kilometers



function calculateDistance(lat1, lon1, lat2, lon2) {



  const earthRadius = 6371;



  const dLat = ((lat2 - lat1) * Math.PI) / 180;



  const dLon = ((lon2 - lon1) * Math.PI) / 180;



  const a =



    Math.sin(dLat / 2) ** 2 +



    Math.cos((lat1 * Math.PI) / 180) *



      Math.cos((lat2 * Math.PI) / 180) *



      Math.sin(dLon / 2) ** 2;



  return (



    earthRadius *



    2 *



    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))



  );



}





// Only classify a PG when its listing explicitly indicates a category.
// Unknown listings remain visible under All PGs.
function inferPGPreference(pg) {
  const text = `${pg.name || ""} ${pg.address || ""}`.toLowerCase();
  if (/\b(co[ -]?living|coliving|co[ -]?live|mixed[ -]?gender)\b/i.test(text)) return "coliving";
  if (/\b(ladies|lady|women|womens|women's|girls|female)\b/i.test(text)) return "women";
  if (/\b(gents|gentlemen|men's|mens|boys|male)\b/i.test(text)) return "men";
  return ["men", "women", "coliving"].includes(pg.searchCategory) ? pg.searchCategory : "unknown";
}

// Display photos supplied by the backend. Never expose a Google API key in React.

function PGPhoto({ pg, className = "h-40", rounded = "rounded-xl" }) {

  const candidates = [

    pg.photoUrl,

    ...(Array.isArray(pg.photoUrls) ? pg.photoUrls : []),

    pg.photo?.url,

    pg.imageUrl,

  ].filter((url) => typeof url === "string" && url.trim());

  const [attempt, setAttempt] = useState(0);

  const url = candidates[attempt] || null;

  const attributions = Array.isArray(pg.photoAttributions) ? pg.photoAttributions : [];



  // Use Vite's /api proxy by default; support an explicitly configured API origin.

  const imageSrc = url && url.startsWith("/api/") && import.meta.env.VITE_API_BASE_URL

    ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}${url}`

    : url;



  return (

    <div className={`relative overflow-hidden bg-gradient-to-br from-[#112747] via-[#1b4273] to-blue-600 ${rounded} ${className}`}>

      {imageSrc ? (

        <img

          src={imageSrc}

          alt={`Google Places photo for ${pg.name}`}

          loading="lazy"

          className="h-full w-full object-cover"

          onError={() => setAttempt((current) => current + 1)}

        />

      ) : (

        <div className="flex h-full flex-col items-center justify-center text-center text-white">

          <span className="text-4xl" aria-hidden="true">⌂</span>

          <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-blue-100">Accommodation listing</span>

        </div>

      )}

      {imageSrc && attributions.length > 0 && (

        <div className="absolute bottom-0 left-0 right-0 bg-slate-950/75 px-3 py-2 text-xs text-white">

          Photo: {attributions.map((author, index) => (

            <span key={`${author.displayName}-${index}`}>

              {index > 0 ? ", " : ""}

              {typeof author.uri === "string" && author.uri.startsWith("https://") ? (

                <a href={author.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">{author.displayName || "Contributor"}</a>

              ) : (author.displayName || "Contributor")}

            </span>

          ))}

        </div>

      )}

    </div>

  );

}



// Transparent, rule-based match score using only verified listing fields.
// Missing commute means the listing cannot yet be scored.
const MATCH_WEIGHTS = {
  balanced: { commute: 45, distance: 20, rating: 35 },
  commute: { commute: 70, distance: 15, rating: 15 },
  rating: { commute: 20, distance: 10, rating: 70 },
  nearest: { commute: 20, distance: 65, rating: 15 },
};

function calculateMatchScore(pg, destinationLocation, commute, priority = "balanced") {
  const minutes = Number(commute?.durationMinutes);
  if (commute?.durationMinutes == null || !Number.isFinite(minutes)) return null;

  const lat = Number(pg.latitude);
  const lon = Number(pg.longitude);
  const destinationLat = Number(destinationLocation?.latitude);
  const destinationLon = Number(destinationLocation?.longitude);
  if (![lat, lon, destinationLat, destinationLon].every(Number.isFinite)) return null;

  const km = calculateDistance(destinationLat, destinationLon, lat, lon);
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const weights = MATCH_WEIGHTS[priority] || MATCH_WEIGHTS.balanced;
  const commuteScore = clamp(1 - minutes / 30) * weights.commute;
  const distanceScore = clamp(1 - km / 5) * weights.distance;
  const rating = pg.googleRating == null ? null : Number(pg.googleRating);
  // An unrated property gets a neutral 2.5/5, not a fabricated review score.
  const ratingScore = clamp((rating != null && Number.isFinite(rating) ? rating : 2.5) / 5) * weights.rating;
  return Math.round(commuteScore + ratingScore + distanceScore);
}

function App() {
  // Live platform statistics are loaded from PostgreSQL through /api/stats.
  const [platformStats, setPlatformStats] = useState(null);
  const [platformStatsError, setPlatformStatsError] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadPlatformStats() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) throw new Error("Statistics API unavailable");
        const data = await response.json();
        if (!cancelled && data.success && data.stats) {
          setPlatformStats(data.stats);
          setPlatformStatsError(false);
        }
      } catch (error) {
        if (!cancelled) setPlatformStatsError(true);
        console.error("Unable to load PGPilot platform statistics:", error);
      }
    }
    loadPlatformStats();
    return () => { cancelled = true; };
  }, [statsRefreshKey]);




  const [destination, setDestination] = useState("VIT Vellore");



  const [destinationLocation, setDestinationLocation] = useState(null);



  const [searchedDestination, setSearchedDestination] = useState("");



  const [pgs, setPgs] = useState([]);



  const [loading, setLoading] = useState(false);



  const [error, setError] = useState("");



  const [searched, setSearched] = useState(false);

  const [view, setView] = useState("home");

  const [detailPG, setDetailPG] = useState(null);



  const [travelMode, setTravelMode] = useState("driving-car");



  const [sortBy, setSortBy] = useState("commute");
  const [matchPriority, setMatchPriority] = useState("balanced");
  const [pgPreference, setPgPreference] = useState("all");
  const [minRating, setMinRating] = useState("any");
  const [maxCommute, setMaxCommute] = useState("any");
  const [maxDistance, setMaxDistance] = useState("any");




  const [selectedPGIds, setSelectedPGIds] = useState([]);



  // Favorites are stored per account in PostgreSQL.



  const [token, setToken] = useState(() => sessionStorage.getItem("pgpilot:token") || "");



  const [account, setAccount] = useState(() => {







  try {







    const savedAccount = sessionStorage.getItem("pgpilot:account");







    return savedAccount ? JSON.parse(savedAccount) : null;







  } catch {







    return null;







  }







});



  const [authMode, setAuthMode] = useState(null);







  const [showProfile, setShowProfile] = useState(false);



  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyDeletingId, setHistoryDeletingId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);



  const [favorites, setFavorites] = useState([]);



  const [favoritesBusy, setFavoritesBusy] = useState(false);



  const [favoritePendingId, setFavoritePendingId] = useState(null);



  const [favoritesError, setFavoritesError] = useState("");



  const [showFavorites, setShowFavorites] = useState(false);



  const accountMenuRef = useRef(null);







  useEffect(() => {



    function closeMenu(event) {



      if (event.key === "Escape") setAccountMenuOpen(false);



      if (event.type === "pointerdown" && !accountMenuRef.current?.contains(event.target)) {



        setAccountMenuOpen(false);



      }



    }



    document.addEventListener("pointerdown", closeMenu);



    document.addEventListener("keydown", closeMenu);



    return () => {



      document.removeEventListener("pointerdown", closeMenu);



      document.removeEventListener("keydown", closeMenu);



    };



  }, []);



  useEffect(() => {



    if (!token) {



      setFavorites([]);



      setAccount(null);



      return;



    }



    let cancelled = false;



    async function loadFavorites() {



      setFavoritesBusy(true);



      setFavoritesError("");



      try {



        const response = await fetch("/api/favorites", {



          headers: { Authorization: `Bearer ${token}` },



        });



        const data = await response.json();



        if (!response.ok || !data.success) throw new Error(data.message || "Unable to load saved PGs");



        if (!cancelled) {



          setFavorites((data.favorites || []).map((item) => ({



            googlePlaceId: item.google_place_id,



            name: item.pg_name,



            address: item.pg_address || "",



            googleRating: item.google_rating == null ? null : Number(item.google_rating),



          })));



        }



      } catch (err) {



        if (!cancelled) {



          setFavoritesError(err.message);



          if (/expired token|invalid.*token|login again/i.test(err.message)) {



            sessionStorage.removeItem("pgpilot:token");



            setToken("");



          }



        }



      } finally {



        if (!cancelled) setFavoritesBusy(false);



      }



    }



    loadFavorites();



    return () => { cancelled = true; };



  }, [token]);



  useEffect(() => {







  if (!token) return;



  let cancelled = false;



  async function fetchProfile() {







    try {







      const response = await fetch("/api/profile", {







        headers: {







          Authorization: `Bearer ${token}`,







        },







      });



      if (!response.ok) {







        throw new Error("Unable to load profile");







      }



      const data = await response.json();



      if (data.success && data.user && !cancelled) {







        setAccount(data.user);



        sessionStorage.setItem(







          "pgpilot:account",







          JSON.stringify(data.user)







        );







      }







    } catch (error) {







      console.error("Profile loading error:", error);







    }







  }



  fetchProfile();



  return () => {







    cancelled = true;







  };







}, [token]);



  function handleAuthSuccess(nextToken, user) {



    sessionStorage.setItem("pgpilot:token", nextToken);







    sessionStorage.setItem("pgpilot:account", JSON.stringify(user));



    setAccount(user);



    setToken(nextToken);



    setFavoritesError("");



    setAuthMode(null);



  }



  async function loadSearchHistory() {
    if (!token) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/search-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load search history");
      setSearchHistory(Array.isArray(data.searches) ? data.searches : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to load search history");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteSearchHistoryItem(id) {
    if (historyDeletingId !== null) return;
    setHistoryDeletingId(id);
    setHistoryError("");
    try {
      const response = await fetch(`/api/search-history/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete search");
      setSearchHistory((previous) => previous.filter((item) => String(item.id) !== String(id)));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to delete search");
    } finally {
      setHistoryDeletingId(null);
    }
  }

  function searchAgainFromHistory(item) {
    const nextDestination = String(item.destination || "").trim();
    if (!nextDestination || loading) return;
    setDestination(nextDestination);
    setShowSearchHistory(false);
    setShowFavorites(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    handleSearch({ preventDefault() {} }, "all", nextDestination);
  }

  async function handleFeedbackSubmit(event) {
    event.preventDefault();
    if (feedbackSubmitting) return;
    if (!token) {
      setShowFeedback(false);
      setAuthMode("login");
      return;
    }
    const message = feedbackMessage.trim();
    if (feedbackRating < 1 || feedbackRating > 5 || message.length < 10 || message.length > 1000) {
      setFeedbackError("Choose 1–5 stars and write between 10 and 1000 characters.");
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: feedbackRating, message }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not submit feedback. Please try again.");
      }
      setFeedbackSuccess(true);
      setFeedbackMessage("");
      setFeedbackRating(0);
      setStatsRefreshKey((current) => current + 1);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Feedback submission failed.");
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  function handleLogout() {
    setView("home");
    setAccountMenuOpen(false);
    setAuthMode(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowFeedback(false);
    setShowSearchHistory(false);
    setSearchHistory([]);



    sessionStorage.removeItem("pgpilot:token");







    sessionStorage.removeItem("pgpilot:account");



    setToken("");



    setAccount(null);



    setFavorites([]);



    setShowFavorites(false);







    setShowProfile(false);



    setFavoritesError("");



  }



  async function toggleFavorite(pg) {



    if (!token) {



      setFavoritesError("");



      setAuthMode("login");



      return;



    }



    if (favoritePendingId || favoritesBusy) return;



    const isSaved = favorites.some((item) => item.googlePlaceId === pg.googlePlaceId);



    setFavoritePendingId(pg.googlePlaceId);



    setFavoritesError("");



    try {



      const response = await fetch(



        isSaved ? `/api/favorites/${encodeURIComponent(pg.googlePlaceId)}` : "/api/favorites",



        {



          method: isSaved ? "DELETE" : "POST",



          headers: {



            Authorization: `Bearer ${token}`,



            ...(isSaved ? {} : { "Content-Type": "application/json" }),



          },



          ...(isSaved ? {} : { body: JSON.stringify({



            googlePlaceId: pg.googlePlaceId,



            name: pg.name,



            address: pg.address || "",



            rating: pg.googleRating == null ? null : Number(pg.googleRating),



          }) }),



        }



      );



      const data = await response.json();



      if (!response.ok || !data.success) throw new Error(data.message || "Could not update favorites");



      if (isSaved) {



        setFavorites((previous) => previous.filter((item) => item.googlePlaceId !== pg.googlePlaceId));



      } else {



        setFavorites((previous) => previous.some((item) => item.googlePlaceId === pg.googlePlaceId)



          ? previous : [...previous, { ...pg }]);



      }



    } catch (err) {



      setFavoritesError(err.message);



    } finally {



      setFavoritePendingId(null);



    }



  }



  function togglePGComparison(pgId) {



    setSelectedPGIds((previous) => {



      if (previous.includes(pgId)) {



        return previous.filter((id) => id !== pgId);



      }



      if (previous.length >= 3) return previous;



      return [...previous, pgId];



    });



  }



  const selectedPGs = pgs.filter((pg) =>



    selectedPGIds.includes(pg.googlePlaceId)



  );



  const [commutes, setCommutes] = useState({});



  const [commuteLoading, setCommuteLoading] = useState({});



  const [commuteErrors, setCommuteErrors] = useState({});



  const [matrixLoading, setMatrixLoading] = useState(false);



  const [matrixError, setMatrixError] = useState("");



  // Track search and commute requests independently



  const searchIdRef = useRef(0);



  const matrixRequestIdRef = useRef(0);



  const mountedRef = useRef(true);



  // Store the latest selected travel mode



  const travelModeRef = useRef("driving-car");



  useEffect(() => {



    mountedRef.current = true;



    return () => {



      mountedRef.current = false;



      searchIdRef.current += 1;



      matrixRequestIdRef.current += 1;



    };



  }, []);



  async function handleSearch(event, preferenceOverride, destinationOverride) {



    event.preventDefault();
    const targetDestination = typeof destinationOverride === "string" ? destinationOverride : destination;
    const isNewDestination = targetDestination.trim().toLowerCase() !== searchedDestination.trim().toLowerCase();
    const requestedPreference = isNewDestination
      ? "all"
      : (typeof preferenceOverride === "string" ? preferenceOverride : pgPreference);



    if (!token) {

      setAuthMode("login");

      return;

    }



    const searchDestination = targetDestination.trim();



    if (!searchDestination || loading) {



      return;



    }



    const searchId = ++searchIdRef.current;



    // Invalidate any previous commute calculation



    matrixRequestIdRef.current += 1;



    setView("results");

    setShowFavorites(false);

    setLoading(true);



    setError("");



    setSearched(true);



    setPgs([]);



    setSelectedPGIds([]);



    setDestinationLocation(null);



    setSearchedDestination("");



    setCommutes({});



    setCommuteLoading({});



    setCommuteErrors({});



    setMatrixError("");



    setMatrixLoading(false);



    setSortBy("commute");
    if (isNewDestination) {
      setPgPreference("all");
      setMinRating("any");
      setMaxCommute("any");
      setMaxDistance("any");
    }



    try {



      // Step 1: Geocode destination



      const locationParams = new URLSearchParams({



        destination: searchDestination,



      });



      const locationResponse = await fetch(



        `/api/locations/geocode?${locationParams}`



      );



      const locationData = await locationResponse.json();



      if (!locationResponse.ok || !locationData.success) {



        throw new Error(



          locationData.message || "Destination not found"



        );



      }



      const location = locationData.location;



      // Step 2: Search real PGs using Google Places



      const params = new URLSearchParams({



        destination: searchDestination,



        latitude: String(location.latitude),



        longitude: String(location.longitude),
        preference: requestedPreference,



      });



      const response = await fetch(`/api/pgs/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });



      const data = await response.json();



      if (!response.ok || !data.success) {



        throw new Error(



          data.message || "Unable to fetch PG listings"



        );



      }



      if (



        searchId !== searchIdRef.current ||



        !mountedRef.current



      ) {



        return;



      }



      const foundPGs = data.pgs || [];



      setDestinationLocation(location);



      setSearchedDestination(searchDestination);



      setPgs(foundPGs);



      setLoading(false);



      // Step 3: Calculate commutes for the current mode



      if (foundPGs.length > 0) {



        await fetchCommuteMatrix(



          foundPGs,



          location,



          searchId,



          travelModeRef.current



        );



      }



    } catch (err) {



      if (



        searchId !== searchIdRef.current ||



        !mountedRef.current



      ) {



        return;



      }



      setError(



        err instanceof Error



          ? err.message



          : "Something went wrong"



      );



    } finally {



      if (



        searchId === searchIdRef.current &&



        mountedRef.current



      ) {



        setLoading(false);



      }



    }



  }



  // Calculate all PG commute times using one Matrix API request



  async function fetchCommuteMatrix(



    foundPGs,



    location,



    searchId,



    mode



  ) {



    const requestId = ++matrixRequestIdRef.current;



    // Clear old-mode results immediately



    setCommutes({});



    setCommuteLoading({});



    setCommuteErrors({});



    setMatrixError("");



    const validPGs = foundPGs.filter(



      (pg) =>



        pg.googlePlaceId &&



        pg.name &&



        pg.latitude != null &&



        pg.longitude != null &&



        Number.isFinite(Number(pg.latitude)) &&



        Number.isFinite(Number(pg.longitude))



    );



    if (validPGs.length === 0) {



      setMatrixLoading(false);



      return;



    }



    setMatrixLoading(true);



    try {



      const response = await fetch("/api/commute/matrix", {



        method: "POST",



        headers: {



          "Content-Type": "application/json",



        },



        body: JSON.stringify({



          destinationLatitude: location.latitude,



          destinationLongitude: location.longitude,



          mode,



          pgs: validPGs.slice(0, 20).map((pg) => ({



            googlePlaceId: pg.googlePlaceId,



            name: pg.name,



            latitude: pg.latitude,



            longitude: pg.longitude,



          })),



        }),



      });



      const data = await response.json();



      if (!response.ok || !data.success) {



        throw new Error(



          data.message || "Unable to calculate commute rankings"



        );



      }



      // Ignore results from older searches or travel modes



      if (



        searchId !== searchIdRef.current ||



        requestId !== matrixRequestIdRef.current ||



        mode !== travelModeRef.current ||



        !mountedRef.current



      ) {



        return;



      }



      const commuteMap = {};



      for (const result of data.results || []) {



        commuteMap[result.googlePlaceId] = {



          distanceKm: result.roadDistanceKm,



          durationMinutes: result.commuteMinutes,



          rank: result.rank,



          mode,



        };



      }



      setCommutes(commuteMap);



    } catch (err) {



      if (



        searchId !== searchIdRef.current ||



        requestId !== matrixRequestIdRef.current ||



        mode !== travelModeRef.current ||



        !mountedRef.current



      ) {



        return;



      }



      setMatrixError(



        err instanceof Error



          ? err.message



          : "Commute ranking failed"



      );



    } finally {



      if (



        searchId === searchIdRef.current &&



        requestId === matrixRequestIdRef.current &&



        mountedRef.current



      ) {



        setMatrixLoading(false);



      }



    }



  }



  // Change travel mode without repeating the PG search



  function handleTravelModeChange(mode) {



    if (mode === travelModeRef.current) {



      return;



    }



    travelModeRef.current = mode;



    setTravelMode(mode);



    // Invalidate older individual commute requests



    matrixRequestIdRef.current += 1;



    setCommutes({});



    setCommuteLoading({});



    setCommuteErrors({});



    setMatrixError("");



    if (



      destinationLocation &&



      pgs.length > 0 &&



      !loading



    ) {



      fetchCommuteMatrix(



        pgs,



        destinationLocation,



        searchIdRef.current,



        mode



      );



    }



  }



  // Retry an individual commute if the Matrix API cannot route it



  async function handleCheckCommute(pg) {



    const pgId = pg.googlePlaceId;



    if (



      !destinationLocation ||



      matrixLoading ||



      commuteLoading[pgId]



    ) {



      return;



    }



    const searchId = searchIdRef.current;



    const requestId = matrixRequestIdRef.current;



    const mode = travelModeRef.current;



    setCommuteLoading((previous) => ({



      ...previous,



      [pgId]: true,



    }));



    setCommuteErrors((previous) => ({



      ...previous,



      [pgId]: "",



    }));



    try {



      const params = new URLSearchParams({



        startLatitude: String(pg.latitude),



        startLongitude: String(pg.longitude),



        endLatitude: String(destinationLocation.latitude),



        endLongitude: String(destinationLocation.longitude),



        mode,



      });



      const response = await fetch(`/api/commute?${params}`);



      const data = await response.json();



      if (!response.ok || !data.success) {



        throw new Error(



          data.message || "Unable to calculate commute"



        );



      }



      if (



        searchId !== searchIdRef.current ||



        requestId !== matrixRequestIdRef.current ||



        mode !== travelModeRef.current ||



        !mountedRef.current



      ) {



        return;



      }



      setCommutes((previous) => ({



        ...previous,



        [pgId]: {



          ...data.commute,



          mode,



          rank: null,



        },



      }));



    } catch (err) {



      if (



        searchId !== searchIdRef.current ||



        requestId !== matrixRequestIdRef.current ||



        mode !== travelModeRef.current ||



        !mountedRef.current



      ) {



        return;



      }



      setCommuteErrors((previous) => ({



        ...previous,



        [pgId]:



          err instanceof Error



            ? err.message



            : "Commute calculation failed",



      }));



    } finally {



      if (



        searchId === searchIdRef.current &&



        requestId === matrixRequestIdRef.current &&



        mountedRef.current



      ) {



        setCommuteLoading((previous) => ({



          ...previous,



          [pgId]: false,



        }));



      }



    }



  }



  const matchScores = Object.fromEntries(
    pgs.map((pg) => [
      pg.googlePlaceId,
      commutes[pg.googlePlaceId]?.mode === travelMode
        ? calculateMatchScore(pg, destinationLocation, commutes[pg.googlePlaceId], matchPriority)
        : null,
    ])
  );

  // Sort PGs without modifying the original list



  const filteredPGs = pgs.filter((pg) => {
    if (pgPreference !== "all" && inferPGPreference(pg) !== pgPreference) return false;
    if (minRating !== "any") {
      const rating = Number(pg.googleRating);
      if (pg.googleRating == null || !Number.isFinite(rating) || rating < Number(minRating)) return false;
    }
    if (maxCommute !== "any") {
      const commute = commutes[pg.googlePlaceId];
      if (commute?.mode !== travelMode || !Number.isFinite(Number(commute.durationMinutes)) ||
          commute.durationMinutes == null || Number(commute.durationMinutes) > Number(maxCommute)) return false;
    }
    if (maxDistance !== "any") {
      if (!destinationLocation || pg.latitude == null || pg.longitude == null ||
          !Number.isFinite(Number(pg.latitude)) || !Number.isFinite(Number(pg.longitude))) return false;
      const km = calculateDistance(
        Number(destinationLocation.latitude), Number(destinationLocation.longitude),
        Number(pg.latitude), Number(pg.longitude)
      );
      if (km > Number(maxDistance)) return false;
    }
    return true;
  });

  const sortedPGs = [...filteredPGs].sort((a, b) => {



    if (sortBy === "match") {
      const scoreA = matchScores[a.googlePlaceId];
      const scoreB = matchScores[b.googlePlaceId];
      if (scoreA == null && scoreB == null) return 0;
      if (scoreA == null) return 1;
      if (scoreB == null) return -1;
      return scoreB - scoreA;
    }

    if (sortBy === "rating") {



      const ratingA = Number(a.googleRating ?? -1);



      const ratingB = Number(b.googleRating ?? -1);



      return ratingB - ratingA;



    }



    if (sortBy === "distance" && destinationLocation) {



      const distanceFor = (pg) => {



        if (



          pg.latitude == null ||



          pg.longitude == null ||



          !Number.isFinite(Number(pg.latitude)) ||



          !Number.isFinite(Number(pg.longitude))



        ) {



          return Infinity;



        }



        return calculateDistance(



          Number(destinationLocation.latitude),



          Number(destinationLocation.longitude),



          Number(pg.latitude),



          Number(pg.longitude)



        );



      };



      return distanceFor(a) - distanceFor(b);



    }



    if (sortBy === "commute") {



      const commuteA = commutes[a.googlePlaceId]?.durationMinutes;



      const commuteB = commutes[b.googlePlaceId]?.durationMinutes;



      const timeA = commuteA == null ? Infinity : commuteA;



      const timeB = commuteB == null ? Infinity : commuteB;



      return timeA - timeB;



    }



    return 0;



  });



  const rankedCount = pgs.filter(



    (pg) =>



      commutes[pg.googlePlaceId]?.durationMinutes != null



  ).length;



  const currentMode = TRAVEL_MODES[travelMode];



  return (



    <div className="min-h-screen bg-slate-50 text-slate-900">



        {/* Refined responsive product navigation */}
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-[0_2px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:py-4" aria-label="Main navigation">
            <a href="#home" onClick={(event) => { event.preventDefault(); setView("home"); setShowFavorites(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" aria-label="PGPilot home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#112747] text-lg font-black text-white shadow-sm transition group-hover:bg-blue-700">P<span className="text-sky-400">.</span></span>
              <span className="text-xl font-extrabold tracking-tight text-[#112747]">PG<span className="text-blue-700">Pilot</span></span>
            </a>
            <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0 sm:gap-3">
              <button type="button" onClick={() => { setView("home"); setShowFavorites(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${view === "home" && !showFavorites ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-[#112747]"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                <span>Explore PGs</span>
              </button>
              {token ? (
                <>
                  <button type="button" onClick={() => setShowFavorites((previous) => !previous)} aria-expanded={showFavorites} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${showFavorites ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-100 hover:text-[#112747]"}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>
                    <span>Saved PGs</span>
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold leading-none text-rose-700">{favorites.length}</span>
                  </button>
                  <span className="hidden h-7 w-px bg-slate-200 sm:block" aria-hidden="true" />
                  <div className="relative" ref={accountMenuRef}>



                    <button



                      type="button"



                      onClick={() => setAccountMenuOpen((open) => !open)}



                      aria-haspopup="menu"



                      aria-expanded={accountMenuOpen}



                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"



                    >



                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#112747] to-blue-700 font-bold text-white">



                        {(account?.name || "U").charAt(0).toUpperCase()}



                      </span>



                      <span className="hidden max-w-28 truncate sm:inline">{account?.name?.split(" ")[0] || "My Account"}</span>



                      <span aria-hidden="true" className="text-slate-500">⌄</span>



                    </button>



                    {accountMenuOpen && (
                      <div role="menu" aria-label="Account menu" className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,340px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_22px_65px_rgba(15,23,42,0.18)]">
                        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 px-3 py-4">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#112747] text-lg font-bold text-white">{(account?.name || "U").charAt(0).toUpperCase()}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#112747]">{account?.name || "PGPilot Member"}</p>
                            <p className="truncate text-xs text-slate-500">{account?.email || "Signed in"}</p>
                            <p className="mt-1 text-[11px] font-semibold text-blue-700">PGPilot member</p>
                          </div>
                        </div>
                        <p className="px-3 pb-1 pt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">My account</p>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setShowProfile(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span className="text-lg text-blue-700">◉</span><span className="flex-1"><span className="block text-sm font-semibold text-slate-800">My Profile</span><span className="block text-xs text-slate-500">Personal information and account</span></span><span className="text-slate-400">›</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setShowFavorites(true); window.scrollTo({top:0,behavior:"smooth"}); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span className="text-lg text-rose-600">♡</span><span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Saved PGs <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{favorites.length}</span></span><span className="block text-xs text-slate-500">Your shortlisted properties</span></span><span className="text-slate-400">›</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); if (selectedPGIds.length) { setView("results"); setShowFavorites(false); setTimeout(() => document.getElementById("pgpilot-compare-section")?.scrollIntoView({behavior:"smooth",block:"start"}), 120); } else { setView("results"); setShowFavorites(false); window.scrollTo({top:0,behavior:"smooth"}); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span className="text-lg text-blue-700">⇄</span><span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Compare PGs <span className="text-xs text-slate-500">({selectedPGIds.length}/3)</span></span><span className="block text-xs text-slate-500">{selectedPGIds.length ? "Review selected properties" : "Select properties from search results"}</span></span><span className="text-slate-400">›</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setShowSearchHistory(true); loadSearchHistory(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50">
                          <span className="text-lg text-blue-700">◷</span><span className="flex-1"><span className="block text-sm font-semibold text-slate-800">My Search History</span><span className="block text-xs text-slate-500">Review and repeat past searches</span></span><span className="text-slate-400">›</span>
                        </button>
                        <div className="mx-2 my-2 border-t border-slate-100" />
                        <p className="px-3 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Support & preferences</p>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setShowProfile(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50"><span className="text-lg">⚙</span> Account Settings <span className="ml-auto text-slate-400">›</span></button>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setFeedbackError(""); setFeedbackSuccess(false); setShowFeedback(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50">
                          <span className="text-lg" aria-hidden="true">✎</span>
                          Give Feedback
                          <span className="ml-auto text-slate-400">›</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setShowHelpSupport(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50"><span className="text-lg">?</span> Help & Support <span className="ml-auto text-slate-400">›</span></button>
                        <div className="mx-2 my-2 border-t border-slate-100" />
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); handleLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"><span className="text-lg">↪</span> Log out</button>
                      </div>
                    )}

                  </div>



                </>



              ) : (



                <>



                  <button type="button" onClick={() => setAuthMode("login")} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">



                    Log in



                  </button>



                  <button type="button" onClick={() => setAuthMode("register")} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">



                    Sign up



                  </button>



                </>



              )}



            </div>



          </nav>



        </header>







      {authMode && !token && (



        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"



          onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthMode(null); }}>



          <div role="dialog" aria-modal="true" aria-label="PGPilot account"



            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">



            <button type="button" aria-label="Close" onClick={() => setAuthMode(null)}



              className="absolute right-4 top-4 z-10 rounded-full px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>



            <AuthForm key={authMode} initialMode={authMode} onLogin={handleAuthSuccess} />



          </div>



        </div>



      )}




      {showSearchHistory && token && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSearchHistory(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="pgpilot-history-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
              <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Your destinations</p><h2 id="pgpilot-history-title" className="mt-1 text-2xl font-extrabold text-[#112747]">My Search History</h2><p className="mt-1 text-sm text-slate-500">Your 50 most recent PG searches</p></div>
              <button type="button" aria-label="Close search history" onClick={() => setShowSearchHistory(false)} className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <div className="overflow-y-auto px-6 py-5 sm:px-8">
              {historyError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{historyError}</p>}
              {historyLoading ? <p className="py-10 text-center text-slate-500">Loading your search history...</p> : searchHistory.length === 0 ? (
                <div className="py-12 text-center"><p className="text-3xl">⌖</p><p className="mt-3 font-bold text-slate-800">No searches yet</p><p className="mt-2 text-sm text-slate-500">Search for a destination to see it here.</p></div>
              ) : (
                <div className="space-y-3">{searchHistory.map((item) => (
                  <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30">
                    <div className="min-w-0 flex-1"><h3 className="truncate font-bold text-[#112747]">{item.destination}</h3><p className="mt-1 text-xs text-slate-500">{Number(item.results_count) || 0} PGs found · {item.created_at ? new Date(item.created_at).toLocaleString() : "Date unavailable"}</p></div>
                    <div className="flex gap-2"><button type="button" disabled={loading} onClick={() => searchAgainFromHistory(item)} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">Search Again</button><button type="button" disabled={historyDeletingId !== null} onClick={() => deleteSearchHistoryItem(item.id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{historyDeletingId === item.id ? "Deleting..." : "Delete"}</button></div>
                  </article>
                ))}</div>
              )}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 text-right sm:px-8"><button type="button" onClick={() => setShowSearchHistory(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></div>
          </div>
        </div>
      )}

      {showFeedback && token && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/65 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !feedbackSubmitting) setShowFeedback(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="pgpilot-feedback-heading"
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Your experience matters</p>
                <h2 id="pgpilot-feedback-heading" className="mt-2 text-2xl font-extrabold text-[#112747]">Rate your PGPilot experience</h2>
                <p className="mt-2 text-sm text-slate-500">Tell us what works and what we can improve.</p>
              </div>
              <button type="button" disabled={feedbackSubmitting} aria-label="Close feedback"
                onClick={() => setShowFeedback(false)}
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50">×</button>
            </div>
            {feedbackSuccess ? (
              <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <div className="text-3xl" aria-hidden="true">✓</div>
                <h3 className="mt-2 font-bold text-emerald-900">Thanks for your feedback!</h3>
                <p className="mt-2 text-sm text-emerald-800">Your review was submitted successfully.</p>
                <button type="button" onClick={() => setShowFeedback(false)}
                  className="mt-5 rounded-xl bg-[#112747] px-6 py-3 text-sm font-bold text-white hover:bg-blue-800">Done</button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="mt-7 space-y-5">
                <fieldset>
                  <legend className="text-sm font-bold text-slate-800">How would you rate PGPilot?</legend>
                  <div className="mt-3 flex gap-2" aria-label="Choose your rating">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                        aria-pressed={feedbackRating === value}
                        onClick={() => setFeedbackRating(value)}
                        className={`rounded-xl p-2 text-3xl transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${value <= feedbackRating ? "text-amber-500" : "text-slate-300"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{feedbackRating ? `${feedbackRating} out of 5 stars` : "Select a star rating"}</p>
                </fieldset>
                <label className="block text-sm font-bold text-slate-800" htmlFor="pgpilot-feedback-message">
                  Your feedback
                </label>
                <textarea id="pgpilot-feedback-message" rows={5} required minLength={10} maxLength={1000}
                  value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)}
                  placeholder="Share what you liked or what PGPilot could improve..."
                  className="w-full resize-y rounded-xl border border-slate-300 p-4 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>10–1000 characters</span><span>{feedbackMessage.trim().length}/1000</span>
                </div>
                {feedbackError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{feedbackError}</p>}
                <button type="submit" disabled={feedbackSubmitting || feedbackRating === 0 || feedbackMessage.trim().length < 10 || feedbackMessage.trim().length > 1000}
                  className="w-full rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {feedbackSubmitting ? "Submitting feedback..." : "Submit Feedback"}
                </button>
                <p className="text-center text-xs text-slate-500">This rates the PGPilot platform, not individual properties.</p>
              </form>
            )}
          </div>
        </div>
      )}

      {showHelpSupport && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelpSupport(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Help and Support" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#112747]">Help & Support</h2><p className="mt-1 text-sm text-slate-500">Quick answers about using PGPilot</p></div><button type="button" onClick={() => setShowHelpSupport(false)} aria-label="Close help" className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button></div>
            <div className="mt-6 space-y-4 text-sm text-slate-700"><div><p className="font-bold">How do I find PGs?</p><p>Enter your destination in Explore PGs and select Search.</p></div><div><p className="font-bold">How is commute time calculated?</p><p>PGPilot estimates travel time for your selected driving, walking, or cycling mode using routing data.</p></div><div><p className="font-bold">How do I save a PG?</p><p>Use the Save button on a property card, then open Saved PGs.</p></div><div><p className="font-bold">How do I compare PGs?</p><p>Select up to three PGs with Compare on the results page.</p></div><p className="rounded-lg bg-blue-50 p-3 text-xs text-slate-600">Listings come from Google Places. Confirm rent, availability and rules directly with the property before booking.</p></div>
            <button type="button" onClick={() => setShowHelpSupport(false)} className="mt-6 w-full rounded-xl bg-[#112747] px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">Got it</button>
          </div>
        </div>
      )}

      {showProfile && token && (







          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"







            onMouseDown={(event) => { if (event.target === event.currentTarget) setShowProfile(false); }}>







            <div role="dialog" aria-modal="true" aria-label="My Profile" className="w-full max-w-md">







              <UserProfile







  user={account}







  savedCount={favorites.length}







  onClose={() => setShowProfile(false)}







  onProfileUpdated={(updatedUser) => setAccount(updatedUser)}







/>







            </div>







          </div>







        )}



        {favoritesError && <p role="alert" className="mx-auto max-w-7xl px-6 pt-4 text-sm text-red-600">{favoritesError}</p>}



      <main id="home">



        {token && showFavorites && (



          <section className="mx-auto max-w-7xl px-6 pt-10" aria-label="Saved PGs">



            <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">



              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">



                <div>



                  <h2 className="text-2xl font-bold">♥ Your Saved PGs</h2>



                  <p className="mt-1 text-sm text-slate-500">



                    Your personal shortlist, available whenever you sign in.



                  </p>



                </div>



                <button



                  type="button"



                  onClick={() => setShowFavorites(false)}



                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"



                >



                  Close



                </button>



              </div>



              {favoritesBusy ? (



                <p className="text-slate-600">Loading saved PGs...</p>



              ) : favorites.length === 0 ? (



                <p className="text-slate-600">No saved PGs yet. Use the heart button on any listing.</p>



              ) : (



                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">



                  {favorites.map((pg) => (



                    <article key={pg.googlePlaceId} className="flex flex-col rounded-xl border border-slate-200 p-5">



                      <h3 className="font-bold text-slate-900">{pg.name}</h3>



                      <p className="mt-2 flex-1 text-sm text-slate-600">{pg.address}</p>



                      <p className="mt-3 text-sm font-semibold text-amber-700">



                        {pg.googleRating == null ? "No Google rating" : `★ ${pg.googleRating}`}



                        {pg.googleRatingCount != null ? ` · ${pg.googleRatingCount} reviews` : ""}



                      </p>



                      <div className="mt-4 flex flex-wrap gap-2">



                        <a



                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.name)}&query_place_id=${encodeURIComponent(pg.googlePlaceId)}`}



                          target="_blank"



                          rel="noopener noreferrer"



                          className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"



                        >



                          View on Maps



                        </a>



                        <button



                          type="button"



                          onClick={() => toggleFavorite(pg)}



                          disabled={favoritePendingId !== null || favoritesBusy}



                          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"



                        >



                          Remove



                        </button>



                      </div>



                    </article>



                  ))}



                </div>



              )}



            </div>



          </section>



        )}



        {view === "home" && (<>

        {/* Premium Homepage Hero */}

        <section className="relative isolate overflow-hidden bg-[#112747] px-4 py-16 text-white sm:px-6 sm:py-24 lg:py-28">

          <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-5xl text-center">

            <span className="inline-flex rounded-full border border-blue-300/25 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">

              Smarter accommodation discovery

            </span>

            <h2 className="mx-auto mt-8 max-w-4xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">

              Find a place that <span className="block text-blue-300">fits your life.</span>

            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">

              Explore real PG listings near your college or workplace.

              Compare commute times and choose a stay that works for you.

            </p>

            <form id="search" onSubmit={handleSearch}

              className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-2xl border border-white/20 bg-white p-3 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:flex-row sm:items-center">

              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">

                <span className="text-xl text-blue-700" aria-hidden="true">⌖</span>

                <input type="text" value={destination}

                  onChange={(event) => setDestination(event.target.value)}

                  placeholder="Enter your college or workplace"

                  aria-label="College or workplace destination"

                  className="w-full min-w-0 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md"

                  required />

              </div>

              <button type="submit" disabled={loading}

                className="min-h-12 rounded-xl bg-blue-700 px-8 py-3.5 font-bold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60">

                {loading ? "Searching..." : "Find PGs →"}

              </button>

            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Popular destinations">
              <span className="mr-1 text-xs font-semibold text-slate-400">Popular destinations</span>
              {["VIT Vellore", "Anna University", "Tidel Park"].map((place) => (
                <button key={place} type="button" onClick={() => setDestination(place)}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:border-blue-300 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  {place}
                </button>
              ))}
            </div>

            {error && (

              <p role="alert" className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-300/30 bg-red-950/50 p-4 text-sm text-red-100">

                {error}

              </p>

            )}

            <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">

              {[

                { icon: "⌖", title: "Real PG Listings", description: "Explore places near your destination" },

                { icon: "↗", title: "Commute Insights", description: "Compare estimated travel times" },

                { icon: "♡", title: "Save Favorites", description: "Keep track of your preferred PGs" },

              ].map((feature) => (

                <div key={feature.title}

                  className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 text-left shadow-sm backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 hover:bg-white/[0.1]">

                  <span className="text-2xl text-blue-300" aria-hidden="true">{feature.icon}</span>

                  <h3 className="mt-3 font-bold text-white">{feature.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>

                </div>

              ))}

            </div>

          </div>

        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">

          <div className="mb-10 max-w-2xl">

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Why PGPilot</p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#112747] sm:text-4xl">A better way to choose where you stay.</h2>

            <p className="mt-4 text-slate-600">Don't choose a PG based on location alone. See how each place fits your daily routine.</p>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {[

              {number:"01",title:"Search around your destination",description:"Start with your campus or office, not a random neighborhood."},

              {number:"02",title:"Compare your actual commute",description:"Review estimated travel times for driving, walking, or cycling."},

              {number:"03",title:"Shortlist with confidence",description:"Compare up to three PGs and save favorites to your account."}

            ].map(item => <article key={item.number} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><span className="text-sm font-extrabold text-blue-600">{item.number}</span><h3 className="mt-5 text-lg font-bold text-[#112747]">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p></article>)}

          </div>

        </section>

        <section className="bg-white py-20">

          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-2">

            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Built around your commute</p><h2 className="mt-3 text-3xl font-extrabold text-[#112747] sm:text-4xl">A cheaper room isn't always a better deal.</h2><p className="mt-5 leading-8 text-slate-600">Long daily journeys can cost you time and money. PGPilot puts estimated commute time alongside listing details, so you can make a more informed choice.</p><button type="button" onClick={() => { if (!token) setAuthMode("register"); else document.getElementById("search")?.scrollIntoView({behavior:"smooth"}); }} className="mt-7 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">{token ? "Start exploring" : "Create your free account"} →</button></div>

            <div className="rounded-3xl bg-[#112747] p-7 text-white shadow-xl sm:p-10"><p className="text-sm font-semibold text-blue-200">YOUR PG SEARCH, SIMPLIFIED</p><div className="mt-7 space-y-4">{["Find accommodation near your destination","Check estimated travel times","Compare listings side by side","Save your personal shortlist"].map((item,index) => <div key={item} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold">{index+1}</span><span className="font-medium">{item}</span></div>)}</div><p className="mt-6 text-xs text-slate-300">Listing availability and commute estimates depend on external data providers.</p></div>

          </div>

        </section>

        <section className="mx-auto max-w-5xl px-6 py-20 text-center"><h2 className="text-3xl font-extrabold text-[#112747]">Ready to find your next place?</h2><p className="mx-auto mt-4 max-w-xl text-slate-600">Start with the destination you visit most. We'll help you explore nearby options.</p><button type="button" onClick={() => document.getElementById("search")?.scrollIntoView({behavior:"smooth"})} className="mt-7 rounded-xl bg-blue-700 px-7 py-3 font-semibold text-white hover:bg-blue-800">Find PGs →</button></section>

        {/* Real platform usage metrics: intentionally below all homepage marketing sections. */}
        <section className="border-t border-slate-100 bg-slate-50 px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">PGPilot in numbers</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#112747] sm:text-4xl">Our Growing Community</h2>
              <p className="mt-3 text-slate-600">Real activity from the PGPilot platform</p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { icon: "👥", label: "Registered Users", value: platformStats?.totalUsers },
                { icon: "🔎", label: "PG Searches", value: platformStats?.totalSearches },
                { icon: "💬", label: "User Feedback", value: platformStats?.totalFeedback },
                { icon: "⭐", label: "Platform Rating", value: platformStats?.averageRating == null ? null : `${platformStats.averageRating}/5` }
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-7 text-center shadow-sm transition-shadow hover:shadow-md sm:px-6">
                  <span className="text-3xl" aria-hidden="true">{stat.icon}</span>
                  <div className="mt-3 text-3xl font-extrabold text-[#112747]">
                    {stat.value ?? (platformStats && stat.label === "Platform Rating" ? "Not rated" : "—")}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
            {platformStatsError && <p className="mt-4 text-center text-sm text-slate-500">Statistics are temporarily unavailable.</p>}
          </div>
        </section>

        </>)}

        {view === "results" && (
          <section className="relative overflow-hidden bg-[#102746] px-6 py-12 text-white sm:py-16">
            <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative mx-auto max-w-7xl">
              <button type="button" onClick={() => { setView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white">← Back to homepage</button>
              <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">PGPILOT / DISCOVER STAYS</p>
                  <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Find a better place near <span className="text-sky-300">{searchedDestination || destination}</span></h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Compare verified source information, real-world commute estimates and personalized match scores—all in one place.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Listings discovered</p>
                  <p className="mt-1 text-3xl font-extrabold text-white">{pgs.length}</p>
                </div>
              </div>
              <form onSubmit={handleSearch} className="mt-8 flex max-w-4xl flex-col gap-3 rounded-2xl border border-white/20 bg-white p-2 shadow-2xl shadow-slate-950/20 sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-4">
                  <span className="text-xl" aria-hidden="true">⌕</span>
                  <span className="sr-only">Change destination</span>
                  <input aria-label="Change destination" value={destination} onChange={event => setDestination(event.target.value)} required placeholder="Search college, workplace or landmark" className="w-full min-w-0 bg-transparent py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" />
                </label>
                <button disabled={loading} type="submit" className="rounded-xl bg-blue-700 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60">{loading ? "Searching..." : "Search PGs →"}</button>
              </form>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
                <span>✓ Google Places listings</span><span>✓ Travel-time comparison</span><span>✓ Personalized Smart Match</span>
              </div>
              {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            </div>
          </section>
        )}

        {loading && (



          <p className="pb-10 text-center text-slate-600">



            Finding nearby accommodation...



          </p>



        )}



        {/* Results */}



        {view === "results" && searched && !loading && !error && (



          <section className="mx-auto max-w-7xl px-6 py-10 pb-20">



            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">



              <div>



                <h3 className="text-2xl font-extrabold tracking-tight text-[#102746]">



                  {pgs.length} places found near{" "}



                  {searchedDestination}



                </h3>



                <p className="mt-2 text-sm text-slate-500">



                  Explore your options, refine your preferences, and compare what matters to you. Listings sourced from Google Places.



                </p>



              </div>



              {/* Sorting */}



              {pgs.length > 0 && (



                <div className="flex items-center gap-3">



                  <label



                    htmlFor="sortBy"



                    className="text-sm font-semibold text-slate-700"



                  >



                    Sort by



                  </label>



                  <select



                    id="sortBy"



                    value={sortBy}



                    onChange={(event) =>



                      setSortBy(event.target.value)



                    }



                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"



                  >



                    <option value="match">Best Match (PGPilot Score)</option>
                    <option value="commute">



                      Shortest commute



                    </option>



                    <option value="rating">



                      Highest Google rating



                    </option>



                    <option value="distance">



                      Nearest straight-line distance



                    </option>



                  </select>



                </div>



              )}



            </div>



                          {/* Advanced filters and accommodation preferences */}
              {pgs.length > 0 && (
                <section aria-label="PG filters and preferences" className="mb-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-[#112747]">Filters &amp; PG Preferences</h4>
                      <p className="mt-1 text-sm text-slate-500">Choose a category to search Google Places again; rating, commute and distance filters apply locally.</p>
                    </div>
                    <button type="button" onClick={() => {
                      if (pgPreference !== "all") { setPgPreference("all"); handleSearch({ preventDefault() {} }, "all"); }
                      setMinRating("any");
                      setMaxCommute("any"); setMaxDistance("any");
                    }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      Clear Filters
                    </button>
                  </div>
                  <fieldset>
                    <legend className="mb-3 text-sm font-bold text-slate-800">Accommodation preference</legend>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["all", "All PGs"], ["coliving", "Co-living"],
                        ["men", "Men's PG"], ["women", "Women's PG"]
                      ].map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={pgPreference === value}
                          onClick={() => { if (value !== pgPreference) { setPgPreference(value); handleSearch({ preventDefault() {} }, value); } }}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${pgPreference === value
                            ? "border-blue-700 bg-blue-700 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Category searches use Google Places keywords. Results are not verified by the property; confirm eligibility before booking.</p>
                  </fieldset>
                   <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                     <label htmlFor="matchPriority" className="block text-sm font-bold text-[#112747]">
                       Smart Match preference
                     </label>
                     <p className="mt-1 text-xs text-slate-600">Choose what matters most. This changes PGPilot Score weights and sorts by Best Match.</p>
                     <select
                       id="matchPriority"
                       value={matchPriority}
                       onChange={(event) => {
                         setMatchPriority(event.target.value);
                         setSortBy("match");
                       }}
                       className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold sm:max-w-sm"
                     >
                       <option value="balanced">Balanced — Commute 45%, Distance 20%, Rating 35%</option>
                       <option value="commute">Commute First — Commute 70%</option>
                       <option value="rating">Rating First — Rating 70%</option>
                       <option value="nearest">Nearest First — Distance 65%</option>
                     </select>
                     <p className="mt-2 text-xs text-slate-500">Scores are estimates from available commute, location and Google rating data; unrated listings use a neutral rating.</p>
                   </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-slate-700">Minimum Google rating
                      <select value={minRating} onChange={(event) => setMinRating(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
                        <option value="any">Any rating</option>
                        <option value="3">3+ stars</option><option value="4">4+ stars</option>
                        <option value="4.5">4.5+ stars</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">Maximum commute
                      <select value={maxCommute} onChange={(event) => setMaxCommute(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
                        <option value="any">Any commute</option>
                        <option value="10">10 minutes</option><option value="20">20 minutes</option>
                        <option value="30">30 minutes</option><option value="45">45 minutes</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700">Maximum distance
                      <select value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
                        <option value="any">Any distance</option>
                        <option value="1">Within 1 km</option><option value="2">Within 2 km</option>
                        <option value="3">Within 3 km</option><option value="5">Within 5 km</option>
                      </select>
                    </label>
                  </div>
                  <p role="status" className="mt-5 text-sm font-semibold text-blue-800">
                    Showing {filteredPGs.length} of {pgs.length} PGs
                    {maxCommute !== "any" && matrixLoading ? " · Calculating commute times…" : ""}
                  </p>
                </section>
              )}

{/* Travel mode selector */}



            {pgs.length > 0 && (



              <div className="mb-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">



                <div className="mb-4">



                  <h4 className="text-base font-bold text-slate-900">



                    Choose your travel mode



                  </h4>



                  <p className="mt-1 text-sm text-slate-500">



                    Compare PGs based on how you travel to your



                    destination.



                  </p>



                </div>



                <div className="grid grid-cols-3 gap-3">



                  {Object.entries(TRAVEL_MODES).map(



                    ([mode, details]) => {



                      const selected = travelMode === mode;



                      return (



                        <button



                          key={mode}



                          type="button"



                          onClick={() =>



                            handleTravelModeChange(mode)



                          }



                          aria-pressed={selected}



                          className={`rounded-xl border px-3 py-4 text-sm font-bold transition ${



                            selected



                              ? "border-blue-700 bg-blue-700 text-white shadow-sm"



                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 hover:bg-blue-50"



                          }`}



                        >



                          <span className="mb-2 block text-2xl">



                            {details.icon}



                          </span>



                          {details.label}



                        </button>



                      );



                    }



                  )}



                </div>



              </div>



            )}



            {/* Matrix loading */}



            {matrixLoading && (



              <div



                role="status"



                className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800"



              >



                Calculating {currentMode.label.toLowerCase()} distances



                and commute rankings...



              </div>



            )}



            {/* Matrix error */}



            {matrixError && (



              <div



                role="alert"



                className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"



              >



                Automatic {currentMode.label.toLowerCase()} commute



                ranking is unavailable: {matrixError}. You can



                still view PG listings and retry individual routes.



              </div>



            )}



            {!matrixLoading && rankedCount > 0 && (



              <p className="mb-6 text-sm font-medium text-blue-700">



                ✓ Estimated {currentMode.label.toLowerCase()} commutes



                calculated for {rankedCount} of {pgs.length} PGs.



              </p>



            )}



            {pgs.length === 0 ? (



              <p className="text-slate-600">



                No accommodation found near this destination.



              </p>



            ) : (



              <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">



                {sortedPGs.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <h4 className="font-bold text-slate-900">No PGs match these filters</h4>
                    <p className="mt-2 text-sm text-slate-600">Try All PGs or relax the rating, commute, or distance limit.</p>
                  </div>
                )}
                {sortedPGs.map((pg) => {



                  const hasCoordinates =



                    pg.latitude != null &&



                    pg.longitude != null &&



                    Number.isFinite(Number(pg.latitude)) &&



                    Number.isFinite(Number(pg.longitude));



                  const distance =



                    destinationLocation && hasCoordinates



                      ? calculateDistance(



                          Number(destinationLocation.latitude),



                          Number(destinationLocation.longitude),



                          Number(pg.latitude),



                          Number(pg.longitude)



                        )



                      : null;



                  const commute = commutes[pg.googlePlaceId];



                  const hasCommute =



                    commute?.durationMinutes != null &&



                    commute?.mode === travelMode;



                  const checkingCommute =



                    commuteLoading[pg.googlePlaceId];



                  const commuteError =



                    commuteErrors[pg.googlePlaceId];



                  return (



                    <article



                      key={pg.googlePlaceId}



                      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_45px_rgba(37,99,235,0.13)] sm:p-5"



                    >



                      <div className="mb-4 flex items-center justify-between rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">PGPilot Match Score</p>
                        <p className="mt-1 text-xs text-slate-500">Personalized by your Smart Match preference</p>
                      </div>
                      <div className="text-right">
                        <span className="block text-2xl font-extrabold tracking-tight text-[#112747]">
                          {matchScores[pg.googlePlaceId] == null ? "Pending" : `${matchScores[pg.googlePlaceId]}/100`}
                        </span>
                        <span className="text-[11px] font-medium text-blue-700">Smart Match</span>
                      </div>
                    </div>
                    <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Match score for ${pg.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={matchScores[pg.googlePlaceId] == null ? undefined : Math.max(0, Math.min(100, Number(matchScores[pg.googlePlaceId]) || 0))}>
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, Number(matchScores[pg.googlePlaceId]) || 0))}%` }} />
                    </div>
                    <PGPhoto key={`${pg.googlePlaceId}-${pg.photoUrl || "none"}`} pg={pg} className="mb-4 h-52 overflow-hidden rounded-2xl ring-1 ring-slate-100 sm:h-56" />

                      {/* Compact Save and Compare actions */}
                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(pg)}
                          disabled={favoritePendingId !== null || favoritesBusy}
                          aria-pressed={favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId)}
                          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                            favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId)
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50"
                          }`}
                        >
                          <span aria-hidden="true" className="text-lg">{favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId) ? "♥" : "♡"}</span>
                          {favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId) ? "Saved" : "Save PG"}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePGComparison(pg.googlePlaceId)}
                          disabled={selectedPGIds.length >= 3 && !selectedPGIds.includes(pg.googlePlaceId)}
                          aria-pressed={selectedPGIds.includes(pg.googlePlaceId)}
                          title={selectedPGIds.length >= 3 && !selectedPGIds.includes(pg.googlePlaceId) ? "Compare up to 3 PGs" : undefined}
                          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            selectedPGIds.includes(pg.googlePlaceId)
                              ? "border-blue-700 bg-blue-50 text-blue-800"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <span aria-hidden="true" className="text-base">⇄</span>
                          {selectedPGIds.includes(pg.googlePlaceId) ? "Selected" : "Compare"}
                        </button>
                      </div>

                      {/* Name and rating */}



                      <div className="mb-3 flex items-start justify-between gap-3">



                        <h4 className="text-lg font-extrabold leading-snug tracking-tight text-slate-900">



                          {pg.name}



                        </h4>



                        <span className="shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">



                          {pg.googleRating == null



                            ? "No rating"



                            : `★ ${pg.googleRating}`}



                        </span>



                      </div>



                      {/* Commute rank */}



                      {sortBy === "commute" &&



                        hasCommute &&



                        commute.rank != null && (



                          <span className="mb-4 self-start rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-[#112747]">



                            Commute Rank #{commute.rank}



                          </span>



                        )}



                      {/* Address */}



                      <p className="mb-4 min-h-20 text-sm leading-6 text-slate-600">



                        {pg.address}



                      </p>



                      <p className="mb-4 text-sm text-slate-500">



                        {pg.googleRatingCount ?? 0} Google ratings



                      </p>



                      {/* Straight-line distance */}



                      {distance !== null && (



                        <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3">



                          <p className="text-sm font-bold text-[#112747]">



                            📍 {distance.toFixed(2)} km away



                          </p>



                          <p className="mt-1 text-xs text-blue-700">



                            Straight-line distance



                          </p>



                        </div>



                      )}



                      {/* Selected-mode commute */}



                      {hasCommute ? (



                        <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-4">



                          <p className="mb-3 text-sm font-bold text-blue-900">



                            {currentMode.icon} Estimated{" "}



                            {currentMode.label} Commute



                          </p>



                          <div className="grid grid-cols-2 gap-3">



                            <div>



                              <p className="text-xs text-blue-700">



                                Route distance



                              </p>



                              <p className="text-lg font-extrabold text-blue-900">



                                {commute.distanceKm} km



                              </p>



                            </div>



                            <div>



                              <p className="text-xs text-blue-700">



                                Travel time



                              </p>



                              <p className="text-lg font-extrabold text-blue-900">



                                {commute.durationMinutes} min



                              </p>



                            </div>



                          </div>



                          <p className="mt-3 text-xs text-blue-700">



                            Estimated using OpenRouteService.



                            No live traffic.



                          </p>



                        </div>



                      ) : (



                        <div className="mb-4">



                          <p className="mb-2 text-sm text-slate-500">



                            {matrixLoading



                              ? `Calculating ${currentMode.label.toLowerCase()} commute...`



                              : `${currentMode.label} commute not available`}



                          </p>



                          {!matrixLoading &&



                            hasCoordinates &&



                            destinationLocation && (



                              <button



                                type="button"



                                onClick={() =>



                                  handleCheckCommute(pg)



                                }



                                disabled={checkingCommute}



                                className="w-full rounded-xl border border-blue-700 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"



                              >



                                {checkingCommute



                                  ? "Checking..."



                                  : "Retry Commute"}



                              </button>



                            )}



                          {commuteError && (



                            <p



                              role="alert"



                              className="mt-2 text-sm text-red-600"



                            >



                              {commuteError}



                            </p>



                          )}



                        </div>



                      )}



                      <button

                        type="button"

                        onClick={() => setDetailPG(pg)}

                        className="mb-3 mt-auto w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-800 transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"

                      >

                        View PG Details →

                      </button>

                      {/* Google Maps link */}



                      <a



                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(



                          pg.name



                        )}&query_place_id=${encodeURIComponent(



                          pg.googlePlaceId



                        )}`}



                        target="_blank"



                        rel="noopener noreferrer"



                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"



                      >



                        View on Google Maps



                      </a>



                    </article>



                  );



                })}



              </div>



            )}



            <div id="pgpilot-compare-section" className="scroll-mt-28">
            <PGComparison



              selectedPGs={selectedPGs}



              commutes={commutes}



              destinationLocation={destinationLocation}



              travelMode={travelMode}



              onRemove={(pgId) =>



                setSelectedPGIds((previous) =>



                  previous.filter((id) => id !== pgId)



                )



              }



              onClear={() => setSelectedPGIds([])}



            />
            </div>



          </section>



        )}



        {/* Google Map */}



        {view === "results" && searched && !loading && !error && pgs.length > 0 && (



        <section className="mx-auto max-w-7xl px-6 pb-12">



          <h2 className="mb-5 text-2xl font-bold">



            Nearby PGs on Google Maps



          </h2>



          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">



            <MapTest



              pgs={pgs}



              destinationLocation={destinationLocation}



            />



          </div>



        </section>



        )}



      </main>



      {/* Step 147: Enhanced PG details, using existing verified listing fields. */}
      {detailPG && (() => {
        const id = detailPG.googlePlaceId;
        const commute = commutes[id]?.mode === travelMode ? commutes[id] : null;
        const score = matchScores[id] ?? calculateMatchScore(detailPG, destinationLocation, commute);
        const category = inferPGPreference(detailPG);
        const categoryLabel = { men: "Men's PG", women: "Women's PG", coliving: "Co-living", unknown: "Category unconfirmed" }[category];
        const saved = favorites.some((item) => item.googlePlaceId === id);
        const compared = selectedPGIds.includes(id);
        const lat = Number(detailPG.latitude);
        const lon = Number(detailPG.longitude);
        const destLat = Number(destinationLocation?.latitude);
        const destLon = Number(destinationLocation?.longitude);
        const hasCoords = [lat, lon, destLat, destLon].every(Number.isFinite) && destinationLocation != null;
        const straightKm = hasCoords ? calculateDistance(destLat, destLon, lat, lon) : null;
        const clamp = (v) => Math.max(0, Math.min(1, v));
        const minutes = commute?.durationMinutes == null ? null : Number(commute.durationMinutes);
        const validMinutes = minutes != null && Number.isFinite(minutes);
        const rating = detailPG.googleRating == null ? null : Number(detailPG.googleRating);
        const commutePoints = validMinutes ? Math.round(clamp(1 - minutes / 30) * 45) : null;
        const ratingPoints = Math.round(clamp((rating != null && Number.isFinite(rating) ? rating : 2.5) / 5) * 35);
        const distancePoints = straightKm != null ? Math.round(clamp(1 - straightKm / 5) * 20) : null;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailPG.name)}&query_place_id=${encodeURIComponent(id)}`;
        const directionsUrl = hasCoords
          ? `https://www.google.com/maps/dir/?api=1&origin=${destLat},${destLon}&destination=${lat},${lon}`
          : mapsUrl;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
            onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailPG(null); }}>
            <section role="dialog" aria-modal="true" aria-label={`${detailPG.name} details`}
              className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="relative bg-[#112747] px-6 py-8 text-white sm:px-9">
                <button type="button" aria-label="Close PG details" onClick={() => setDetailPG(null)}
                  className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25">×</button>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200">PGPilot · Property overview</p>
                <h2 className="mt-3 max-w-xl pr-7 text-2xl font-extrabold sm:text-3xl">{detailPG.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">⌖ {detailPG.address}</p>
                <span className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">{categoryLabel} · inferred from listing text</span>
              </div>
              <div className="space-y-6 p-5 sm:p-8">
                <PGPhoto key={`${id}-${detailPG.photoUrl || "none"}`} pg={detailPG} className="h-52 sm:h-64" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Google rating</p><p className="mt-2 text-xl font-extrabold text-[#112747]">{rating == null ? "Unrated" : `★ ${rating}`}</p><p className="mt-1 text-xs text-slate-500">{detailPG.googleRatingCount ?? 0} reviews</p></div>
                  <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs text-blue-700">{currentMode.label} commute</p><p className="mt-2 text-xl font-extrabold text-[#112747]">{validMinutes ? `${minutes} min` : "Pending"}</p><p className="mt-1 text-xs text-blue-700">Estimated travel time</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Road distance</p><p className="mt-2 text-xl font-extrabold text-[#112747]">{commute?.distanceKm != null ? `${commute.distanceKm} km` : "Pending"}</p><p className="mt-1 text-xs text-slate-500">Route estimate</p></div>
                  <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs text-blue-700">PGPilot match</p><p className="mt-2 text-xl font-extrabold text-[#112747]">{score == null ? "Pending" : `${score}/100`}</p><p className="mt-1 text-xs text-blue-700">Rule-based score</p></div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-[#112747]">Why this match score?</h3><span className="text-xs font-semibold text-slate-500">45% commute · 35% rating · 20% distance</span></div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">The score is calculated from estimated commute time, Google rating and straight-line distance. It does not verify rent, safety, availability or amenities.</p>
                  <div className="mt-5 space-y-4">
                    {[
                      { label: "Commute time", points: commutePoints, max: 45, note: validMinutes ? `${minutes} min` : "Not calculated" },
                      { label: "Google rating", points: ratingPoints, max: 35, note: rating == null ? "Unrated · neutral score" : `${rating}/5` },
                      { label: "Distance", points: distancePoints, max: 20, note: straightKm == null ? "Not available" : `${straightKm.toFixed(1)} km straight-line` },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-800">{item.label} <span className="font-normal text-slate-500">· {item.note}</span></span><span className="font-bold text-[#112747]">{score == null || item.points == null ? "—" : `${item.points}/${item.max}`}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${score == null || item.points == null ? 0 : item.points / item.max * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Displayed breakdown points are rounded individually; the final match score is rounded after summing the underlying values.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-[#112747]">About this property</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">This listing was discovered through Google Places. Accommodation category is inferred from public listing text, not verified by the property. Contact the PG directly to confirm gender eligibility, room availability, monthly rent, deposit, food, amenities and safety arrangements.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-800">Open in Google Maps ↗</a>
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center text-sm font-bold text-blue-800 transition hover:bg-blue-100">Get directions ↗</a>
                  <button type="button" onClick={() => toggleFavorite(detailPG)} disabled={favoritePendingId !== null || favoritesBusy}
                    className={`rounded-xl border px-5 py-3 text-sm font-bold transition disabled:opacity-50 ${saved ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-[#112747] hover:bg-slate-50"}`}>
                    {saved ? "♥ Saved PG" : "♡ Save PG"}
                  </button>
                  <button type="button" onClick={() => togglePGComparison(id)} disabled={!compared && selectedPGIds.length >= 3}
                    className={`rounded-xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${compared ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-[#112747] hover:bg-slate-50"}`}>
                    {compared ? "✓ Selected for comparison" : selectedPGIds.length >= 3 ? "Compare limit reached (3)" : "+ Add to Compare"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      })()}

      {/* Footer */}



      <footer className="border-t border-slate-200 bg-[#112747] py-8 text-center text-sm text-slate-300">



        © {new Date().getFullYear()} PGPilot. Find smarter.



        Live better.



      </footer>



    </div>



  );



}



export default App;
