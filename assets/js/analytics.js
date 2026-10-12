// What this does: Loads the site's analytics integration and sends page-usage information using the configured tag.

(function(window){
  'use strict';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-QSPL315P1W');
})(window);
