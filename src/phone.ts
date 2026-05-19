const US_DIGITS = 10;

export function parseUsPhoneToE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let core = digits;
  if (core.length === 11 && core.startsWith("1")) {
    core = core.slice(1);
  }
  if (core.length !== US_DIGITS) return null;
  return `+1${core}`;
}
