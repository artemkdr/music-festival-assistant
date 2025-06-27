export function mergeResults<T>(results: Partial<T>[]): T {
    // Type guards
    function isObject(val: unknown): val is Record<string, unknown> {
        return typeof val === 'object' && val !== null && !Array.isArray(val);
    }
    function isArray(val: unknown): val is unknown[] {
        return Array.isArray(val);
    }

    function deepMerge<A>(a: A, b: A): A {
        if (isArray(a) && isArray(b)) {
            // Deduplicate by stringified value
            const seen = new Set<string>();
            const mergedArr = [...a, ...b].filter(item => {
                const key = isObject(item) ? JSON.stringify(item) : String(item);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            return mergedArr as A;
        } else if (isObject(a) && isObject(b)) {
            const mergedObj: Record<string, unknown> = { ...a };
            for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
                if (a[key] !== undefined && b[key] !== undefined) {
                    mergedObj[key] = deepMerge(a[key], b[key]);
                } else {
                    mergedObj[key] = a[key] !== undefined ? a[key] : b[key];
                }
            }
            return mergedObj as A;
        } else {
            return a !== undefined ? a : b;
        }
    }
    let merged: Partial<T> = {};
    for (const result of results) {
        merged = deepMerge(merged, result);
    }
    return merged as T;
}
