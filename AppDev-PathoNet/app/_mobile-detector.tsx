import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useMobileDetector() {
  const [isMobile, setIsMobile] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const checkMobile = () => {
      if (Platform.OS === 'web') {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setScreenSize({ width, height });
        
        // Mobile detection: width < 768px OR touch device
        const isMobileDevice = width < 768 || 'ontouchstart' in window;
        setIsMobile(isMobileDevice);
      } else {
        // Native platforms - always consider mobile
        setIsMobile(true);
        setScreenSize({ width: 375, height: 667 }); // iPhone dimensions
      }
    };

    // Initial check
    checkMobile();

    // Add resize listener for web
    if (Platform.OS === 'web') {
      window.addEventListener('resize', checkMobile);
      window.addEventListener('orientationchange', checkMobile);
    }

    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('resize', checkMobile);
        window.removeEventListener('orientationchange', checkMobile);
      }
    };
  }, []);

  return { isMobile, screenSize };
}
