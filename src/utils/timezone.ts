import { env } from "../config/env";

/**
 * Formats a date to a locale string using the configured timezone from environment variables.
 * This ensures all dates are formatted consistently regardless of server timezone.
 * 
 * @param date - The date to format (Date object or date string)
 * @param options - Intl.DateTimeFormatOptions for customizing the format
 * @returns Formatted date string in the configured timezone
 */
export function formatDateInTimezone(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  
  // Default options for readable date format
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    ...options,
  };

  // Try to use the timezone directly if it's an IANA timezone name
  // Otherwise, convert offset to IANA timezone or use manual adjustment
  const timezone = convertTimezoneOffsetToIANA(env.TIMEZONE);
  
  try {
    // Use Intl.DateTimeFormat with the timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      ...defaultOptions,
      timeZone: timezone,
    });
    return formatter.format(dateObj);
  } catch (error) {
    // Fallback: if timezone conversion fails, use manual offset adjustment
    console.warn(`Failed to use timezone ${timezone}, falling back to offset adjustment:`, error);
    return formatDateWithOffset(dateObj, env.TIMEZONE, defaultOptions);
  }
}

/**
 * Converts a timezone offset string (e.g., "+05:30") to an IANA timezone name.
 * Common offsets are mapped to their corresponding IANA timezones.
 */
function convertTimezoneOffsetToIANA(offset: string): string {
  // If it's already an IANA timezone name (contains '/'), return as is
  if (offset.includes("/")) {
    return offset;
  }

  // Map common offsets to IANA timezone names
  const offsetMap: Record<string, string> = {
    "+05:30": "Asia/Colombo", // India Standard Time / Sri Lanka
    "+05:00": "Asia/Karachi", // Pakistan Standard Time
    "+00:00": "UTC",
    "+01:00": "Europe/Paris", // Central European Time
    "+02:00": "Europe/Athens", // Eastern European Time
    "+03:00": "Europe/Moscow", // Moscow Time
    "+04:00": "Asia/Dubai", // Gulf Standard Time
    "+06:00": "Asia/Dhaka", // Bangladesh Standard Time
    "+07:00": "Asia/Bangkok", // Indochina Time
    "+08:00": "Asia/Singapore", // Singapore Time
    "+09:00": "Asia/Tokyo", // Japan Standard Time
    "+10:00": "Australia/Sydney", // Australian Eastern Time
    "-05:00": "America/New_York", // Eastern Time
    "-06:00": "America/Chicago", // Central Time
    "-07:00": "America/Denver", // Mountain Time
    "-08:00": "America/Los_Angeles", // Pacific Time
  };

  // Normalize offset format (handle +5:30, +05:30, etc.)
  const normalizedOffset = offset.startsWith("+") || offset.startsWith("-") 
    ? offset 
    : `+${offset}`;
  
  // Ensure format is +HH:MM or -HH:MM
  const match = normalizedOffset.match(/^([+-])(\d{1,2}):?(\d{2})$/);
  if (match) {
    const sign = match[1];
    const hours = match[2].padStart(2, "0");
    const minutes = match[3] || "00";
    const formattedOffset = `${sign}${hours}:${minutes}`;
    
    if (offsetMap[formattedOffset]) {
      return offsetMap[formattedOffset];
    }
  }

  // If no mapping found, try to use UTC with offset adjustment
  // Return a special marker that will trigger fallback
  return offset;
}

/**
 * Formats a date by manually adjusting for the timezone offset.
 * This is a fallback when IANA timezone conversion is not possible.
 * 
 * The approach: manually calculate the time components in the target timezone
 * and format them directly.
 */
function formatDateWithOffset(
  date: Date,
  offset: string,
  options: Intl.DateTimeFormatOptions
): string {
  // Parse offset (e.g., "+05:30" or "-08:00")
  const match = offset.match(/^([+-])(\d{1,2}):?(\d{2})$/);
  if (!match) {
    // Invalid offset, fall back to UTC
    console.warn(`Invalid timezone offset format: ${offset}, using UTC`);
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] || "0", 10);
  const offsetMinutes = sign * (hours * 60 + minutes);

  // Get UTC time components
  const utcTime = date.getTime();
  // Add offset to get local time in target timezone (offset is in minutes)
  const localTime = utcTime + (offsetMinutes * 60 * 1000);
  const localDate = new Date(localTime);
  
  // Extract components from the adjusted date
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth();
  const day = localDate.getUTCDate();
  const hour = localDate.getUTCHours();
  const minute = localDate.getUTCMinutes();
  const second = localDate.getUTCSeconds();
  
  // Create a date string in ISO format that represents the local time
  // Then format it using UTC (since we've already adjusted)
  const adjustedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  
  // Format with UTC timezone (since we've already converted to the target timezone)
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(adjustedDate);
}

/**
 * Gets the current date/time as a Date object.
 * This returns the current UTC time, which is what should be used for database operations.
 * The timezone configuration in Sequelize will handle conversion when storing/retrieving.
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Creates a date by adding minutes to the current time.
 * This ensures date arithmetic works correctly regardless of server timezone.
 * 
 * @param minutes - Number of minutes to add (can be negative)
 * @returns Date object representing current time + minutes
 */
export function addMinutesToNow(minutes: number): Date {
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

/**
 * Creates a date by adding hours to the current time.
 * 
 * @param hours - Number of hours to add (can be negative)
 * @returns Date object representing current time + hours
 */
export function addHoursToNow(hours: number): Date {
  return addMinutesToNow(hours * 60);
}

/**
 * Creates a date by adding days to the current time.
 * 
 * @param days - Number of days to add (can be negative)
 * @returns Date object representing current time + days
 */
export function addDaysToNow(days: number): Date {
  return addMinutesToNow(days * 24 * 60);
}

/**
 * Adds minutes to an existing date.
 * 
 * @param date - The date to add minutes to
 * @param minutes - Number of minutes to add (can be negative)
 * @returns New Date object with minutes added
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Adds hours to an existing date.
 * 
 * @param date - The date to add hours to
 * @param hours - Number of hours to add (can be negative)
 * @returns New Date object with hours added
 */
export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

/**
 * Adds days to an existing date.
 * 
 * @param date - The date to add days to
 * @param days - Number of days to add (can be negative)
 * @returns New Date object with days added
 */
export function addDays(date: Date, days: number): Date {
  return addMinutes(date, days * 24 * 60);
}

/**
 * Parses a date string and returns a Date object.
 * This ensures consistent date parsing regardless of server timezone.
 * 
 * @param dateString - Date string to parse (ISO format recommended)
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Gets the timezone offset in minutes for the configured timezone.
 * Positive values are ahead of UTC, negative are behind.
 * 
 * @returns Offset in minutes
 */
export function getTimezoneOffsetMinutes(): number {
  const offset = env.TIMEZONE;
  
  // If it's an IANA timezone, we can't easily get the offset without a library
  // For now, try to parse as offset string
  const match = offset.match(/^([+-])(\d{1,2}):?(\d{2})$/);
  if (match) {
    const sign = match[1] === "+" ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || "0", 10);
    return sign * (hours * 60 + minutes);
  }
  
  // If IANA timezone, return 0 and let Intl handle it
  // This is a limitation - for full IANA support, we'd need a library
  return 0;
}

