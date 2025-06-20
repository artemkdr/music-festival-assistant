import type { ReactElement } from 'react';

/**
 * Loading spinner component
 */
export function LoadingSpinner(): ReactElement {
    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-gray-600 animate-pulse-slow">Analyzing festival lineup and your preferences...</p>
        </div>
    );
}
