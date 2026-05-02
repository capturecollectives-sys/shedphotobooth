// -- Shed Photobooth - main.js ------------------------------

// Mobile menu toggle - global so inline onclick works on every page
function toggleMenu() {
  var menu = document.getElementById('mobileMenu');
  var burger = document.querySelector('.nav__burger');
  if (!menu) return;
  var isOpen = menu.classList.toggle('open');
  if (burger) {
    var spans = burger.querySelectorAll('span');
    if (spans.length >= 3) {
      spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px,5px)' : '';
      spans[1].style.opacity   = isOpen ? '0' : '1';
      spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px,-5px)' : '';
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {

  // -- Sticky nav --------------------------------------------
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // -- Close mobile menu on link click ----------------------
  var mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        mobileMenu.classList.remove('open');
        var burger = document.querySelector('.nav__burger');
        if (burger) {
          var spans = burger.querySelectorAll('span');
          if (spans.length >= 3) {
            spans[0].style.transform = '';
            spans[1].style.opacity   = '1';
            spans[2].style.transform = '';
          }
        }
      });
    });
  }

  // -- Scroll reveal -----------------------------------------
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(function(el) { io.observe(el); });
  } else {
    revealEls.forEach(function(el) { el.classList.add('visible'); });
  }

  // -- Contact form ------------------------------------------
  var contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var defaultText = submitBtn ? submitBtn.textContent : '';

    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (submitBtn) {
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
      }

      try {
        var res = await fetch(contactForm.action || 'https://formspree.io/f/mpqoevpk', {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          window.location.href = 'thank-you.html';
          return;
        }

        throw new Error('Form submission failed');
      } catch (err) {
        if (submitBtn) {
          submitBtn.textContent = 'Please try again';
          submitBtn.disabled = false;
          window.setTimeout(function() {
            submitBtn.textContent = defaultText;
          }, 3000);
        }
      }
    });
  }

});
