/**
 * Ensures only one poster hover portal is open at a time.
 * When a new card opens, the previous card is force-closed.
 */

type Closer = () => void;

let activeId: string | null = null;
const closers = new Map<string, Closer>();

export function registerHoverCard(id: string, forceClose: Closer) {
  closers.set(id, forceClose);
  return () => {
    closers.delete(id);
    if (activeId === id) activeId = null;
  };
}

/** Claim hover exclusivity — closes any other open card immediately. */
export function claimHover(id: string) {
  if (activeId && activeId !== id) {
    const prev = closers.get(activeId);
    prev?.();
  }
  activeId = id;
}

export function releaseHover(id: string) {
  if (activeId === id) activeId = null;
}
