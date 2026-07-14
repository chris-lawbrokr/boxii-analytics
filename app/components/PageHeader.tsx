import { Suspense } from "react";
import RangeFilter from "./RangeFilter";

/**
 * Sticky page header shared by every tab.
 *
 * It sticks to Nav's scroll container (components/ui/nav/Nav.tsx) rather than
 * the window — that div is the scrolling ancestor, so `top` resolves against
 * its scrollport, not the viewport.
 *
 * Two details this depends on:
 * - The negative margins bleed the background out across the page's own
 *   `p-4 sm:p-8`, so cards scrolling underneath can't show through the gutters
 *   or above the header. They must stay in step with that padding.
 * - `top-0` is correct on mobile too, even though Nav's mobile top bar overlaps
 *   the scrollport: a sticky offset is resolved against the scroll container's
 *   padding box, and Nav already pads that container by `pt-16` to clear the
 *   bar. Adding our own offset on top would double-count it and leave a band of
 *   content scrolling past above the header.
 */
export default function PageHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 -mt-4 flex flex-col gap-4 bg-surface px-4 pb-4 pt-4 sm:-mx-8 sm:-mt-8 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:pt-8">
      <h1 className="text-4xl font-bold leading-9 -tracking-tight text-brand-dark">
        {title}
      </h1>
      <Suspense fallback={null}>
        <RangeFilter />
      </Suspense>
    </header>
  );
}
