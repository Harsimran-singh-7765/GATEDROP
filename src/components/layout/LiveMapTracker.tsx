import { Pin, Navigation } from "lucide-react";
import { convertGpsToPercent } from "@/lib/map-calibration";
import React, { useState } from "react";

interface LiveMapProps {
    runnerLocation: { lat: number, lon: number } | null;
    // pickupLocation?: string; // Hata diya
    // dropLocation?: string;   // Hata diya
}

export const LiveMapTracker: React.FC<LiveMapProps> = ({
    runnerLocation,
}) => {

    const [hoverCoords, setHoverCoords] = useState<{ x: number, y: number } | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        setHoverCoords({ x: Math.round(xPercent), y: Math.round(yPercent) });
    };

    const handleMouseLeave = () => {
        setHoverCoords(null);
    };

    const runnerPos = runnerLocation ? convertGpsToPercent(runnerLocation.lat, runnerLocation.lon) : null;

    console.log("[MapTracker Debug]", {
        Runner_GPS: runnerLocation,
        Runner_XY_Percent: runnerPos,
    });

    return (
        <div 
            className="w-full h-[500px] rounded-lg relative overflow-hidden border-2 border-primary bg-muted"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Map Image Background */}
            <img
                src="/mapjiit.jpg" 
                alt="College Map"
                className="w-full h-full object-cover"
            />

            {/* Mouse Hover Debugger Overlay */}
            {hoverCoords && (
                <div 
                    className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded-lg text-xs font-mono"
                    style={{ zIndex: 100 }}
                >
                    X: {hoverCoords.x}% <br />
                    Y: {hoverCoords.y}%
                </div>
            )}

            {/* Runner's Live Position (Blue Pin) */}
            {runnerPos && (
                <div
                    // --- YEH HAI FIX ---
                    // 'duration-1000' (1s) ko 'duration-300' (0.3s) kar diya
                    className="absolute transition-all duration-300 ease-linear"
                    // --- END FIX ---
                    style={{
                        left: `${runnerPos.x}%`,
                        top: `${runnerPos.y}%`,
                        transform: "translate(-50%, -100%)" 
                    }}
                    title="Runner Location"
                >
                    <Pin className="h-8 w-8 text-blue-500" fill="currentColor" />
                </div>
            )}
        </div>
    );
};