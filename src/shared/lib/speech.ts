export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window
