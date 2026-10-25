<div align="center">

# 🏠 PGPilot

### Find smarter. Compare confidently. Stay closer.

**A commute-aware PG discovery platform with real-world listings, explainable recommendations, and personalized property shortlisting.**

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**[🌐 Live Website](https://pgpilot-finder.vercel.app)** · **[💻 Source Code](https://github.com/AAQUIL-16/PGPilot)**

</div>

---

## 📌 Overview

**PGPilot** is a full-stack web application that helps students and working professionals discover paying-guest (PG) accommodations based on **where they need to travel**, rather than relying only on locality names or raw ratings.

Users can search around a college or workplace, explore accommodation listings, estimate driving/walking/cycling commute times, apply practical filters, understand why a property receives its **Smart Match score**, and save or compare promising options.

> **Project principle:** A nearby PG is not necessarily the most convenient PG. Travel time, distance, rating, and personal priorities should be considered together.

## 🎯 Problem Statement

Traditional accommodation searches can make it difficult to:

- Evaluate the actual daily commute to a destination.
- Compare properties consistently across different travel modes.
- Understand how a recommendation or ranking was calculated.
- Shortlist and revisit properties without losing search context.
- Balance travel convenience, proximity, and public ratings.

**PGPilot's approach:** destination-first discovery, real-world listing information, route-based commute estimates, and transparent rule-based ranking.

## ✨ Key Features

| Feature | What it does |
|---|---|
| 🔎 Destination-first search | Search for PGs around a college, office, or other destination. |
| 📍 Google Places integration | Retrieves accommodation listings and available place details from Google Places. |
| 🚗 Travel-mode comparison | Estimates commutes for driving, walking, and cycling using routing services. |
| 🧠 Explainable Smart Match | Ranks listings using commute, straight-line distance, and Google rating, with a visible score breakdown. |
| 🎛️ Advanced filters | Filter by accommodation category, rating, maximum commute, and distance; supports custom limits. |
| ❤️ Wishlist | Save properties to revisit later and manage them on a dedicated page. |
| ⚖️ PG comparison | Select up to three properties for side-by-side comparison. |
| 🕘 Search history | Revisit and repeat earlier searches. |
| 🔐 Authentication | Account access and protected, user-specific actions. |
| 👤 Account area | Profile, settings, feedback, support, and account navigation. |
| 📊 Community statistics | Displays platform activity such as users, searches, feedback, and ratings from the backend. |
| 📱 Responsive UI | Tailwind-based layouts for desktop and smaller screens. |

**Data transparency:** Listings and Google ratings originate from third-party sources; they should not be described as independently inspected or verified PGs. Commute times are **estimates**, not guaranteed travel times. Availability and rent should be confirmed directly with the property.

---

## 🖼️ Screenshots

### 1. Homepage — destination-first discovery

![PGPilot homepage](screenshots/homepage.png)

The homepage introduces the destination-based search workflow, quick destination suggestions, and the platform's three core capabilities: listing discovery, commute insights, and saved properties.

### 2. Community statistics

![PGPilot community statistics](screenshots/community.png)

The statistics section presents platform activity. Counts and averages are loaded from the application's statistics endpoint rather than being hard-coded into the interface.

### 3. Search results header

![PGPilot results search](screenshots/results-search.png)

After searching, users can review their destination and the number of discovered listings before examining the results, travel estimates, and filters.

### 4. Travel mode selector

![PGPilot travel mode selector](screenshots/travel-modes.png)

Users can switch between driving, walking, and cycling. The interface displays calculation status for the selected travel mode.

### Additional screenshots to add

The following features are implemented in the application but are **not illustrated here yet**. Capture screenshots from your current website and save them with these filenames:

| Screenshot file | Suggested screen |
|---|---|
| `screenshots/smart-match.png` | PG cards with Smart Match score and explanation |
| `screenshots/advanced-filters.png` | Expanded filters and custom limits |
| `screenshots/wishlist.png` | Dedicated saved-properties page |
| `screenshots/compare.png` | Side-by-side comparison of selected PGs |
| `screenshots/account.png` | Account menu or profile screen (hide personal information) |

---

## 🏗️ System Architecture

![PGPilot System Architecture](Screenshots/Architecture.png)

### Component responsibilities

| Layer | Responsibility |
|---|---|
| **Frontend** | Destination input, search state, filters, maps/UI, account screens, saved listings, comparison, and score explanations. |
| **Backend** | REST endpoints, third-party API access, request validation, authentication, and persistence. |
| **Database** | User-related records, favorites, search history, feedback, and platform activity. |
| **Google Places** | Place discovery and available public listing information. |
| **Routing provider** | Geocoding and travel-time/distance estimates for selected travel modes. |
| **Smart Match** | Explainable, client-side rule-based scoring using available listing and commute information. |

### End-to-end search workflow

```mermaid
sequenceDiagram
    actor User
    participant UI as React frontend
    participant API as Express API
    participant GP as Google Places
    participant RT as Routing service
    participant DB as PostgreSQL

    User->>UI: Enter destination and search
    UI->>API: Request destination geocoding
    API->>RT: Resolve destination coordinates
    RT-->>API: Coordinates
    API-->>UI: Destination location
    UI->>API: Search accommodation listings
    API->>GP: Places search
    GP-->>API: Listing details
    API-->>UI: PG listings
    UI->>API: Request commute estimates
    API->>RT: Route / travel-time calculations
    RT-->>API: Estimated commutes
    API-->>UI: Commute data
    UI->>UI: Apply filters and Smart Match ranking
    UI-->>User: Display ranked results and explanations
    opt Authenticated user saves a PG
        User->>UI: Save property
        UI->>API: Update favorites
        API->>DB: Persist favorite
        API-->>UI: Updated wishlist
    end
```

---

## 🧠 Smart Match — Explainable Recommendation Engine

PGPilot uses a **transparent, rule-based score**, not a trained machine-learning model. The score is calculated from three measurable signals:

1. **Commute time** — estimated time from the property to the destination.
2. **Straight-line distance** — geographic distance to the destination.
3. **Google rating** — publicly available rating, when present.

### Weighted score

For a chosen priority, the score is calculated as:

\[
S = w_c\,C + w_d\,D + w_r\,R
\]

Where the normalized component scores are:

\[
C = \max(0,\min(1,1-t/30)),\qquad
D = \max(0,\min(1,1-k/5)),\qquad
R = \max(0,\min(1,r/5))
\]

- `t`: estimated commute time in minutes
- `k`: straight-line distance in kilometers
- `r`: Google rating on a 0–5 scale
- `w_c`, `w_d`, `w_r`: selected priority weights (sum to 100)

### Ranking priorities and weights

| Priority | Commute | Distance | Rating |
|---|---:|---:|---:|
| **Balanced** | 45% | 20% | 35% |
| **Fastest commute** | 70% | 15% | 15% |
| **Top rated** | 20% | 10% | 70% |
| **Nearest** | 20% | 65% | 15% |

The UI exposes the same component weights used in the calculation, so users can understand **why one PG ranks above another**.

**Important implementation details:**
- A property without a usable commute estimate is **not assigned a Smart Match score**.
- If a Google rating is missing, the current scoring implementation uses a neutral `2.5/5` rating component and labels it as unrated.
- The score is a **relative discovery aid**, not a certification of property quality, safety, affordability, or availability.
- The current implementation is rule-based; it does **not** claim AI model training or predictive accuracy.

---

## 🧰 Technology Stack

| Category | Technology |
|---|---|
| Frontend | React, Vite, JavaScript (JSX) |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT-based account flow |
| Places / listing data | Google Places API |
| Geocoding and routing | Routing/geocoding backend integrations, including OpenRouteService in the project design |
| Deployment | Vercel (frontend), Render (backend) |
| Version control | Git, GitHub |

> The repository's actual `package.json`, backend route files, and deployment configuration are the authoritative sources for exact package versions and environment-variable names.

---

## 🔌 API Overview

The current React application calls the following backend endpoints. Consult the Express route definitions for request/response contracts and authorization requirements.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/locations/geocode` | Resolve a destination to coordinates |
| `GET` | `/api/pgs/search` | Retrieve PG search results |
| `POST` | `/api/commute/matrix` | Calculate travel estimates for multiple listings |
| `GET` | `/api/commute` | Request an individual commute estimate |
| `GET` | `/api/stats` | Retrieve platform activity statistics |
| `GET` / other | `/api/favorites` | Fetch and manage saved properties |
| `GET` / other | `/api/search-history` | Retrieve and manage search history |
| `GET` / other | `/api/profile` | Access profile information |
| `POST` | `/api/feedback` | Submit platform feedback |

**Note:** This is a frontend-observed API overview, not a complete OpenAPI specification. Additional auth, settings, and support routes may exist in the backend.

---

## 🗄️ Data and Persistence

PostgreSQL supports the application's persistent, user-oriented features. At the domain level, the data model includes:

```mermaid
erDiagram
    USER ||--o{ FAVORITE : saves
    USER ||--o{ SEARCH_HISTORY : performs
    USER ||--o{ FEEDBACK : submits
    FAVORITE }o--|| PLACE_REFERENCE : references
    SEARCH_HISTORY }o--|| DESTINATION_REFERENCE : searches
```

This is a **conceptual model**, not an exact export of your SQL schema. Review the repository's migrations or schema before documenting table names, columns, foreign keys, and indexes as definitive.

---

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL
- Valid API credentials for the external services configured by the backend
- Git

### 1. Clone the repository

```bash
git clone https://github.com/AAQUIL-16/PGPilot.git
cd PGPilot
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Configure the backend

Open another terminal and locate the backend folder (commonly `server/` or `backend/`). Install its dependencies:

```bash
cd server
npm install
```

> If your repository uses a different backend folder name, use that folder instead.

Create the environment files expected by the repository. Typical configuration categories are shown below; **verify the exact variable names in your backend source before using them**:

```dotenv
# Illustrative names only — match the actual code
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/pgpilot
JWT_SECRET=replace_with_a_long_random_secret
GOOGLE_PLACES_API_KEY=your_google_places_key
ORS_API_KEY=your_routing_api_key
PORT=5000
```

For the Vite frontend, configure the backend URL only if your application uses it:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

Never commit `.env` files or real API keys. Ensure `.gitignore` excludes secrets.

### 4. Initialize PostgreSQL

Create the database and run the migrations, SQL scripts, or ORM setup included in the repository. The exact command depends on the database tooling in your current backend.

### 5. Start the backend

From the backend directory, use the script defined in its `package.json` (often `npm run dev` or `npm start`).

### 6. Start the frontend

```bash
cd client
npm run dev
```

Open the local URL displayed by Vite (usually `http://localhost:5173`).

### 7. Test the main user journey

1. Open PGPilot and enter a destination.
2. Search for PGs and confirm listings load.
3. Change travel mode and inspect commute estimates.
4. Apply rating, distance, and commute filters.
5. Switch Smart Match priority and inspect the score breakdown.
6. Sign in, save a PG, and open Wishlist.
7. Compare properties and revisit Search History.

---

## ☁️ Deployment

| Component | Hosting |
|---|---|
| Frontend | [Vercel](https://vercel.com/) |
| Backend | [Render](https://render.com/) |
| Database | PostgreSQL (provider depends on deployment configuration) |

**Live app:** https://pgpilot-finder.vercel.app

When deploying, configure production API URLs, CORS rules, server-side API keys, database credentials, and allowed origins. Do not expose secret API keys in the Vite client bundle.

---

## 🔐 Security and Reliability Considerations

- Protect user-specific endpoints with authentication and authorization checks.
- Keep database credentials, JWT secrets, and third-party API keys on the server.
- Validate user inputs and filter limits on both frontend and backend.
- Apply sensible API rate limits and handle provider failures gracefully.
- Treat public ratings and third-party property details as external data.
- Clearly distinguish estimated commute times from guaranteed arrival times.
- Avoid exposing personal information in screenshots, logs, and public demo accounts.

These are engineering considerations; this README does **not** claim that a formal security audit or penetration test has been completed.

---

## 🧪 Testing Checklist

- [ ] Destination geocoding handles valid and invalid searches.
- [ ] PG listings load correctly or show a useful empty/error state.
- [ ] Driving, walking, and cycling update commute data.
- [ ] Smart Match changes ranking according to selected priority.
- [ ] Custom rating, distance, and commute filters apply correctly.
- [ ] Wishlist remains consistent after saving and removing PGs.
- [ ] Compare PGs enforces the three-property limit.
- [ ] Search history and profile require the appropriate account state.
- [ ] Mobile navigation and account menu remain usable.
- [ ] API credentials are absent from the public frontend bundle.

The checklist is for verification and is **not a claim that automated tests have passed**.

---

## 🛣️ Future Enhancements

- More complete result pagination and broader search coverage.
- Additional commute modes where supported by the routing provider.
- Richer verified-property details, including rent and amenities, when reliable data becomes available.
- Saved searches and alerts for newly discovered properties.
- Better accessibility, automated tests, and performance monitoring.
- Property-owner onboarding and verified listing management, if the product expands beyond third-party discovery.

---

## 💡 What Makes PGPilot Different?

**Destination-first discovery:** Users begin with where they need to go, not just where they want to live.

**Commute-aware comparison:** Road-based travel estimates complement straight-line distance.

**Explainable recommendations:** The ranking formula and weights are visible rather than hidden behind an opaque score.

**End-to-end product thinking:** Search, filtering, authentication, saving, comparing, history, and feedback form a connected workflow.

---

## 👨‍💻 Project Information

**Project:** PGPilot — Commute-Aware PG Finder  
**Category:** Full-Stack Web Development  
**Repository:** https://github.com/AAQUIL-16/PGPilot  
**Live demo:** https://pgpilot-finder.vercel.app

### Acknowledgments

Listing and routing information is provided through their respective third-party services, subject to their availability, usage policies, and terms. All product names and trademarks belong to their respective owners.

---

<div align="center">

**PGPilot — Find a place that fits your life.**

⭐ If this project is useful, consider starring the repository.

</div>
