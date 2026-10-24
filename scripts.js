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
      const mobile = window.matchMedia('(max-width: 768px)');
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
        status.className = 'gallery-status visually-hidden';
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
          renderTimer = setTimeout(commit, 200);
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
      document.documentElement.classList.add('gallery-ready');
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
        if(status)status.classList.toggle('visually-hidden',!terms.length);
        if (status) status.textContent = terms.length
          ? 'Найдено проектов: ' + visible + ' из ' + cards.length
          : 'Всего проектов: ' + cards.length;
      }
      input.addEventListener('input', filter);
      filter();
      wrapper.hidden = false;
    }

    function initOriginalMotion() {
      const root = document.documentElement;
      const header=$('#siteHeader');let scrollFrame=0;
      function headerScroll(){scrollFrame=0;if(header)header.classList.toggle('scrolled',window.scrollY>(header.classList.contains('scrolled')?80:100));}
      window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(headerScroll);},{passive:true});headerScroll();

      // Only original combined animate-card elements moved; .fade-up alone did not.
      const targets = $$('.services-page .svc, .portfolio-card');
      const delays = [50,120,180,240,300,360,420,480];
      const reveal = element => {
        element.classList.remove('reveal-pending');
        if (reducedMotion.matches) return;
        const service = element.classList.contains('svc');
        if (service) {
          const delay=delays[$$('.svc',element.parentElement).indexOf(element)]||0;
          element.animate([{opacity:0},{opacity:1}],{duration:600,delay,easing:'ease',fill:'backwards'});
          element.animate([{transform:'translateY(40px) scale(.96)'},{transform:'translateY(0) scale(1)'}],{duration:600,delay,easing:'cubic-bezier(.25,.46,.45,.94)',fill:'backwards'});
          $('img',element)?.animate([{opacity:0},{opacity:1}],{duration:500,delay,easing:'ease',fill:'backwards'});
        } else {
          element.animate([{opacity:0,transform:'translateY(30px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:500,easing:'ease-out',fill:'backwards'});
        }
      };
      if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
        }, {threshold:.1,rootMargin:'50px 0px -50px 0px'});
        targets.forEach(element => { element.classList.add('reveal-pending'); observer.observe(element); });
        const expose = () => { observer.disconnect(); targets.forEach(e=>e.classList.remove('reveal-pending')); };
        onMediaChange(reducedMotion, () => { if(reducedMotion.matches) expose(); });
        document.addEventListener('focusin', event => { const card=event.target.closest?.('.reveal-pending'); if(card){observer.unobserve(card);card.classList.remove('reveal-pending');} });
      }
      onMediaChange(reducedMotion, () => {
        for (const animation of document.getAnimations()) if (animation.effect instanceof KeyframeEffect && animation.effect.target) {
          if (reducedMotion.matches && Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
        }
      });

      // Original cyan cursor particles, only on a fine pointer and while actually moving.
      const fine = matchMedia('(hover: hover) and (pointer: fine)');
      const layer=document.createElement('div');layer.className='pointer-trail';layer.setAttribute('aria-hidden','true');document.body.append(layer);
      const particles = new Set(); let last = 0;
      const clear = () => { particles.forEach(e=>e.remove());particles.clear(); };
      document.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || !fine.matches || reducedMotion.matches || document.hidden || Modal.isOpen()) return;
        const now=performance.now(); if(now-last<90 || particles.size>=12)return; last=now;
        const dot=document.createElement('i');dot.className='blue-particle';dot.setAttribute('aria-hidden','true');
        const size=Math.random()*3+2;dot.style.width=dot.style.height=`${size}px`;
        dot.style.left=`${event.clientX+(Math.random()-.5)*24}px`;dot.style.top=`${event.clientY+(Math.random()-.5)*24}px`;
        layer.append(dot);particles.add(dot);
        const animation=dot.animate([{transform:'translate(0,0) scale(1.1)',opacity:.9},{transform:`translate(${(Math.random()-.5)*56}px,${(Math.random()-.5)*56}px) scale(.5)`,opacity:0}],{duration:28*1000/60,easing:'linear'});
        animation.onfinish=()=>{dot.remove();particles.delete(dot);};
      },{passive:true});
      document.addEventListener('visibilitychange',()=>{root.classList.toggle('page-inactive',document.hidden);if(document.hidden)clear();});
      document.addEventListener('site:modalchange',clear);
      onMediaChange(reducedMotion,clear);onMediaChange(fine,clear);window.addEventListener('pagehide',clear);
    }

    function initHomeCarousel() {
      const carousel = $('#carousel'); if (!carousel) return;
      const items = $$('.carousel-item', carousel), controls = $('.carousel-controls');
      if (items.length !== 5 || !controls) return;
      const status = $('.carousel-status', controls);status.setAttribute('aria-live','off');let current=0,timer=0,visible=false,hovered=false;
      const wrap=carousel.closest('.carousel-wrap');
      function render() {
        items.forEach((item,index)=>{const offset=(index-current+items.length)%items.length;
          item.dataset.position=['current','next','far-next','far-prev','prev'][offset];
          item.inert=offset!==0;item.tabIndex=offset===0?0:-1;item.setAttribute('aria-hidden',String(offset!==0));
        }); status.textContent=`${current+1} / ${items.length}`;
      }
      function schedule() {
        clearTimeout(timer);timer=0;
        if(!visible || hovered || document.hidden || reducedMotion.matches || wrap.contains(document.activeElement) || Modal.isOpen())return;
        timer=setTimeout(()=>{current=(current+1)%items.length;render();schedule();},4000);
      }
      function move(step){current=(current+step+items.length)%items.length;render();schedule();}
      $('.previous',controls).addEventListener('click',()=>move(-1));$('.next',controls).addEventListener('click',()=>move(1));
      carousel.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
        if(event.key==='Home')current=0;else if(event.key==='End')current=items.length-1;
        else current=(current+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;
        render();focusElement(items[current]);schedule();
      });
      let startX=0,startY=0,swiped=false;
      carousel.addEventListener('touchstart',event=>{startX=event.changedTouches[0].clientX;startY=event.changedTouches[0].clientY;clearTimeout(timer);swiped=false;},{passive:true});
      carousel.addEventListener('touchend',event=>{const dx=startX-event.changedTouches[0].clientX,dy=startY-event.changedTouches[0].clientY;
        if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){swiped=performance.now()+400;move(dx>0?1:-1);}else schedule();},{passive:true});
      carousel.addEventListener('click',event=>{if(swiped&&performance.now()<swiped)event.preventDefault();swiped=false;},true);
      wrap.addEventListener('mouseenter',()=>{hovered=true;schedule();});wrap.addEventListener('mouseleave',()=>{hovered=false;schedule();});
      wrap.addEventListener('focusin',schedule);wrap.addEventListener('focusout',()=>queueMicrotask(schedule));
      document.addEventListener('visibilitychange',schedule);document.addEventListener('site:modalchange',schedule);onMediaChange(reducedMotion,schedule);
      if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.1}).observe(carousel);
      window.addEventListener('pagehide',()=>clearTimeout(timer));
      carousel.classList.add('is-enhanced');controls.hidden=false;render();
    }

    function initProjectTools() {
      const panel = $('#projectTools');
      const button = $('#projectToolsToggle');
      if (!panel || !button) return;
      function setOpen(open, restoreFocus = false) {
        if (!open && restoreFocus) focusElement(button);
        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', open ? 'Закрыть категории и поиск' : 'Категории и поиск');
        if (open) focusElement($('#projectSearch', panel) || $('a', panel));
      }
      button.addEventListener('click', () => setOpen(panel.hidden, !panel.hidden));
      panel.addEventListener('click', event => {
        const link = event.target.closest('.category-nav a');
        if (!link) return;
        const target = document.getElementById(link.hash.slice(1));
        setOpen(false);
        if (target) {
          target.tabIndex = -1; focusElement(target);
          if(!reducedMotion.matches)target.animate([{boxShadow:'0 0 0 4px rgba(0,229,255,.3)'},{boxShadow:'0 0 0 4px rgba(0,229,255,.3)',offset:.8},{boxShadow:'0 0 0 0 transparent'}],{duration:1500,easing:'ease'});
        }
      });
      document.addEventListener('keydown', event => {
        if (!panel.hidden && event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault(); setOpen(false, true);
        }
      });
      document.addEventListener('click', event => {
        if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) {
          setOpen(false, panel.contains(document.activeElement));
        }
      });
      document.addEventListener('site:modalchange', () => { if (Modal.isOpen()) setOpen(false); });
      panel.classList.add('is-enhanced');
      button.hidden = false;
      setOpen(false);
    }

    [initPage, initBurger, initGallery, initSearch, initOriginalMotion, initHomeCarousel, initProjectTools].forEach(initialize => {
      try { initialize(); }
      catch (error) { console.error('Не удалось инициализировать ' + initialize.name + ':', error); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSite, { once: true });
  else initSite();
})();
