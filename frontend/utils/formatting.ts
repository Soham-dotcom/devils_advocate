export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

export function getScoreColor(score: number): string {
  if (score <= 3) return "text-red-500";
  if (score <= 6) return "text-yellow-500";
  return "text-green-500";
}

export function getScoreBgColor(score: number): string {
  if (score <= 3) return "bg-red-500/10";
  if (score <= 6) return "bg-yellow-500/10";
  return "bg-green-500/10";
}

export function getScoreBorderColor(score: number): string {
  if (score <= 3) return "border-red-500/30";
  if (score <= 6) return "border-yellow-500/30";
  return "border-green-500/30";
}

export function formatScore(score: number): string {
  return `${score.toFixed(1)}/10`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
