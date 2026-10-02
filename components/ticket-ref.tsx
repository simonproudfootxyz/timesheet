export function ticketHref(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function TicketRef({ value }: { value: string | null }) {
  if (!value) return null;
  const href = ticketHref(value);
  if (!href) return <span>{value}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-line underline-offset-2 hover:text-accent"
    >
      {value}
    </a>
  );
}
