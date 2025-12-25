"use client";

import { useSessionTracker } from "../hooks/useSessionTracker";

export default function SessionTracker() {
  // Initialize session tracking
  useSessionTracker();

  // This component doesn't render anything visible
  return null;
}
