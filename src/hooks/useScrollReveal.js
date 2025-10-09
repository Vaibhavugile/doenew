// src/hooks/useScrollReveal.js
import { useEffect, useRef, useState } from 'react';

const useScrollReveal = (options = {}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const defaultOptions = {
    root: null, // relative to the viewport
    rootMargin: '0px',
    threshold: 0.1, // percentage of the target element which is visible in the root
    once: true // reveal once and stop observing
  };

  const finalOptions = { ...defaultOptions, ...options };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (finalOptions.once) {
            observer.unobserve(entry.target); // Stop observing after it's visible
          }
        } else if (!finalOptions.once) {
          // If not 'once', allow it to become hidden again if it scrolls out of view
          setIsVisible(false);
        }
      });
    }, finalOptions);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [finalOptions.root, finalOptions.rootMargin, finalOptions.threshold, finalOptions.once]);

  return [ref, isVisible];
};

export default useScrollReveal;