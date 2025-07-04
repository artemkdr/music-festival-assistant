/**
 * Utility functions for generating ICS calendar files
 */

import { CalendarEvent } from '@/lib/schemas';
import { isValidDate } from '@/lib/utils/date-util';

/**
 * Adds an event to Google Calendar *
 * @param event - Event details including date, time, festival, artist, and stage
 * @returns URL to add the event to Google Calendar
 */
export const addToGoogleCalendar = async (event: { date: string; time: string; festival: string; artist: string; stage: string }) => {
    const { date, time, festival, artist, stage } = event;
    // check if time is like "22:00 - 23:00" and extract the first part
    let parsedTime = time;
    if (time.includes('-')) {
        const timeParts = time.split('-');
        if (timeParts.length > 1 && timeParts && timeParts[0]) {
            parsedTime = timeParts[0].trim(); // take the first part before the dash
        }
    }
    const actDateTime = new Date(`${date}T${parsedTime}`);
    let formattedStartDate = '';
    let formattedEndDate = '';
    if (isValidDate(actDateTime)) {
        // if actDateTime hours are less than 5:00, it's likely the next day actually,
        // because most festivals start in the afternoon or evening and they don't put the next day date in the time field
        if (actDateTime.getHours() < 5) {
            actDateTime.setDate(actDateTime.getDate() + 1);
        }
        // Format as YYYYMMDDTHHMMSSZ
        formattedStartDate = actDateTime.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
        // add 1 hour for end time
        const endDate = new Date(actDateTime);
        endDate.setHours(endDate.getHours() + 1);
        formattedEndDate = endDate.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    }
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(artist)} at ${encodeURIComponent(festival)}&dates=${formattedStartDate}/${formattedEndDate}&details=${encodeURIComponent(stage)}`;
    window.open(calendarUrl, '_blank');
};

/**
 * Formats a date to ICS format (YYYYMMDDTHHMMSSZ)
 * @param date - The date to format
 * @returns Formatted date string for ICS
 */
const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
};

/**
 * Escapes special characters in ICS text fields
 * @param text - Text to escape
 * @returns Escaped text safe for ICS format
 */
const escapeICSText = (text: string): string => {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').replace(/\r/g, '');
};

/**
 * Generates ICS calendar content for an event
 * @param event - Event details
 * @returns ICS calendar content as string
 */
export const generateICS = (event: CalendarEvent): string => {
    const now = new Date();
    const timestamp = formatICSDate(now);

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Music Festival Assistant//Event//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${timestamp}-${Math.random().toString(36).substr(2, 9)}@music-festival-assistant.com`,
        `DTSTAMP:${timestamp}`,
        `DTSTART:${formatICSDate(new Date(event.startDate))}`,
        `DTEND:${formatICSDate(new Date(event.endDate))}`,
        `SUMMARY:${escapeICSText(event.title)}`,
        ...(event.description ? [`DESCRIPTION:${escapeICSText(event.description)}`] : []),
        ...(event.location ? [`LOCATION:${escapeICSText(event.location)}`] : []),
        ...(event.url ? [`URL:${event.url}`] : []),
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');

    return icsContent;
};

/**
 * Downloads an ICS file for the given event
 * @param event - Event details
 * @param filename - Optional filename (without .ics extension)
 */
export const downloadICSFile = (event: CalendarEvent, filename?: string): void => {
    const icsContent = generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename || 'event'}.ics`;

    // Temporarily add to DOM to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    URL.revokeObjectURL(link.href);
};

/**
 * Creates a calendar event object for a festival performance
 * @param params - Performance details
 * @returns CalendarEvent object
 */
export const createFestivalEvent = (params: {
    artistName: string;
    festivalName: string;
    date: string;
    time: string;
    stage?: string;
    festivalLocation?: string;
    festivalWebsite?: string;
}): CalendarEvent => {
    const { artistName, festivalName, date, time, stage, festivalLocation, festivalWebsite } = params;

    const startDate = new Date(`${date}T${time}`);

    if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid date or time format: ${date} ${time}`);
    }

    // If the time is early morning (before 5 AM), it's likely the next day
    if (startDate.getHours() < 5) {
        startDate.setDate(startDate.getDate() + 1);
    }

    // Default performance duration is 1 hour
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const title = `${artistName} @ ${festivalName}`;
    const description = `${artistName} @ ${festivalName}${stage ? ` ${stage}` : ''}`;
    const location = stage ? `${stage}, ${festivalLocation || festivalName}` : festivalLocation || festivalName;

    const event: CalendarEvent = {
        title,
        description,
        location,
        startDate,
        endDate,
    };

    if (festivalWebsite) {
        event.url = festivalWebsite;
    }

    return event;
};

export const downloadICSCalendar = (festival: { name: string; location?: string | undefined; website?: string | undefined }, event: { date: string; time: string; artist: string; stage?: string }) => {
    const { date, time, artist, stage } = event;

    let parsedTime = time;
    if (time.includes('-')) {
        const timeParts = time.split('-');
        if (timeParts.length > 1 && timeParts && timeParts[0]) {
            parsedTime = timeParts[0].trim(); // take the first part before the dash
        }
    }

    const eventParams: Parameters<typeof createFestivalEvent>[0] = {
        artistName: artist,
        festivalName: festival.name,
        date,
        time: parsedTime,
    };

    if (stage) {
        eventParams.stage = stage;
    }

    if (festival.location) {
        eventParams.festivalLocation = festival.location;
    }

    if (festival.website) {
        eventParams.festivalWebsite = festival.website;
    }

    const calendarEvent = createFestivalEvent(eventParams);

    const filename = `${artist.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${festival.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    downloadICSFile(calendarEvent, filename);
};
