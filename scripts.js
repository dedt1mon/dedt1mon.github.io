(() => {
  'use strict';

  function initSite() {
    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMediaChange = (query, callback) => {
      if (query.addEventListener) query.addEventListener('change', callback);
      else query.addListener(callback);
    };
    const plainClick = event => !event.defaultPrevented && event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    function mediaURL(value) {
      if (typeof value !== 'string' || !value.trim()) return '';
      try {
        const url = new URL(value, document.baseURI);
        if (!['http:', 'https:'].includes(url.protocol) ||
            url.origin !== location.origin || url.username || url.password) return '';
        return url.href;
      } catch (error) {
        return '';
      }
    }

    function safeParseMedia(element) {
      try {
        const parsed = JSON.parse(element.dataset.media || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.flatMap(item => {
          if (!item || !['image', 'video'].includes(item.type)) return [];
          const src = mediaURL(item.src);
          if (!src) return [];
          return [{
            type: item.type,
            src,
            preview: mediaURL(item.preview),
            alt: typeof item.alt === 'string' ? item.alt : ''
          }];
        });
      } catch (error) {
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

    function initPage() {
      $$('#year, #year2, #year3').forEach(element => {
        element.textContent = new Date().getFullYear();
      });
      Modal.wire('#privacyModal', '#openPrivacy', '#closePrivacy');
    }

    function initBurger() {
      const burger = $('#burgerBtn');
      const nav = $('#top-nav');
      if (!burger || !nav) return;
      const mobile = window.matchMedia('(max-width: 767px)');
      let open = false;

      function setOpen(value, restoreFocus = false) {
        open = value && mobile.matches;
        if (!open && restoreFocus && nav.contains(document.activeElement)) focusElement(burger);
        burger.classList.toggle('active', open);
        nav.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        nav.inert = mobile.matches && !open;
        nav.setAttribute('aria-hidden', String(mobile.matches && !open));
      }

      burger.setAttribute('aria-controls', nav.id);
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
      document.addEventListener('site:modalchange', () => {
        if (Modal.isOpen()) setOpen(false);
      });
      onMediaChange(mobile, () => setOpen(false, true));
      setOpen(false);
      document.documentElement.classList.add('js');
    }

    function initGallery() {
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
      const galleryMain = $('.gallery-main', modal);
      let status = $('#galleryStatus');
      if (!status) {
        status = document.createElement('p');
        status.id = 'galleryStatus';
        status.className = 'gallery-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');
        if (galleryMain) galleryMain.after(status);
      }
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
        if (media.preview) return media.preview;
        const poster = project.media.find(item => item.type === 'image');
        return poster ? poster.preview || poster.src : '';
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
          thumbnail.className = 'gallery-thumbnail' + (isVideo ? ' video' : '');
          thumbnail.setAttribute('aria-label',
            (isVideo ? 'Видео ' : 'Изображение ') + (index + 1) + ' из ' +
            current.media.length + ': ' + (media.alt || current.title));
          const source = isVideo ? posterFor(media, current) : media.preview || media.src;
          if (source) {
            const image = document.createElement('img');
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            image.width = 88;
            image.height = 62;
            image.addEventListener('error', () => {
              thumbnail.textContent = String(index + 1);
            }, { once: true });
            image.src = source;
            thumbnail.appendChild(image);
          } else {
            thumbnail.textContent = String(index + 1);
          }
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
          content.classList.remove('is-fading');
          status.textContent = '';
          return;
        }
        status.textContent = (media.type === 'video' ? 'Видео ' : 'Изображение ') +
          (currentIndex + 1) + ' из ' + current.media.length;
        const commit = () => {
          renderTimer = 0;
          if (version !== renderVersion || !Modal.isOpen(modal)) return;
          releaseVideo();
          const container = document.createElement('div');
          container.className = 'gallery-media-frame';
          if (media.type === 'video') {
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = false;
            video.playsInline = true;
            video.preload = 'metadata';
            video.tabIndex = 0;
            const poster = posterFor(media, project);
            if (poster) video.poster = poster;
            video.setAttribute('aria-label', media.alt || project.title);
            currentVideo = video;
            video.addEventListener('error', () => {
              if (currentVideo !== video) return;
              releaseVideo();
              container.replaceChildren(unavailableMedia('Не удалось загрузить видео. Прямая ссылка доступна в материалах проекта.'));
            }, { once: true });
            video.src = media.src;
            container.appendChild(video);
          } else {
            const image = document.createElement('img');
            image.alt = media.alt || project.title;
            image.decoding = 'async';
            image.addEventListener('error', () => {
              container.replaceChildren(unavailableMedia('Не удалось загрузить изображение. Прямая ссылка доступна в материалах проекта.'));
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
          renderTimer = setTimeout(commit, 140);
        }
      }

      function openProject(card, opener) {
        const media = safeParseMedia(card);
        if (!media.length) return false;
        cancelRender();
        releaseVideo();
        current = {
          title: card.dataset.title || $('.portfolio-title', card)?.textContent.trim() || 'Проект',
          date: card.dataset.date || '',
          description: card.dataset.description || '',
          technologies: (card.dataset.tech || '').split('|').map(value => value.trim()).filter(Boolean),
          media
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
          button.hidden = current.media.length <= 1;
        });
        buildThumbnails();
        Modal.open(modal, opener);
        renderGallery(true);
        return true;
      }

      function move(direction) {
        if (!current || current.media.length <= 1 || !Modal.isOpen(modal)) return;
        currentIndex = (currentIndex + direction + current.media.length) % current.media.length;
        renderGallery();
      }

      $$('.portfolio-card .project-open').forEach(opener => {
        const card = opener.closest('.portfolio-card');
        if (!card || !safeParseMedia(card).length) return;
        opener.setAttribute('aria-haspopup', 'dialog');
        opener.setAttribute('aria-controls', modal.id);
        opener.addEventListener('click', event => {
          if (plainClick(event) && openProject(card, opener)) event.preventDefault();
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
        content.classList.remove('is-fading');
        if (thumbnails) thumbnails.replaceChildren();
        status.textContent = '';
        current = null;
      });
      document.addEventListener('keydown', event => {
        if (!Modal.isOpen(modal) || event.defaultPrevented || event.altKey || event.ctrlKey ||
            event.metaKey || event.isComposing ||
            event.target.closest?.('video, input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && currentVideo) currentVideo.pause();
      });
      window.addEventListener('pagehide', () => {
        if (Modal.isOpen(modal)) Modal.close(modal, { immediate: true, restoreFocus: false });
      });
      onMediaChange(reducedMotion, () => {
        if (reducedMotion.matches && currentVideo) currentVideo.pause();
      });
    }

    function initSearch() {
      const input = $('#projectSearch');
      const wrapper = input?.closest('.portfolio-search');
      const status = $('#searchStatus');
      const cards = $$('.portfolio-card');
      if (!input || !wrapper || !cards.length) return;
      const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е');
      const sections = $$('.portfolio-category-section');
      const entries = cards.map(card => ({
        card,
        text: normalize([
          card.dataset.title || '',
          card.dataset.description || '',
          card.dataset.tech || '',
          $('h2', card.closest('.portfolio-category-section') || document)?.textContent || ''
        ].join(' '))
      }));
      const categoryLinks = $$('.category-nav a[href^="#"]').map(link => {
        let target = null;
        try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch (error) { /* Invalid anchors keep their native behavior. */ }
        return { link, section: target?.closest('.portfolio-category-section') };
      });
      function filter() {
        const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
        let visible = 0;
        entries.forEach(entry => {
          const matches = terms.every(term => entry.text.includes(term));
          entry.card.hidden = !matches;
          if (matches) visible += 1;
        });
        sections.forEach(section => {
          section.hidden = !$('.portfolio-card:not([hidden])', section);
        });
        categoryLinks.forEach(({ link, section }) => {
          if (section) link.hidden = section.hidden;
        });
        if (status) status.textContent = terms.length
          ? 'Найдено проектов: ' + visible + ' из ' + cards.length
          : 'Всего проектов: ' + cards.length;
      }
      input.addEventListener('input', filter);
      filter();
      wrapper.hidden = false;
    }

    [initPage, initBurger, initGallery, initSearch].forEach(initialize => {
      try { initialize(); }
      catch (error) { console.error('Не удалось инициализировать ' + initialize.name + ':', error); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSite, { once: true });
  else initSite();
})();
