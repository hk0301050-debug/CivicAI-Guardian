import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { CivicReport } from "../types";

interface MapViewProps {
  reports: CivicReport[];
}

export const MapView: React.FC<MapViewProps> = ({ reports }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Helper to color code severity
  const getSeverityColor = (severity?: string): string => {
    if (!severity) return "#94a3b8"; // gray
    const s = severity.toLowerCase().trim();
    if (s.includes("high") || s.includes("critical") || s.includes("urgent") || s.includes("severe")) {
      return "#ef4444"; // red
    }
    if (s.includes("medium") || s.includes("moderate") || s.includes("warn")) {
      return "#f97316"; // orange
    }
    if (s.includes("low") || s.includes("minor")) {
      return "#22c55e"; // green
    }
    return "#94a3b8"; // gray
  };

  // Helper to format status badges inside popup
  const getStatusBadgeHtml = (status?: string): string => {
    const val = status || "pending";
    let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
    let label = "Pending Analysis";

    switch (val.toLowerCase()) {
      case "resolved":
        bgClass = "bg-green-100 text-green-800 border-green-200";
        label = "Resolved";
        break;
      case "in_progress":
        bgClass = "bg-blue-100 text-blue-800 border-blue-200";
        label = "In Progress";
        break;
      case "accepted":
        bgClass = "bg-amber-100 text-amber-800 border-amber-200";
        label = "Accepted";
        break;
      default:
        bgClass = "bg-slate-100 text-slate-700 border-slate-200";
        label = "Pending Analysis";
    }

    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${bgClass}">${label}</span>`;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Filter reports with valid numeric lat/lng in or near India/Bihar
    const validReports = reports.filter(
      (r) =>
        r.location &&
        typeof r.location.latitude === "number" &&
        !isNaN(r.location.latitude) &&
        typeof r.location.longitude === "number" &&
        !isNaN(r.location.longitude) &&
        (r.location.latitude !== 0 || r.location.longitude !== 0) &&
        r.location.latitude >= 5 &&
        r.location.latitude <= 40 &&
        r.location.longitude >= 65 &&
        r.location.longitude <= 100
    );

    // Default center (Bihar, India district)
    const defaultCenter: L.LatLngExpression = [25.4945, 86.0054];
    const defaultZoom = 11;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // If there are valid coordinates, fit bounds, else set default view
    if (validReports.length > 0) {
      const bounds = L.latLngBounds(
        validReports.map((r) => [r.location!.latitude, r.location!.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(defaultCenter, defaultZoom);
    }

    // Add Circle Markers for each report
    validReports.forEach((report) => {
      const lat = report.location!.latitude;
      const lng = report.location!.longitude;
      const color = getSeverityColor(report.analysis?.severity);

      const marker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      // Construct read-only popup HTML string
      const popupHtml = `
        <div class="w-64 font-sans text-slate-800 p-2" id="map-popup-${report.id}">
          <div class="relative h-28 w-full bg-slate-100 rounded-md overflow-hidden mb-2">
            <img 
              src="${report.imageUrl}" 
              alt="Evidence" 
              class="w-full h-full object-cover" 
              referrerpolicy="no-referrer"
            />
          </div>
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-1.5 flex-wrap">
              <span class="text-xs font-bold text-slate-900">${report.analysis?.category || "Civic Incident"}</span>
              ${getStatusBadgeHtml(report.status)}
            </div>
            
            <p class="text-[10px] text-slate-500 leading-relaxed line-clamp-3 my-1">
              ${report.description || "No public description provided."}
            </p>

            <div class="border-t border-slate-100 pt-1.5 flex flex-col gap-1 text-[9px] text-slate-400">
              <div class="flex justify-between">
                <span>Severity:</span>
                <span class="font-bold uppercase tracking-wider" style="color: ${color};">${report.analysis?.severity || "Unknown"}</span>
              </div>
              <div class="flex justify-between">
                <span>Department:</span>
                <span class="font-bold text-slate-600 truncate max-w-[130px]">${report.routing?.department || "General Civic Department"}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: "custom-leaflet-popup"
      });
    });

    // Setup ResizeObserver to adjust size dynamically
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    resizeObserver.observe(mapContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [reports]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-inner" id="citizen-map-viewport">
      <div ref={mapContainerRef} className="w-full h-full z-10" id="leaflet-map-element" />
      
      {/* Visual Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-md z-[1000] text-xs pointer-events-none select-none" id="map-legend">
        <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1 text-[9px] uppercase tracking-wider">Severity Legend</h4>
        <div className="space-y-1.5 font-semibold text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] border border-white inline-block shadow-xs"></span>
            <span className="text-slate-600">High / Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f97316] border border-white inline-block shadow-xs"></span>
            <span className="text-slate-600">Medium Severity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#22c55e] border border-white inline-block shadow-xs"></span>
            <span className="text-slate-600">Low Severity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#94a3b8] border border-white inline-block shadow-xs"></span>
            <span className="text-slate-600">Unknown / Missing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
