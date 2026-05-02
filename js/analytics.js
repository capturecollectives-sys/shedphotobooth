// Add your GA4 Measurement ID below, for example: G-XXXXXXXXXX.
// The tag stays dormant until a real ID is set.
(function() {
  var GA_MEASUREMENT_ID = '';
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(script);
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
  document.addEventListener('click', function(event) {
    var link = event.target.closest('a');
    if (!link || !window.gtag) return;
    var href = link.getAttribute('href') || '';
    var text = (link.textContent || '').trim();
    if (href.indexOf('contact.html') !== -1 || href.indexOf('mailto:') === 0) {
      window.gtag('event', 'generate_lead_click', { link_text: text, link_url: href });
    }
  });
  document.addEventListener('submit', function(event) {
    if (event.target && event.target.matches('.contact-form') && window.gtag) {
      window.gtag('event', 'generate_lead', { form_id: event.target.getAttribute('id') || 'contact-form' });
    }
  });
})();
