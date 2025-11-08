// --- YEH HAI AAPKA NAYA, ACCURATE CALIBRATION ---
// Yeh values aapke Google Earth Pro screenshots se convert ki gayi hain.
const MAP_BOUNDS = {
    // Aapke 'mapjiit.jpg' ka sabse UPAR ka point
    topLat: 28.631217, 

    // Aapke 'mapjiit.jpg' ka sabse LEFT ka point
    leftLon: 77.370936,

    // Aapke 'mapjiit.jpg' ka sabse NEECHE ka point
    bottomLat: 28.629028, 

    // Aapke 'mapjiit.jpg' ka sabse RIGHT ka point
    rightLon: 77.374256
};
// ------------------------------------------

/**
 * GPS (Lat, Lon) ko image par (X, Y) percentage mein convert karta hai.
 * Yeh function ab aapke naye bounds ke saath sahi kaam karega.
 */
export const convertGpsToPercent = (lat: number, lon: number) => {
    const { topLat, leftLon, bottomLat, rightLon } = MAP_BOUNDS;
    const latRange = topLat - bottomLat;
    const lonRange = rightLon - leftLon;

    // Division by zero se bachne ke liye
    if (latRange <= 0 || lonRange <= 0) {
        console.error("MAP_BOUNDS calibration error: Range is zero.");
        return { x: 0, y: 0 };
    }

    const yPercent = ((topLat - lat) / latRange) * 100;
    const xPercent = ((lon - leftLon) / lonRange) * 100;
    
    // Values ko 0-100 ke beech rakhein
    const y = Math.max(0, Math.min(100, yPercent));
    const x = Math.max(0, Math.min(100, xPercent));
    
    return { x, y };
};


// --- !! ATTENTION !! ---
// Aapka 'super off' pink pin ka issue yahaan hai.
// Aapke puraane LOCATION_COORDINATES ab is naye, calibrated map ke LIYE GALAT HAIN.
// Aapko "Gate 1", "H4" etc. ke naye Lat/Lon dhoondne honge jo
// is map area ke andar aate hain.
//
// EXAMPLE: Google Maps par jaayein, "H4" par right-click karein,
// aur naye decimal coordinates (jaise 28.6295, 77.3728) ko yahaan update karein.
// -----------------------

export const LOCATION_COORDINATES: Record<string, { lat: number, lon: number }> = {
    // --- Yahaan nayi values daalein ---
    "Gate 1": { lat: 28.6309, lon: 77.3712 }, // Example: Nayi value
    "H4": { lat: 28.6300, lon: 77.3715 },     // Example: Nayi value
    "Library": { lat: 28.6305, lon: 77.3716 }, // Example: Nayi value
    "Cafeteria": { lat: 28.6303, lon: 77.3717 }, // Example: Nayi value
    
    // Purani values (ab galat hain):
    // "Gate 2": { lat: 28.6280, lon: 77.3714 },
    // "H3": { lat: 28.6282, lon: 77.3722 },

    "default": { lat: 28.6308, lon: 77.3713 } // Default ko bhi update karein
};
// -------------------------------------------