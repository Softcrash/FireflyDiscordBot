const DURATION_REGEX = /^(\d+)\s*([smhd])$/i;
const UNITS_TO_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };

// Discord-Limit für Timeouts: 28 Tage
const MAX_TIMEOUT_SECONDS = 28 * 86400;

/**
 * Parst Strings wie "30s", "5m", "2h", "7d" in Sekunden.
 * @param {string} input
 * @returns {{ seconds: number, ms: number, human: string } | null}
 *          null wenn das Format ungültig ist.
 */
function parseDuration(input) {
  if (typeof input !== 'string') return null;

  const match = DURATION_REGEX.exec(input.trim());
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (!UNITS_TO_SECONDS[unit] || value <= 0) return null;

  const seconds = value * UNITS_TO_SECONDS[unit];
  const human = formatHuman(seconds);

  return { seconds, ms: seconds * 1000, human };
}

/**
 * Erzeugt eine gut lesbare deutsche Repräsentation von Sekunden.
 */
function formatHuman(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days} Tag${days === 1 ? '' : 'e'}`);
  if (hours) parts.push(`${hours} Stunde${hours === 1 ? '' : 'n'}`);
  if (minutes) parts.push(`${minutes} Minute${minutes === 1 ? '' : 'n'}`);
  if (seconds) parts.push(`${seconds} Sekunde${seconds === 1 ? '' : 'n'}`);

  return parts.join(', ') || '0 Sekunden';
}

module.exports = { parseDuration, MAX_TIMEOUT_SECONDS };