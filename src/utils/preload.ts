// Keep an async util if you need it:
export async function preload() {
  // no-op for now
}

// Make sure the DEFAULT export is NOT async, so expo-router won't error if it scans this file.
export default function preloadDefault() {
  // non-async, no-op
  return;
}
