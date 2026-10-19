import throttle from "lodash.throttle";
import { useEffect, useEffectEvent } from "react";

/** Subscribe to visual viewport changes and throttle measurements, including initial layout. */
export function useThrottledViewport(onMeasure: () => void, wait = 200) {
  const measure = useEffectEvent(onMeasure);
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const handleChange = throttle(
      () => {
        measure();
      },
      wait,
      { leading: false, trailing: true }
    );

    viewport.addEventListener("resize", handleChange);
    viewport.addEventListener("scroll", handleChange);
    handleChange();

    return () => {
      handleChange.cancel();
      viewport.removeEventListener("resize", handleChange);
      viewport.removeEventListener("scroll", handleChange);
    };
  }, [wait]);
}
