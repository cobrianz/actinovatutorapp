import { useEffect, useRef } from 'react';

export function useSessionTracker() {
  const startTimeRef = useRef(null);
  const sessionIdRef = useRef(null);

  useEffect(() => {
    // Generate unique session ID
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Record start time
    startTimeRef.current = Date.now();

    // Track session on page load
    const trackSessionStart = async () => {
      try {
        await fetch('/api/session/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            startTime: startTimeRef.current,
            page: window.location.pathname,
          }),
        });
      } catch (error) {
        // Silent fail - session tracking is non-critical
      }
    };

    trackSessionStart();

    // Track session end on page unload
    const trackSessionEnd = async () => {
      if (startTimeRef.current && sessionIdRef.current) {
        const endTime = Date.now();
        const duration = endTime - startTimeRef.current;

        try {
          await fetch('/api/session/end', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              endTime,
              duration,
              page: window.location.pathname,
            }),
          });
        } catch (error) {
          // Silent fail - session tracking is non-critical
        }
      }
    };

    // Track beforeunload and visibilitychange
    const handleBeforeUnload = () => {
      trackSessionEnd();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackSessionEnd();
      } else if (document.visibilityState === 'visible') {
        // Reset start time when user returns
        startTimeRef.current = Date.now();
        trackSessionStart();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      trackSessionEnd();
    };
  }, []);

  return {
    sessionId: sessionIdRef.current,
    startTime: startTimeRef.current,
  };
}
