/**
 * Formats a date as a string in the format "YYYY-MM-DD".
 * @param date The date to format.
 * @returns The formatted date string or undefined if the date is invalid.
 */
export const formatDate = (date: Date): string | undefined => {
    if (!isValidDate(date)) {
        return undefined;
    }
    return date.toISOString().split('T')[0];
};

/**
 * Checks if a date is valid.
 * @param date The date to check.
 * @returns True if the date is valid, false otherwise.
 */
export const isValidDate = (date: Date): boolean => {
    return !isNaN(date.getTime());
};

/**
 * Checks if a date string is valid.
 * @param dateString The date string to check.
 * @returns True if the date string is valid, false otherwise.
 */
export const isValidDateString = (dateString: string): boolean => {
    const date = new Date(dateString);
    return isValidDate(date);
};

/**
 * Formats a date as a date-time string in dd/mm/yyyy HH:mm format.
 * @param date The date to format.
 * @returns The formatted date-time string or undefined if the date is invalid.
 */
export const formatDateTime = (date: Date): string | undefined => {
    if (!isValidDate(date)) {
        return undefined;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} ${formatTime(date)}`;
};

/**
 * Formats a date as a time string in the format "HH:mm:ss".
 * @param date The date to format.
 * @returns The formatted time string or undefined if the date is invalid.
 */
export const formatTime = (date: Date): string | undefined => {
    if (!isValidDate(date)) {
        return undefined;
    }
    return date.toTimeString().split(' ')[0];
};

/**
 * Parses a date string and returns a Date object.
 * If the date string is invalid, it returns the default value if provided.
 * @param dateString The date string to parse.
 * @param defaultValue The default value to return if the date string is invalid.
 * @returns The parsed Date object or the default value.
 */
export const parseDate = (dateString: string, defaultValue?: Date): Date => {
    const date = new Date(dateString);
    if (!isValidDate(date)) {
        if (defaultValue) {
            return defaultValue;
        }
        throw new Error('Invalid date string');
    }
    return date;
};

/**
 * Builds a Date object from a date and time string.
 * If the time string is empty, it defaults to midnight (00:00:00).
 * @param date - The date to use.
 * @param time - The time string in the format "HH:mm:ss". If empty, it defaults to "00:00:00".
 * @returns A Date object with the specified date and time.
 */
export const buildDateTime = (date: Date, time: string): Date => {
    const hms: number[] | undefined = time
        .match(/(\d){1,2}(:(\d){1,2})?(:(\d){1,2})?/)?.[0]
        ?.split(':')
        .map(Number);
    const newDate = new Date(date);
    newDate.setHours(hms?.[0] || 0, hms?.[1] || 0, hms?.[2] || 0, 0);
    return newDate;
};

/**
 * Builds a date-time range from a start date and start/end times.
 * If the end time is earlier than the start time, it will pass it to the next day.
 *
 * @param startDate
 * @param startTime
 * @param endTime
 * @returns
 */
export const buildDateTimeRange = (startDate: Date, startTime: string, endTime: string): [Date, Date] => {
    const start = buildDateTime(startDate, startTime || '20:00');
    const end = buildDateTime(startDate, endTime || `${start.getHours() + 1}:00`);
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }
    return [start, end];
};
