/**
 * Google Analytics event tracking utility
 */

/**
 * Send a custom event to Google Analytics
 * @param {string} eventName - The name of the event
 * @param {Object} eventParams - Additional parameters for the event
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track button clicks
 * @param {string} buttonName - The name/label of the button
 * @param {Object} additionalParams - Additional parameters
 */
export const trackButtonClick = (buttonName, additionalParams = {}) => {
  trackEvent('button_click', {
    button_name: buttonName,
    ...additionalParams,
  });
};

/**
 * Track view changes (table/heatmap)
 * @param {string} viewType - The type of view (table/heatmap)
 */
export const trackViewChange = (viewType) => {
  trackEvent('view_change', {
    view_type: viewType,
  });
};

/**
 * Track date selection
 * @param {string} date - The selected date
 */
export const trackDateSelection = (date) => {
  trackEvent('date_selection', {
    selected_date: date,
  });
};

/**
 * Track theme changes
 * @param {string} theme - The selected theme (auto/dark/light)
 */
export const trackThemeChange = (theme) => {
  trackEvent('theme_change', {
    theme_mode: theme,
  });
};

/**
 * Track search usage
 * @param {string} searchTerm - The search term used
 */
export const trackSearch = (searchTerm) => {
  trackEvent('search', {
    search_term: searchTerm,
  });
};

/**
 * Track accordion expand/collapse
 * @param {string} accordionName - The name of the accordion
 * @param {boolean} expanded - Whether it's expanded or collapsed
 */
export const trackAccordionToggle = (accordionName, expanded) => {
  trackEvent('accordion_toggle', {
    accordion_name: accordionName,
    expanded: expanded,
  });
};

/**
 * Track table interactions
 * @param {string} action - The action performed (sort, filter, etc.)
 * @param {Object} details - Additional details about the action
 */
export const trackTableInteraction = (action, details = {}) => {
  trackEvent('table_interaction', {
    action,
    ...details,
  });
};

/**
 * Track heatmap interactions
 * @param {string} action - The action performed
 * @param {Object} details - Additional details about the action
 */
export const trackHeatmapInteraction = (action, details = {}) => {
  trackEvent('heatmap_interaction', {
    action,
    ...details,
  });
};
