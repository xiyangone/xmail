type DateInput = Date | number | string | null | undefined;

const baseFormatterOptions: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const zhCnMinuteFormatter = new Intl.DateTimeFormat(
  "zh-CN",
  baseFormatterOptions
);

const zhCnSecondFormatter = new Intl.DateTimeFormat("zh-CN", {
  ...baseFormatterOptions,
  second: "2-digit",
});

export function formatZhCnDateTime(
  value: DateInput,
  options?: { includeSeconds?: boolean }
) {
  if (value == null) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return options?.includeSeconds
    ? zhCnSecondFormatter.format(date)
    : zhCnMinuteFormatter.format(date);
}
