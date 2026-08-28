/**
 * Thin branching electric traces behind the hero.
 *
 * Static geometry only — the parent animates group opacity, so this never
 * costs more than one composited layer. Two stroke passes (wide + hairline)
 * give bloom without an SVG filter.
 */

/** Descending bolts with short forks, plus two horizontal traces. */
const BRANCHES = [
  // Primary bolt — enters top-left, travels to lower-centre
  "M 318 -30 L 366 122 L 316 172 L 402 330 L 356 382 L 438 528 L 408 578 L 476 740",
  "M 366 122 L 268 208",
  "M 402 330 L 498 402 L 462 462",
  "M 438 528 L 358 604",
  // Secondary bolt — right side, shorter
  "M 884 -30 L 840 98 L 896 152 L 852 268 L 910 338",
  "M 840 98 L 758 136",
  "M 852 268 L 786 306 L 810 358",
  // Faint far-left trace
  "M 92 -30 L 130 94 L 80 142 L 138 250",
  // Horizontal traces near the hero baseline
  "M -30 646 L 236 646 L 266 614 L 628 614",
  "M 1230 706 L 984 706 L 952 734 L 636 734",
] as const;

export function ElectricBranches({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Bloom pass — wide, very low opacity, no blur filter */}
      <g
        stroke="hsl(var(--electric) / 0.28)"
        strokeWidth={4}
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        {BRANCHES.map((d) => (
          <path key={`bloom-${d}`} d={d} />
        ))}
      </g>
      {/* Core pass — hairline, near-white */}
      <g
        stroke="hsl(var(--electric-hot) / 0.95)"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        {BRANCHES.map((d) => (
          <path
            key={`core-${d}`}
            d={d}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}
