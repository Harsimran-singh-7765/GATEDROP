// --- YAHI HAI AAPKA MAIN CALIBRATION ---
// AAPKO YEH 4 VALUES GOOGLE MAPS SE DHOOND KAR REPLACE KARNI HAIN

const MAP_BOUNDS = {
    // Aapke 'college-map.png' ka TOP-LEFT kona
    topLat: 28.6293,     // Example: JIIT Top-Left Latitude
    leftLon: 77.3711,    // Example: JIIT Top-Left Longitude

    // Aapke 'college-map.png' ka BOTTOM-RIGHT kona
    bottomLat: 28.6275,  // Example: JIIT Bottom-Right Latitude
    rightLon: 77.3738   // Example: JIIT Bottom-Right Longitude
};
// ------------------------------------------

/**
 * GPS (Lat, Lon) ko image par (X, Y) percentage mein convert karta hai.
 */
export const convertGpsToPercent = (lat: number, lon: number) => {
    const { topLat, leftLon, bottomLat, rightLon } = MAP_BOUNDS;

    // Kitna bada area hai
    const latRange = topLat - bottomLat;
    const lonRange = rightLon - leftLon;

    // Position calculate karo (0 se 100 tak)
    const yPercent = ((topLat - lat) / latRange) * 100;
    const xPercent = ((lon - leftLon) / lonRange) * 100;

    // Ensure karein ki value 0-100 ke beech rahe
    const y = Math.max(0, Math.min(100, yPercent));
    const x = Math.max(0, Math.min(100, xPercent));

    return { x, y };
};

// --- YEH AAPKA LOCATION DICTIONARY HAI ---
// Har important jagah ka (Lat, Lon) yahaan daalein
// (Yeh values bhi Google Maps se milengi)

export const LOCATION_COORDINATES: Record<string, { lat: number, lon: number }> = {
    "Gate 1": { lat: 28.6290, lon: 77.3713 },
    "Gate 2": { lat: 28.6280, lon: 77.3714 },
    "H1": { lat: 28.6288, lon: 77.3720 },
    "H2": { lat: 28.6285, lon: 77.3721 },
    "H3": { lat: 28.6282, lon: 77.3722 },
    "H4": { lat: 28.6279, lon: 77.3723 },
    "Library": { lat: 28.6287, lon: 77.3730 },
    "Cafeteria": { lat: 28.6284, lon: 77.3732 },
    // ...baaki saari locations add karein
    // Default value agar location na mile
    "default": { lat: 28.6285, lon: 77.3725 }
};
// -------------------------------------------