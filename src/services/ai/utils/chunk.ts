/**
 * Chunks a text into smaller parts with a specified maximum character length and overlap.
 * 
 * @param text 
 * @param maxChunkChars 
 * @param overlap 
 * @returns 
 */

export function chunkText(text: string, maxChunkChars: number, overlap: number): string[] {
    if (text.length <= maxChunkChars) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + maxChunkChars, text.length);
        chunks.push(text.slice(start, end));
        if (end === text.length) break;
        start = end - overlap;
    }
    return chunks;
}