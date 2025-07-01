import { useState, useEffect, type ReactElement } from 'react';

/**
 * Progressive loading messages shown at 10-second intervals
 */
const LOADING_MESSAGES = [
    "Analyzing festival lineup and your preferences...",
    "It could take some time...",
    "Processing a lot of artists and their musical characteristics...",
    "Cross-referencing your taste with festival lineups...",
    "Almost there! Finalizing your personalized recommendations...",    
];

/**
 * Loading spinner component with progressive messages
 * Shows different messages every 10 seconds to keep users engaged
 */
export function RecommendationsLoadingSpinner(): ReactElement {
    const [messageIndex, setMessageIndex] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        
        const interval = setInterval(() => {
            const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
            setElapsedTime(currentElapsed);
            
            // Show next message every 10 seconds, but don't exceed array length
            const newIndex = Math.min(Math.floor(currentElapsed / 10), LOADING_MESSAGES.length - 1);
            setMessageIndex(newIndex);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center space-y-4 min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            
            <div className="text-center space-y-2 max-w-md">
                {/* Current message with fade-in animation */}
                <p 
                    key={messageIndex}
                    className="text-gray-700 animate-pulse-slow text-lg font-medium transition-opacity duration-500"
                >
                    {LOADING_MESSAGES[messageIndex]}
                </p>
                
                {/* Show elapsed time after 5 seconds */}
                {elapsedTime >= 5 && (
                    <p className="text-gray-500 text-sm">
                        Elapsed time: {elapsedTime}s
                    </p>
                )}
                
                {/* Show patience message after 30 seconds */}
                {elapsedTime >= 30 && (
                    <p className="text-orange-600 text-sm font-medium animate-pulse">
                        Thank you for your patience! We're working hard to find the perfect festivals for you.
                    </p>
                )}
            </div>
        </div>
    );
}
