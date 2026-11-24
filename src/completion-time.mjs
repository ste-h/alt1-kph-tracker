/**
 * @param {string} text
 * @returns {number | null} Completion time in tenths of a second.
 */
export function parseCompletionTime(text) {
  const time = text.match(/completion time:\s*(\d+):(\d{2})(?!\d)(?:\.(\d))?/i);
  if (!time) return null;
  return (Number(time[1]) * 60 + Number(time[2])) * 10 + Number(time[3] || 0);
}
