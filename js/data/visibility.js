// visibility.js — Geographic constellation visibility calculation
// Determines which constellations are above the horizon for a given
// latitude, longitude, and local time.
//
// Astronomical model: simplified equatorial → horizontal coordinate transform
//   sin(alt) = sin(dec) · sin(lat) + cos(dec) · cos(lat) · cos(HA)
//   HA (Hour Angle) = LST − RA
// All angles in degrees internally, converted to radians for Math trig.

// ── Constellation center coordinates (RA hours, Dec degrees) ─────────────
// These are approximate center RA/Dec for each of the 30 game constellations.
// Source: IAU constellation boundaries (approximate centroids).
const CONSTELLATION_COORDS = [
  { nameEn: 'Orion',          ra: 5.50,  dec:  5.0  },
  { nameEn: 'Ursa Major',     ra: 11.00, dec: 55.0  },
  { nameEn: 'Scorpius',       ra: 16.90, dec: -30.0 },
  { nameEn: 'Leo',            ra: 10.67, dec: 15.0  },
  { nameEn: 'Cassiopeia',     ra: 1.00,  dec: 62.0  },
  { nameEn: 'Cygnus',         ra: 20.50, dec: 46.0  },
  { nameEn: 'Aquarius',       ra: 22.30, dec: -12.0 },
  { nameEn: 'Taurus',         ra: 4.70,  dec: 16.0  },
  { nameEn: 'Gemini',         ra: 7.00,  dec: 23.0  },
  { nameEn: 'Cancer',         ra: 8.60,  dec: 22.0  },
  { nameEn: 'Virgo',          ra: 13.40, dec:  0.0  },
  { nameEn: 'Libra',          ra: 15.20, dec: -15.0 },
  { nameEn: 'Sagittarius',    ra: 19.00, dec: -28.0 },
  { nameEn: 'Capricornus',    ra: 21.00, dec: -20.0 },
  { nameEn: 'Pisces',         ra: 0.48,  dec: 13.0  },
  { nameEn: 'Aries',          ra: 2.50,  dec: 21.0  },
  { nameEn: 'Perseus',        ra: 3.50,  dec: 43.0  },
  { nameEn: 'Auriga',         ra: 6.00,  dec: 43.0  },
  { nameEn: 'Boötes',         ra: 14.70, dec: 31.0  },
  { nameEn: 'Corona Borealis', ra: 15.80, dec: 33.0 },
  { nameEn: 'Hercules',       ra: 17.40, dec: 27.0  },
  { nameEn: 'Lyra',           ra: 18.85, dec: 37.0  },
  { nameEn: 'Aquila',         ra: 19.67, dec:  3.0  },
  { nameEn: 'Pegasus',        ra: 22.70, dec: 19.0  },
  { nameEn: 'Andromeda',      ra: 0.80,  dec: 40.0  },
  { nameEn: 'Ursa Minor',     ra: 15.00, dec: 77.0  },
  { nameEn: 'Draco',          ra: 17.00, dec: 65.0  },
  { nameEn: 'Centaurus',      ra: 13.00, dec: -47.0 },
  { nameEn: 'Crux',           ra: 12.45, dec: -60.0 },
  { nameEn: 'Hydra',          ra: 10.00, dec: -20.0 },
];

// ── Default location: Lake Tekapo, New Zealand ────────────────
export const DEFAULT_LAT = -44.0;
export const DEFAULT_LON = 170.5;

// ── Degrees ↔ Radians ─────────────────────────────────────────
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// ── Julian Date from JS Date ──────────────────────────────────
function _julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// ── Greenwich Mean Sidereal Time (degrees) ───────────────────
function _gmst(date) {
  const jd = _julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
           + 0.000387933 * T * T - T * T * T / 38710000.0;
  return ((gmst % 360) + 360) % 360; // normalize 0..360
}

// ── Local Sidereal Time (degrees) ─────────────────────────────
function _lst(date, lonDeg) {
  return ((_gmst(date) + lonDeg) % 360 + 360) % 360;
}

// ── Altitude of a star (degrees) ──────────────────────────────
// ra: hours, dec: degrees, lat: degrees, lst: degrees
function _altitude(raHours, decDeg, latDeg, lstDeg) {
  const ha  = (lstDeg - raHours * 15 + 360) % 360; // hour angle in degrees
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;
  const h   = ha * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(h);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * R2D;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Returns an array of visible constellation objects (from CONSTELLATION_COORDS),
 * each augmented with { altitude, azimuth } in degrees.
 * Sorted by altitude descending. Filtered to altitude > minAlt.
 *
 * @param {number} latDeg  - Observer latitude (degrees, south = negative)
 * @param {number} lonDeg  - Observer longitude (degrees, west = negative)
 * @param {Date}   [date]  - Observation time (defaults to now)
 * @param {number} [minAlt=15] - Minimum altitude to include
 * @param {number} [maxCount=6] - Maximum constellations to return
 * @returns {Array<{nameEn, ra, dec, altitude}>}
 */
export function getVisibleConstellations(
  latDeg = DEFAULT_LAT,
  lonDeg = DEFAULT_LON,
  date = new Date(),
  minAlt = 15,
  maxCount = 6,
) {
  const lst = _lst(date, lonDeg);

  const results = CONSTELLATION_COORDS.map(c => ({
    ...c,
    altitude: _altitude(c.ra, c.dec, latDeg, lst),
  })).filter(c => c.altitude > minAlt)
     .sort((a, b) => b.altitude - a.altitude);

  let visible = results.slice(0, maxCount);

  // Fallback: if fewer than 4 visible, supplement with highest-altitude constellations
  // regardless of minAlt (season fallback)
  if (visible.length < 4) {
    const all = CONSTELLATION_COORDS.map(c => ({
      ...c,
      altitude: _altitude(c.ra, c.dec, latDeg, lst),
    })).sort((a, b) => b.altitude - a.altitude);
    visible = all.slice(0, 4);
  }

  return visible;
}

/**
 * Requests the browser Geolocation API.
 * Resolves with { lat, lon } on success, or default coords on denial/error.
 * Never rejects — always resolves.
 *
 * @returns {Promise<{lat: number, lon: number, isDefault: boolean}>}
 */
export function requestLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, isDefault: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        isDefault: false,
      }),
      () => resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, isDefault: true }),
      { timeout: 6000, maximumAge: 300000 }, // 5-min cache OK for star visibility
    );
  });
}
