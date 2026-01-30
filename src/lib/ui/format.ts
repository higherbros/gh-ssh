const useColor =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb";

const colorize = (code: string, text: string): string =>
  useColor ? `\u001b[${code}m${text}\u001b[0m` : text;

export const styles = {
  bold: (text: string) => colorize("1", text),
  dim: (text: string) => colorize("2", text),
  red: (text: string) => colorize("31", text),
  green: (text: string) => colorize("32", text),
  yellow: (text: string) => colorize("33", text),
  cyan: (text: string) => colorize("36", text),
};

export const emoji = {
  header: "🚀",
  subtitle: "🔐",
  info: "💡",
  success: "🎉",
  warn: "⚠️",
  error: "💥",
  step: "🧭",
  list: "🔹",
  step1: "🔎",
  step2: "🔐",
  step3: "🧰",
  step4: "➕",
  step5: "📋",
  step6: "✅",
  loading: "⏳",
};

export const tag = (label: string, style: (text: string) => string): string =>
  style(`[${label}]`);
