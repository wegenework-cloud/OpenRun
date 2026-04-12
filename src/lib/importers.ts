import type { Activity, ImportSource } from "../types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseImportSource(value: string): ImportSource {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "pdf":
    case "apple-watch":
    case "strava":
    case "garmin":
    case "manual":
      return normalized;
    case "apple health":
    case "apple_watch":
    case "watch":
      return "apple-watch";
    case "device":
    case "csv":
    case "fit":
    case "gpx":
    case "tcx":
      return "garmin";
    default:
      return "manual";
  }
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseActivitiesCsv(csvText: string): Activity[] {
  const rows = csvText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return [];
  }

  const headers = splitCsvLine(rows[0]).map(normalizeHeader);

  return rows.slice(1).flatMap((row, rowIndex) => {
    const values = splitCsvLine(row);
    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );

    const title = record.title || record.name || record.workout || record.activity;
    const type = record.type || record.activity_type || "Workout";
    const date = record.date || record.workout_date || "";

    if (!title && !date) {
      return [];
    }

    return [
      {
        id: `import-${Date.now()}-${rowIndex}`,
        title: title || `${type} entry`,
        source: parseImportSource(record.source || record.import_source || ""),
        date,
        type,
        distanceKm: parseNumber(
          record.distance_km || record.distance || record.kilometers || "",
        ),
        durationMinutes: parseNumber(
          record.duration_minutes || record.duration || record.minutes || "",
        ),
        effort: record.effort || record.intensity || "Unspecified",
        note: record.note || record.notes || record.comment || "",
      },
    ];
  });
}
