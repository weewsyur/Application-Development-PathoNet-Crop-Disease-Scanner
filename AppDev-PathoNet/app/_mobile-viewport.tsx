import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useMobileViewport() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Set mobile viewport meta tag
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      }

      // Add mobile-specific CSS
      const style = document.createElement('style');
      style.textContent = `
        @media screen and (min-width: 769px) {
          .desktop-only { display: none !important; }
        }
        @media screen and (max-width: 768px) {
          .mobile-only { display: block !important; }
        }
        body {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          -moz-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overflow-x: hidden;
        }
      `;
      document.head.appendChild(style);

      // Add mobile body class
      document.body.classList.add('mobile-optimized');
    }
  }, []);
}
