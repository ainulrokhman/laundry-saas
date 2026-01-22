/**
 * General utility functions
 */

/**
 * Generate a random tracking code for orders
 * @param length - Length of the tracking code (default: 8)
 * @returns Random alphanumeric string
 */
export function generateTrackingCode(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format currency to Indonesian Rupiah
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian format
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Format datetime to Indonesian format
 * @param date - Date to format
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Censor name for privacy (e.g., "John Doe" -> "J*** D***")
 * @param name - Name to censor
 * @returns Censored name
 */
export function censorName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word;
      return word[0] + "*".repeat(Math.min(word.length - 1, 3));
    })
    .join(" ");
}
