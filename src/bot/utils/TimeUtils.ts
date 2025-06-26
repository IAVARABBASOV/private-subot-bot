/**
 * Utility functions for time formatting and manipulation
 */

/**
 * Format time in HH:mm:ss
 * @param ms Time in milliseconds
 * @returns Formatted time string
 */
export function getTimeInStringFormat(ms: number): string {
    // Ensure two-digit formatting
    const format = (num: number) => num.toString().padStart(2, '0');

    const date = new Date(ms);

    return `${format(date.getHours())}:${format(date.getMinutes())}:${format(date.getSeconds())}`;
} 