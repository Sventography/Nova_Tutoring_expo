let lastCheckinISO: string | null = null;
export function recordCheckIn(date: Date = new Date()) { lastCheckinISO = date.toISOString(); return lastCheckinISO; }
export function getLastCheckInISO(): string | null { return lastCheckinISO; }
export default { recordCheckIn, getLastCheckInISO };
