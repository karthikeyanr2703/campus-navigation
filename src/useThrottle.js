import { useEffect, useRef, useState } from "react";

const useThrottle = (callback, delay) => {
  let [args, setArgs] = useState(null);
  let lastExecuted = useRef(Date.now());
  let timeoutRef = useRef(null);
  console.log(lastExecuted, "first");
  useEffect(() => {
    if (!args) return;
    const now = Date.now();
    console.log(now, "second");
    const timeSinceLastExe = now - lastExecuted.current;
    if (timeSinceLastExe >= delay) {
      lastExecuted.current = now;
      callback(...args);
      setArgs(null);
    } else {
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        setArgs(null);
      }, delay - timeSinceLastExe);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [args, callback, delay]);
  return (...params) => setArgs(params);
};

export default useThrottle;
