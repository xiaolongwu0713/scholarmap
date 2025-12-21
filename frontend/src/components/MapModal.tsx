"use client";

import { useEffect, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  getWorldMap,
  getCountryMap,
  getCityMap,
  getInstitutionScholars,
  type WorldMapData,
  type CountryMapData,
  type CityMapData,
  type Scholar
} from "@/lib/api";

type MapLevel = "world" | "country" | "city" | "institution";

type Props = {
  projectId: string;
  runId: string;
  onClose: () => void;
};

// Country center coordinates
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "United States": [-95.7129, 37.0902],
  China: [104.1954, 35.8617],
  Japan: [138.2529, 36.2048],
  Germany: [10.4515, 51.1657],
  "United Kingdom": [-3.436, 55.3781],
  France: [2.2137, 46.2276],
  "South Korea": [127.7669, 35.9078],
  Netherlands: [5.2913, 52.1326],
  Australia: [133.7751, -25.2744],
  Switzerland: [8.2275, 46.8182],
  Canada: [-106.3468, 56.1304],
  Italy: [12.5674, 41.8719],
  Spain: [-3.7492, 40.4637],
  Brazil: [-47.8825, -15.7942],
  India: [78.9629, 20.5937],
  Russia: [105.3188, 61.524],
  Mexico: [-102.5528, 23.6345],
  Sweden: [18.6435, 60.1282],
  Norway: [8.4689, 60.472],
  Denmark: [9.5018, 56.2639],
  Belgium: [4.4699, 50.5039],
  Austria: [14.5501, 47.5162],
  Poland: [19.1451, 51.9194],
  Turkey: [35.2433, 38.9637],
  Israel: [34.8516, 31.0461],
  "South Africa": [22.9375, -30.5595],
  Argentina: [-63.6167, -38.4161],
  Chile: [-71.543, -35.6751],
  Colombia: [-74.2973, 4.5709],
  Greece: [21.8243, 39.0742],
  Portugal: [-8.2245, 39.3999],
  Ireland: [-8.2439, 53.4129],
  "New Zealand": [174.886, -40.9006],
  Finland: [25.7482, 61.9241],
  "Czech Republic": [15.473, 49.8175],
  Hungary: [19.5033, 47.1625],
  Romania: [24.9668, 45.9432],
  Singapore: [103.8198, 1.3521],
  "Hong Kong": [114.1095, 22.3193],
  Taiwan: [120.9605, 23.6978]
};

// City coordinates (major cities)
const CITY_COORDS: Record<string, [number, number]> = {
  // US Cities
  "New York": [-74.006, 40.7128],
  "Boston": [-71.0589, 42.3601],
  "Baltimore": [-76.6122, 39.2904],
  "San Francisco": [-122.4194, 37.7749],
  "Los Angeles": [-118.2437, 34.0522],
  "Seattle": [-122.3321, 47.6062],
  "Chicago": [-87.6298, 41.8781],
  "Houston": [-95.3698, 29.7604],
  "Philadelphia": [-75.1652, 39.9526],
  "Washington": [-77.0369, 38.9072],
  "Atlanta": [-84.388, 33.749],
  "Miami": [-80.1918, 25.7617],
  "Denver": [-104.9903, 39.7392],
  "Austin": [-97.7431, 30.2672],
  "Durham": [-78.8986, 35.994],
  "Stanford": [-122.1697, 37.4275],
  "La Jolla": [-117.2713, 32.8328],
  "Pittsburgh": [-79.9959, 40.4406],
  "Ann Arbor": [-83.743, 42.2808],
  // International Cities
  "London": [-0.1276, 51.5074],
  "Paris": [2.3522, 48.8566],
  "Berlin": [13.405, 52.52],
  "Munich": [11.582, 48.1351],
  "Tokyo": [139.6917, 35.6895],
  "Beijing": [116.4074, 39.9042],
  "Shanghai": [121.4737, 31.2304],
  "Shenzhen": [114.0579, 22.5431],
  "Guangzhou": [113.2644, 23.1291],
  "Tianjin": [117.2008, 39.0842],
  "Chongqing": [106.5516, 29.563],
  "Chengdu": [104.0668, 30.5728],
  "Wuhan": [114.3055, 30.5928],
  "Hangzhou": [120.1551, 30.2741],
  "Nanjing": [118.7969, 32.0603],
  "Xi'an": [108.9398, 34.3416],
  "Xi'An City": [108.9398, 34.3416],
  "Xian": [108.9398, 34.3416],
  "Linyi": [118.3425, 35.1041],
  "Qingdao": [120.3826, 36.0671],
  "Dalian": [121.6147, 38.9140],
  "Suzhou": [120.5954, 31.2989],
  "Seoul": [126.978, 37.5665],
  "Amsterdam": [4.9041, 52.3676],
  "Rotterdam": [4.4777, 51.9244],
  "Sydney": [151.2093, -33.8688],
  "Melbourne": [144.9631, -37.8136],
  "Toronto": [-79.3832, 43.6532],
  "Montreal": [-73.5673, 45.5017],
  "Vancouver": [-123.1207, 49.2827],
  "Zurich": [8.541, 47.3769],
  "Geneva": [6.1432, 46.2044],
  "Stockholm": [18.0686, 59.3293],
  "Copenhagen": [12.5683, 55.6761],
  "Vienna": [16.3738, 48.2082],
  "Rome": [12.4964, 41.9028],
  "Milan": [9.19, 45.4642],
  "Madrid": [-3.7038, 40.4168],
  "Barcelona": [2.1734, 41.3851],
  "Brussels": [4.3517, 50.8503]
};

