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

type MapLevel = "world" | "country" | "city";

type Props = {
  projectId: string;
  runId: string;
  onClose: () => void;
  onExport: () => void;
  exportLoading: boolean;
};

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

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

// Country zoom levels based on country size
// Larger countries need lower zoom levels to show the entire country
// Zoom level guide: 1=world, 2=continent, 3=very large country, 4=large country, 5=medium, 6=small, 7=city, 8=district
// For very large countries like China, use zoom 2.5-3 to show the entire country
const COUNTRY_ZOOM_LEVELS: Record<string, number> = {
  // Very large countries (zoom 2-2.5) - need to show entire country
  // These countries are so large that they need very low zoom to see the whole country
  Russia: 2,
  Canada: 2,
  China: 2,  // Very low zoom to show entire country (zoom 2 shows ~continent level)
  "United States": 2,  // Very low zoom for better coverage
  Brazil: 2,
  Australia: 2,
  India: 2.5,  // Slightly higher as it's narrower
  Argentina: 2.5,
  // Large countries (zoom 4-5)
  Mexico: 4,
  Indonesia: 4,
  "South Africa": 4,
  Turkey: 4,
  // Medium countries (zoom 5-6)
  France: 5,
  Spain: 5,
  Germany: 5,
  Italy: 5,
  Japan: 5,
  "United Kingdom": 4,
  Poland: 5,
  // Small countries (zoom 6-7)
  Netherlands: 6,
  Belgium: 6,
  Switzerland: 6,
  Austria: 6,
  "South Korea": 6,
  // Very small countries (zoom 7-8)
  Singapore: 7,
  "Hong Kong": 7,
  Taiwan: 7,
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

export default function MapModal({ projectId, runId, onClose, onExport, exportLoading }: Props) {
  const [level, setLevel] = useState<MapLevel>("world");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Data for each level
  const [worldData, setWorldData] = useState<WorldMapData[]>([]);
  const [countryData, setCountryData] = useState<CountryMapData[]>([]);
  const [cityData, setCityData] = useState<CityMapData[]>([]);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [showScholarModal, setShowScholarModal] = useState(false);
  const [selectedInstitutionName, setSelectedInstitutionName] = useState<string | null>(null);
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());

  // Navigation state
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

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

  async function handleShare() {
    const url = `${window.location.origin}/projects/${projectId}/runs/${runId}`;
    const copied = await copyTextToClipboard(url);
    if (copied) {
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1500);
    }
  }

  // Load world data on mount
  useEffect(() => {
    loadWorldData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for Mapbox authentication errors
  useEffect(() => {
    if (!mapboxToken) return;

    // Monitor console errors for Mapbox-related errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMsg = args.join(" ");
      if (
        errorMsg.includes("401") ||
        errorMsg.includes("Unauthorized") ||
        (errorMsg.includes("mapbox.com") && errorMsg.includes("401"))
      ) {
        setMapError("Invalid or expired Mapbox access token. Please check your token in .env.local and restart the server.");
      }
      originalConsoleError.apply(console, args);
    };

    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || "";
      const errorUrl = (event.filename || "").toLowerCase();
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("Mapbox") ||
        event.error?.message?.includes("access token") ||
        (errorUrl.includes("mapbox.com") && (errorMessage.includes("401") || errorMessage.includes("Unauthorized")))
      ) {
        setMapError("Invalid or expired Mapbox access token. Please check your token in .env.local and restart the server.");
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason || "");
      if (
        reason.includes("401") ||
        reason.includes("Unauthorized") ||
        reason.includes("Mapbox") ||
        reason.includes("access token")
      ) {
        setMapError("Invalid or expired Mapbox access token. Please check your token in .env.local and restart the server.");
      }
    };

    // Monitor fetch errors for mapbox.com requests
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      if (url.includes("mapbox.com")) {
        try {
          const response = await originalFetch(input, init);
          if (response.status === 401 && url.includes("mapbox.com")) {
            setMapError("Invalid or expired Mapbox access token. Please check your token in .env.local and restart the server.");
          }
          return response;
        } catch (error) {
          throw error;
        }
      }
      return originalFetch(input, init);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError;
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [mapboxToken]);

  async function loadWorldData() {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorldMap(projectId, runId);
      console.log("World map data loaded:", data);
      console.log("Countries with coordinates:", data.filter(c => c.latitude !== null && c.longitude !== null).length);
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

      // Always show the entire country using predefined country center coordinates
      // Do not adapt to marker positions - just show the country as a whole
      const coords = COUNTRY_COORDS[country];
      if (coords) {
        // Use country-specific zoom level, or default to 5 for countries not in the list
        const zoom = COUNTRY_ZOOM_LEVELS[country] || 5;
        setViewState({
          longitude: coords[0],
          latitude: coords[1],
          zoom: zoom
        });
      } else {
        // Fallback: if country not in COUNTRY_COORDS, try to get from first city with coords
        const citiesWithCoords = data.filter(c => c.latitude !== null && c.longitude !== null);
        if (citiesWithCoords.length > 0) {
          // Use country-specific zoom level, or default to 5
          const zoom = COUNTRY_ZOOM_LEVELS[country] || 5;
          setViewState({
            longitude: citiesWithCoords[0].longitude!,
            latitude: citiesWithCoords[0].latitude!,
            zoom: zoom
          });
        }
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
      
      // Find city coordinates from countryData to zoom to city
      const cityInfo = countryData.find(c => c.city === city && c.latitude !== null && c.longitude !== null);
      if (cityInfo) {
        setViewState({
          longitude: cityInfo.longitude!,
          latitude: cityInfo.latitude!,
          zoom: 10 // Zoom in closer for city view
        });
      } else {
        // Fallback to CITY_COORDS if not found in countryData
        const coords = CITY_COORDS[city];
        if (coords) {
          setViewState({
            longitude: coords[0],
            latitude: coords[1],
            zoom: 10
          });
        }
      }
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
      setSelectedInstitutionName(institution);
      setShowScholarModal(true);
      setExpandedPapers(new Set()); // Reset expanded papers when opening modal
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (level === "city") {
      setLevel("country");
      setSelectedCity(null);
      
      // Zoom back to show entire country
      if (selectedCountry && countryData.length > 0) {
        const citiesWithCoords = countryData.filter(c => c.latitude !== null && c.longitude !== null);
        if (citiesWithCoords.length > 0) {
          const longitudes = citiesWithCoords.map(c => c.longitude!);
          const latitudes = citiesWithCoords.map(c => c.latitude!);
          
          const minLon = Math.min(...longitudes);
          const maxLon = Math.max(...longitudes);
          const minLat = Math.min(...latitudes);
          const maxLat = Math.max(...latitudes);
          
          // Calculate center
          const centerLon = (minLon + maxLon) / 2;
          const centerLat = (minLat + maxLat) / 2;
          
          // Calculate zoom level based on bounding box
          const lonDiff = maxLon - minLon;
          const latDiff = maxLat - minLat;
          const maxDiff = Math.max(lonDiff, latDiff);
          
          let zoom = 5;
          if (maxDiff > 20) zoom = 3;
          else if (maxDiff > 10) zoom = 4;
          else if (maxDiff > 5) zoom = 5;
          else if (maxDiff > 2) zoom = 6;
          else if (maxDiff > 1) zoom = 7;
          else zoom = 8;
          
          setViewState({
            longitude: centerLon,
            latitude: centerLat,
            zoom: zoom
          });
        } else {
          // Fallback to country center if no city coordinates
          const coords = COUNTRY_COORDS[selectedCountry];
          if (coords) {
            setViewState({
              longitude: coords[0],
              latitude: coords[1],
              zoom: 5
            });
          }
        }
      }
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
    const scholarCount =
      selectedCity && cityData.length
        ? cityData.reduce((sum, institution) => sum + institution.scholar_count, 0)
        : selectedCountry && countryData.length
          ? countryData.reduce((sum, city) => sum + city.scholar_count, 0)
          : null;
    const scholarLabel =
      scholarCount !== null
        ? ` (${scholarCount.toLocaleString()} scholar${scholarCount === 1 ? "" : "s"})`
        : "";

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span style={{ color: "#999" }}>→</span>}
            <span style={{ fontWeight: i === crumbs.length - 1 ? "bold" : "normal" }}>
              {c}
              {i === crumbs.length - 1 ? scholarLabel : ""}
            </span>
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
            </tr>
          </thead>
          <tbody>
            {worldData.slice(0, 20).map((c, index) => (
              <tr key={`${c.country}-${index}`}>
                <td>{c.country}</td>
                <td>{c.scholar_count}</td>
                <td>{c.paper_count}</td>
                <td>{c.institution_count}</td>
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
            </tr>
          </thead>
          <tbody>
            {countryData.slice(0, 20).map((c, index) => (
              <tr key={`${c.city}-${index}`}>
                <td>{c.city}</td>
                <td>{c.scholar_count}</td>
                <td>{c.institution_count}</td>
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

  
  const togglePaper = (pmid: string) => {
    const newExpanded = new Set(expandedPapers);
    if (newExpanded.has(pmid)) {
      newExpanded.delete(pmid);
    } else {
      newExpanded.add(pmid);
    }
    setExpandedPapers(newExpanded);
  };
  
  function renderScholarModal() {
    if (!showScholarModal || !scholars.length || !selectedInstitutionName) return null;
    
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
          zIndex: 2000,
          padding: 20
        }}
        onClick={() => setShowScholarModal(false)}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 8,
            width: "90%",
            maxWidth: 1000,
            maxHeight: "90%",
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
              <h2 style={{ margin: 0, marginBottom: "8px" }}>📚 {selectedInstitutionName}</h2>
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                {scholars.length} scholar{scholars.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button className="secondary" onClick={() => setShowScholarModal(false)} style={{ fontSize: "15px" }}>
              ✕ Close
            </button>
          </div>
          
          {/* Scholars and Papers List */}
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {scholars.map((scholar, scholarIdx) => (
              <div
                key={scholar.scholar_name}
                style={{
                  marginBottom: 32,
                  padding: 20,
                  border: "2px solid #e5e7eb",
                  borderRadius: 12,
                  backgroundColor: "#ffffff"
                }}
              >
                {/* Scholar Header */}
                <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
                  <h3 style={{ margin: 0, marginBottom: 4, color: "#111827", fontSize: 18, fontWeight: 600 }}>
                    {scholar.scholar_name}
                  </h3>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    {scholar.paper_count} paper{scholar.paper_count !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {/* Papers List */}
                <div>
                  {scholar.papers.map((paper, paperIdx) => (
                    <div
                      key={paper.pmid}
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        backgroundColor: "#fafafa"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          cursor: "pointer"
                        }}
                        onClick={() => togglePaper(paper.pmid)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6, color: "#111827", fontSize: 14 }}>
                            {paper.title || `Paper ${paperIdx + 1}`}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {paper.year && <span>Year: {paper.year}</span>}
                            {paper.doi && (
                              <span style={{ marginLeft: 12 }}>
                                DOI: <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  {paper.doi}
                                </a>
                              </span>
                            )}
                            {paper.pmid && (
                              <span style={{ marginLeft: 12 }}>
                                PMID: <a href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  {paper.pmid}
                                </a>
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ marginLeft: 12, color: "#6b7280", fontSize: 16, minWidth: 24, textAlign: "center" }}>
                          {expandedPapers.has(paper.pmid) ? "▼" : "▶"}
                        </div>
                      </div>
                      {expandedPapers.has(paper.pmid) && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                          <div style={{ color: "#6b7280", fontSize: 13, fontStyle: "italic" }}>
                            Abstract not available in database
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate marker size based on scholar count (logarithmic scale for better distribution)
  function getMarkerSize(count: number): number {
    const minSize = 8;
    const maxSize = 70;
    const logCount = Math.log(count + 1);
    const allCounts = [
      ...worldData.map(c => c.scholar_count),
      ...countryData.map(c => c.scholar_count)
    ];
    const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : count;
    const maxLogCount = Math.log(maxCount + 1);
    if (maxLogCount === 0) return minSize;
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
      const validCountries = worldData.filter((country) => country.latitude !== null && country.longitude !== null);
      
      return validCountries.map((country, index) => {
          const size = getMarkerSize(country.scholar_count);
          const { bg, shadow } = getMarkerColor(country.scholar_count);
          const fontSize = Math.max(12, size / 4);

          return (
            <Marker
              key={`${country.country}-${index}-${country.longitude}-${country.latitude}`}
              longitude={country.longitude!}
              latitude={country.latitude!}
              anchor="center"
            >
              <div
                className="map-marker"
                style={{
                  background: bg,
                  color: "white",
                  width: `${size}px`,
                  height: `${size}px`,
                  minWidth: `${size}px`,
                  minHeight: `${size}px`,
                  fontSize: `${fontSize}px`,
                  boxShadow: shadow,
                  lineHeight: `${size}px`,
                  textAlign: "center",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 10
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
      // Show city markers (no popup for country level)
      return countryData
        .filter((city) => city.latitude !== null && city.longitude !== null)
        .map((city, index) => {
          const size = getMarkerSize(city.scholar_count);
          const { bg, shadow } = getMarkerColor(city.scholar_count);
          const fontSize = Math.max(12, size / 4);

          return (
            <Marker key={`${city.city}-${index}-${city.longitude}-${city.latitude}`} longitude={city.longitude!} latitude={city.latitude!} anchor="center">
            <div
              className="map-marker"
              style={{
                background: bg,
                color: "white",
                width: `${size}px`,
                height: `${size}px`,
                minWidth: `${size}px`,
                minHeight: `${size}px`,
                fontSize: `${fontSize}px`,
                boxShadow: shadow,
                lineHeight: `${size}px`,
                textAlign: "center",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                zIndex: 10
              }}
              onClick={() => drillToCity(selectedCountry, city.city)}
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
    <div>
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
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
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
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              className="secondary"
              onClick={handleShare}
              style={{
                fontSize: "15px",
                background: "#5a0760",
                color: "#fff",
                borderColor: "#5a0760"
              }}
            >
              {shareCopied ? "Copied!" : "Share"}
            </button>
            <button
              className="secondary"
              onClick={onExport}
              disabled={exportLoading}
              style={{
                fontSize: "15px",
                background: "#5a0760",
                color: "#fff",
                borderColor: "#5a0760"
              }}
            >
              {exportLoading ? "Exporting..." : "Export"}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="secondary" onClick={onClose} style={{ fontSize: "15px" }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Map (left side) */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* Fullscreen Toggle Button (Mobile Optimized) */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                background: "white",
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151"
              }}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                  <span className="hidden sm:inline">Exit</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                  <span className="hidden sm:inline">Full</span>
                </>
              )}
            </button>
            
            {mapboxToken ? (
              mapError ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    backgroundColor: "#f5f5f5",
                    padding: 40,
                    textAlign: "center"
                  }}
                >
                  <div style={{ 
                    padding: "24px", 
                    background: "#fee2e2", 
                    borderRadius: "12px",
                    color: "#dc2626",
                    fontSize: 16,
                    maxWidth: 600,
                    border: "2px solid #fca5a5"
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️ Mapbox Authentication Error</div>
                    <div style={{ marginBottom: 16, lineHeight: 1.6 }}>
                      {mapError}
                    </div>
                    <div style={{ 
                      fontSize: 14, 
                      color: "#991b1b", 
                      background: "#ffffff",
                      padding: 16,
                      borderRadius: 8,
                      marginTop: 16,
                      textAlign: "left"
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>To fix this:</div>
                      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>Get a Mapbox access token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>https://account.mapbox.com/access-tokens/</a></li>
                        <li>Add it to your <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>frontend/.env.local</code> file:</li>
                      </ol>
                      <div style={{ 
                        background: "#f3f4f6", 
                        padding: 12, 
                        borderRadius: 6, 
                        marginTop: 8,
                        fontFamily: "monospace",
                        fontSize: 13
                      }}>
                        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
                      </div>
                      <div style={{ marginTop: 12, fontSize: 13 }}>
                        <li style={{ listStyle: "none", marginTop: 8 }}>Restart your Next.js development server</li>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Map
                  {...viewState}
                  onMove={(evt) => setViewState(evt.viewState)}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="mapbox://styles/mapbox/light-v11"
                  mapboxAccessToken={mapboxToken}
                >
                {renderMarkers()}

                {popupInfo && level !== "country" && (
                  <Popup
                    longitude={popupInfo.longitude}
                    latitude={popupInfo.latitude}
                    anchor="bottom"
                    closeButton={false}
                    closeOnClick={false}
                    offset={25}
                    style={{ padding: 0 }}
                  >
                    <div style={{ 
                      padding: "10px 14px", 
                      fontSize: "13px",
                      background: "white",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      border: "none",
                      margin: 0
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
              )
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

          {/* Data panel (right side) - Hidden in fullscreen mode */}
          {!isFullscreen && (
            <div
              style={{
                width: 420,
                borderLeft: "2px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                background: "#fafafa"
              }}
              className="hidden md:flex"
            >
            <div style={{ padding: 20, borderBottom: "2px solid #e5e7eb", background: "white" }}>
              {level !== "world" && (
                <button className="secondary" onClick={goBack} style={{ marginBottom: 12, width: "100%" }}>
                  ← Back to {level === "city" ? "Country" : "World"}
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
            </div>
          </div>
          )}
        </div>
      </div>
      
      {/* Scholar Details Modal */}
      {renderScholarModal()}
    </div>
  );
}
