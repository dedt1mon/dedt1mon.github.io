(() => {
  'use strict';

  function initSite() {
    /* ====== CONFIG / UTIL ====== */
    const CONFIG = {
      carousel: { autoplayMs: 4000 },
      particles: { max: 12, spawnIntervalMs: 90, lifeMs: 28 * 1000 / 60 }
    };
    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMediaChange = (query, callback) => {
      if (query.addEventListener) query.addEventListener('change', callback);
      else query.addListener(callback);
    };

    function safeParseMedia(element) {
      try {
        const parsed = JSON.parse(element.dataset.media || '[]');
        return Array.isArray(parsed) ? parsed.filter(item =>
          item && (item.type === 'image' || item.type === 'video') &&
          typeof item.src === 'string' && item.src.trim()
        ) : [];
      } catch (error) {
        console.warn('Некорректный data-media', element);
        return [];
      }
    }

    function unavailableMedia(message) {
      const notice = document.createElement('p');
      notice.className = 'media-unavailable';
      notice.setAttribute('role', 'status');
      notice.textContent = message;
      return notice;
    }

    function focusElement(element) {
      if (element && element.isConnected) element.focus({ preventScroll: true });
    }

    /* ====== MODALS ====== */
    const Modal = (() => {
      const states = new WeakMap();
      let activeModal = null;
      let background = [];
      let bodyStyles = null;
      let redirectingFocus = false;

      function stateFor(element) {
        if (!states.has(element)) states.set(element, { frame: 0, timer: 0, phase: 'closed', opener: null });
        return states.get(element);
      }

      function focusableElements(element) {
        return $$('a[href], button, input, select, textarea, video[controls], [tabindex]', element)
          .filter(node => {
            if (node.disabled || node.tabIndex < 0 || node.closest('[hidden], [inert]')) return false;
            for (let parent = node; parent && parent !== element.parentElement; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
            }
            return true;
          });
      }

      function lockBackground(element) {
        bodyStyles = {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
          rootOverflow: document.documentElement.style.overflow
        };
        const scrollbarWidth = document.documentElement.clientWidth > 0
          ? Math.max(0, window.innerWidth - document.documentElement.clientWidth) : 0;
        if (scrollbarWidth) {
          const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
          document.body.style.paddingRight = `${padding + scrollbarWidth}px`;
        }
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        background = Array.from(document.body.children)
          .filter(node => node !== element && !node.contains(element) && !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName))
          .map(node => ({ node, inert: node.inert }));
        background.forEach(({ node }) => { node.inert = true; });
      }

      function unlockBackground() {
        background.forEach(({ node, inert }) => { node.inert = inert; });
        background = [];
        if (bodyStyles) {
          document.body.style.overflow = bodyStyles.overflow;
          document.body.style.paddingRight = bodyStyles.paddingRight;
          document.documentElement.style.overflow = bodyStyles.rootOverflow;
          bodyStyles = null;
        }
      }

      function transitionTime(element) {
        if (reducedMotion.matches) return 0;
        const milliseconds = value => value.trim().endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
        return [element, $('.modal-content', element)].filter(Boolean).reduce((longest, node) => {
          const style = getComputedStyle(node);
          const durations = style.transitionDuration.split(',').map(milliseconds);
          const delays = style.transitionDelay.split(',').map(milliseconds);
          return Math.max(longest, ...durations.map((duration, index) =>
            (duration || 0) + (delays[index % delays.length] || 0)));
        }, 0);
      }

      function finishClose(element, state) {
        if (state.phase !== 'closing') return;
        state.timer = 0;
        state.phase = 'closed';
        element.style.display = 'none';
        element.dispatchEvent(new CustomEvent('site:modalclosed'));
      }

      function close(element, { immediate = false, restoreFocus = true } = {}) {
        if (!element) return;
        const state = stateFor(element);
        if (state.phase === 'closed') return;
        cancelAnimationFrame(state.frame);
        clearTimeout(state.timer);
        state.frame = 0;
        state.phase = 'closing';
        element.classList.remove('active');
        element.dispatchEvent(new CustomEvent('site:modalclose'));
        if (activeModal === element) {
          activeModal = null;
          unlockBackground();
          if (restoreFocus) focusElement(state.opener);
          document.dispatchEvent(new CustomEvent('site:modalchange'));
        }
        element.setAttribute('aria-hidden', 'true');
        element.inert = true;
        const duration = immediate ? 0 : transitionTime(element);
        if (duration) state.timer = setTimeout(() => finishClose(element, state), duration);
        else finishClose(element, state);
      }

      function open(element, opener = document.activeElement) {
        if (!element) return;
        if (activeModal === element) return;
        if (activeModal) close(activeModal, { immediate: true, restoreFocus: false });
        const state = stateFor(element);
        cancelAnimationFrame(state.frame);
        clearTimeout(state.timer);
        state.timer = 0;
        state.phase = 'open';
        state.opener = opener;
        activeModal = element;
        element.style.display = 'flex';
        element.setAttribute('aria-hidden', 'false');
        element.setAttribute('aria-modal', 'true');
        if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
        element.inert = false;
        lockBackground(element);
        state.frame = requestAnimationFrame(() => {
          state.frame = 0;
          if (activeModal === element) element.classList.add('active');
        });
        focusElement($('.close-modal', element) || focusableElements(element)[0] || element);
        document.dispatchEvent(new CustomEvent('site:modalchange'));
      }

      function wire(modalSelector, openSelector, closeSelector) {
        const modal = $(modalSelector);
        if (!modal) return;
        modal.inert = true;
        const openButton = openSelector ? $(openSelector) : null;
        const closeButton = $(closeSelector);
        if (openButton) openButton.addEventListener('click', event => {
          event.preventDefault();
          open(modal, openButton);
        });
        if (closeButton) closeButton.addEventListener('click', () => close(modal));
        modal.addEventListener('click', event => {
          if (event.target === modal) close(modal);
        });
      }

      document.addEventListener('keydown', event => {
        if (!activeModal || event.defaultPrevented) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          close(activeModal);
        } else if (event.key === 'Tab') {
          const elements = focusableElements(activeModal);
          const first = elements[0] || activeModal;
          const last = elements[elements.length - 1] || activeModal;
          if (!elements.includes(document.activeElement) || (event.shiftKey && document.activeElement === first) ||
              (!event.shiftKey && document.activeElement === last)) {
            event.preventDefault();
            focusElement(event.shiftKey ? last : first);
          }
        }
      });

      document.addEventListener('focusin', event => {
        if (!activeModal || activeModal.contains(event.target) || redirectingFocus) return;
        redirectingFocus = true;
        focusElement(focusableElements(activeModal)[0] || activeModal);
        redirectingFocus = false;
      });

      return { open, close, wire, isOpen: element => element ? activeModal === element : Boolean(activeModal) };
    })();

    /* ====== YEAR / PAGE VISIBILITY ====== */
    function initPage() {
      $$('#year, #year2, #year3').forEach(element => { element.textContent = new Date().getFullYear(); });
      // Содержимое не должно ждать загрузки всех изображений и внешних ресурсов.
      document.body.style.opacity = '1';
      Modal.wire('#privacyModal', '#openPrivacy', '#closePrivacy');
    }

    /* ====== BURGER MENU ====== */
    function initBurger() {
      const burger = $('#burgerBtn');
      const nav = $('.top-nav');
      if (!burger || !nav) return;
      const mobile = window.matchMedia('(max-width: 768px)');
      let open = false;
      if (!nav.id) nav.id = 'top-nav';
      burger.setAttribute('aria-controls', nav.id);

      function setOpen(value, restoreFocus = false) {
        open = value && mobile.matches;
        if (!open && restoreFocus && nav.contains(document.activeElement)) focusElement(burger);
        burger.classList.toggle('active', open);
        nav.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        nav.inert = mobile.matches && !open;
        nav.setAttribute('aria-hidden', String(mobile.matches && !open));
      }

      burger.addEventListener('click', () => setOpen(!open));
      nav.addEventListener('click', event => {
        if (event.target.closest('.nav-link')) setOpen(false);
      });
      document.addEventListener('click', event => {
        if (open && !burger.contains(event.target) && !nav.contains(event.target)) setOpen(false, true);
      });
      document.addEventListener('keydown', event => {
        if (open && event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          setOpen(false, true);
        }
      });
      document.addEventListener('site:modalchange', () => { if (Modal.isOpen()) setOpen(false); });
      onMediaChange(mobile, () => setOpen(false));
      setOpen(false);
      document.body.classList.add('nav-ready');
    }

    /* ====== SCROLL ANIMATIONS ====== */
    function initScrollAnimations() {
      const targets = $$('.fade-up, .animate-card, .portfolio-card');
      const reveal = target => {
        target.classList.remove('reveal-pending');
        target.classList.add('in-view', 'show');
      };
      if (!targets.length) return;
      if (reducedMotion.matches || !('IntersectionObserver' in window)) {
        targets.forEach(reveal);
        return;
      }
      let observer;
      try {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            observer.unobserve(entry.target);
          });
        }, { threshold: 0.1, rootMargin: '50px 0px -50px 0px' });
        targets.forEach(target => {
          target.classList.add('reveal-pending');
          observer.observe(target);
        });
      } catch (error) {
        if (observer) observer.disconnect();
        targets.forEach(reveal);
        return;
      }
      onMediaChange(reducedMotion, () => {
        if (reducedMotion.matches) {
          observer.disconnect();
          targets.forEach(reveal);
        }
      });
    }

    /* ====== LAZY IMAGES ====== */
    function initLazy() {
      const images = $$('img.lazy, img[data-src]');
      if (!images.length) return;
      const loadImage = image => {
        if (image.dataset.src) image.src = image.dataset.src;
        image.classList.remove('lazy');
        image.removeAttribute('data-src');
      };
      if (!('IntersectionObserver' in window)) {
        images.forEach(loadImage);
        return;
      }
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadImage(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });
      images.forEach(image => observer.observe(image));
    }

    /* ====== CAROUSEL ====== */
    function initCarousel() {
      const carousel = $('#carousel');
      if (!carousel) return;
      const items = $$('.carousel-item', carousel);
      if (!items.length) return;
      let index = 0;
      let autoplay = 0;
      let hovered = false;
      let focused = false;
      let touching = false;
      let suspended = false;
      let visible = !('IntersectionObserver' in window);
      let touchStart = null;
      carousel.setAttribute('role', 'region');
      carousel.setAttribute('aria-roledescription', 'карусель');
      if (!carousel.hasAttribute('tabindex')) carousel.tabIndex = 0;
      items.forEach((item, itemIndex) => {
        item.setAttribute('role', 'group');
        item.setAttribute('aria-roledescription', 'слайд');
        item.setAttribute('aria-label', `${itemIndex + 1} из ${items.length}`);
      });

      function render() {
        items.forEach((item, itemIndex) => {
          const difference = (itemIndex - index + items.length) % items.length;
          item.classList.toggle('active', difference === 0);
          item.classList.toggle('next', difference === 1);
          item.classList.toggle('prev', difference === items.length - 1 && difference !== 0);
          item.setAttribute('aria-hidden', String(difference > 1 && difference < items.length - 1));
        });
      }
      function stop() {
        clearInterval(autoplay);
        autoplay = 0;
      }
      function move(direction) {
        index = (index + direction + items.length) % items.length;
        render();
      }
      function syncAutoplay() {
        stop();
        if (items.length > 1 && visible && !hovered && !focused && !touching && !suspended &&
            !document.hidden && !reducedMotion.matches && !Modal.isOpen()) {
          autoplay = setInterval(() => move(1), CONFIG.carousel.autoplayMs);
        }
      }
      function manualMove(direction) {
        move(direction);
        syncAutoplay();
      }

      carousel.addEventListener('click', event => {
        if (event.target.closest('.carousel-next, .carousel-item.next')) manualMove(1);
        else if (event.target.closest('.carousel-prev, .carousel-item.prev')) manualMove(-1);
      });
      carousel.addEventListener('keydown', event => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing ||
            event.target.closest('input, textarea, select, video, [contenteditable="true"]')) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          manualMove(event.key === 'ArrowLeft' ? -1 : 1);
        }
      });
      carousel.addEventListener('mouseenter', () => { hovered = true; syncAutoplay(); });
      carousel.addEventListener('mouseleave', () => { hovered = false; syncAutoplay(); });
      carousel.addEventListener('focusin', () => { focused = true; syncAutoplay(); });
      carousel.addEventListener('focusout', () => {
        queueMicrotask(() => {
          focused = carousel.contains(document.activeElement);
          syncAutoplay();
        });
      });
      carousel.addEventListener('touchstart', event => {
        const touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
        touching = true;
        stop();
      }, { passive: true });
      carousel.addEventListener('touchend', event => {
        if (touchStart) {
          const touch = event.changedTouches[0];
          const dx = touchStart.x - touch.clientX;
          const dy = touchStart.y - touch.clientY;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx > 0 ? 1 : -1);
        }
        touchStart = null;
        touching = false;
        syncAutoplay();
      }, { passive: true });
      carousel.addEventListener('touchcancel', () => {
        touchStart = null;
        touching = false;
        syncAutoplay();
      }, { passive: true });
      if ('IntersectionObserver' in window) {
        try {
          const observer = new IntersectionObserver(entries => {
            visible = entries.some(entry => entry.isIntersecting);
            syncAutoplay();
          }, { threshold: 0.1 });
          observer.observe(carousel);
        } catch (error) { visible = true; }
      }
      document.addEventListener('visibilitychange', syncAutoplay);
      document.addEventListener('site:modalchange', syncAutoplay);
      window.addEventListener('pagehide', () => { suspended = true; stop(); });
      window.addEventListener('pageshow', () => { suspended = false; syncAutoplay(); });
      onMediaChange(reducedMotion, syncAutoplay);
      render();
      syncAutoplay();
    }

    /* ====== HEADER SCROLL ====== */
    function initHeader() {
      const header = $('#siteHeader');
      if (!header) return;
      let scrolled;
      function update() {
        const next = window.scrollY > 100;
        if (next !== scrolled) {
          header.classList.toggle('scrolled', next);
          scrolled = next;
        }
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
    }

    /* ====== PORTFOLIO CARDS ====== */
    function initPortfolioCards() {
      $$('.portfolio-grid, .portfolio-grid1').forEach(grid => {
        grid.classList.remove('loading');
        grid.classList.add('loaded');
      });
      $$('.portfolio-card').forEach(card => {
        const mediaBox = $('.portfolio-media', card);
        if (!mediaBox) return;
        const media = safeParseMedia(card);
        const poster = media.find(item => item.type === 'image' && item.src.includes('-poster')) ||
          media.find(item => item.type === 'image') || media[0];
        if (!poster) return;
        if (poster.type === 'video') {
          mediaBox.classList.add('has-video');
          const placeholder = document.createElement('div');
          placeholder.className = 'video-placeholder';
          placeholder.setAttribute('aria-label', 'Видео');
          const playIcon = document.createElement('div');
          playIcon.className = 'video-play-icon';
          playIcon.textContent = '▶';
          playIcon.setAttribute('aria-hidden', 'true');
          placeholder.appendChild(playIcon);
          mediaBox.replaceChildren(placeholder);
          return;
        }

        // Один существующий img даёт и постер, и его размеры; фон включается после загрузки.
        const image = $('img', mediaBox) || document.createElement('img');
        image.alt = image.getAttribute('alt') || card.dataset.title || poster.alt || '';
        image.loading = 'lazy';
        image.decoding = 'async';
        let settled = false;
        function loaded() {
          if (settled || !image.naturalWidth) return;
          settled = true;
          const ratio = image.naturalWidth / image.naturalHeight;
          mediaBox.classList.toggle('wide-image', ratio > 1.5);
          mediaBox.classList.toggle('tall-image', ratio < 0.67);
          mediaBox.style.setProperty('--media-bg', `url(${JSON.stringify(poster.src)})`);
          image.classList.add('loaded');
        }
        function failed() {
          if (settled) return;
          settled = true;
          mediaBox.replaceChildren(unavailableMedia('Не удалось загрузить изображение'));
        }
        image.addEventListener('load', loaded, { once: true });
        image.addEventListener('error', failed, { once: true });
        let wrapper = $('.image-wrapper', mediaBox);
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'image-wrapper';
          Object.assign(wrapper.style, { width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' });
          wrapper.appendChild(image);
          mediaBox.replaceChildren(wrapper);
        }
        if (image.getAttribute('src') !== poster.src) image.src = poster.src;
        if (image.complete) {
          if (image.naturalWidth) loaded();
          else if (image.getAttribute('src')) failed();
        }
      });
    }

    /* ====== PORTFOLIO MODAL ====== */
    function initPortfolioModal() {
      const modal = $('#portfolioModal');
      const content = $('#galleryContent');
      if (!modal || !content) return;
      const title = $('#portfolio-modal-title');
      const date = $('#projectDate');
      const description = $('#projectDescription');
      const technologies = $('#techList');
      const thumbnails = $('#galleryThumbnails');
      const prevButton = $('#galleryPrev');
      const nextButton = $('#galleryNext');
      let current = null;
      let currentIndex = 0;
      let currentVideo = null;
      let renderTimer = 0;
      let renderFrame = 0;
      let renderVersion = 0;

      function cancelRender() {
        clearTimeout(renderTimer);
        cancelAnimationFrame(renderFrame);
        renderTimer = renderFrame = 0;
        renderVersion += 1;
      }
      function releaseVideo() {
        if (!currentVideo) return;
        currentVideo.autoplay = false;
        currentVideo.pause();
        currentVideo.removeAttribute('src');
        currentVideo.load();
        currentVideo = null;
      }
      function posterFor(media, project) {
        const stem = media.src.replace(/\.[^/.?#]+(?:[?#].*)?$/, '');
        return project.media.find(item => item.type === 'image' &&
          (item.src.includes(stem) || (media.alt && item.alt === `${media.alt} постер`)))?.src ||
          project.media.find(item => item.type === 'image')?.src || 'img/video-placeholder.jpg';
      }
      function syncThumbnails() {
        if (thumbnails) $$('.gallery-thumbnail', thumbnails).forEach((thumbnail, index) => {
          thumbnail.classList.toggle('active', index === currentIndex);
          thumbnail.setAttribute('aria-pressed', String(index === currentIndex));
        });
      }
      function buildThumbnails() {
        if (!thumbnails) return;
        const fragment = document.createDocumentFragment();
        current.media.forEach((media, index) => {
          const thumbnail = document.createElement('button');
          const isVideo = media.type === 'video';
          thumbnail.type = 'button';
          thumbnail.className = `gallery-thumbnail${isVideo ? ' video' : ''}`;
          thumbnail.dataset.index = String(index);
          thumbnail.setAttribute('aria-label', `${isVideo ? 'Видео' : 'Изображение'} ${index + 1} из ${current.media.length}: ${media.alt || current.title}`);
          const image = document.createElement('img');
          image.alt = '';
          image.loading = 'lazy';
          image.decoding = 'async';
          image.addEventListener('error', () => { thumbnail.textContent = String(index + 1); }, { once: true });
          image.src = isVideo ? posterFor(media, current) : media.src;
          thumbnail.appendChild(image);
          thumbnail.addEventListener('click', () => {
            if (currentIndex !== index) {
              currentIndex = index;
              renderGallery();
            }
          });
          fragment.appendChild(thumbnail);
        });
        thumbnails.replaceChildren(fragment);
        syncThumbnails();
      }

      function renderGallery(immediate = false) {
        cancelRender();
        if (currentVideo) currentVideo.pause();
        if (!current || !Modal.isOpen(modal)) return;
        syncThumbnails();
        const media = current.media[currentIndex];
        const project = current;
        const version = renderVersion;
        if (!media) {
          releaseVideo();
          content.replaceChildren(unavailableMedia('Материалы проекта недоступны'));
          content.classList.remove('is-fading', 'is-video');
          return;
        }
        const commit = () => {
          renderTimer = 0;
          if (version !== renderVersion || !Modal.isOpen(modal)) return;
          releaseVideo();
          const container = document.createElement('div');
          Object.assign(container.style, { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' });
          content.classList.toggle('is-video', media.type === 'video');
          if (media.type === 'video') {
            const video = document.createElement('video');
            video.controls = true;
            video.muted = true;
            video.autoplay = !reducedMotion.matches && !document.hidden;
            video.playsInline = true;
            video.preload = 'metadata';
            video.tabIndex = 0;
            video.poster = posterFor(media, project);
            video.setAttribute('aria-label', media.alt || project.title);
            currentVideo = video;
            video.addEventListener('error', () => {
              if (currentVideo !== video) return;
              releaseVideo();
              container.replaceChildren(unavailableMedia('Не удалось загрузить видео'));
              content.classList.remove('is-video');
            }, { once: true });
            video.src = media.src;
            container.appendChild(video);
          } else {
            const image = document.createElement('img');
            image.alt = media.alt || project.title;
            image.decoding = 'async';
            image.addEventListener('error', () => {
              container.replaceChildren(unavailableMedia('Не удалось загрузить изображение'));
            }, { once: true });
            image.src = media.src;
            container.appendChild(image);
          }
          content.replaceChildren(container);
          if (immediate || reducedMotion.matches) content.classList.remove('is-fading');
          else renderFrame = requestAnimationFrame(() => {
            renderFrame = 0;
            if (version === renderVersion) content.classList.remove('is-fading');
          });
        };
        if (immediate || reducedMotion.matches) commit();
        else {
          content.classList.add('is-fading');
          renderTimer = setTimeout(commit, 200);
        }
      }

      function openProject(card) {
        cancelRender();
        releaseVideo();
        current = {
          title: card.dataset.title || $('.portfolio-title', card)?.textContent.trim() || 'Проект',
          date: card.dataset.date || '—',
          description: card.dataset.description || '',
          technologies: card.dataset.tech ? card.dataset.tech.split('|').map(value => value.trim()).filter(Boolean) : ['Blender'],
          media: safeParseMedia(card)
        };
        currentIndex = 0;
        if (title) title.textContent = current.title;
        if (date) date.textContent = current.date;
        if (description) description.textContent = current.description;
        if (technologies) technologies.replaceChildren(...current.technologies.map(technology => {
          const tag = document.createElement('span');
          tag.className = 'tech-tag';
          tag.textContent = technology;
          return tag;
        }));
        [prevButton, nextButton].filter(Boolean).forEach(button => {
          button.style.display = current.media.length > 1 ? 'flex' : 'none';
        });
        buildThumbnails();
        Modal.open(modal, card);
        renderGallery(true);
      }
      function move(direction) {
        if (!current || current.media.length <= 1 || !Modal.isOpen(modal)) return;
        currentIndex = (currentIndex + direction + current.media.length) % current.media.length;
        renderGallery();
      }

      $$('.portfolio-card').forEach(card => {
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-haspopup', 'dialog');
        card.setAttribute('aria-label', `Открыть проект: ${card.dataset.title || $('.portfolio-title', card)?.textContent.trim() || 'Проект'}`);
        card.addEventListener('click', event => {
          if (!event.target.closest('a, button, input, textarea, select')) openProject(card);
        });
        card.addEventListener('keydown', event => {
          if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openProject(card);
          }
        });
      });
      if (prevButton) prevButton.addEventListener('click', () => move(-1));
      if (nextButton) nextButton.addEventListener('click', () => move(1));
      Modal.wire('#portfolioModal', null, '#closePortfolioModal');
      modal.addEventListener('site:modalclose', () => {
        cancelRender();
        if (currentVideo) {
          currentVideo.autoplay = false;
          currentVideo.pause();
        }
      });
      modal.addEventListener('site:modalclosed', () => {
        releaseVideo();
        content.replaceChildren();
        content.classList.remove('is-fading', 'is-video');
        if (thumbnails) thumbnails.replaceChildren();
        current = null;
      });
      document.addEventListener('keydown', event => {
        if (!Modal.isOpen(modal) || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing ||
            event.target.closest?.('video, input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && currentVideo) {
          currentVideo.autoplay = false;
          currentVideo.pause();
        }
      });
      window.addEventListener('pagehide', () => {
        if (Modal.isOpen(modal)) Modal.close(modal, { immediate: true, restoreFocus: false });
      });
      onMediaChange(reducedMotion, () => {
        if (reducedMotion.matches && currentVideo) {
          currentVideo.autoplay = false;
          currentVideo.pause();
        }
      });
    }

    /* ====== HASH NAVIGATION / FLOATING CATEGORIES ====== */
    function hashTarget(href) {
      if (!href || href === '#' || !href.startsWith('#')) return null;
      try { return document.getElementById(decodeURIComponent(href.slice(1))); }
      catch (error) { return null; }
    }
    function scrollToTarget(target, href) {
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex') && target.tabIndex < 0) {
        target.tabIndex = -1;
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      focusElement(target);
      if (location.hash !== href) {
        try { history.pushState(null, '', href); } catch (error) { /* Файловый просмотр может ограничивать History API. */ }
      }
    }
    const plainClick = event => !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    function initFloatingCategories() {
      const toggle = $('#floatingToggle');
      const dropdown = $('#categoriesDropdown');
      const closeButton = $('#closeCategories');
      if (!toggle || !dropdown) return;
      let open = false;
      let highlight = null;
      let highlightTimer = 0;
      function setOpen(value, restoreFocus = false) {
        open = value;
        if (!open && restoreFocus && dropdown.contains(document.activeElement)) focusElement(toggle);
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-controls', dropdown.id);
        dropdown.classList.toggle('open', open);
        dropdown.setAttribute('aria-hidden', String(!open));
        dropdown.inert = !open;
      }
      function clearHighlight() {
        clearTimeout(highlightTimer);
        if (highlight) {
          highlight.target.style.boxShadow = highlight.shadow;
          highlight.target.style.transition = highlight.transition;
          highlight = null;
        }
      }
      toggle.addEventListener('click', () => setOpen(!open));
      if (closeButton) closeButton.addEventListener('click', () => setOpen(false, true));
      document.addEventListener('click', event => {
        if (open && !toggle.contains(event.target) && !dropdown.contains(event.target)) setOpen(false, true);
      });
      document.addEventListener('keydown', event => {
        if (open && event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          setOpen(false, true);
        }
      });
      dropdown.addEventListener('click', event => {
        const link = event.target.closest('.category-link');
        if (!link || !plainClick(event)) return;
        const href = link.getAttribute('href');
        const target = hashTarget(href);
        if (!target) return;
        event.preventDefault();
        setOpen(false);
        scrollToTarget(target, href);
        clearHighlight();
        highlight = { target, shadow: target.style.boxShadow, transition: target.style.transition };
        if (!reducedMotion.matches) target.style.transition = 'box-shadow 0.3s ease';
        target.style.boxShadow = '0 0 0 4px rgba(0,229,255,.3)';
        highlightTimer = setTimeout(clearHighlight, 1500);
      });
      document.addEventListener('site:modalchange', () => { if (Modal.isOpen()) setOpen(false); });
      window.addEventListener('pagehide', clearHighlight);
      setOpen(false);
    }

    function initSmoothHash() {
      document.addEventListener('click', event => {
        if (!plainClick(event)) return;
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const href = link.getAttribute('href');
        const target = hashTarget(href);
        if (!target) return;
        event.preventDefault();
        scrollToTarget(target, href);
      });
    }

    /* ====== BLUE PARTICLES ====== */
    function initParticles() {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      const particles = [];
      let frame = 0;
      let previousFrame = 0;
      let lastSpawn = -Infinity;
      function clear() {
        cancelAnimationFrame(frame);
        frame = 0;
        particles.splice(0).forEach(particle => particle.element.remove());
      }
      function update(timestamp) {
        frame = 0;
        const elapsed = Math.min(50, Math.max(0, timestamp - previousFrame));
        previousFrame = timestamp;
        for (let index = particles.length - 1; index >= 0; index--) {
          const particle = particles[index];
          particle.life -= elapsed;
          if (particle.life <= 0) {
            particle.element.remove();
            particles.splice(index, 1);
            continue;
          }
          particle.x += particle.vx * elapsed / (1000 / 60);
          particle.y += particle.vy * elapsed / (1000 / 60);
          const ratio = particle.life / CONFIG.particles.lifeMs;
          particle.element.style.opacity = String(ratio * 0.9);
          particle.element.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) scale(${0.5 + ratio * 0.6})`;
        }
        // Когда след затих, нет ни интервала, ни ожидающего кадра.
        if (particles.length) frame = requestAnimationFrame(update);
      }
      document.addEventListener('mousemove', event => {
        if (document.hidden || reducedMotion.matches || !finePointer.matches || Modal.isOpen()) return;
        const now = performance.now();
        if (now - lastSpawn < CONFIG.particles.spawnIntervalMs || particles.length >= CONFIG.particles.max) return;
        lastSpawn = now;
        const element = document.createElement('div');
        element.className = 'blue-particle';
        element.setAttribute('aria-hidden', 'true');
        const size = Math.random() * 3 + 2;
        const x = event.clientX + (Math.random() - 0.5) * 24;
        const y = event.clientY + (Math.random() - 0.5) * 24;
        Object.assign(element.style, {
          width: `${size}px`, height: `${size}px`, left: '0', top: '0', opacity: '0.9',
          position: 'fixed', pointerEvents: 'none', zIndex: '9998', transform: `translate3d(${x}px, ${y}px, 0)`
        });
        document.body.appendChild(element);
        particles.push({ element, x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: CONFIG.particles.lifeMs });
        if (!frame) {
          previousFrame = now;
          frame = requestAnimationFrame(update);
        }
      }, { passive: true });
      document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
      document.addEventListener('site:modalchange', () => { if (Modal.isOpen()) clear(); });
      window.addEventListener('pagehide', clear);
      onMediaChange(reducedMotion, () => { if (reducedMotion.matches) clear(); });
      onMediaChange(finePointer, () => { if (!finePointer.matches) clear(); });
    }

    /* ====== IMAGE INTERACTIONS ====== */
    function initImageInteractions() {
      ['contextmenu', 'dragstart'].forEach(type => {
        document.addEventListener(type, event => {
          if (event.target.tagName === 'IMG') event.preventDefault();
        });
      });
    }

    /* ====== INITIALIZATION ====== */
    [initPage, initBurger, initHeader, initLazy, initCarousel, initPortfolioCards,
      initPortfolioModal, initFloatingCategories, initScrollAnimations, initSmoothHash,
      initParticles, initImageInteractions].forEach(initialize => {
      try { initialize(); }
      catch (error) { console.error(`Error in ${initialize.name}:`, error); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSite, { once: true });
  else initSite();
})();
