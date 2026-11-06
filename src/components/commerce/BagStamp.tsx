"use client";

import { useEffect, useState } from "react";

export const BAG_ADDED_EVENT = "mangata:bag-added";

/** A tribal stamped once beside the bag, as the answer to adding a piece. Reacts to the action, never to a restored bag. */
export function BagStamp() {
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    const added = () => setStamp(value => value + 1);
    window.addEventListener(BAG_ADDED_EVENT, added);
    return () => window.removeEventListener(BAG_ADDED_EVENT, added);
  }, []);
  return stamp > 0 ? <span key={stamp} className="bag-stamp" aria-hidden="true" /> : null;
}
