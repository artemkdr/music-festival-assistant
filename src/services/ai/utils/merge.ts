export function mergeResults<T>(results: Partial<T>[]): T {
    function deepMerge(a: any, b: any): any {
        if (Array.isArray(a) && Array.isArray(b)) {
            // Deduplicate by stringified value
            const seen = new Set<string>();
            const mergedArr = [...a, ...b].filter(item => {
                const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            return mergedArr;
        } else if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
            const mergedObj: any = { ...a };
            for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
                if (a[key] !== undefined && b[key] !== undefined) {
                    mergedObj[key] = deepMerge(a[key], b[key]);
                } else {
                    mergedObj[key] = a[key] !== undefined ? a[key] : b[key];
                }
            }
            return mergedObj;
        } else {
            return a !== undefined ? a : b;
        }
    }
    let merged: any = {};
    for (const result of results) {
        merged = deepMerge(merged, result);
    }
    return merged as T;
}