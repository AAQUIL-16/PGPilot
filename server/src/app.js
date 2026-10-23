const pool = require("./config/db");

const express = require("express");

const helmet = require("helmet");

const { rateLimit } = require("express-rate-limit");

const { searchNearbyPGs } = require("./services/googlePlacesService");

const { geocodeDestination } = require("./services/geocodingService");

const { calculateCommute } = require("./services/routingService");

const { calculateCommuteMatrix } = require("./services/matrixService");

const authRoutes = require("./routes/authRoutes");

const favoriteRoutes = require("./routes/favoriteRoutes");

const profileRoutes = require("./routes/profileRoutes");

const statsRoutes = require("./routes/statsRoutes");

const feedbackRoutes = require("./routes/feedbackRoutes");


const app = express();

// Trust the Render reverse proxy
app.set("trust proxy", 1);

// Add standard HTTP security headers
app.use(helmet());

// Limit repeated login and registration attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});



app.use(express.json({ limit: "20kb" }));

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/favorites", favoriteRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/stats", statsRoutes);

app.use("/api/feedback", feedbackRoutes);

const authMiddleware = require("./middleware/authMiddleware");
const searchHistoryRoutes = require("./routes/searchHistoryRoutes");

app.use("/api/search-history", searchHistoryRoutes);

// Cache Google Places results for 15 minutes

const searchCache = new Map();

const CACHE_DURATION_MS = 15 * 60 * 1000;



// Cache individual commute results for 15 minutes

const commuteCache = new Map();

const COMMUTE_CACHE_DURATION_MS = 15 * 60 * 1000;



// Cache Matrix API results for 15 minutes

const matrixCache = new Map();

const MATRIX_CACHE_DURATION_MS = 15 * 60 * 1000;



// Supported travel modes

const ALLOWED_MODES = [

  "driving-car",

  "foot-walking",

  "cycling-regular",

];



// Validate latitude and longitude

function isValidCoordinate(latitude, longitude) {

  return (

    latitude !== null &&

    longitude !== null &&

    latitude !== undefined &&

    longitude !== undefined &&

    String(latitude).trim() !== "" &&

    String(longitude).trim() !== "" &&

    Number.isFinite(Number(latitude)) &&

    Number.isFinite(Number(longitude)) &&

    Number(latitude) >= -90 &&

    Number(latitude) <= 90 &&

    Number(longitude) >= -180 &&

    Number(longitude) <= 180

  );

}



// Health check

app.get("/api/health", (req, res) => {

  return res.status(200).json({

    success: true,

    message: "PGPilot API is running",

  });

});



// Convert destination name into coordinates

app.get("/api/locations/geocode", async (req, res) => {

  try {

    const destination = String(req.query.destination || "").trim();



    if (!destination) {

      return res.status(400).json({

        success: false,

        message: "Destination is required",

      });

    }



    if (destination.length > 200) {

      return res.status(400).json({

        success: false,

        message: "Destination is too long",

      });

    }



    const location = await geocodeDestination(destination);



    if (!location) {

      return res.status(404).json({

        success: false,

        message: "Destination not found",

      });

    }



    return res.status(200).json({

      success: true,

      location,

    });

  } catch (error) {

    console.error("Geocoding error:", error.message);



    return res.status(502).json({

      success: false,

      message: "Unable to find destination. Please try again.",

    });

  }

});



// Search nearby PGs using Google Places

