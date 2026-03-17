interface MailboxLike {
  name?: string | null;
  address?: string | null;
}

interface ContactParts {
  raw: string | null;
  name: string | null;
  address: string | null;
}

const EMAIL_ADDRESS_PATTERN =
  /([A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

function normalizeWhitespace(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function normalizeName(value?: string | null): string | null {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return null;
  const trimmed = normalized.replace(/^['"]+|['"]+$/g, "").trim();
  return trimmed || null;
}

export function parseContactAddress(value?: string | null): ContactParts {
  const raw = normalizeWhitespace(value);
  if (!raw) {
    return { raw: null, name: null, address: null };
  }

  const addressMatch = raw.match(EMAIL_ADDRESS_PATTERN);
  if (!addressMatch) {
    return { raw, name: normalizeName(raw), address: null };
  }

  const address = addressMatch[1];
  const matchIndex = addressMatch.index ?? raw.indexOf(address);
  const before = raw.slice(0, matchIndex).replace(/[<(\["'\s]+$/g, "");
  const after = raw
    .slice(matchIndex + address.length)
    .replace(/^[>\])"'\s,;:.-]+/g, "");
  const combinedName = normalizeName([before, after].filter(Boolean).join(" "));

  return {
    raw,
    name:
      combinedName && combinedName.toLowerCase() !== address.toLowerCase()
        ? combinedName
        : null,
    address,
  };
}

export function formatMailboxDisplay(
  mailbox?: MailboxLike | null,
  fallback?: string | null
): string | null {
  const address = normalizeWhitespace(mailbox?.address);
  const name = normalizeName(mailbox?.name);
  if (address && name && name.toLowerCase() !== address.toLowerCase()) {
    return `${name} <${address}>`;
  }

  return address ?? name ?? formatContactDisplay(fallback);
}

export function formatContactDisplay(value?: string | null): string | null {
  const parsed = parseContactAddress(value);
  if (parsed.address && parsed.name) {
    return `${parsed.name} <${parsed.address}>`;
  }

  return parsed.address ?? parsed.name ?? parsed.raw;
}

export function matchesContactFilter(
  contactValue?: string | null,
  filterValue?: string | null
): boolean {
  const normalizedFilter = normalizeWhitespace(filterValue)?.toLowerCase();
  if (!normalizedFilter) return true;

  const parsedFilter = parseContactAddress(filterValue);
  const parsedContact = parseContactAddress(contactValue);
  const contactCandidates = new Set<string>();
  const contactDisplay = formatContactDisplay(contactValue);

  if (contactDisplay) {
    contactCandidates.add(contactDisplay.toLowerCase());
  }
  if (parsedContact.raw) {
    contactCandidates.add(parsedContact.raw.toLowerCase());
  }
  if (parsedContact.address) {
    contactCandidates.add(parsedContact.address.toLowerCase());
  }
  if (parsedContact.name) {
    contactCandidates.add(parsedContact.name.toLowerCase());
  }

  const filterCandidates = new Set<string>([normalizedFilter]);
  if (parsedFilter.address) {
    filterCandidates.add(parsedFilter.address.toLowerCase());
  }
  if (parsedFilter.name) {
    filterCandidates.add(parsedFilter.name.toLowerCase());
  }

  return Array.from(filterCandidates).some((candidate) =>
    Array.from(contactCandidates).some((contact) => contact.includes(candidate))
  );
}
