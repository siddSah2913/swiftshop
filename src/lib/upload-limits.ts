// Upload size caps, kept in their own module so CLIENT components can import
// them without pulling in the Node-only helpers (fs/crypto/path) that live in
// files.ts. A browser bundle must never trace node: builtins.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_SUBMISSION = 6;