export default function MapModal({ projectId, runId, onClose }: Props) {
  const [level, setLevel] = useState<MapLevel>("world");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data for each level
  const [worldData, setWorldData] = useState<WorldMapData[]>([]);
  const [countryData, setCountryData] = useState<CountryMapData[]>([]);
  const [cityData, setCityData] = useState<CityMapData[]>([]);
  const [scholars, setScholars] = useState<Scholar[]>([]);

  // Navigation state
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);

  // Map state
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5
  });

  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    name: string;
    count: number;
  } | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  // Load world data on mount
  useEffect(() => {
    loadWorldData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWorldData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorldMap(projectId, runId);
      setWorldData(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function drillToCountry(country: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getCountryMap(projectId, runId, country);
      setCountryData(data);
      setSelectedCountry(country);
      setLevel("country");

      // Zoom to country
      const coords = COUNTRY_COORDS[country];
      if (coords) {
        setViewState({
          longitude: coords[0],
          latitude: coords[1],
          zoom: 5
        });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function drillToCity(country: string, city: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getCityMap(projectId, runId, country, city);
      setCityData(data);
      setSelectedCity(city);
      setLevel("city");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function drillToInstitution(country: string, city: string, institution: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await getInstitutionScholars(projectId, runId, institution, country, city);
      setScholars(data.scholars);
      setSelectedInstitution(institution);
      setLevel("institution");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (level === "institution") {
      setLevel("city");
      setSelectedInstitution(null);
    } else if (level === "city") {
      setLevel("country");
      setSelectedCity(null);
    } else if (level === "country") {
      setLevel("world");
      setSelectedCountry(null);
      setViewState({ longitude: 0, latitude: 20, zoom: 1.5 });
    }
  }

  function renderBreadcrumbs() {
    const crumbs = ["World"];
    if (selectedCountry) crumbs.push(selectedCountry);
    if (selectedCity) crumbs.push(selectedCity);
    if (selectedInstitution) crumbs.push(selectedInstitution);

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span style={{ color: "#999" }}>→</span>}
            <span style={{ fontWeight: i === crumbs.length - 1 ? "bold" : "normal" }}>{c}</span>
          </span>
        ))}
      </div>
    );
  }

  function renderWorldList() {
    if (!worldData.length) return <div className="muted">No data</div>;

    return (
      <div style={{ maxHeight: 400, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Scholars</th>
              <th>Papers</th>
              <th>Institutions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {worldData.slice(0, 20).map((c) => (
              <tr key={c.country}>
                <td>{c.country}</td>
                <td>{c.scholar_count}</td>
                <td>{c.paper_count}</td>
                <td>{c.institution_count}</td>
                <td>
                  <button className="secondary" onClick={() => drillToCountry(c.country)}>
                    Drill →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCountryList() {
    if (!countryData.length) return <div className="muted">No cities found</div>;

    return (
      <div style={{ maxHeight: 400, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>Scholars</th>
              <th>Institutions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {countryData.slice(0, 20).map((c) => (
              <tr key={c.city}>
                <td>{c.city}</td>
                <td>{c.scholar_count}</td>
                <td>{c.institution_count}</td>
                <td>
                  <button className="secondary" onClick={() => drillToCity(c.country, c.city)}>
                    Drill →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCityList() {
    if (!cityData.length) return <div className="muted">No institutions found</div>;

    return (
      <div style={{ maxHeight: 400, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Scholars</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cityData.slice(0, 20).map((c, idx) => (
              <tr key={idx}>
                <td>{c.institution}</td>
                <td>{c.scholar_count}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => drillToInstitution(c.country, c.city, c.institution)}
                  >
                    View Scholars →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderScholarList() {
    if (!scholars.length) return <div className="muted">No scholars found</div>;

    return (
      <div style={{ maxHeight: 400, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Papers</th>
              <th>Career</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {scholars.map((s, idx) => (
              <tr key={idx}>
                <td>{s.name}</td>
                <td>{s.paper_count}</td>
                <td>
                  {s.career_start_year || "?"} - {s.career_end_year || "?"}
                </td>
                <td>{s.is_likely_pi ? "👑 PI" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Calculate marker size based on scholar count (logarithmic scale for better distribution)
  function getMarkerSize(count: number): number {
    const minSize = 8;
    const maxSize = 70;
    const logCount = Math.log(count + 1);
    const maxLogCount = Math.log(Math.max(...worldData.map(c => c.scholar_count), ...countryData.map(c => c.scholar_count)) + 1);
    return minSize + ((maxSize - minSize) * logCount) / maxLogCount;
  }

  // Get color - single blue color scheme
  function getMarkerColor(count: number): { bg: string; shadow: string } {
    return { 
      bg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
      shadow: "0 3px 10px rgba(37, 99, 235, 0.4)" 
    };
  }

  function renderMarkers() {
    if (level === "world") {
      // Show country markers
      return worldData.map((country) => {
        // Use coordinates from API response
        if (country.latitude === null || country.longitude === null) {
          return null;
        }

        const size = getMarkerSize(country.scholar_count);
        const { bg, shadow } = getMarkerColor(country.scholar_count);
        const fontSize = Math.max(12, size / 4);

        return (
          <Marker
            key={country.country}
            longitude={country.longitude}
            latitude={country.latitude}
            anchor="center"
          >
            <div
              className="map-marker"
              style={{
                background: bg,
                color: "white",
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${fontSize}px`,
                boxShadow: shadow
              }}
              onClick={() => drillToCountry(country.country)}
              onMouseEnter={() =>
                setPopupInfo({
                  longitude: country.longitude!,
                  latitude: country.latitude!,
                  name: country.country,
                  count: country.scholar_count
                })
              }
              onMouseLeave={() => setPopupInfo(null)}
            >
              {country.scholar_count}
            </div>
          </Marker>
        );
      });
    } else if (level === "country" && selectedCountry) {
      // Show city markers
      return countryData.map((city) => {
        // Use coordinates from API response
        if (city.latitude === null || city.longitude === null) {
          return null;
        }

        const size = getMarkerSize(city.scholar_count);
        const { bg, shadow } = getMarkerColor(city.scholar_count);
        const fontSize = Math.max(12, size / 4);

        return (
          <Marker key={city.city} longitude={city.longitude} latitude={city.latitude} anchor="center">
            <div
              className="map-marker"
              style={{
                background: bg,
                color: "white",
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${fontSize}px`,
                boxShadow: shadow
              }}
              onClick={() => drillToCity(selectedCountry, city.city)}
              onMouseEnter={() =>
                setPopupInfo({
                  longitude: city.longitude!,
                  latitude: city.latitude!,
                  name: city.city,
                  count: city.scholar_count
                })
              }
              onMouseLeave={() => setPopupInfo(null)}
            >
              {city.scholar_count}
            </div>
          </Marker>
        );
      });
    }

    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          width: "90%",
          maxWidth: 1200,
          height: "90%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "2px solid #e5e7eb",
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h2 style={{ margin: 0, marginBottom: "8px" }}>
              <span style={{ 
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                🗺️ Scholar Map
              </span>
            </h2>
            {renderBreadcrumbs()}
          </div>
          <button className="secondary" onClick={onClose} style={{ fontSize: "15px" }}>
            ✕ Close
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Map (left side) */}
          <div style={{ flex: 1, position: "relative" }}>
            {mapboxToken ? (
              <Map
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/light-v11"
                mapboxAccessToken={mapboxToken}
              >
                {renderMarkers()}

                {popupInfo && (
                  <Popup
                    longitude={popupInfo.longitude}
                    latitude={popupInfo.latitude}
                    anchor="bottom"
                    closeButton={false}
                    closeOnClick={false}
                    offset={25}
                  >
                    <div style={{ 
                      padding: "10px 14px", 
                      fontSize: "13px",
                      background: "white",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}>
                      <div style={{ fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
                        📍 {popupInfo.name}
                      </div>
                      <div style={{ 
                        color: "#2563eb", 
                        fontWeight: 600,
                        fontSize: "14px",
                        marginBottom: "4px"
                      }}>
                        👥 {popupInfo.count} scholars
                      </div>
                      <div style={{ 
                        color: "#6b7280", 
                        fontSize: "11px",
                        fontStyle: "italic"
                      }}>
                        💡 Click to explore
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  backgroundColor: "#f5f5f5"
                }}
              >
                <div className="muted">Map requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env</div>
              </div>
            )}
          </div>

          {/* Data panel (right side) */}
          <div
            style={{
              width: 420,
              borderLeft: "2px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              background: "#fafafa"
            }}
          >
            <div style={{ padding: 20, borderBottom: "2px solid #e5e7eb", background: "white" }}>
              {level !== "world" && (
                <button className="secondary" onClick={goBack} style={{ marginBottom: 12, width: "100%" }}>
                  ← Back to {level === "institution" ? "Cities" : level === "city" ? "Cities" : "World"}
                </button>
              )}
              {loading && (
                <div style={{ 
                  padding: "12px", 
                  background: "#eff6ff", 
                  borderRadius: "8px",
                  color: "#2563eb",
                  textAlign: "center",
                  fontWeight: 600
                }}>
                  🔄 Loading data...
                </div>
              )}
              {error && (
                <div style={{ 
                  padding: "12px", 
                  background: "#fee2e2", 
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: 14
                }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
              {level === "world" && renderWorldList()}
              {level === "country" && renderCountryList()}
              {level === "city" && renderCityList()}
              {level === "institution" && renderScholarList()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

