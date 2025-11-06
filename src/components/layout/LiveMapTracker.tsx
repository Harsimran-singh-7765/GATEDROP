import { Pin, Navigation } from "lucide-react";
import { convertGpsToPercent, LOCATION_COORDINATES } from "@/lib/map-calibration";
import React from "react";

interface LiveMapProps {
    runnerLocation: { lat: number, lon: number } | null;
    pickupLocation: string; // "Gate 2"
    dropLocation: string;   // "H4"
}

export const LiveMapTracker: React.FC<LiveMapProps> = ({
    runnerLocation,
    pickupLocation,
    dropLocation
}) => {

    // Dictionary se coordinates nikalo
    const pickupCoords = LOCATION_COORDINATES[pickupLocation] || LOCATION_COORDINATES["default"];
    const dropCoords = LOCATION_COORDINATES[dropLocation] || LOCATION_COORDINATES["default"];

    // Coordinates ko X/Y percentage mein convert karo
    const runnerPos = runnerLocation ? convertGpsToPercent(runnerLocation.lat, runnerLocation.lon) : null;
    const pickupPos = convertGpsToPercent(pickupCoords.lat, pickupCoords.lon);
    const dropPos = convertGpsToPercent(dropCoords.lat, dropCoords.lon);

    return (
        <div className="w-full h-80 rounded-lg relative overflow-hidden border-2 border-primary bg-muted">
            {/* Map Image Background */}
            <img
                src="/college-map.png" // Yeh image public/college-map.png mein honi chahiye
                alt="College Map"
                className="w-full h-full object-cover"
            />

            {/* Pickup Point (Green) */}
            <div
                className="absolute"
                style={{ left: `${pickupPos.x}%`, top: `${pickupPos.y}%`, transform: "translate(-50%, -100%)" }}
                title={pickupLocation}
            >
                <Pin className="h-8 w-8 text-green-500" fill="currentColor" />
            </div>

            {/* Drop Point (Pink) */}
            <div
                className="absolute"
                style={{ left: `${dropPos.x}%`, top: `${dropPos.y}%`, transform: "translate(-50%, -100%)" }}
                title={dropLocation}
            >
                <Pin className="h-8 w-8 text-pink-500" fill="currentColor" />
            </div>

            {/* Runner's Live Position (Blue) */}
            {runnerPos && (
                <div
                    className="absolute transition-all duration-1000 ease-linear"
                    style={{
                        left: `${runnerPos.x}%`,
                        top: `${runnerPos.y}%`,
                        transform: "translate(-50%, -50%)"
                    }}
                    title="Runner Location"
                >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <Navigation className="h-4 w-4 text-white" fill="white" />
                    </div>
                </div>
            )}
        </div>
    );
};