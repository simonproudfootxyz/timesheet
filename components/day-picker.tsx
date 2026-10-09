"use client";

import Link from "next/link";
import { useState } from "react";
import { secondaryButtonClass } from "@/lib/styles";

export function DayPicker({
  date,
  previous,
  next,
}: {
  date: string;
  previous: string;
  next: string;
}) {
  const [value, setValue] = useState(date);
  const [shownDate, setShownDate] = useState(date);
  if (shownDate !== date) {
    setShownDate(date);
    setValue(date);
  }

  return (
    <form action="/" className="flex flex-wrap items-end gap-2">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium">Date</span>
        <input
          type="date"
          name="date"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 rounded-lg border border-line bg-white px-3 text-sm"
        />
      </label>
      <button type="submit" className={secondaryButtonClass}>
        Show
      </button>
      <Link href={`/?date=${previous}`} className={secondaryButtonClass}>
        Previous
      </Link>
      <Link href={`/?date=${next}`} className={secondaryButtonClass}>
        Next
      </Link>
    </form>
  );
}
