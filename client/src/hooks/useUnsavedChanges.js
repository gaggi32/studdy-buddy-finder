import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

// US-10: warn the user before they navigate away from a form with unsaved
// changes. Covers both in-app navigation (via the router blocker) and hard
// navigation such as reload / closing the tab (via beforeunload).
export function useUnsavedChanges(when) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname
  );

  // In-app navigation: confirm, then either proceed or stay put.
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm(
      'You have unsaved changes. Leave this page and discard them?'
    );
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  // Hard navigation: the browser shows its native "leave site?" prompt.
  useEffect(() => {
    if (!when) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
