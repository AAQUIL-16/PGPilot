import { useEffect, useRef, useState } from "react";



import UserProfile from "./UserProfile";



import MapTest from "./MapTest";



import PGComparison from "./PGComparison";



import AuthForm from "./AuthForm";



const TRAVEL_MODES = {
  "driving-car": { label: "Driving" },
  "foot-walking": { label: "Walking" },
  "cycling-regular": { label: "Cycling" },
};

// Inline SVGs keep the travel selector consistent without extra dependencies.
function TravelModeIcon({ mode, className = "h-6 w-6" }) {
  const shared = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", "aria-hidden": true };
  if (mode === "driving-car") return (
    <svg {...shared}><path d="M5 17H3v-5l2-6h14l2 6v5h-2"/><path d="M5 17h14M3 12h18M7 6l-2 6m12-6 2 6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  );
  if (mode === "foot-walking") return (
    <svg {...shared}><circle cx="13" cy="4" r="2"/><path d="m7 21 3-5 2-4m-2-4 3 2 3 1 3 4M10 8l-3 4-3 1m8-1-2 4 5 5"/></svg>
  );
  return (
    <svg {...shared}><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="m5.5 17 4-9 4 9h-8m8 0 5-9h-5m-4-3h3"/></svg>
  );
}


// Consistent outline icons for the account menu (no additional package required).
function AccountMenuIcon({ name, className = "h-[19px] w-[19px]" }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    compare: <><path d="M4 7h16M4 17h16"/><path d="m8 3-4 4 4 4m8 2 4 4-4 4"/></>,
    history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    settings: <><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4"/></>,
    feedback: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z"/><path d="M8 11.5h9"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.9-1.7 1.4-1.7 3.2"/><path d="M12 17h.01"/></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M14 8l4 4-4 4m4-4H9"/></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.user}</svg>;
}

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

// Explainable breakdown uses the exact same inputs and weights as the ranking score.
function getMatchExplanation(pg, destinationLocation, commute, priority = "balanced") {
  const minutes = commute?.durationMinutes == null ? null : Number(commute.durationMinutes);
  const coords = [pg.latitude, pg.longitude, destinationLocation?.latitude, destinationLocation?.longitude];
  if (minutes == null || !Number.isFinite(minutes) || coords.some((v) => v == null || !Number.isFinite(Number(v)))) return null;
  const [lat, lon, destLat, destLon] = coords.map(Number);
  const km = calculateDistance(destLat, destLon, lat, lon);
  const weights = MATCH_WEIGHTS[priority] || MATCH_WEIGHTS.balanced;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const rating = pg.googleRating == null ? null : Number(pg.googleRating);
  const validRating = rating != null && Number.isFinite(rating) && rating >= 0 && rating <= 5;
  const ratingValue = validRating ? rating : 2.5;
  const parts = [
    { label: "Commute time", points: clamp(1 - minutes / 30) * weights.commute, max: weights.commute, note: `${minutes.toFixed(1)} min estimated` },
    { label: "Google rating", points: clamp(ratingValue / 5) * weights.rating, max: weights.rating, note: validRating ? `${rating}/5` : "Unrated · neutral 2.5/5 used" },
    { label: "Straight-line distance", points: clamp(1 - km / 5) * weights.distance, max: weights.distance, note: `${km.toFixed(1)} km` },
  ];
  return { parts, total: Math.round(parts.reduce((sum, part) => sum + part.points, 0)), weights };
}

function calculateMatchScore(pg, destinationLocation, commute, priority = "balanced") {
  return getMatchExplanation(pg, destinationLocation, commute, priority)?.total ?? null;
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
  const [mapExpanded, setMapExpanded] = useState(false);



  const [travelMode, setTravelMode] = useState("driving-car");



  const [sortBy, setSortBy] = useState("commute");
  const [matchPriority, setMatchPriority] = useState("balanced");
  const [pgPreference, setPgPreference] = useState("all");
  const [minRating, setMinRating] = useState("any");
  const [maxCommute, setMaxCommute] = useState("any");
  const [maxDistance, setMaxDistance] = useState("any");
  // Draft selections are applied together using the Apply Filters button.
  const [filterDraft, setFilterDraft] = useState({
    preference: "all", rating: "any", commute: "any", distance: "any", priority: "balanced"
  });
  const [filterNotice, setFilterNotice] = useState("");
  // Optional custom numeric limits; only used when the corresponding dropdown is Custom.
  const [customCommute, setCustomCommute] = useState("");
  const [customDistance, setCustomDistance] = useState("");





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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [themePreference, setThemePreference] = useState(() => {
    try { return localStorage.getItem("pgpilot:theme") || "light"; } catch { return "light"; }
  });
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
  const [reducedMotion, setReducedMotion] = useState(() => {
    try { return localStorage.getItem("pgpilot:reduced-motion") === "true"; } catch { return false; }
  });
  const isDark = themePreference === "dark" || (themePreference === "system" && systemDark);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("pgpilot:theme", themePreference); } catch { /* storage disabled */ }
    document.documentElement.dataset.pgpilotTheme = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    return () => { delete document.documentElement.dataset.pgpilotTheme; document.documentElement.style.colorScheme = ""; };
  }, [themePreference, isDark]);

  useEffect(() => {
    try { localStorage.setItem("pgpilot:reduced-motion", String(reducedMotion)); } catch { /* storage disabled */ }
    document.documentElement.dataset.pgpilotReducedMotion = reducedMotion ? "true" : "false";
    return () => { delete document.documentElement.dataset.pgpilotReducedMotion; };
  }, [reducedMotion]);



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
    setShowAccountSettings(false);



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



  const searchInputRef = useRef(null);
  const [searchSpotlight, setSearchSpotlight] = useState(false);
  const searchSpotlightTimer = useRef(null);
  function focusHomepageSearch() {
    setView("home");
    setShowFavorites(false);
    window.setTimeout(() => {
      document.getElementById("search")?.scrollIntoView({ behavior: "smooth", block: "center" });
      searchInputRef.current?.focus({ preventScroll: true });
      setSearchSpotlight(true);
      window.clearTimeout(searchSpotlightTimer.current);
      searchSpotlightTimer.current = window.setTimeout(() => setSearchSpotlight(false), 1800);
    }, 80);
  }

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



    if (isNewDestination || typeof preferenceOverride !== "string") setSortBy("commute");
    if (isNewDestination) {
      setPgPreference("all");
      setMinRating("any");
      setMaxCommute("any");
      setMaxDistance("any");
      setFilterDraft({ preference: "all", rating: "any", commute: "any", distance: "any", priority: "balanced" });
      setCustomCommute("");
      setCustomDistance("");
      setMatchPriority("balanced");
      setFilterNotice("");
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
      <style>{String.raw`
        /* Cohesive slate/navy palette. Preserve branded blue surfaces and light search bar. */
        html[data-pgpilot-theme="dark"] { background: #091523; }
        html[data-pgpilot-theme="dark"] body { background: #091523; color: #e7eef8; }
        html[data-pgpilot-theme="dark"] .bg-white,
        html[data-pgpilot-theme="dark"] .bg-white\/95 { background-color: #142438 !important; }
        html[data-pgpilot-theme="dark"] .bg-slate-50,
        html[data-pgpilot-theme="dark"] .bg-slate-100,
        html[data-pgpilot-theme="dark"] .bg-\[\#f1f6fd\] { background-color: #0e1c2d !important; }
        html[data-pgpilot-theme="dark"] .bg-blue-50,
        html[data-pgpilot-theme="dark"] .bg-sky-50 { background-color: #172d47 !important; }
        html[data-pgpilot-theme="dark"] .text-slate-900,
        html[data-pgpilot-theme="dark"] .text-slate-800,
        html[data-pgpilot-theme="dark"] .text-slate-700,
        html[data-pgpilot-theme="dark"] .text-\[\#112747\],
        html[data-pgpilot-theme="dark"] .text-\[\#102746\] { color: #f1f6ff !important; }
        html[data-pgpilot-theme="dark"] .text-slate-600,
        html[data-pgpilot-theme="dark"] .text-slate-500 { color: #b3c3d7 !important; }
        html[data-pgpilot-theme="dark"] .text-blue-700 { color: #91c3ff !important; }
        html[data-pgpilot-theme="dark"] .border-slate-200,
        html[data-pgpilot-theme="dark"] .border-slate-100 { border-color: #334761 !important; }
        html[data-pgpilot-theme="dark"] input,
        html[data-pgpilot-theme="dark"] select,
        html[data-pgpilot-theme="dark"] textarea { background-color: #1b3049; color: #f1f6ff; border-color: #4b607b; }
        html[data-pgpilot-theme="dark"] input::placeholder { color: #aabbd0; }
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search,
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search.bg-white { background: #ffffff !important; }
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search input { background: transparent !important; color: #14253b !important; border-color: transparent !important; }
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search input::placeholder { color: #64748b !important; }
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search button[type="submit"] { color: #ffffff !important; }
        /* Dark-mode coverage for all screens, including cards, menus and dialogs. */
        html[data-pgpilot-theme="dark"] #root > div { background-color: #091523; color: #e7eef8; }
        html[data-pgpilot-theme="dark"] .bg-white\/90,
        html[data-pgpilot-theme="dark"] .bg-white\/80,
        html[data-pgpilot-theme="dark"] .bg-white\/70,
        html[data-pgpilot-theme="dark"] .bg-white\/60 { background-color: #142438 !important; }
        html[data-pgpilot-theme="dark"] .bg-slate-50\/90,
        html[data-pgpilot-theme="dark"] .bg-slate-50\/80,
        html[data-pgpilot-theme="dark"] .bg-slate-100\/80,
        html[data-pgpilot-theme="dark"] .bg-gray-50,
        html[data-pgpilot-theme="dark"] .bg-gray-100 { background-color: #102136 !important; }
        html[data-pgpilot-theme="dark"] .bg-blue-100,
        html[data-pgpilot-theme="dark"] .bg-indigo-50,
        html[data-pgpilot-theme="dark"] .bg-teal-50,
        html[data-pgpilot-theme="dark"] .bg-emerald-50 { background-color: #18344b !important; }
        html[data-pgpilot-theme="dark"] .text-slate-950,
        html[data-pgpilot-theme="dark"] .text-slate-400,
        html[data-pgpilot-theme="dark"] .text-gray-900,
        html[data-pgpilot-theme="dark"] .text-gray-800,
        html[data-pgpilot-theme="dark"] .text-gray-700,
        html[data-pgpilot-theme="dark"] .text-gray-600,
        html[data-pgpilot-theme="dark"] .text-gray-500 { color: #d5e2f2 !important; }
        html[data-pgpilot-theme="dark"] .text-blue-800,
        html[data-pgpilot-theme="dark"] .text-blue-900,
        html[data-pgpilot-theme="dark"] .text-teal-700,
        html[data-pgpilot-theme="dark"] .text-teal-800,
        html[data-pgpilot-theme="dark"] .text-emerald-700 { color: #9acbff !important; }
        html[data-pgpilot-theme="dark"] .border-slate-300,
        html[data-pgpilot-theme="dark"] .border-gray-200,
        html[data-pgpilot-theme="dark"] .border-blue-100,
        html[data-pgpilot-theme="dark"] .border-blue-200 { border-color: #3a506b !important; }
        html[data-pgpilot-theme="dark"] input:focus,
        html[data-pgpilot-theme="dark"] textarea:focus,
        html[data-pgpilot-theme="dark"] select:focus { color: #f1f6ff; }
        /* Keep branded buttons and navy hero panels legible. */
        html[data-pgpilot-theme="dark"] button.bg-blue-700,
        html[data-pgpilot-theme="dark"] button.bg-blue-800,
        html[data-pgpilot-theme="dark"] a.bg-blue-700 { color: #ffffff !important; }
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search,
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search:focus-within { background-color: #fff !important; border-color: rgba(255,255,255,.35) !important; box-shadow: 0 18px 48px rgba(0,0,0,.22) !important; }
        html[data-pgpilot-theme="dark"] .pgpilot-hero-search input:focus { color: #14253b !important; box-shadow: none !important; outline: none !important; }
        .pgpilot-hero-search:focus-within { box-shadow: 0 18px 48px rgba(0,0,0,.22) !important; }
        .pgpilot-hero-search input:focus { outline: none !important; box-shadow: none !important; }
        html[data-pgpilot-reduced-motion="true"] *,
        html[data-pgpilot-reduced-motion="true"] *::before,
        html[data-pgpilot-reduced-motion="true"] *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
      `}</style>




        {/* Refined responsive product navigation */}
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-[0_2px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:py-4" aria-label="Main navigation">
            <a href="#home" onClick={(event) => { event.preventDefault(); setView("home"); setShowFavorites(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="group flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" aria-label="PGPilot home">
              <img
  src="logo.png"
  alt="PGPilot"
  className="h-10 w-10 rounded-xl object-cover shadow-sm transition-transform group-hover:scale-105"
/>
              <span className="text-xl font-extrabold tracking-tight text-[#112747]">PG<span className="text-blue-700">Pilot</span></span>
            </a>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
              <div className="flex items-center gap-5 sm:gap-7">
                <button type="button" onClick={() => { setView("home"); setShowFavorites(false); window.scrollTo({top:0,behavior:"smooth"}); }} aria-current={!showFavorites ? "page" : undefined} className={`group relative inline-flex items-center gap-2 py-3 text-sm font-semibold transition-colors ${!showFavorites ? "text-blue-700" : "text-slate-600 hover:text-blue-700"}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                  <span>Discover</span>
                  <span className={`absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-blue-600 transition-transform ${!showFavorites ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
                </button>
                {token && <button type="button" onClick={() => { setShowFavorites(true); setAccountMenuOpen(false); window.scrollTo({top:0,behavior:"smooth"}); }} aria-current={showFavorites ? "page" : undefined} className={`group relative inline-flex items-center gap-2 py-3 text-sm font-semibold transition-colors ${showFavorites ? "text-blue-700" : "text-slate-600 hover:text-blue-700"}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]" aria-hidden="true"><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  <span>Wishlist</span>
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">{favorites.length}</span>
                  <span className={`absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-blue-600 transition-transform ${showFavorites ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
                </button>}
              </div>
              {token ? (
                <>
                  
                  <div className="relative" ref={accountMenuRef}>



                    <button



                      type="button"



                      onClick={() => setAccountMenuOpen((open) => !open)}



                      aria-haspopup="menu"



                      aria-expanded={accountMenuOpen}



                      className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-[#112747] shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"



                    >



                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#112747] to-blue-700 font-bold text-white">



                        {(account?.name || "U").charAt(0).toUpperCase()}



                      </span>



                      <span className="hidden max-w-28 truncate sm:inline">{account?.name?.split(" ")[0] || "My Account"}</span>



                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 text-slate-500 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>



                    </button>



                    {accountMenuOpen && (
                      <div role="menu" aria-label="Account menu" className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,360px)] max-h-[min(82vh,720px)] overflow-y-auto rounded-[22px] border border-slate-200/90 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                        <div className="flex items-center gap-3 rounded-2xl bg-[#f1f6fd] px-3.5 py-3.5">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#112e5a] text-lg font-bold text-white shadow-sm">{(account?.name || "U").charAt(0).toUpperCase()}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-bold text-[#102746]">{account?.name || "PGPilot Member"}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{account?.email || "Signed in"}</p>
                            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-700"><AccountMenuIcon name="shield" className="h-3.5 w-3.5"/> PGPilot Member</p>
                          </div>
                        </div>
                        <p className="px-2.5 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">My workspace</p>
                        {[
                          { icon: "user", title: "My Profile", desc: "Personal details", action: () => setShowProfile(true) },
                          { icon: "heart", title: "Wishlist", desc: "Your saved properties", count: favorites.length, action: () => { setShowFavorites(true); window.scrollTo({top:0,behavior:"smooth"}); } },
                          { icon: "compare", title: "Compare PGs", desc: "Compare up to 3 properties", count: `${selectedPGIds.length}/3`, action: () => { setView("results"); setShowFavorites(false); if (selectedPGIds.length) setTimeout(() => document.getElementById("pgpilot-compare-section")?.scrollIntoView({behavior:"smooth",block:"start"}),120); else window.scrollTo({top:0,behavior:"smooth"}); } },
                          { icon: "history", title: "Search History", desc: "Your recent searches", action: () => { setShowSearchHistory(true); loadSearchHistory(); } },
                        ].map((item) => (
                          <button key={item.title} type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); item.action(); }} className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700"><AccountMenuIcon name={item.icon}/></span>
                            <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">{item.title}{item.count !== undefined && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{item.count}</span>}</span><span className="mt-0.5 block text-[11px] text-slate-500">{item.desc}</span></span>
                            <span className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true">›</span>
                          </button>
                        ))}
                        <div className="mx-2 my-2 border-t border-slate-100" />
                        <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Preferences & support</p>
                        {[
                          { icon: "settings", title: "Account Settings", action: () => setShowAccountSettings(true) },
                          { icon: "feedback", title: "Give Feedback", action: () => { setFeedbackError(""); setFeedbackSuccess(false); setShowFeedback(true); } },
                          { icon: "help", title: "Help & Support", action: () => setShowHelpSupport(true) },
                        ].map((item) => (
                          <button key={item.title} type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); item.action(); }} className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                            <span className="flex h-9 w-10 shrink-0 items-center justify-center text-slate-500 group-hover:text-blue-700"><AccountMenuIcon name={item.icon}/></span>
                            <span className="flex-1 text-[13px] font-semibold text-slate-700">{item.title}</span>
                            <span className="text-slate-300 group-hover:text-blue-600" aria-hidden="true">›</span>
                          </button>
                        ))}
                        <div className="mx-2 my-2 border-t border-slate-100" />
                        <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); handleLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"><span className="flex h-9 w-10 items-center justify-center"><AccountMenuIcon name="logout"/></span> Log out</button>
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

      {showAccountSettings && token && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/65 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAccountSettings(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="pgpilot-settings-title"
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-[#102747] to-[#1d4c92] px-6 py-6 text-white sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-200">Personalize your experience</p>
                  <h2 id="pgpilot-settings-title" className="mt-1 text-2xl font-extrabold">Account Settings</h2>
                  <p className="mt-1 text-sm text-blue-100">Customize how PGPilot looks and feels.</p>
                </div>
                <button type="button" aria-label="Close account settings" onClick={() => setShowAccountSettings(false)}
                  className="rounded-xl border border-white/25 px-3 py-1.5 text-xl text-white hover:bg-white/10">×</button>
              </div>
            </div>
            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-extrabold text-slate-900">Appearance</h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{isDark ? "Dark mode" : "Light mode"}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">Choose your preferred theme. Your choice is saved on this device.</p>
                <div className="mt-4 grid grid-cols-3 gap-3" role="group" aria-label="Color theme">
                  {[
                    { id: "light", icon: "☀", title: "Light" },
                    { id: "dark", icon: "☾", title: "Dark" },
                    { id: "system", icon: "◐", title: "System" },
                  ].map((option) => (
                    <button key={option.id} type="button" aria-pressed={themePreference === option.id}
                      onClick={() => setThemePreference(option.id)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${themePreference === option.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>
                      <span className="text-2xl" aria-hidden="true">{option.icon}</span>{option.title}
                      <span className="text-[11px]">{themePreference === option.id ? "✓ Selected" : "Select"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <h3 className="font-bold text-slate-900">Reduce animations</h3>
                  <p className="mt-1 text-xs text-slate-500">Minimize scrolling and transition effects.</p>
                </div>
                <button type="button" role="switch" aria-checked={reducedMotion} aria-label="Reduce animations"
                  onClick={() => setReducedMotion((value) => !value)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${reducedMotion ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${reducedMotion ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <span className="font-bold text-slate-900">Profile details are separate.</span> To view or edit your personal information, use <span className="font-semibold">My Profile</span> in the account menu.
              </div>
              <button type="button" onClick={() => setShowAccountSettings(false)}
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800">Done</button>
            </div>
          </section>
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
          <section className="mx-auto min-h-[70vh] max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pt-14" aria-label="Wishlist">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-7">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  Your personal collection
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#112747] sm:text-4xl">My Wishlist</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">Keep your favorite PGs in one place and revisit them whenever you want.</p>
              </div>
              <button type="button" onClick={() => { setShowFavorites(false); setView("home"); window.scrollTo({top:0,behavior:"smooth"}); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
                <span aria-hidden="true">←</span> Explore PGs
              </button>
            </div>
            {favoritesBusy ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-600" role="status">Loading your saved PGs...</div>
            ) : favorites.length === 0 ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true"><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
                <h2 className="text-xl font-bold text-[#112747]">Your wishlist is waiting</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Save PGs you like while exploring. They will appear here so you can easily compare your options later.</p>
                <button type="button" onClick={() => { setShowFavorites(false); setView("home"); window.scrollTo({top:0,behavior:"smooth"}); }} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">Explore available PGs</button>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600"><span className="font-bold text-[#112747]">{favorites.length}</span> saved {favorites.length === 1 ? "property" : "properties"}</p><p className="hidden text-xs text-slate-400 sm:block">Your saved places stay linked to your account</p></div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {favorites.map((pg) => (
                    <article key={pg.googlePlaceId} className="group flex min-h-[235px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
                      <div className="mb-4 flex items-start justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">Saved property</span><button type="button" onClick={() => toggleFavorite(pg)} disabled={favoritePendingId !== null || favoritesBusy} aria-label={`Remove ${pg.name} from wishlist`} title="Remove from wishlist" className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button></div>
                      <h3 className="line-clamp-2 text-lg font-bold leading-snug text-[#112747]">{pg.name}</h3>
                      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{pg.address || "Address not available"}</p>
                      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4"><span className="text-amber-500" aria-hidden="true">★</span><span className="text-sm font-bold text-slate-800">{pg.googleRating == null ? "Not rated" : Number(pg.googleRating).toFixed(1)}</span>{pg.googleRatingCount != null && <span className="text-xs text-slate-400">({pg.googleRatingCount} reviews)</span>}</div>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pg.name)}&query_place_id=${encodeURIComponent(pg.googlePlaceId)}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#112747] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">View on Google Maps <span aria-hidden="true">↗</span></a>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {!showFavorites && view === "home" && (<>

        {/* Refined homepage hero — existing search logic preserved */}
        <section className="relative isolate overflow-hidden bg-[#102747] px-5 py-16 text-white sm:px-8 sm:py-20 lg:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_12%,rgba(59,130,246,0.18),transparent_38%),radial-gradient(ellipse_at_5%_100%,rgba(56,189,248,0.09),transparent_42%)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" /> Discover smarter stays
              </div>
              <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-5xl lg:text-[58px]">
                Your next stay, <span className="text-sky-300">made simpler.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                Find PGs near your college or workplace. Compare travel times, explore real listings, and shortlist places that suit your routine.
              </p>
              <form id="search" onSubmit={handleSearch} className={`pgpilot-hero-search mx-auto mt-9 flex max-w-3xl scroll-mt-28 flex-col gap-2 rounded-2xl border bg-white p-2.5 transition-all duration-300 focus-within:ring-0 sm:flex-row sm:items-center ${searchSpotlight ? "border-white/40 shadow-[0_18px_48px_rgba(0,0,0,0.22)]" : "border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"}`}>
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  <span className="sr-only">Destination</span>
                  <input ref={searchInputRef} type="text" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Enter your college, office or landmark" aria-label="College or workplace destination" className="w-full min-w-0 rounded-lg bg-transparent py-3.5 text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-0" required />
                </label>
                <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3 font-bold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {!loading && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>}
                  {loading ? "Searching..." : "Search PGs"}
                </button>
              </form>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Popular destinations">
                <span className="mr-1 text-xs font-medium text-slate-400">Popular searches:</span>
                {["VIT Vellore", "Anna University", "Tidel Park"].map((place) => (
                  <button key={place} type="button" onClick={() => setDestination(place)} className="rounded-full border border-white/20 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-300/60 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{place}</button>
                ))}
              </div>
              {error && <p role="alert" className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-300/30 bg-red-950/50 p-4 text-sm text-red-100">{error}</p>}
            </div>
            <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
              {[
                { key: "listing", title: "Discover real listings", description: "Browse PGs near the places that matter to you." },
                { key: "commute", title: "Plan your commute", description: "Compare estimated driving, walking and cycling times." },
                { key: "saved", title: "Save your shortlist", description: "Keep your favorite properties in one place." }
              ].map((feature) => (
                <article key={feature.key} className="group rounded-2xl border border-white/15 bg-white/[0.065] p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-white/[0.10]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-200">
                    {feature.key === "listing" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></svg> : feature.key === "commute" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h5a5 5 0 0 0 5-5v-5"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>}
                  </div>
                  <h3 className="mt-5 text-base font-bold tracking-tight text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                </article>
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

            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Built around your commute</p><h2 className="mt-3 text-3xl font-extrabold text-[#112747] sm:text-4xl">A cheaper room isn't always a better deal.</h2><p className="mt-5 leading-8 text-slate-600">Long daily journeys can cost you time and money. PGPilot puts estimated commute time alongside listing details, so you can make a more informed choice.</p><button type="button" onClick={focusHomepageSearch} className="mt-7 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"><svg viewBox="0 0 24 24" className="inline h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg> Explore PGs</button></div>

            <div className="rounded-3xl bg-[#112747] p-7 text-white shadow-xl sm:p-10"><p className="text-sm font-semibold text-blue-200">YOUR PG SEARCH, SIMPLIFIED</p><div className="mt-7 space-y-4">{["Find accommodation near your destination","Check estimated travel times","Compare listings side by side","Save your personal shortlist"].map((item,index) => <div key={item} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/10 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold">{index+1}</span><span className="font-medium">{item}</span></div>)}</div><p className="mt-6 text-xs text-slate-300">Listing availability and commute estimates depend on external data providers.</p></div>

          </div>

        </section>

        <section className="mx-auto max-w-5xl px-6 py-20 text-center"><h2 className="text-3xl font-extrabold text-[#112747]">Ready to find your next place?</h2><p className="mx-auto mt-4 max-w-xl text-slate-600">Start with the destination you visit most. We'll help you explore nearby options.</p><button type="button" onClick={focusHomepageSearch} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-7 py-3 font-semibold text-white hover:bg-blue-800"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>Find PGs</button></section>

        {/* Live platform metrics — all numbers remain connected to existing API state */}
        <section className="border-t border-slate-200 bg-[#f7f9fc] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">PGPilot at a glance</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#102747] sm:text-4xl">A community taking shape.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">A snapshot of activity on PGPilot, based on available platform data.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Platform overview</span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { key: "users", label: "Registered users", value: platformStats?.totalUsers, description: "People who joined PGPilot" },
                { key: "search", label: "PG searches", value: platformStats?.totalSearches, description: "Destination searches made" },
                { key: "feedback", label: "Feedback received", value: platformStats?.totalFeedback, description: "Responses from users" },
                { key: "rating", label: "Average rating", value: platformStats?.averageRating == null ? null : `${platformStats.averageRating}/5`, description: "From submitted feedback" }
              ].map((stat) => (
                <article key={stat.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition hover:border-blue-200 hover:shadow-md sm:p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    {stat.key === "users" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></svg> : stat.key === "search" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg> : stat.key === "feedback" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M20 16a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z"/><path d="M8 9h8M8 13h5"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m12 2 3.1 6.4 7 .9-5 4.9 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5-4.9 7-.9Z"/></svg>}
                  </div>
                  <p className="mt-5 text-3xl font-extrabold tracking-tight text-[#102747] sm:text-4xl">{stat.value ?? (platformStats && stat.key === "rating" ? "Not rated" : "—")}</p>
                  <h3 className="mt-2 text-sm font-bold text-slate-800">{stat.label}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{stat.description}</p>
                </article>
              ))}
            </div>
            {platformStatsError && <p className="mt-5 text-sm text-slate-500" role="status">Statistics are temporarily unavailable.</p>}
          </div>
        </section>

        </>)}

        {!showFavorites && view === "results" && (
          <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#102746] via-[#16365e] to-[#194a79] text-white">
            <div className="pointer-events-none absolute -right-16 -top-36 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />
            <div className="relative mx-auto max-w-7xl px-6 py-9 sm:py-11">
              <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold sm:text-sm">
                <button type="button" onClick={() => { setView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-7h6v7"/></svg>
                  Home
                </button>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                <span aria-current="page" className="text-sky-200">Explore PGs</span>
              </nav>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">Find your next stay</p>
                  <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-[38px]">
                    PGs near <span className="text-sky-300">{searchedDestination || destination}</span>
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Explore nearby stays, compare commute times, and discover your best match.</p>
                </div>
                <div className="inline-flex w-fit shrink-0 items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm" role="status" aria-live="polite">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-sky-200" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9M14 14h3M14 18h3"/></svg>
                  </div>
                  <div>{loading ? <><svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3"/><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg><p className="mt-1 text-xs text-slate-200">Searching nearby PGs</p></> : <><p className="text-2xl font-extrabold leading-none">{pgs.length}</p><p className="mt-1 text-xs font-medium text-slate-200">Listings found</p></>}</div>
                </div>
              </div>
              <form onSubmit={handleSearch} className="mt-7 flex max-w-4xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-slate-950/15 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                  <span className="sr-only">Search destination</span>
                  <input aria-label="Search destination" value={destination} onChange={event => setDestination(event.target.value)} required placeholder="Enter a college, office or landmark" className="w-full min-w-0 bg-transparent py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" />
                </label>
                <button disabled={loading} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60">
                  {loading ? "Searching..." : "Find PGs"}
                  {!loading && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>}
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5"><span className="text-sky-300">✓</span> Google Places data</span>
                <span className="inline-flex items-center gap-1.5"><span className="text-sky-300">✓</span> Commute estimates</span>
                <span className="inline-flex items-center gap-1.5"><span className="text-sky-300">✓</span> Smart Match ranking</span>
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



        {!showFavorites && view === "results" && searched && !loading && !error && (



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



            </div>

            {/* Compact, accessible preference panel: draft choices are applied together. */}
            {pgs.length > 0 && (
              <details aria-label="PG filters and preferences" className="group mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_24px_rgba(15,35,70,0.06)] transition-all open:border-blue-200 open:shadow-[0_12px_32px_rgba(15,35,70,0.09)]">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3.5 marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="11" cy="17" r="2" fill="white"/></svg>
                    </span>
                    <span className="min-w-0"><span className="block text-sm font-extrabold tracking-tight text-[#112747] sm:text-[15px]">Refine your results</span><span className="mt-0.5 block text-xs text-slate-500">Filters, commute limits &amp; Smart Match</span></span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:inline-flex">Smart Match: {({ balanced: "Balanced", commute: "Fastest", rating: "Top rated", nearest: "Nearest" })[matchPriority] || "Balanced"}</span>
                    {([pgPreference !== "all", minRating !== "any", maxCommute !== "any", maxDistance !== "any", matchPriority !== "balanced"].filter(Boolean).length > 0) && <span className="rounded-full bg-[#112747] px-2.5 py-1 text-xs font-bold text-white">{[pgPreference !== "all", minRating !== "any", maxCommute !== "any", maxDistance !== "any", matchPriority !== "balanced"].filter(Boolean).length} active</span>}
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#112747] transition-colors group-hover:border-blue-200 group-hover:bg-blue-50"><span className="group-open:hidden">Customize</span><span className="hidden group-open:inline">Collapse</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6"/></svg></span>
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 pb-5 pt-5 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#112747]">Find your ideal PG</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Choose your preferences, then apply them to find your best matches.</p>
                  </div>
                  <button type="button" disabled={loading} onClick={() => {
                    const defaults = { preference: "all", rating: "any", commute: "any", distance: "any", priority: "balanced" };
                    setFilterDraft(defaults);
                    setCustomCommute(""); setCustomDistance("");
                    setPgPreference("all");
                    setMinRating("any"); setMaxCommute("any"); setMaxDistance("any");
                    setMatchPriority("balanced"); setSortBy("commute");
                    setFilterNotice("All filters have been cleared.");
                    if (pgPreference !== "all") {
                      handleSearch({ preventDefault() {} }, "all");
                    }
                  }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
                    Reset filters
                  </button>
                </div>

                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-[#112747]">Accommodation type</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[["all", "All PGs"], ["coliving", "Co-living"], ["men", "Men's PG"], ["women", "Women's PG"]].map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={filterDraft.preference === value}
                        onClick={() => { setFilterDraft((previous) => ({ ...previous, preference: value })); setFilterNotice(""); }}
                        className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${filterDraft.preference === value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Categories use Google Places search keywords. Confirm eligibility with the property.</p>
                </fieldset>

                <fieldset className="mt-6">
                  <legend className="text-sm font-semibold text-[#112747]">What matters most to you?</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { value: "balanced", title: "Best overall", description: "Balance commute, distance and ratings" },
                      { value: "commute", title: "Fastest commute", description: "Prioritize shorter travel times" },
                      { value: "rating", title: "Top rated", description: "Prioritize Google ratings" },
                      { value: "nearest", title: "Nearest", description: "Prioritize proximity to destination" },
                    ].map((option) => (
                      <button key={option.value} type="button" aria-pressed={filterDraft.priority === option.value}
                        onClick={() => { setFilterDraft((previous) => ({ ...previous, priority: option.value })); setFilterNotice(""); }}
                        className={`min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${filterDraft.priority === option.value ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}>
                        <span className="flex items-center justify-between gap-2 text-sm font-bold text-[#112747]">
                          {option.title}<span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${filterDraft.priority === option.value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300"}`}>{filterDraft.priority === option.value ? "✓" : ""}</span>
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-slate-500">{option.description}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Smart Match uses estimated commute, straight-line distance and Google ratings. Unrated listings receive a neutral rating.</p>
                </fieldset>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Minimum Google rating", key: "rating", options: [["any", "Any rating"], ...[2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => [String(v), `${v.toFixed(1)}+ stars`])] },
                    { label: "Maximum commute", key: "commute", options: [["any", "Any commute"], ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((v) => [String(v), `Within ${v} minutes`]), ["custom", "Custom time…"]] },
                    { label: "Maximum straight-line distance", key: "distance", options: [["any", "Any distance"], ...[0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25].map((v) => [String(v), `Within ${v} km`]), ["custom", "Custom distance…"]] },
                  ].map((field) => (
                    <div key={field.key} className="min-w-0">
                      <label htmlFor={`pgpilot-filter-${field.key}`} className="block text-sm font-semibold text-[#112747]">{field.label}</label>
                      <select id={`pgpilot-filter-${field.key}`} value={filterDraft[field.key]}
                        onChange={(event) => { const value = event.target.value; setFilterDraft((previous) => ({ ...previous, [field.key]: value })); setFilterNotice(""); }}
                        className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                        {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      {field.key === "commute" && filterDraft.commute === "custom" && (
                        <div className="mt-2">
                          <label htmlFor="pgpilot-custom-commute" className="block text-xs font-medium text-slate-600">Maximum time (minutes)</label>
                          <input id="pgpilot-custom-commute" type="number" min="1" max="1440" step="1" inputMode="numeric" placeholder="e.g. 75"
                            value={customCommute} onChange={(event) => { setCustomCommute(event.target.value); setFilterNotice(""); }}
                            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                        </div>
                      )}
                      {field.key === "distance" && filterDraft.distance === "custom" && (
                        <div className="mt-2">
                          <label htmlFor="pgpilot-custom-distance" className="block text-xs font-medium text-slate-600">Maximum distance (km)</label>
                          <input id="pgpilot-custom-distance" type="number" min="0.1" max="100" step="0.1" inputMode="decimal" placeholder="e.g. 12.5"
                            value={customDistance} onChange={(event) => { setCustomDistance(event.target.value); setFilterNotice(""); }}
                            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Distance is measured in a straight line. Commute uses your selected travel mode. Filters apply to the PG listings currently retrieved from Google Places.</p>

                <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div aria-live="polite" className="min-w-0">
                    <p className="text-sm font-semibold text-[#112747]">{filteredPGs.length} of {pgs.length} PGs match your applied filters</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {minRating !== "any" && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">Rating {minRating}+</span>}
                      {maxCommute !== "any" && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">Commute ≤ {maxCommute} min</span>}
                      {maxDistance !== "any" && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">Distance ≤ {maxDistance} km</span>}
                      {pgPreference !== "all" && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">{pgPreference === "men" ? "Men's PG" : pgPreference === "women" ? "Women's PG" : "Co-living"}</span>}
                    </div>
                    {filterNotice && <p className="mt-2 text-xs text-slate-500">{filterNotice}</p>}
                    {maxCommute !== "any" && matrixLoading && <p className="mt-1 text-xs text-slate-500">Calculating commute times…</p>}
                  </div>
                  <button type="button" disabled={loading} onClick={() => {
                    const commuteValue = filterDraft.commute === "custom" ? customCommute.trim() : filterDraft.commute;
                    const distanceValue = filterDraft.distance === "custom" ? customDistance.trim() : filterDraft.distance;
                    if (filterDraft.commute === "custom" && (commuteValue === "" || !Number.isFinite(Number(commuteValue)) || Number(commuteValue) < 1 || Number(commuteValue) > 1440 || !Number.isInteger(Number(commuteValue)))) {
                      setFilterNotice("Enter a valid custom commute between 1 and 1440 whole minutes.");
                      return;
                    }
                    if (filterDraft.distance === "custom" && (distanceValue === "" || !Number.isFinite(Number(distanceValue)) || Number(distanceValue) < 0.1 || Number(distanceValue) > 100)) {
                      setFilterNotice("Enter a valid custom distance between 0.1 and 100 km.");
                      return;
                    }
                    setPgPreference(filterDraft.preference);
                    setMinRating(filterDraft.rating);
                    setMaxCommute(commuteValue);
                    setMaxDistance(distanceValue);
                    setMatchPriority(filterDraft.priority);
                    setSortBy("match");
                    setFilterNotice("Preferences applied. See matching PGs below.");
                    if (filterDraft.preference !== pgPreference) {
                      handleSearch({ preventDefault() {} }, filterDraft.preference);
                    } else {
                      document.getElementById("pgpilot-results-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 disabled:opacity-50">
                    {loading ? "Applying…" : "Apply filters & show PGs →"}
                  </button>
                </div>
                </div></details>
            )}

{/* Compact map access: listings remain the primary view; the map opens only on request. */}
            {pgs.length > 0 && (
              <section className="mb-5 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#102747] to-[#174477] text-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-sky-200"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/><circle cx="12" cy="10" r="2"/></svg>
                    </span>
                    <div><h3 className="text-base font-bold">Explore {filteredPGs.length} PGs near {searchedDestination || destination}</h3><p className="mt-0.5 text-xs text-blue-100">Browse listings below or see their locations on an interactive map.</p></div>
                  </div>
                  <button type="button" aria-expanded={mapExpanded} aria-controls="pgpilot-map-panel" onClick={() => setMapExpanded((open) => !open)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#112747] shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    {mapExpanded ? "Hide map" : "View on map"}<span aria-hidden="true">{mapExpanded ? "↑" : "↗"}</span>
                  </button>
                </div>
                {mapExpanded && (
                  <div id="pgpilot-map-panel" className="border-t border-white/15 bg-white p-3 text-slate-900 sm:p-4">
                    <MapTest pgs={filteredPGs} destinationLocation={destinationLocation} onSelectPG={setDetailPG} commutes={commutes} travelMode={travelMode} matchScores={matchScores} />
                    <p className="mt-3 text-xs text-slate-500">Click a map pin to see a PG and open its details. Commute estimates do not include live traffic.</p>
                  </div>
                )}
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



                          className={`relative flex min-h-[106px] flex-col items-center justify-center rounded-xl border px-3 py-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${



                            selected



                              ? "border-blue-700 bg-blue-700 text-white shadow-sm"



                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 hover:bg-blue-50"



                          }`}



                        >



                          <TravelModeIcon mode={mode} className="mb-2 h-6 w-6" />
                          {selected && (
                            <span className="absolute right-3 top-3" aria-label="Selected">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </span>
                          )}



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
              <div role="status" className="mb-6 flex items-start gap-2 text-sm">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div>
                  <p className="font-semibold text-slate-800">{currentMode.label} commute estimates {rankedCount === pgs.length ? "ready" : "partially ready"}</p>
                  <p className="mt-0.5 text-slate-500">Travel times calculated for {rankedCount} of {pgs.length} PGs.</p>
                </div>
              </div>
            )}



            {pgs.length === 0 ? (



              <p className="text-slate-600">



                No accommodation found near this destination.



              </p>



            ) : (



              <div id="pgpilot-results-list" className="grid scroll-mt-24 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">



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



                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="line-clamp-2 text-base font-extrabold text-[#112747]">{pg.name}</h4>
                        <span className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-sm font-extrabold text-blue-800" title="Commute, distance and rating weighted score">{matchScores[pg.googlePlaceId] == null ? "Pending" : `${matchScores[pg.googlePlaceId]}/100`} <span className="text-[10px] font-semibold">Match</span></span>
                      </div>
                    <details className="mb-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
                      <summary className="cursor-pointer font-bold text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">ⓘ Match score breakdown</summary>
                      {(() => {
                        const explanation = getMatchExplanation(pg, destinationLocation, commutes[pg.googlePlaceId]?.mode === travelMode ? commutes[pg.googlePlaceId] : null, matchPriority);
                        if (!explanation) return <p className="mt-3 text-slate-600">Score unavailable until commute and location data are ready.</p>;
                        return <div className="mt-3 space-y-3">
                          {explanation.parts.map((part) => <div key={part.label}>
                            <div className="flex justify-between gap-3"><span className="font-semibold text-slate-700">{part.label}</span><span className="font-bold text-[#112747]">{part.points.toFixed(1)} / {part.max}</span></div>
                            <p className="mt-0.5 text-xs text-slate-500">{part.note}</p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${part.max ? part.points / part.max * 100 : 0}%` }} /></div>
                          </div>)}
                          <p className="border-t border-blue-100 pt-2 text-xs text-slate-600">Total: {explanation.total}/100 · Based on selected Smart Match preference. Not a verification of rent, safety or availability.</p>
                        </div>;
                      })()}
                    </details>
                    <PGPhoto key={`${pg.googlePlaceId}-${pg.photoUrl || "none"}`} pg={pg} className="mb-4 h-52 overflow-hidden rounded-2xl ring-1 ring-slate-100 sm:h-56" />

                      {/* Compact Save and Compare actions */}
                      <div className="mb-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(pg)}
                          disabled={favoritePendingId !== null || favoritesBusy}
                          aria-pressed={favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId)}
                          title="Save or remove this PG from your wishlist"
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg font-semibold transition disabled:opacity-50 ${
                            favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId)
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50"
                          }`}
                        >
                          <span aria-hidden="true" className="text-lg">{favorites.some((saved) => saved.googlePlaceId === pg.googlePlaceId) ? "♥" : "♡"}</span>

                        </button>
                        <button
                          type="button"
                          onClick={() => togglePGComparison(pg.googlePlaceId)}
                          disabled={selectedPGIds.length >= 3 && !selectedPGIds.includes(pg.googlePlaceId)}
                          aria-pressed={selectedPGIds.includes(pg.googlePlaceId)}
                          title={selectedPGIds.length >= 3 && !selectedPGIds.includes(pg.googlePlaceId) ? "Compare up to 3 PGs" : "Add or remove from comparison"}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            selectedPGIds.includes(pg.googlePlaceId)
                              ? "border-blue-700 bg-blue-50 text-blue-800"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <span aria-hidden="true" className="text-base">⇄</span>

                        </button>
                      </div>

                      {/* Name and rating */}



                      <div className="mb-3 flex items-start justify-between gap-3">



                        <h4 className="sr-only">



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



                            Distance from destination (approx.)



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
              matchScores={matchScores}



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



      </main>



      {/* Step 147: Enhanced PG details, using existing verified listing fields. */}
      {detailPG && (() => {
        const id = detailPG.googlePlaceId;
        const commute = commutes[id]?.mode === travelMode ? commutes[id] : null;
        const score = matchScores[id] ?? calculateMatchScore(detailPG, destinationLocation, commute, matchPriority);
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
        const explanation = getMatchExplanation(detailPG, destinationLocation, commute, matchPriority);
        const scoreParts = explanation?.parts || [];
        const minutes = commute?.durationMinutes == null ? null : Number(commute.durationMinutes);
        const validMinutes = minutes != null && Number.isFinite(minutes);
        const rating = detailPG.googleRating == null ? null : Number(detailPG.googleRating);
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
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-[#112747]">Why this match score?</h3><span className="text-xs font-semibold text-slate-500">{`Commute ${MATCH_WEIGHTS[matchPriority].commute}% · Rating ${MATCH_WEIGHTS[matchPriority].rating}% · Distance ${MATCH_WEIGHTS[matchPriority].distance}%`}</span></div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">The score is calculated from estimated commute time, Google rating and straight-line distance. It does not verify rent, safety, availability or amenities.</p>
                  <div className="mt-5 space-y-4">
                    {scoreParts.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-800">{item.label} <span className="font-normal text-slate-500">· {item.note}</span></span><span className="font-bold text-[#112747]">{score == null || item.points == null ? "—" : `${item.points.toFixed(1)}/${item.max}`}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${score == null || item.points == null ? 0 : item.points / item.max * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Component points are shown to one decimal place; the total is rounded after summing. Changing Smart Match preference updates this breakdown and the ranking.</p>
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
