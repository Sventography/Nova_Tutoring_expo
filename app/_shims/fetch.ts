/**
 * No-op shim for web/Expo. Node server uses its own runtime fetch.
 * Keeping this file prevents bundling errors when shared code imports "@/_shims/fetch".
 */
export {};
