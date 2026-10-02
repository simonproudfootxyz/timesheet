const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function requiredName(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? "").trim();
  if (!text) return { ok: false as const, error: `${label} is required.` };
  if (text.length > 120) {
    return { ok: false as const, error: `${label} must be 120 characters or fewer.` };
  }
  return { ok: true as const, value: text };
}

export function optionalText(value: FormDataEntryValue | null, max: number) {
  const text = String(value ?? "").trim();
  if (text.length > max) {
    return { ok: false as const, error: `Keep this under ${max} characters.` };
  }
  return { ok: true as const, value: text.length === 0 ? null : text };
}

export function parseRate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return { ok: false as const, error: "Enter an hourly rate like 150 or 150.50." };
  }
  const [dollars, fraction = ""] = text.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    return { ok: false as const, error: "That hourly rate is too large." };
  }
  return { ok: true as const, value: cents };
}

export function parseCurrency(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim().toUpperCase();
  const currency = text || "USD";
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false as const, error: "Currency must be a 3-letter code, like USD." };
  }
  return { ok: true as const, value: currency };
}

export function readId(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  if (!isUuid(text)) return null;
  return text;
}