app.get("/api/pgs/search", authMiddleware, async (req, res) => {

  try {

    const destination = String(req.query.destination || "").trim();



    const latitude = Number(req.query.latitude);

    const longitude = Number(req.query.longitude);
    const preference = String(req.query.preference || "all").toLowerCase();
    if (!["all", "men", "women", "coliving"].includes(preference)) {
      return res.status(400).json({ success: false, message: "Invalid PG preference" });
    }



    if (

      !destination ||

      destination.length > 200 ||

      !isValidCoordinate(req.query.latitude, req.query.longitude)

    ) {

      return res.status(400).json({

        success: false,

        message: "Valid destination, latitude and longitude are required",

      });

    }



    const cacheKey = JSON.stringify({

      provider: "google-universal-v2",

      destination: destination.toLowerCase(),
      preference,

      latitude,

      longitude,

    });

    
async function recordSuccessfulSearch(resultsCount) {
  try {
    await pool.query(
  `INSERT INTO search_history
   (user_id, destination, results_count)
   VALUES ($1, $2, $3)`,
  [req.user.id, destination, resultsCount]
);
  } catch (trackingError) {
    console.error(
      "Search tracking error:",
      trackingError.message
    );
  }
}




    const cached = searchCache.get(cacheKey);



    if (

      cached &&
      Array.isArray(cached.pgs) && cached.pgs.length > 0 &&
      Date.now() - cached.timestamp < CACHE_DURATION_MS

    ) {
      await recordSuccessfulSearch(cached.pgs.length);

      return res.status(200).json({

        success: true,

        destination,

        total: cached.pgs.length,

        source: "Google Places",

        cached: true,

        pgs: cached.pgs,

      });

    }



    const pgs = await searchNearbyPGs(

      destination,

      latitude,

      longitude,
      preference

    );

    // Record a successfully completed PG search
try {
  await recordSuccessfulSearch(pgs.length);
} catch (trackingError) {
  console.error(
    "Search tracking error:",
    trackingError.message
  );
}



    if (pgs.length > 0) {
      searchCache.set(cacheKey, { timestamp: Date.now(), pgs });
    } else {
      searchCache.delete(cacheKey);
    }

    return res.status(200).json({

      success: true,

      destination,

      total: pgs.length,

      source: "Google Places",

      cached: false,

      pgs,

    });

  } catch (error) {

    console.error("Google Places search failed:", error.message);



    return res.status(502).json({

      success: false,

      message: "Unable to fetch accommodation from Google Places",

      error:

        process.env.NODE_ENV === "production"

          ? undefined

          : error.message,

    });

  }

});



// Proxy Google Places photos so the API key stays on the server.
// Google Places photo names have the form places/{placeId}/photos/{photoId}.
app.get("/api/pgs/photo", async (req, res) => {
  const name = String(req.query.name || "");
  if (!/^places\/[^/\s]+\/photos\/[^/\s]+$/.test(name)) {
    return res.status(400).json({ success: false, message: "Invalid photo reference" });
  }
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return res.status(503).json({ success: false, message: "Photo service unavailable" });
  }
  try {
    const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
    url.searchParams.set("maxWidthPx", "800");
    const upstream = await fetch(url, {
      headers: { "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY },
      signal: AbortSignal.timeout(15000)
    });
    if (!upstream.ok) return res.sendStatus(404);
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return res.sendStatus(502);
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) return res.sendStatus(502);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(bytes);
  } catch (error) {
    console.error("Google Places photo error:", error.message);
    return res.sendStatus(502);
  }
});

// Calculate individual road distance and commute time

app.get("/api/commute", async (req, res) => {

  try {

    const {

      startLatitude,

      startLongitude,

      endLatitude,

      endLongitude,

    } = req.query;



    const mode = String(req.query.mode || "driving-car");



    if (

      !isValidCoordinate(startLatitude, startLongitude) ||

      !isValidCoordinate(endLatitude, endLongitude)

    ) {

      return res.status(400).json({

        success: false,

        message: "Valid start and end coordinates are required",

      });

    }



    if (!ALLOWED_MODES.includes(mode)) {

      return res.status(400).json({

        success: false,

        message: "Unsupported travel mode",

      });

    }



    const startLat = Number(startLatitude);

    const startLon = Number(startLongitude);

    const endLat = Number(endLatitude);

    const endLon = Number(endLongitude);



    const cacheKey = JSON.stringify({

      startLat,

      startLon,

      endLat,

      endLon,

      mode,

    });



    const cached = commuteCache.get(cacheKey);



    if (

      cached &&

      Date.now() - cached.timestamp < COMMUTE_CACHE_DURATION_MS

    ) {

      return res.status(200).json({

        success: true,

        source: "OpenRouteService",

        cached: true,

        commute: cached.commute,

      });

    }



    const commute = await calculateCommute(

      startLat,

      startLon,

      endLat,

      endLon,

      mode

    );



    commuteCache.set(cacheKey, {

      timestamp: Date.now(),

      commute,

    });



    return res.status(200).json({

      success: true,

      source: "OpenRouteService",

      cached: false,

      commute,

    });

  } catch (error) {

    console.error("Commute calculation failed:", error.message);



    return res.status(502).json({

      success: false,

      message: "Unable to calculate commute for this route",

      error:

        process.env.NODE_ENV === "production"

          ? undefined

          : error.message,

    });

  }

});



