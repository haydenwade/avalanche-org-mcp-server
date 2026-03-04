const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utc.getTime())) return false;

  const validYear = utc.getUTCFullYear() === year;
  const validMonth = utc.getUTCMonth() === month - 1;
  const validDay = utc.getUTCDate() === day;
  return validYear && validMonth && validDay;
}

export function assertValidDay(value: string): string {
  if (!isValidDay(value)) {
    throw new Error(
      `Invalid day "${value}". Expected YYYY-MM-DD (example: 2026-02-24).`,
    );
  }
  return value;
}

export function assertLatitude(value: number): number {
  if (!isFiniteNumber(value) || value < -90 || value > 90) {
    throw new Error(`Invalid lat "${value}". Expected a number between -90 and 90.`);
  }
  return value;
}

export function assertLongitude(value: number): number {
  if (!isFiniteNumber(value) || value < -180 || value > 180) {
    throw new Error(
      `Invalid lon "${value}". Expected a number between -180 and 180.`,
    );
  }
  return value;
}

export function assertLatLon(lat: number, lon: number) {
  return {
    lat: assertLatitude(lat),
    lon: assertLongitude(lon),
  };
}

export function normalizeOptionalCenterId(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("centerId must be a non-empty string when provided.");
  }
  return trimmed;
}
