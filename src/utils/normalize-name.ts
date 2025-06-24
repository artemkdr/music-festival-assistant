/**
 * Utility to normalize names:
 * - Remove diacritics,
 * - Remove special characters,
 * - Convert to lowercase,
 * - Trim whitespace
 * - Replace spaces with '-'
 * @param name Name to normalize
 * @returns Normalized name
 */
export const normalizeName = (name: string) => {
    return name
        .normalize('NFD') // Normalize to decompose diacritics
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
};
