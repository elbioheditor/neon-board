/// <reference types="vite/client" />

interface Window {
  neonDesktop?: {
    isElectron: boolean;
    platform: string;
    brandName: string;
    version: string;
  };
}
