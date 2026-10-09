import { useEffect, useRef } from 'react';

/**
 * Custom hook to monitor and log component render times.
 * Logs a warning to the console if a render takes longer than 100ms.
 */
export const useRenderPerformance = (componentName: string) => {
  const startTime = useRef(performance.now());
  // Record time at the start of component render pass
  startTime.current = performance.now();

  useEffect(() => {
    const renderDuration = performance.now() - startTime.current;
    if (renderDuration > 100) {
      console.warn(`[Performance] ${componentName} render took ${renderDuration.toFixed(2)}ms`);
    }
  });
};
