/**
 * Converts a UTC timestamp to a localized datetime string.
 * @param {string} utcTimestamp - The UTC timestamp to convert, expected in ISO 8601 format.
 * @returns {string} A string representing the localized datetime.
 */
export function convertUTCToLocalDatetime(utcTimestamp: string, full?:boolean): string {
	// Create a Date object from the UTC timestamp
	const date = new Date(utcTimestamp);

	// Check if the date is valid
	if (isNaN(date.getTime())) {
		throw new Error("Invalid UTC timestamp provided.");
	}

	// Define options for displaying the date and time
	const options: Intl.DateTimeFormatOptions = {
		weekday: full?'long':undefined,  // e.g., Monday
		year: full?'numeric':undefined,  // e.g., 2024
		month: full?'long':undefined,    // e.g., April
		day: full?'numeric':undefined,   // e.g., 23
		hour: '2-digit',  // e.g., 04 AM/PM
		minute: '2-digit', // e.g., 31
		second: '2-digit', // e.g., 01
		timeZoneName: full?'short':undefined // e.g., GMT+8
	};

	// Format the date to the local timezone of the user
	const formattedDate = new Intl.DateTimeFormat('default', options).format(date);

	return formattedDate;
}


/**
 * Converts a UTC timestamp to a relative time string (e.g., 3 minutes ago).
 * @param {string} utcTimestamp - The UTC timestamp to convert, expected in ISO 8601 format.
 * @returns {string} A string representing the time elapsed since the date, adjusted to the user's local timezone.
 */
export function timeAgo(utcTimestamp: string): string {
	const now = new Date(); // current time
	const past = new Date(utcTimestamp); // time of the event

	// Check if the date is valid
	if (isNaN(past.getTime())) {
		throw new Error("Invalid UTC timestamp provided.");
	}

	const seconds = Math.floor((now.getTime() - past.getTime()) / 1000); // difference in seconds

	// Time calculations
	if (seconds < 60) {
		return 'just now';
	}
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	}
	const days = Math.floor(hours / 24);
	if (days < 7) {
		return `${days} day${days > 1 ? 's' : ''} ago`;
	}
	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
	}
	const months = Math.floor(days / 30);
	if (months < 12) {
		return `${months} month${months > 1 ? 's' : ''} ago`;
	}
	const years = Math.floor(days / 365);
	return `${years} year${years > 1 ? 's' : ''} ago`;
}
