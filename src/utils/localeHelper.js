// Safe locale formatting with fallbacks
export const safeLocaleDateString = (date, locale = 'sq-AL', options = {}) => {
  try {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    // Try the requested locale first
    return dateObj.toLocaleDateString(locale, options);
  } catch (error) {
    console.warn(`Locale ${locale} not supported, falling back to en-GB:`, error);
    try {
      // Fallback to en-GB
      return new Date(date).toLocaleDateString('en-GB', options);
    } catch (fallbackError) {
      console.error('Even fallback locale failed:', fallbackError);
      // Final fallback - just return the date as string
      return new Date(date).toDateString();
    }
  }
};

export const safeLocaleString = (date, locale = 'sq-AL', options = {}) => {
  try {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    // Try the requested locale first
    return dateObj.toLocaleString(locale, options);
  } catch (error) {
    console.warn(`Locale ${locale} not supported, falling back to en-GB:`, error);
    try {
      // Fallback to en-GB
      return new Date(date).toLocaleString('en-GB', options);
    } catch (fallbackError) {
      console.error('Even fallback locale failed:', fallbackError);
      // Final fallback - just return the date as string
      return new Date(date).toString();
    }
  }
};

// Check if locale is supported
export const isLocaleSupported = (locale) => {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0;
  } catch (error) {
    return false;
  }
};

// Get the best available locale
export const getBestLocale = (preferredLocale = 'sq-AL') => {
  const supportedLocales = ['sq-AL', 'en-GB', 'en-US', 'en'];
  
  for (const locale of supportedLocales) {
    if (isLocaleSupported(locale)) {
      return locale;
    }
  }
  
  return 'en-GB'; // Final fallback
};