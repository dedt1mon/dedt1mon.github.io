document.addEventListener('DOMContentLoaded', () => {
  /* ====== CONFIG ====== */
  const CONFIG = {
    carousel: { autoplayMs: 4000 },
    particles: { max: 12, spawnIntervalMs: 90, lifeFrames: 28 }
  };

  /* ====== UTIL ====== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ====== УТИЛИТА ДЛЯ MEDIA ====== */
  function safeParseMedia(el) {
    try {
      const data = el.dataset.media;
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Некорректный data-media', el);
      return [];
    }
  }

  /* ====== YEAR ====== */
  (function setYear() {
    const els = $$('#year, #year2, #year3');
    const y = new Date().getFullYear();
    els.forEach(el => el && (el.textContent = y));
  })();

  /* ====== PAGE LOAD FADE ====== */
  (function pageFade() {
    if (document.querySelector('.portfolio-grid') || document.querySelector('.services-page')) {
      document.body.style.opacity = '1';
    } else {
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.45s ease';
      window.addEventListener('load', () => setTimeout(() => (document.body.style.opacity = '1'), 80));
    }
  })();

  /* ====== BURGER MENU ====== */
  (function burgerInit() {
    const burger = $('#burgerBtn');
    const nav = document.querySelector('.top-nav');
    if (!burger || !nav) return;
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', burger.classList.contains('active'));
    });

    // close nav on link click (delegated)
    nav.addEventListener('click', (e) => {
      if (e.target.matches('.nav-link')) {
        burger.classList.remove('active');
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  })();

  /* ====== SCROLL ANIMATIONS ====== */
  function initScrollAnimations() {
    // Исключаем карточки портфолио, так как они обрабатываются отдельно
    const targets = $$('.fade-up:not(.portfolio-card), .animate-card');
  
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(t => {
        t.classList.add('in-view', 'show');
      });
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view', 'show');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px 0px -50px 0px'
    });

    targets.forEach(t => io.observe(t));

    setTimeout(() => {
      targets.forEach(t => {
        const rect = t.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight && rect.bottom >= 0;
        if (isVisible && !t.classList.contains('in-view')) {
          t.classList.add('in-view', 'show');
        }
      });
    }, 1000);
  }

  /* ====== ОТДЕЛЬНЫЙ IntersectionObserver для сеток портфолио ====== */
  function initScrollAnimationsForGrid(grid) {
    const cards = grid.querySelectorAll('.portfolio-card');
    if (!cards.length) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view', 'show');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px 0px -50px 0px'
    });
    
    cards.forEach(card => observer.observe(card));
  }

  /* ====== LAZY IMAGES ====== */
  function initLazy() {
    const imgs = $$('img.lazy, img[data-src]');
    if (!imgs.length) return;

    if ('IntersectionObserver' in window) {
      const imgIo = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src || img.getAttribute('data-src');
            if (src) img.src = src;
            img.classList.remove('lazy');
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      imgs.forEach(img => imgIo.observe(img));
    } else {
      imgs.forEach(img => {
        const src = img.dataset.src || img.getAttribute('data-src');
        if (src) img.src = src;
        img.classList.remove('lazy');
      });
    }
  }

  /* ====== CAROUSEL ====== */
  function initCarousel() {
    const carousel = $('#carousel');
    if (!carousel) return;

    const items = $$('.carousel-item', carousel);
    if (!items.length) return;

    let idx = 0;
    let autoplay = null;
    const total = items.length;

    function render() {
      items.forEach((it, i) => {
        it.classList.remove('prev', 'active', 'next');
        const diff = ((i - idx) + total) % total;
        if (diff === 0) it.classList.add('active');
        else if (diff === 1) it.classList.add('next');
        else if (diff === total - 1) it.classList.add('prev');
      });
    }

    function next() { idx = (idx + 1) % total; render(); }
    function prev() { idx = (idx - 1 + total) % total; render(); }

    carousel.addEventListener('click', (e) => {
      if (e.target.matches('.carousel-next')) { stop(); next(); start(); }
      if (e.target.matches('.carousel-prev')) { stop(); prev(); start(); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { stop(); prev(); start(); }
      if (e.key === 'ArrowRight') { stop(); next(); start(); }
    });

    let startX = 0;
    carousel.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; stop(); }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const dist = startX - endX;
      const threshold = 50;
      if (Math.abs(dist) > threshold) dist > 0 ? next() : prev();
      start(); 
    });

    function start() {
      stop();
      autoplay = setInterval(next, CONFIG.carousel.autoplayMs);
    }
    function stop() { if (autoplay) clearInterval(autoplay); autoplay = null; }

    render();
    start();
  }

  /* ====== HEADER SCROLL ====== */
  (function headerScroll() {
    const header = $('#siteHeader');
    if (!header) return;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ====== MODALS ====== */
  const Modal = (() => {
    function open(el) {
      if (!el) return;
      el.style.display = 'flex';
      requestAnimationFrame(() => el.classList.add('active'));
    }
    function close(el) {
      if (!el) return;
      el.classList.remove('active');
      setTimeout(() => {
        el.style.display = 'none';
      }, 300);
    }
    function wire(modalSelector, openSelector, closeSelector) {
      const modal = $(modalSelector);
      const openBtn = $(openSelector);
      const closeBtn = $(closeSelector);
      if (openBtn && modal) openBtn.addEventListener('click', (ev) => { ev.preventDefault(); open(modal); });
      if (closeBtn && modal) closeBtn.addEventListener('click', () => close(modal));
      if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) close(modal); });
      }
      return { modal, open, close };
    }
    return { wire, open, close };
  })();

  /* privacy modal */
  (function initPrivacy() {
    Modal.wire('#privacyModal', '#openPrivacy', '#closePrivacy');
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const pm = $('#privacyModal');
        if (pm && pm.classList.contains('active')) Modal.close(pm);
      }
    });
  })();

  /* order modal */
  (function initOrder() {
    const orderModal = $('#orderModal');
    const orderBtns = $$('.order-btn');
    const closeBtn = orderModal ? orderModal.querySelector('.close-modal') : null;
    const form = orderModal ? orderModal.querySelector('form') : null;
    orderBtns.forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      const service = btn.dataset.service || btn.getAttribute('data-service') || 'Услуга';
      const selected = orderModal ? orderModal.querySelector('#selectedService') : null;
      if (selected) selected.value = service;
      Modal.open(orderModal);
    }));
    if (closeBtn) closeBtn.addEventListener('click', () => Modal.close(orderModal));
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const reset = () => { form.reset(); Modal.close(orderModal); };
        try { alert('Заявка отправлена!'); reset(); } catch (err) { reset(); }
      });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && orderModal && orderModal.style.display === 'block') Modal.close(orderModal); });
  })();

  /* ====== ОСТАНОВКА ВСЕХ ВИДЕО ====== */
  function stopAllVideos(container) {
    if (!container) return;
    container.querySelectorAll('video').forEach(v => {
      v.pause();
      v.currentTime = 0;
    });
  }

  /* ====== IMPROVED initPortfolioCards() - СИНХРОННАЯ ЗАГРУЗКА С ПОЛНЫМ ОТОБРАЖЕНИЕМ И BLUR ЭФФЕКТОМ ====== */
  function initPortfolioCards() {
    const portfolioCards = document.querySelectorAll('.portfolio-card');
    if (!portfolioCards.length) return;

    // Находим все родительские сетки
    const portfolioGrids = document.querySelectorAll('.portfolio-grid, .portfolio-grid1');
    
    portfolioGrids.forEach(grid => {
      // Добавляем класс загрузки
      grid.classList.add('loading');
      
      // Находим все карточки в этой сетке
      const cardsInGrid = Array.from(grid.querySelectorAll('.portfolio-card'));
      if (!cardsInGrid.length) {
        grid.classList.remove('loading');
        grid.classList.add('loaded');
        return;
      }
      
      let loadedCardsCount = 0;
      const totalCards = cardsInGrid.length;
      
      cardsInGrid.forEach(card => {
        const mediaBox = card.querySelector('.portfolio-media');
        if (!mediaBox) {
          loadedCardsCount++;
          checkAllCardsLoaded();
          return;
        }

        const mediaList = safeParseMedia(card);
        if (!mediaList.length) {
          loadedCardsCount++;
          checkAllCardsLoaded();
          return;
        }

        // Находим первое изображение для постера
        let posterMedia = null;
        
        // Сначала ищем изображение с "poster" в имени
        posterMedia = mediaList.find(item => 
          item.type === 'image' && item.src && item.src.includes('-poster')
        );
        
        // Если не нашли, ищем первое изображение
        if (!posterMedia) {
          posterMedia = mediaList.find(item => item.type === 'image');
        }
        
        // Если все еще не нашли, используем первое медиа
        if (!posterMedia && mediaList.length > 0) {
          posterMedia = mediaList[0];
        }

        // Если нет медиа вообще
        if (!posterMedia) {
          loadedCardsCount++;
          checkAllCardsLoaded();
          return;
        }

        // Создаем изображение
        const isVideo = posterMedia.type === 'video';

        // Очищаем mediaBox перед вставкой
        mediaBox.innerHTML = '';

        if (isVideo) {
          mediaBox.classList.add('has-video');

          const placeholder = document.createElement('div');
          placeholder.className = 'video-placeholder';
          placeholder.setAttribute('aria-label', 'Видео');

          const playIcon = document.createElement('div');
          playIcon.className = 'video-play-icon';
          playIcon.innerHTML = '▶';

          placeholder.appendChild(playIcon);
          mediaBox.appendChild(placeholder);

          loadedCardsCount++;
          checkAllCardsLoaded();
          return;
        }

        const img = document.createElement('img');
        img.src = posterMedia.src;
        img.alt = posterMedia.alt || '';
        img.loading = 'eager';

        // Загружаем изображение для определения его размеров
        const tempImg = new Image();
        tempImg.onload = function() {
          const aspectRatio = this.width / this.height;

          // Определяем ориентацию изображения
          if (aspectRatio > 1.5) {
            mediaBox.classList.add('wide-image');
          } else if (aspectRatio < 0.67) {
            mediaBox.classList.add('tall-image');
          }

          // ⚠️ ИЗМЕНЕННАЯ СТРОКА 541: Используем CSS-переменную для blur эффекта
          mediaBox.style.setProperty('--media-bg', `url(${posterMedia.src})`);
        };
        tempImg.src = posterMedia.src;

        // Создаем обертку для управления загрузкой
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';

        // Обработчик загрузки - убираем blur эффект
        const imageLoaded = () => {
          // Добавляем класс loaded для плавного перехода
          img.classList.add('loaded');
          loadedCardsCount++;
          checkAllCardsLoaded();
        };

        // Проверяем, загружено ли уже изображение
        if (img.complete) {
          // Если изображение уже загружено из кэша
          setTimeout(() => {
            imageLoaded();
          }, 50); // Небольшая задержка для плавности
        } else {
          // Добавляем обработчики для загрузки
          img.addEventListener('load', () => {
            setTimeout(() => {
              imageLoaded();
            }, 50);
          });

          img.addEventListener('error', () => {
            console.warn('Failed to load image:', img.src);
            // Загружаем fallback изображение
            img.src = './img/portfolio/logo/EA.jpg';
            setTimeout(() => {
              imageLoaded();
            }, 50);
          });
        }

        // Добавляем стили
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.display = 'block';

        wrapper.appendChild(img);
        mediaBox.appendChild(wrapper);
      });
      
      // Функция проверки загрузки всех карточек в сетке
      function checkAllCardsLoaded() {
        if (loadedCardsCount >= totalCards) {
          // Все карточки загружены
          setTimeout(() => {
            grid.classList.remove('loading');
            grid.classList.add('loaded');
            
            // Восстанавливаем анимации для каждой карточки
            cardsInGrid.forEach((card, index) => {
              card.style.animationDelay = `${index * 0.1}s`;
              card.style.animation = 'cardAppear 0.5s ease-out both';
            });
            
            // Запускаем IntersectionObserver для этой сетки
            initScrollAnimationsForGrid(grid);
          }, 100);
        }
      }
      
      // Проверяем на случай, если карточек нет
      if (totalCards === 0) {
        grid.classList.remove('loading');
        grid.classList.add('loaded');
      }
    });
  }

  /* ====== PORTFOLIO MODAL - ИЗМЕНЕНО: видео проигрываются только здесь ====== */
  function initPortfolioModal() {
    const modal = $('#portfolioModal');
    if (!modal) return;

    const titleEl = $('#portfolio-modal-title');
    const dateEl = $('#projectDate');
    const descEl = $('#projectDescription');
    const techList = $('#techList');
    const galleryContent = $('#galleryContent');
    const galleryThumbs = $('#galleryThumbnails');
    const prevBtn = $('#galleryPrev');
    const nextBtn = $('#galleryNext');
    const closeBtn = $('#closePortfolioModal');

    let current = null;
    let currentIndex = 0;
    let currentVideo = null;

    function parseProjectData(card) {
      const media = safeParseMedia(card);

      if (media.length === 0) {
        return {
          id: card.dataset.project || '1',
          title: card.dataset.title || card.querySelector('.portfolio-title')?.textContent?.trim() || 'Проект',
          date: card.dataset.date || '—',
          description: card.dataset.description || '',
          technologies: card.dataset.tech ? card.dataset.tech.split('|').map(t => t.trim()) : ['Blender'],
          media: [{
            type: 'image',
            src: './img/portfolio/logo/EA.jpg',
            alt: card.dataset.title || 'Проект'
          }]
        };
      }

      return {
        id: card.dataset.project || '1',
        title: card.dataset.title || card.querySelector('.portfolio-title')?.textContent?.trim() || 'Проект',
        date: card.dataset.date || '—',
        description: card.dataset.description || '',
        technologies: card.dataset.tech ? card.dataset.tech.split('|').map(t => t.trim()) : ['Blender'],
        media: media
      };
    }

    function openProject(pid, cardElement) {
      const project = parseProjectData(cardElement);
      current = project;
      currentIndex = 0;
      
      if (titleEl) titleEl.textContent = project.title;
      if (dateEl) dateEl.textContent = project.date;
      if (descEl) descEl.textContent = project.description || '';
      
      if (techList) {
        techList.innerHTML = '';
        project.technologies.forEach((t, index) => {
          const tag = document.createElement('span');
          tag.className = 'tech-tag';
          tag.textContent = t;
          techList.appendChild(tag);
        });
      }
      
      renderGallery();
      Modal.open(modal);
    }

    function renderGallery() {
      if (!current || !current.media.length) return;
      
      const currentMedia = current.media[currentIndex];
      
      // Останавливаем текущее видео
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.currentTime = 0;
        currentVideo = null;
      }
      
      if (galleryContent) {
        galleryContent.classList.add('is-fading');
        galleryContent.classList.toggle('is-video', currentMedia.type === 'video');

        setTimeout(() => {
          galleryContent.innerHTML = '';
          
          if (currentMedia.type === 'video') {
          const videoContainer = document.createElement('div');
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          videoContainer.style.display = 'flex';
          videoContainer.style.alignItems = 'center';
          videoContainer.style.justifyContent = 'center';
          
          const video = document.createElement('video');
          video.src = currentMedia.src;
          video.poster = 'img/video-placeholder.jpg';
          video.controls = true;
          video.autoplay = true; // Автовоспроизведение только в модальном окне
          video.muted = true; // Без звука для автовоспроизведения
          video.playsInline = true;
          video.preload = 'auto';
          video.style.maxWidth = '100%';
          video.style.maxHeight = '100%';
          video.style.borderRadius = '12px';
          video.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.3)';
          
          currentVideo = video;
          
          video.addEventListener('error', () => {
            console.warn(`Failed to load modal video: ${currentMedia.src}`);
            const img = document.createElement('img');
            img.src = './img/portfolio/logo/EA.jpg';
            img.alt = 'Видео не загружено';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.borderRadius = '12px';
            videoContainer.innerHTML = '';
            videoContainer.appendChild(img);
          });
          
          videoContainer.appendChild(video);
          galleryContent.appendChild(videoContainer);
        } else {
          const imgContainer = document.createElement('div');
          imgContainer.style.width = '100%';
          imgContainer.style.height = '100%';
          imgContainer.style.display = 'flex';
          imgContainer.style.alignItems = 'center';
          imgContainer.style.justifyContent = 'center';
          
          const img = document.createElement('img');
          img.src = currentMedia.src;
          img.alt = currentMedia.alt || current.title;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          img.style.borderRadius = '12px';
          img.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.3)';
          img.style.objectFit = 'contain';
          
          img.addEventListener('error', () => {
            console.warn(`Failed to load modal image: ${currentMedia.src}`);
            img.src = './img/portfolio/logo/EA.jpg';
          });
          
          imgContainer.appendChild(img);
          galleryContent.appendChild(imgContainer);
        }

          requestAnimationFrame(() => {
            galleryContent.classList.remove('is-fading');
          });
        }, 200);
      }
      
      if (galleryThumbs) {
        galleryThumbs.innerHTML = '';
        current.media.forEach((media, i) => {
          const thumb = document.createElement('div');
          const isVideo = media.type === 'video';
          thumb.className = `gallery-thumbnail ${isVideo ? 'video' : ''} ${i === currentIndex ? 'active' : ''}`;
          thumb.setAttribute('data-index', i);
          
          // Ищем постер для видео в медиа-списке
          let thumbSrc = media.src;
          if (media.type === 'video') {
            // Пытаемся найти постер в том же проекте
            const posterMedia = current.media.find(m => 
              m.type === 'image' && 
              (m.src.includes(media.src.replace('.mp4', '-poster')) || 
               m.alt === media.alt + ' постер' ||
               m.src.includes(media.src.replace('.mp4', '')))
            );
            
            if (posterMedia) {
              thumbSrc = posterMedia.src;
            } else {
              // Если не нашли постер, ищем первое изображение в проекте
              const firstImage = current.media.find(m => m.type === 'image');
              if (firstImage) {
                thumbSrc = firstImage.src;
              } else {
                // Если вообще нет изображений, используем fallback
                thumbSrc = './img/portfolio/logo/EA.jpg';
              }
            }
          }
          
          if (isVideo) {
            const img = document.createElement('img');
            img.src = 'img/video-placeholder.jpg';
            img.alt = 'Видео';
            img.loading = 'lazy';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            thumb.appendChild(img);

            const videoIcon = document.createElement('div');
            videoIcon.style.position = 'absolute';
            videoIcon.style.top = '50%';
            videoIcon.style.left = '50%';
            videoIcon.style.transform = 'translate(-50%, -50%)';
            videoIcon.style.color = '#fff';
            videoIcon.style.fontSize = '16px';
            videoIcon.style.textShadow = '0 0 5px #000';
            videoIcon.innerHTML = '▶';
            thumb.appendChild(videoIcon);
          } else {
            const img = document.createElement('img');
            img.src = thumbSrc;
            img.alt = media.alt || current.title;
            img.loading = 'lazy';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';

            img.addEventListener('error', () => {
              console.warn(`Failed to load thumbnail: ${thumbSrc}`);
              img.src = './img/portfolio/logo/EA.jpg';
            });

            thumb.appendChild(img);
          }
          
          thumb.addEventListener('click', () => {
            currentIndex = i;
            renderGallery();
          });
          galleryThumbs.appendChild(thumb);
        });
      }
      
      if (prevBtn) prevBtn.style.display = current.media.length > 1 ? 'flex' : 'none';
      if (nextBtn) nextBtn.style.display = current.media.length > 1 ? 'flex' : 'none';
    }

    function nextMedia() {
      if (!current || current.media.length <= 1) return;
      currentIndex = (currentIndex + 1) % current.media.length;
      renderGallery();
    }

    function prevMedia() {
      if (!current || current.media.length <= 1) return;
      currentIndex = (currentIndex - 1 + current.media.length) % current.media.length;
      renderGallery();
    }

    // Обработчики кликов по карточкам
    $$('.portfolio-card').forEach(card => {
      card.addEventListener('click', () => {
        const pid = card.dataset.project || '1';
        openProject(pid, card);
      });
      
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const pid = card.dataset.project || '1';
          openProject(pid, card);
        }
      });
      
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Открыть проект: ${card.querySelector('.portfolio-title')?.textContent || 'Проект'}`);
    });

    if (prevBtn) prevBtn.addEventListener('click', prevMedia);
    if (nextBtn) nextBtn.addEventListener('click', nextMedia);
    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.currentTime = 0;
        currentVideo = null;
      }
      Modal.close(modal);
    });
    
    modal.addEventListener('click', (e) => { 
      if (e.target === modal) {
        if (currentVideo) {
          currentVideo.pause();
          currentVideo.currentTime = 0;
          currentVideo = null;
        }
        Modal.close(modal);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (!modal || modal.style.display !== 'block') return;
      if (e.key === 'Escape') {
        if (currentVideo) {
          currentVideo.pause();
          currentVideo.currentTime = 0;
          currentVideo = null;
        }
        Modal.close(modal);
      }
      if (e.key === 'ArrowLeft') prevMedia();
      if (e.key === 'ArrowRight') nextMedia();
    });
  }

  /* ====== FLOATING CATEGORIES PANEL ====== */
  function initFloatingCategories() {
    const floatingToggle = $('#floatingToggle');
    const categoriesDropdown = $('#categoriesDropdown');
    const closeCategories = $('#closeCategories');
  
    if (!floatingToggle || !categoriesDropdown) return;
  
    floatingToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      floatingToggle.classList.toggle('active');
      categoriesDropdown.classList.toggle('open');
    });
  
    if (closeCategories) {
      closeCategories.addEventListener('click', (e) => {
        e.stopPropagation();
        floatingToggle.classList.remove('active');
        categoriesDropdown.classList.remove('open');
      });
    }
  
    document.addEventListener('click', (e) => {
      if (!floatingToggle.contains(e.target) && !categoriesDropdown.contains(e.target)) {
        floatingToggle.classList.remove('active');
        categoriesDropdown.classList.remove('open');
      }
    });
  
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        floatingToggle.classList.remove('active');
        categoriesDropdown.classList.remove('open');
      }
    });
  
    const categoryLinks = $$('.category-link');
    categoryLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetElement = $(targetId);
      
        if (targetElement) {
          floatingToggle.classList.remove('active');
          categoriesDropdown.classList.remove('open');
        
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        
          targetElement.style.transition = 'all 0.3s ease';
          targetElement.style.boxShadow = '0 0 0 4px rgba(0,229,255,.3)';
          setTimeout(() => {
            targetElement.style.boxShadow = 'none';
          }, 1500);
        }
      });
    });
  }


  /* ====== BLUE PARTICLES ====== */
  (function initParticles() {
    const container = document.body;
    if (!container) return;

    let particles = [];
    let lastSpawn = 0;
    let mouse = { x: -1000, y: -1000 };

    function spawn(x, y) {
      if (particles.length >= CONFIG.particles.max) return;
      const el = document.createElement('div');
      el.className = 'blue-particle';
      const size = Math.random() * 3 + 2;
      el.style.width = el.style.height = `${size}px`;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = '0.9';
      el.style.position = 'fixed';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '9998';
      container.appendChild(el);
      particles.push({
        el, x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: CONFIG.particles.lifeFrames
      });
    }

    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      const now = performance.now();
      if (now - lastSpawn > CONFIG.particles.spawnIntervalMs) {
        spawn(mouse.x + (Math.random() - 0.5) * 24, mouse.y + (Math.random() - 0.5) * 24);
        lastSpawn = now;
      }
    }, { passive: true });

    setInterval(() => {
      if (particles.length < 4 && mouse.x > -900) {
        spawn(mouse.x + (Math.random() - 0.5) * 40, mouse.y + (Math.random() - 0.5) * 40);
      }
    }, 400);

    function update() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        const lifeRatio = p.life / CONFIG.particles.lifeFrames;
        p.el.style.left = `${p.x}px`;
        p.el.style.top = `${p.y}px`;
        p.el.style.opacity = String(lifeRatio * 0.9);
        p.el.style.transform = `scale(${0.5 + lifeRatio * 0.6})`;
        if (p.life <= 0) {
          p.el.remove();
          particles.splice(i, 1);
        }
      }
      requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  })();

  /* ====== SMOOTH SCROLL FOR HASH LINKS ====== */
  (function smoothHash() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  })();

  /* ====== DISABLE IMAGE SAVE INTERACTIONS ====== */
  (function lockImages() {
    document.addEventListener('contextmenu', (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });
    document.addEventListener('dragstart', (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });
  })();

  /* ====== ЗАПУСК ВСЕХ ФУНКЦИЙ ====== */
  function safeInit(fn, name) {
    try {
      fn();
    } catch(e) {
      console.error(`Error in ${name}:`, e);
    }
  }

  // Запускаем в правильном порядке
  safeInit(initScrollAnimations, 'initScrollAnimations');
  safeInit(initLazy, 'initLazy');
  safeInit(initCarousel, 'initCarousel');
  safeInit(initPortfolioCards, 'initPortfolioCards');
  safeInit(initPortfolioModal, 'initPortfolioModal');
  safeInit(initFloatingCategories, 'initFloatingCategories');
});