// Calculate and rank multiple PGs using the Matrix API

app.post("/api/commute/matrix", async (req, res) => {

  try {

    const {

      destinationLatitude,

      destinationLongitude,

      pgs,

      mode = "driving-car",

    } = req.body || {};



    // Validate selected travel mode

    if (

      typeof mode !== "string" ||

      !ALLOWED_MODES.includes(mode)

    ) {

      return res.status(400).json({

        success: false,

        message:

          "Unsupported travel mode. Choose driving-car, foot-walking or cycling-regular",

      });

    }



    // Validate destination coordinates

    if (

      !isValidCoordinate(

        destinationLatitude,

        destinationLongitude

      )

    ) {

      return res.status(400).json({

        success: false,

        message: "Valid destination coordinates are required",

      });

    }



    // Validate PG list

    if (

      !Array.isArray(pgs) ||

      pgs.length === 0 ||

      pgs.length > 20

    ) {

      return res.status(400).json({

        success: false,

        message: "Provide between 1 and 20 PGs",

      });

    }



    // Validate each PG

    const invalidPG = pgs.some(

      (pg) =>

        !pg ||

        typeof pg.googlePlaceId !== "string" ||

        !pg.googlePlaceId.trim() ||

        typeof pg.name !== "string" ||

        !pg.name.trim() ||

        !isValidCoordinate(pg.latitude, pg.longitude)

    );



    if (invalidPG) {

      return res.status(400).json({

        success: false,

        message:

          "Each PG must have a valid ID, name and coordinates",

      });

    }



    // Normalize PG data

    const normalizedPGs = pgs.map((pg) => ({

      googlePlaceId: pg.googlePlaceId,

      name: pg.name,

      latitude: Number(pg.latitude),

      longitude: Number(pg.longitude),

    }));



    const destinationLat = Number(destinationLatitude);

    const destinationLon = Number(destinationLongitude);



    // Cache key includes travel mode

    // Driving, walking and cycling use separate cached results

    const cacheKey = JSON.stringify({

      destinationLat,

      destinationLon,

      pgs: normalizedPGs,

      mode,

    });



    const cached = matrixCache.get(cacheKey);



    if (

      cached &&

      Date.now() - cached.timestamp < MATRIX_CACHE_DURATION_MS

    ) {

      return res.status(200).json({

        success: true,

        source: "OpenRouteService Matrix",

        cached: true,

        mode,

        total: cached.results.length,

        results: cached.results,

      });

    }



    // Calculate commutes using selected travel mode

    const results = await calculateCommuteMatrix(

      destinationLat,

      destinationLon,

      normalizedPGs,

      mode

    );



    // Rank PGs by shortest estimated travel time

    // Unreachable locations appear at the end

    const rankedResults = [...results].sort((a, b) => {

      const timeA = a.commuteMinutes;

      const timeB = b.commuteMinutes;



      if (timeA == null && timeB == null) return 0;

      if (timeA == null) return 1;

      if (timeB == null) return -1;



      return timeA - timeB;

    });



    // Assign ranks to reachable PGs

    let rank = 0;



    const rankedPGs = rankedResults.map((pg) => ({

      ...pg,

      rank:

        pg.commuteMinutes == null

          ? null

          : ++rank,

    }));



    // Temporarily cache the ranked results

    matrixCache.set(cacheKey, {

      timestamp: Date.now(),

      results: rankedPGs,

    });



    return res.status(200).json({

      success: true,

      source: "OpenRouteService Matrix",

      cached: false,

      mode,

      total: rankedPGs.length,

      results: rankedPGs,

    });

  } catch (error) {

    console.error("Matrix calculation failed:", error.message);



    return res.status(502).json({

      success: false,

      message: "Unable to calculate commute rankings",

      error:

        process.env.NODE_ENV === "production"

          ? undefined

          : error.message,

    });

  }

});

// Handle unknown API routes
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Handle unexpected application errors
app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  // Handle invalid JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error. Please try again later.",
  });
});


module.exports = app;
