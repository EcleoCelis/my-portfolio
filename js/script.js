document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       DARK MODE ENGINE WITH SYSTEM PREFERENCE & STORAGE RESILIENCE
       ========================================================================== */
    const themeToggle = document.getElementById('themeToggle');
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getStoredTheme = () => {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            return null;
        }
    };

    const setStoredTheme = (theme) => {
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            // Storage unavailable or blocked in privacy mode; continue in-memory
        }
    };

    const storedTheme = getStoredTheme() ||
                        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    if (storedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
    } else if (themeToggle) {
        themeToggle.setAttribute('aria-pressed', 'false');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            let newTheme = 'light';

            if (currentTheme !== 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                newTheme = 'dark';
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            themeToggle.setAttribute('aria-pressed', String(newTheme === 'dark'));
            setStoredTheme(newTheme);
        });
    }

    /* ==========================================================================
       MOBILE NAVIGATION OFF-CANVAS CONTROLLER
       ========================================================================== */
    const hamburger = document.getElementById('hamburger');
    const navbarMenu = document.getElementById('navbarMenu');
    const navbarLinks = document.querySelectorAll('.navbar__link');

    const closeMenu = () => {
        if (!navbarMenu || !hamburger) return;
        navbarMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        if (document.body && document.body.style) document.body.style.overflow = '';
    };

    const toggleMenu = () => {
        if (!navbarMenu || !hamburger) return;
        const isOpen = navbarMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        if (document.body && document.body.style) {
            document.body.style.overflow = isOpen ? 'hidden' : '';
        }
    };

    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }

    navbarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarMenu && navbarMenu.classList.contains('open')) closeMenu();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navbarMenu && navbarMenu.classList.contains('open')) {
            closeMenu();
            if (hamburger) hamburger.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (navbarMenu && navbarMenu.classList.contains('open')) {
            if (!navbarMenu.contains(e.target) && hamburger && !hamburger.contains(e.target)) {
                closeMenu();
            }
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && navbarMenu && navbarMenu.classList.contains('open')) {
            closeMenu();
        }
    });

    /* ==========================================================================
       STICKY HEADER MECHANICS & ACTIVE LINK INTERSECTION MONITOR
       ========================================================================== */
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section[id]');
    const backToTop = document.getElementById('backToTop');
    let isScrollTicking = false;

    const handleScroll = () => {
        const scrollY = window.scrollY;

        // Sticky Navbar Effect
        if (navbar) {
            if (scrollY > 20) {
                navbar.classList.add('navbar--scrolled');
            } else {
                navbar.classList.remove('navbar--scrolled');
            }
        }

        // Back To Top Display
        if (backToTop) {
            if (scrollY > 600) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }

        // Dynamic Highlighting of Links via Active Viewport Location
        const docHeight = document.documentElement ? document.documentElement.scrollHeight : 0;
        const atBottom = docHeight > 0 && (window.innerHeight + scrollY >= docHeight - 24);
        let activeId = null;

        if (atBottom && sections.length > 0) {
            activeId = sections[sections.length - 1].getAttribute('id');
        } else {
            sections.forEach(current => {
                const sectionHeight = current.offsetHeight;
                const sectionTop = current.offsetTop - 100;
                if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                    activeId = current.getAttribute('id');
                }
            });
        }

        sections.forEach(current => {
            const sectionId = current.getAttribute('id');
            const targetLink = document.querySelector(`.navbar__link[href="#${sectionId}"]`);
            if (targetLink) {
                targetLink.classList.toggle('active-link', sectionId === activeId);
            }
        });
        isScrollTicking = false;
    };

    window.addEventListener('scroll', () => {
        if (!isScrollTicking) {
            window.requestAnimationFrame(handleScroll);
            isScrollTicking = true;
        }
    }, { passive: true });

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
    }

    /* ==========================================================================
       TYPING SIMULATION STRINGS ENGINE
       ========================================================================== */
    const typingText = document.getElementById('typing-text');
    const phrases = ["IT Support & Systems Aspirant.", "Web & Application Developer.", "Graphic & UI Designer."];
    let phraseIdx = 0;
    let letterIdx = 0;
    let isDeleting = false;

    const executeTypeSequence = () => {
        const currentString = phrases[phraseIdx];
        
        if (isDeleting) { 
            typingText.textContent = currentString.substring(0, letterIdx - 1); 
            letterIdx--;
        } else {
            typingText.textContent = currentString.substring(0, letterIdx + 1);
            letterIdx++;
        }

        let pace = isDeleting ? 40 : 80;

        if (!isDeleting && letterIdx === currentString.length) {
            pace = 2000; // Pause at completion point
            isDeleting = true;
        } else if (isDeleting && letterIdx === 0) {
            isDeleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            pace = 400; // Inter-phrase breathing space
        }

        setTimeout(executeTypeSequence, pace);
    };
    
    if (typingText) {
        if (prefersReducedMotion) {
            typingText.textContent = phrases[0];
        } else {
            executeTypeSequence();
        }
    }

    /* ==========================================================================
       INTERACTIVE HERO PROFILE IMAGE (HOVER, TOUCH & KEYBOARD TOGGLE)
       ========================================================================== */
    const profileToggle = document.getElementById('profileImageToggle');
    const profileHint = document.getElementById('profileImageHint');
    const profileFunnyImg = document.getElementById('profileFunnyImg');

    if (profileToggle && profileHint) {
        const primaryImg = profileToggle.querySelector ? profileToggle.querySelector('.my-profile--primary') : null;
        let isHoveringProfile = false;
        let isToggledProfile = false;
        let altProfileFailed = false;

        const isTouchDevice = () => {
            try {
                return Boolean(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);
            } catch (e) {
                return false;
            }
        };

        const getDefaultHintText = () => (
            isTouchDevice() ? 'Tap to see my other side ✨' : 'Hover to see my other side ✨'
        );

        const getActiveCaptionText = () => (
            isTouchDevice()
                ? 'Still a developer, just less serious 😄 (Tap to switch back)'
                : 'Still a developer, just less serious 😄'
        );

        const warmAltImage = () => {
            if (!profileFunnyImg || altProfileFailed) return;
            if (profileFunnyImg.getAttribute && profileFunnyImg.getAttribute('loading') === 'lazy') {
                profileFunnyImg.setAttribute('loading', 'eager');
            }
        };

        const syncProfileVisual = () => {
            if (altProfileFailed) {
                profileToggle.classList.remove('is-alt-active');
                profileToggle.setAttribute('aria-pressed', 'false');
                profileToggle.setAttribute('data-alt-failed', 'true');
                profileHint.hidden = true;
                return;
            }

            const showAlt = isHoveringProfile || isToggledProfile;
            profileToggle.classList.toggle('is-alt-active', showAlt);
            profileToggle.setAttribute('aria-pressed', String(showAlt));
            profileHint.classList.toggle('is-alt-active', showAlt);
            profileHint.textContent = showAlt ? getActiveCaptionText() : getDefaultHintText();

            if (primaryImg && primaryImg.setAttribute) {
                primaryImg.setAttribute('aria-hidden', String(showAlt));
            }
            if (profileFunnyImg && profileFunnyImg.setAttribute) {
                profileFunnyImg.setAttribute('aria-hidden', String(!showAlt));
            }
        };

        if (profileFunnyImg && typeof profileFunnyImg.addEventListener === 'function') {
            profileFunnyImg.addEventListener('error', () => {
                altProfileFailed = true;
                isHoveringProfile = false;
                isToggledProfile = false;
                syncProfileVisual();
            });
        }

        // Preload alternate image cleanly after initial load settles to prevent hover flicker without impacting LCP
        if (window && typeof window.addEventListener === 'function') {
            window.addEventListener('load', warmAltImage, { once: true });
        }

        // Desktop pointer hover (explicitly ignores synthetic touch pointerenter/leave)
        profileToggle.addEventListener('pointerenter', (e) => {
            if (e && e.pointerType && e.pointerType !== 'mouse') return;
            if (isTouchDevice()) return;
            warmAltImage();
            isHoveringProfile = true;
            syncProfileVisual();
        });

        profileToggle.addEventListener('pointerleave', (e) => {
            if (e && e.pointerType && e.pointerType !== 'mouse') return;
            isHoveringProfile = false;
            isToggledProfile = false;
            syncProfileVisual();
        });

        // Touch tap & Keyboard Enter/Space activation (native click prevents accidental toggle during scroll)
        profileToggle.addEventListener('click', (e) => {
            if (altProfileFailed) return;
            warmAltImage();
            const isKeyboard = Boolean(e && e.detail === 0);
            if (isKeyboard || isTouchDevice()) {
                isToggledProfile = !isToggledProfile;
                isHoveringProfile = false;
            } else {
                // Mouse click on desktop toggles cleanly
                const currentlyShown = isHoveringProfile || isToggledProfile;
                isToggledProfile = !currentlyShown;
                isHoveringProfile = false;
            }
            syncProfileVisual();
        });

        profileToggle.addEventListener('focus', warmAltImage);

        profileToggle.addEventListener('keydown', (e) => {
            if (e && e.key === 'Escape' && (isToggledProfile || isHoveringProfile)) {
                isToggledProfile = false;
                isHoveringProfile = false;
                syncProfileVisual();
            }
        });

        syncProfileVisual();
    }

    /* ==========================================================================
       ECOSYSTEM FILTER ENGINE & DENSITY OPTIMIZER (OVERCROWD PREVENTION)
       ========================================================================== */
    const INITIAL_PROJECTS_LIMIT = 4; // Max initial visible cards on homepage to prevent grid overcrowding
    let activeFilterCriterion = 'all';

    const viewAllProjectsBtn = document.getElementById('viewAllProjectsBtn');
    const viewAllProjectsHeaderLink = document.getElementById('viewAllProjectsHeaderLink');
    const totalProjectsCountBadge = document.getElementById('totalProjectsCountBadge');

    const updateProjectsVisibility = () => {
        const projectCards = Array.from(document.querySelectorAll('.project-card'));
        const matchingCards = projectCards.filter(card => {
            const category = (card.getAttribute('data-category') || '').toLowerCase();
            return activeFilterCriterion === 'all' || category === activeFilterCriterion.toLowerCase();
        });

        const totalMatching = matchingCards.length;
        let visibleCount = 0;

        projectCards.forEach(card => {
            const category = (card.getAttribute('data-category') || '').toLowerCase();
            const isMatch = activeFilterCriterion === 'all' || category === activeFilterCriterion.toLowerCase();
            if (isMatch) {
                const matchIndex = matchingCards.indexOf(card);
                if (matchIndex < INITIAL_PROJECTS_LIMIT) {
                    card.hidden = false;
                    card.style.display = 'flex';
                    requestAnimationFrame(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    });
                    visibleCount++;
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(8px)';
                    card.hidden = true;
                    card.style.display = 'none';
                }
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(8px)';
                card.hidden = true;
                card.style.display = 'none';
            }
        });

        // Manage Empty State
        const grid = document.querySelector('.projects__grid');
        let emptyState = document.getElementById('projectsEmptyState');
        if (totalMatching === 0) {
            if (!emptyState && grid) {
                emptyState = document.createElement('div');
                emptyState.id = 'projectsEmptyState';
                emptyState.className = 'projects__empty-state';
                emptyState.textContent = 'No featured projects currently listed under this category.';
                grid.appendChild(emptyState);
            }
            if (emptyState) emptyState.hidden = false;
        } else if (emptyState) {
            emptyState.hidden = true;
        }
    };

    const applyProjectFilter = (filterCriterion) => {
        activeFilterCriterion = filterCriterion || 'all';
        updateProjectsVisibility();

        const targetUrl = activeFilterCriterion === 'all'
            ? 'projects.html'
            : `projects.html?category=${encodeURIComponent(activeFilterCriterion)}`;

        if (viewAllProjectsBtn) {
            viewAllProjectsBtn.href = targetUrl;
        }
        if (viewAllProjectsHeaderLink) {
            viewAllProjectsHeaderLink.href = targetUrl;
        }
    };

    const bindFilterButtons = () => {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(button => {
            button.onclick = () => {
                buttons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');

                const filterCriterion = button.getAttribute('data-filter') || 'all';
                applyProjectFilter(filterCriterion);
            };
        });
    };
    bindFilterButtons();
    updateProjectsVisibility();

    /* ==========================================================================
       TESTIMONIAL CAROUSEL TRANSITION SYSTEM (AUTO-ROTATING & MANUAL CONTROLS)
       ========================================================================== */
    const carousel = document.getElementById('testimonialCarousel');
    const items = document.querySelectorAll('.carousel__item');
    const carouselControls = document.querySelector('.carousel-controls');
    const carouselContainer = document.querySelector('.carousel-container');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentCarouselIndex = 0;
    let autoplayTimer = null;
    const AUTOPLAY_INTERVAL_MS = 5000; // Automatically advances every 5 seconds

    const renderCarouselSlide = () => {
        if (!carousel || items.length === 0) return;
        carousel.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    };

    const nextCarouselSlide = () => {
        if (items.length <= 1) return;
        currentCarouselIndex = (currentCarouselIndex + 1) % items.length;
        renderCarouselSlide();
    };

    const prevCarouselSlide = () => {
        if (items.length <= 1) return;
        currentCarouselIndex = (currentCarouselIndex - 1 + items.length) % items.length;
        renderCarouselSlide();
    };

    const startCarouselAutoplay = () => {
        if (autoplayTimer || items.length <= 1) return;
        autoplayTimer = setInterval(() => {
            nextCarouselSlide();
        }, AUTOPLAY_INTERVAL_MS);
    };

    const stopCarouselAutoplay = () => {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    };

    const resetCarouselAutoplay = () => {
        stopCarouselAutoplay();
        startCarouselAutoplay();
    };

    if (carousel && items.length > 1) {
        // Retain and enhance arrow button click listeners
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextCarouselSlide();
                resetCarouselAutoplay();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevCarouselSlide();
                resetCarouselAutoplay();
            });
        }

        // Pause on hover or focus to allow comfortable reading
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', stopCarouselAutoplay);
            carouselContainer.addEventListener('mouseleave', startCarouselAutoplay);
            carouselContainer.addEventListener('focusin', stopCarouselAutoplay);
            carouselContainer.addEventListener('focusout', startCarouselAutoplay);

            // Touch swipe support for mobile
            let touchStartX = 0;
            carouselContainer.addEventListener('touchstart', (e) => {
                stopCarouselAutoplay();
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            carouselContainer.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 40) {
                    if (diff > 0) nextCarouselSlide();
                    else prevCarouselSlide();
                }
                startCarouselAutoplay();
            }, { passive: true });
        }

        // Pause autoplay if browser tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopCarouselAutoplay();
            } else {
                startCarouselAutoplay();
            }
        });

        // Initialize automatic functioning immediately
        startCarouselAutoplay();
    } else if (carouselControls && items.length <= 1) {
        carouselControls.hidden = true;
        carouselControls.style.display = 'none';
    }

    /* ==========================================================================
       ASYNC COUNTER SCROLL INTERSECTION TRIGGERS
       ========================================================================== */
    const counterNumbers = document.querySelectorAll('.counter-card__number');
    
    const startCounterSequence = (element) => {
        const limit = parseInt(element.getAttribute('data-target'), 10);
        if (prefersReducedMotion) {
            element.textContent = limit;
            return;
        }
        let currentCount = 0;
        const speedFactor = Math.ceil(limit / 30); // Balances progression pacing smoothly

        const step = () => {
            currentCount += speedFactor;
            if (currentCount >= limit) {
                element.textContent = limit;
            } else {
                element.textContent = currentCount;
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    };

    /* ==========================================================================
       SCROLL REVEAL & INTERSECTION OBSERVATION ENGINE
       ========================================================================== */
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const generalObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');

                    // If current item is a counter element inside viewport, kick off runtime loop
                    if (entry.target.classList.contains('about__facts')) {
                        counterNumbers.forEach(num => startCounterSequence(num));
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.scroll-reveal').forEach(el => generalObserver.observe(el));
    } else {
        document.querySelectorAll('.scroll-reveal').forEach(el => el.classList.add('revealed'));
    }

    /* ==========================================================================
       PROJECT CASE STUDY MODAL & RESUME / EMAIL HIRING WORKFLOWS
       ========================================================================== */
    const PROJECT_CASE_STUDIES = {
        nutricare: {
            tag: 'Health Tech',
            title: 'NutriCare Platform',
            desc: 'A secure, cloud-enabled operational community platform offering offline metrics gathering and healthcare visualization analytics.',
            role: 'Capstone Project Leader (2025 — Present) — Led responsive interface architecture in Laravel and Tailwind CSS, optimized relational PostgreSQL queries, and integrated community healthcare analytics subsystems.',
            highlights: [
                'Designed responsive, accessible dashboard layouts using Laravel Blade and Tailwind CSS.',
                'Implemented offline-capable community health metrics collection workflows.',
                'Optimized relational PostgreSQL queries for healthcare visualization and reporting.'
            ],
            tech: ['Laravel', 'Tailwind CSS', 'PostgreSQL'],
            status: 'Academic Capstone Project — Public live deployment and repository URLs are pending institutional release. Use the button below to request a live code walkthrough or technical architecture review.'
        }
    };

    /* ==========================================================================
       IMAGE LIGHTBOX VIEWER ENGINE
       ========================================================================== */
    const imageLightboxModal = document.getElementById('imageLightboxModal');
    const imageLightboxBackdrop = document.getElementById('imageLightboxBackdrop');
    const imageLightboxClose = document.getElementById('imageLightboxClose');
    const imageLightboxImg = document.getElementById('imageLightboxImg');
    const imageLightboxTitle = document.getElementById('imageLightboxTitle');
    const imageLightboxTag = document.getElementById('imageLightboxTag');
    let lastFocusedLightboxTrigger = null;

    const openImageLightbox = (imageUrl, title, tag) => {
        if (!imageLightboxModal || !imageUrl) return;
        lastFocusedLightboxTrigger = document.activeElement;
        if (imageLightboxImg) {
            imageLightboxImg.src = imageUrl;
            imageLightboxImg.alt = title ? `${title} full view` : 'Project image full preview';
        }
        if (imageLightboxTitle) imageLightboxTitle.textContent = title || '';
        if (imageLightboxTag) imageLightboxTag.textContent = tag || '';

        imageLightboxModal.hidden = false;
        if (document.body && document.body.style) document.body.style.overflow = 'hidden';
        if (imageLightboxClose) imageLightboxClose.focus();
    };

    const closeImageLightbox = () => {
        if (!imageLightboxModal || imageLightboxModal.hidden) return;
        imageLightboxModal.hidden = true;
        if (document.body && document.body.style) document.body.style.overflow = '';
        if (lastFocusedLightboxTrigger && typeof lastFocusedLightboxTrigger.focus === 'function') {
            lastFocusedLightboxTrigger.focus();
        }
    };

    if (imageLightboxClose) imageLightboxClose.addEventListener('click', closeImageLightbox);
    if (imageLightboxBackdrop) imageLightboxBackdrop.addEventListener('click', closeImageLightbox);

    /* ==========================================================================
       CASE STUDY ARCHITECTURAL MODAL DIALOG CONTROLLER
       ========================================================================== */
    const projectModal = document.getElementById('projectModal');
    const projectModalClose = document.getElementById('projectModalClose');
    const projectModalDismissBtn = document.getElementById('projectModalDismissBtn');
    const projectModalInquireBtn = document.getElementById('projectModalInquireBtn');
    const projectModalImageContainer = document.getElementById('projectModalImageContainer');
    const projectModalImg = document.getElementById('projectModalImg');
    const projectModalZoomBtn = document.getElementById('projectModalZoomBtn');
    const caseStudyButtons = document.querySelectorAll('.project-case-study-btn');
    let lastFocusedModalTrigger = null;

    const openProjectModal = (projectId, triggerEl) => {
        const data = PROJECT_CASE_STUDIES[projectId];
        if (!projectModal || !data) return;

        lastFocusedModalTrigger = triggerEl || document.activeElement;
        const tagEl = document.getElementById('projectModalTag');
        const titleEl = document.getElementById('projectModalTitle');
        const descEl = document.getElementById('projectModalDesc');
        const roleEl = document.getElementById('projectModalRole');
        const highlightsEl = document.getElementById('projectModalHighlights');
        const techEl = document.getElementById('projectModalTech');
        const statusEl = document.getElementById('projectModalStatus');

        if (tagEl) tagEl.textContent = data.tag;
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        if (roleEl) roleEl.textContent = data.role;
        if (statusEl) statusEl.textContent = data.status;

        // Image Showcase in Case Study Modal
        if (projectModalImageContainer && projectModalImg) {
            if (data.image_data) {
                projectModalImg.src = data.image_data;
                projectModalImg.alt = data.title ? `${data.title} Preview` : 'Project Preview';
                projectModalImageContainer.hidden = false;

                const triggerZoom = () => openImageLightbox(data.image_data, data.title, data.tag);
                projectModalImg.onclick = triggerZoom;
                if (projectModalZoomBtn) projectModalZoomBtn.onclick = triggerZoom;
            } else {
                projectModalImg.src = '';
                projectModalImg.alt = '';
                projectModalImageContainer.hidden = true;
            }
        }

        const roleHeading = document.getElementById('projectModalRoleHeading');
        const highlightsHeading = document.getElementById('projectModalHighlightsHeading');
        const techHeading = document.getElementById('projectModalTechHeading');
        const statusHeading = document.getElementById('projectModalStatusHeading');
        const isDesign = data.project_type === 'design';

        if (roleHeading) {
            roleHeading.textContent = isDesign ? 'Design Role & Creative Process' : 'Role & Engineering Contributions';
        }
        if (highlightsHeading) {
            highlightsHeading.textContent = isDesign ? 'Key Design Highlights & Deliverables' : 'Key Capabilities & Architecture';
        }
        if (techHeading) {
            techHeading.textContent = isDesign ? 'Design Tools & Deliverables' : 'Technology Stack';
        }
        if (statusHeading) {
            statusHeading.textContent = isDesign ? 'Deliverables & Prototype Access' : 'Availability & Code Access';
        }
        if (projectModalInquireBtn) {
            projectModalInquireBtn.textContent = isDesign ? 'Request Design Walkthrough & Assets' : 'Request Walkthrough / Code Review';
        }

        if (highlightsEl) {
            highlightsEl.textContent = '';
            data.highlights.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                highlightsEl.appendChild(li);
            });
        }

        if (techEl) {
            techEl.textContent = '';
            data.tech.forEach(t => {
                const span = document.createElement('span');
                span.textContent = t;
                techEl.appendChild(span);
            });
        }

        projectModal.hidden = false;
        if (document.body && document.body.style) document.body.style.overflow = 'hidden';
        if (projectModalClose) projectModalClose.focus();
    };

    const closeProjectModal = () => {
        if (!projectModal || projectModal.hidden) return;
        projectModal.hidden = true;
        if (document.body && document.body.style) document.body.style.overflow = '';
        if (lastFocusedModalTrigger && typeof lastFocusedModalTrigger.focus === 'function') {
            lastFocusedModalTrigger.focus();
        }
    };

    caseStudyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId = btn.getAttribute('data-project-modal');
            openProjectModal(projectId, btn);
        });
    });

    if (projectModalClose) projectModalClose.addEventListener('click', closeProjectModal);
    if (projectModalDismissBtn) projectModalDismissBtn.addEventListener('click', closeProjectModal);
    if (projectModalInquireBtn) {
        projectModalInquireBtn.addEventListener('click', () => {
            const titleEl = document.getElementById('projectModalTitle');
            const projectTitle = titleEl ? titleEl.textContent : 'Project';
            closeProjectModal();
            const inquirySelect = document.getElementById('inquiryType');
            const subjectInput = document.getElementById('subject');
            if (inquirySelect) inquirySelect.value = 'technical';
            if (subjectInput && !subjectInput.value) {
                subjectInput.value = `Walkthrough / Code Review Request: ${projectTitle}`;
            }
        });
    }

    if (projectModal) {
        projectModal.addEventListener('click', (e) => {
            if (e.target === projectModal) closeProjectModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const resModal = document.getElementById('resumeDownloadModal');
            if (imageLightboxModal && !imageLightboxModal.hidden) {
                closeImageLightbox();
            } else if (resModal && !resModal.hidden) {
                resModal.hidden = true;
                if (document.body && document.body.style) document.body.style.overflow = '';
            } else if (projectModal && !projectModal.hidden) {
                closeProjectModal();
            }
        }
    });

    /* ==========================================================================
       DYNAMIC POSTGRESQL PROJECTS INGESTION WITH ZERO-FLASH FALLBACK
       ========================================================================== */
    const loadDynamicProjects = async () => {
        const grid = document.querySelector('.projects__grid');
        if (!grid || typeof fetch !== 'function' || !window.location || !/^https?:$/i.test(window.location.protocol)) {
            return;
        }

        try {
            const res = await fetch('/api/projects');
            if (!res.ok) return;
            const data = await res.json();
            if (!data.ok || !Array.isArray(data.projects)) return;

            // Clear hardcoded fallback studies so only admin database projects exist
            for (const key in PROJECT_CASE_STUDIES) {
                delete PROJECT_CASE_STUDIES[key];
            }

            if (data.projects.length === 0) {
                grid.innerHTML = '';
                if (totalProjectsCountBadge) totalProjectsCountBadge.textContent = '0';
                applyProjectFilter('all');
                return;
            }

            // Dynamically synchronize category filter tabs from PostgreSQL categories
            const filtersContainer = document.querySelector('.projects__filters');
            if (filtersContainer) {
                const categoryMap = new Map();
                data.projects.forEach(p => {
                    const catSlug = (p.category || 'general').toLowerCase();
                    const catName = p.tag || p.category || 'General';
                    if (!categoryMap.has(catSlug)) {
                        categoryMap.set(catSlug, catName);
                    }
                });

                const currentActive = filtersContainer.querySelector('.filter-btn.active');
                const activeFilter = currentActive ? currentActive.getAttribute('data-filter') : 'all';

                filtersContainer.innerHTML = '';
                const allBtn = document.createElement('button');
                allBtn.type = 'button';
                allBtn.className = 'filter-btn' + (activeFilter === 'all' ? ' active' : '');
                allBtn.setAttribute('data-filter', 'all');
                allBtn.setAttribute('aria-pressed', (activeFilter === 'all').toString());
                allBtn.textContent = 'All Projects';
                filtersContainer.appendChild(allBtn);

                categoryMap.forEach((name, slug) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'filter-btn' + (activeFilter === slug ? ' active' : '');
                    btn.setAttribute('data-filter', slug);
                    btn.setAttribute('aria-pressed', (activeFilter === slug).toString());
                    btn.textContent = name;
                    filtersContainer.appendChild(btn);
                });

                bindFilterButtons();
            }

            const escapeHtml = (str) => String(str == null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            data.projects.forEach(p => {
                const slug = p.slug || ('proj-' + p.id);
                const isDesign = p.project_type === 'design';
                PROJECT_CASE_STUDIES[slug] = {
                    tag: p.tag || (isDesign ? 'Design Showcase' : 'System Project'),
                    title: p.title,
                    desc: p.description || '',
                    image_data: p.image_data || '',
                    project_type: p.project_type || 'system',
                    role: p.role_details || p.role_contributions || '',
                    highlights: Array.isArray(p.highlights) && p.highlights.length ? p.highlights : [
                        isDesign ? 'Created visual layout, typography hierarchy, and print/digital-ready assets.' : 'Engineered core responsive interface and component architecture.',
                        isDesign ? 'Refined visual balance and branding clarity for the target audience.' : 'Optimized relational data access and operational workflows.'
                    ],
                    tech: Array.isArray(p.tech_stack) ? p.tech_stack : [],
                    status: p.status_note || (isDesign
                        ? (p.live_url ? ('Interactive prototype available at ' + p.live_url + '.') : 'High-resolution design preview available above; source files available upon request.')
                        : (p.repo_url ? ('Source code is publicly available at ' + p.repo_url + '.') : 'Pending public release.'))
                };
            });

            if (totalProjectsCountBadge && Array.isArray(data.projects)) {
                totalProjectsCountBadge.textContent = String(data.projects.length);
            }

            grid.innerHTML = '';
            data.projects.forEach(p => {
                const slug = p.slug || ('proj-' + p.id);
                const safeSlug = escapeHtml(slug);
                const safeTitle = escapeHtml(p.title);
                const safeDesc = escapeHtml(p.description || '');
                const safeTag = escapeHtml(p.tag || (p.project_type === 'design' ? 'Design' : 'Featured'));
                const safeLiveUrl = p.live_url ? escapeHtml(p.live_url) : '';
                const safeRepoUrl = p.repo_url ? escapeHtml(p.repo_url) : '';
                const isDesign = p.project_type === 'design';
                const card = document.createElement('div');
                card.className = 'project-card scroll-reveal revealed';
                card.setAttribute('data-category', (p.category || 'general').toLowerCase());
                card.setAttribute('data-project-id', slug);

                const imageHtml = p.image_data
                    ? '<div class="project-card__image-clickable" role="button" tabindex="0" aria-label="View full image for ' + safeTitle + '">' +
                      '<img src="' + escapeHtml(p.image_data) + '" alt="' + safeTitle + ' Preview" class="project-card__img" loading="lazy">' +
                      '<span class="project-card__zoom-badge" aria-hidden="true">' +
                      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>' +
                      '<span>View Image</span>' +
                      '</span>' +
                      '</div>'
                    : '<div class="project-card__placeholder"><span>' + safeTitle + '</span></div>';

                const techHtml = (Array.isArray(p.tech_stack) ? p.tech_stack : [])
                    .map(t => '<span>' + escapeHtml(t) + '</span>')
                    .join('');

                let extLinksHtml = '';
                let statusPillHtml = '';

                if (isDesign) {
                    if (safeLiveUrl) {
                        extLinksHtml += '<a href="' + safeLiveUrl + '" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View prototype for ' + safeTitle + '"><span>Prototype</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>';
                    } else if (p.image_data) {
                        extLinksHtml = '<button type="button" class="project-card__ext-link project-card__preview-btn" aria-label="Open full-screen preview for ' + safeTitle + '"><span>Full Preview</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>';
                    } else {
                        extLinksHtml = '<span class="project-card__dev-badge project-card__dev-badge--design" title="Interactive prototype in progress"><span class="project-card__dev-dot"></span>Design in Progress</span>';
                        statusPillHtml = '<span class="project-card__status-pill project-card__status-pill--design">Design in Progress</span>';
                    }
                } else {
                    if (safeLiveUrl) {
                        extLinksHtml += '<a href="' + safeLiveUrl + '" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="Visit live demo for ' + safeTitle + '"><span>Demo</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>';
                    }
                    if (safeRepoUrl) {
                        extLinksHtml += '<a href="' + safeRepoUrl + '" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View repository for ' + safeTitle + '"><span>GitHub</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>';
                    }
                    if (!safeLiveUrl && !safeRepoUrl) {
                        extLinksHtml = '<span class="project-card__dev-badge" title="Source repository and live deployment in active development"><span class="project-card__dev-dot"></span>In-development</span>';
                        statusPillHtml = '<span class="project-card__status-pill project-card__status-pill--dev">In-development</span>';
                    }
                }

                const typePillHtml = isDesign
                    ? '<span class="project-card__type-pill project-card__type-pill--design">🎨 Design</span>'
                    : '<span class="project-card__type-pill project-card__type-pill--system">💻 Code</span>';

                card.innerHTML = [
                    '<div class="project-card__image-wrapper">',
                    imageHtml,
                    '</div>',
                    '<div class="project-card__content">',
                    '<div class="project-card__header-meta">',
                    '<span class="project-card__tag">' + safeTag + '</span>',
                    typePillHtml,
                    statusPillHtml,
                    '</div>',
                    '<h3 class="project-card__title">' + safeTitle + '</h3>',
                    '<p class="project-card__desc">' + safeDesc + '</p>',
                    '<div class="project-card__tech">',
                    techHtml,
                    '</div>',
                    '<div class="project-card__links">',
                    '<button type="button" class="project-card__case-btn project-case-study-btn" data-project-modal="' + safeSlug + '" aria-haspopup="dialog">Case Study</button>',
                    '<div class="project-card__ext-links">' + extLinksHtml + '</div>',
                    '</div>',
                    '</div>'
                ].join('');

                const caseBtn = card.querySelector('.project-case-study-btn');
                if (caseBtn) {
                    caseBtn.addEventListener('click', () => {
                        openProjectModal(slug, caseBtn);
                    });
                }

                const previewBtn = card.querySelector('.project-card__preview-btn');
                if (previewBtn && p.image_data) {
                    previewBtn.addEventListener('click', () => {
                        openImageLightbox(p.image_data, p.title, p.tag || 'Design Showcase');
                    });
                }

                const imgClickable = card.querySelector('.project-card__image-clickable');
                if (imgClickable && p.image_data) {
                    const triggerImageZoom = () => {
                        openImageLightbox(p.image_data, p.title, p.tag || (isDesign ? 'Design Showcase' : 'System Project'));
                    };
                    imgClickable.addEventListener('click', triggerImageZoom);
                    imgClickable.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            triggerImageZoom();
                        }
                    });
                }

                grid.appendChild(card);
            });

            const activeFilterBtn = document.querySelector('.filter-btn.active');
            const activeFilter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
            applyProjectFilter(activeFilter || 'all');
        } catch (err) {
            // Graceful fallback to static HTML
        }
    };

    loadDynamicProjects();

    // Resume Download Verification, Optional Identification Modal & Honest Fallback
    const resumeLink = document.getElementById('resumeDownloadLink');
    const resumeStatusNote = document.getElementById('resumeStatusNote');
    const resumeDownloadModal = document.getElementById('resumeDownloadModal');
    const resumeModalClose = document.getElementById('resumeModalClose');
    const resumeDirectDownloadBtn = document.getElementById('resumeDirectDownloadBtn');
    const resumeIdentifyForm = document.getElementById('resumeIdentifyForm');
    const resumeModalError = document.getElementById('resumeModalError');
    let pendingResumeHref = '/api/resume';

    const closeResumeModal = () => {
        if (!resumeDownloadModal || resumeDownloadModal.hidden) return;
        resumeDownloadModal.hidden = true;
        if (document.body && document.body.style) document.body.style.overflow = '';
        if (resumeLink && typeof resumeLink.focus === 'function') resumeLink.focus();
    };

    const buildTrackedResumeUrl = (baseHref, reqId) => {
        const analyticsApi = window.PortfolioAnalytics;
        if (!analyticsApi || analyticsApi.isOptedOut()) {
            return baseHref;
        }
        const ctx = analyticsApi.getContext();
        const sep = baseHref.includes('?') ? '&' : '?';
        return `${baseHref}${sep}vid=${encodeURIComponent(ctx.visitorId)}&sid=${encodeURIComponent(ctx.sessionId)}&reqId=${encodeURIComponent(reqId || analyticsApi.generateId('req'))}`;
    };

    const triggerActualResumeDownload = (baseHref, reqId) => {
        const targetUrl = buildTrackedResumeUrl(baseHref, reqId);
        closeResumeModal();
        window.location.href = targetUrl;
    };

    if (resumeModalClose) resumeModalClose.addEventListener('click', closeResumeModal);
    if (resumeDownloadModal) {
        resumeDownloadModal.addEventListener('click', (e) => {
            if (e.target === resumeDownloadModal) closeResumeModal();
        });
    }
    if (resumeDirectDownloadBtn) {
        resumeDirectDownloadBtn.addEventListener('click', () => {
            const analyticsApi = window.PortfolioAnalytics;
            const reqId = analyticsApi ? analyticsApi.generateId('req') : '';
            if (analyticsApi) {
                analyticsApi.trackEvent('resume_requested', {
                    eventId: reqId ? `req_${reqId}` : '',
                    downloadResource: 'Celis-Jomarie-Resume.pdf'
                });
            }
            triggerActualResumeDownload(pendingResumeHref, reqId);
        });
    }
    if (resumeIdentifyForm) {
        resumeIdentifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (resumeModalError) {
                resumeModalError.textContent = '';
                resumeModalError.classList.remove('visible');
            }
            const nameEl = document.getElementById('resumeVisitorName');
            const companyEl = document.getElementById('resumeVisitorCompany');
            const emailEl = document.getElementById('resumeVisitorEmail');
            const nameVal = nameEl ? nameEl.value.trim() : '';
            const companyVal = companyEl ? companyEl.value.trim() : '';
            const emailVal = emailEl ? emailEl.value.trim() : '';

            if (nameVal.length > 0 && nameVal.length < 2) {
                if (resumeModalError) {
                    resumeModalError.textContent = 'Please enter at least 2 characters for your name, or use Direct Download above.';
                    resumeModalError.classList.add('visible');
                }
                return;
            }
            if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) {
                if (resumeModalError) {
                    resumeModalError.textContent = 'Please enter a valid email address or leave email blank.';
                    resumeModalError.classList.add('visible');
                }
                return;
            }

            const analyticsApi = window.PortfolioAnalytics;
            const reqId = analyticsApi ? analyticsApi.generateId('req') : '';
            if (analyticsApi && nameVal.length >= 2) {
                await analyticsApi.identifyVisitor({
                    name: nameVal,
                    company: companyVal,
                    email: emailVal,
                    source: 'resume_request'
                });
            }
            if (analyticsApi) {
                await analyticsApi.trackEvent('resume_requested', {
                    eventId: reqId ? `req_${reqId}` : '',
                    downloadResource: 'Celis-Jomarie-Resume.pdf'
                });
            }
            resumeIdentifyForm.reset();
            triggerActualResumeDownload(pendingResumeHref, reqId);
        });
    }

    if (resumeLink) {
        resumeLink.addEventListener('click', async (e) => {
            const href = resumeLink.getAttribute('href');
            if (!href) return;

            // Check if the resume PDF is present on the server before navigating
            if (typeof fetch === 'function' && window.location && /^https?:$/i.test(window.location.protocol)) {
                e.preventDefault();
                pendingResumeHref = href;
                try {
                    const res = await fetch(href, { method: 'HEAD' });
                    const contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
                    if (res.ok && contentType.includes('pdf')) {
                        if (resumeStatusNote) resumeStatusNote.hidden = true;
                        if (resumeDownloadModal) {
                            resumeDownloadModal.hidden = false;
                            if (document.body && document.body.style) document.body.style.overflow = 'hidden';
                            if (resumeDirectDownloadBtn) resumeDirectDownloadBtn.focus();
                        } else {
                            triggerActualResumeDownload(href, '');
                        }
                        return;
                    }
                } catch (err) {
                    // Fall through to honest missing-asset guidance
                }

                // Record demand (requested + server-verified unavailable) without breaking fallback UX
                const analyticsApi = window.PortfolioAnalytics;
                if (analyticsApi && !analyticsApi.isOptedOut()) {
                    const reqId = analyticsApi.generateId('req');
                    analyticsApi.trackEvent('resume_requested', {
                        eventId: `req_${reqId}`,
                        downloadResource: 'Celis-Jomarie-Resume.pdf'
                    });
                    if (href.includes('/api/resume')) {
                        fetch(buildTrackedResumeUrl(href, reqId), { method: 'GET' }).catch(() => {});
                    }
                }

                if (resumeStatusNote) {
                    resumeStatusNote.textContent = 'The PDF resume file is currently pending upload by the portfolio owner. Redirecting to the contact form so you can request a copy directly.';
                    resumeStatusNote.hidden = false;
                }
                const inquirySelect = document.getElementById('inquiryType');
                const subjectInput = document.getElementById('subject');
                if (inquirySelect) inquirySelect.value = 'job';
                if (subjectInput && !subjectInput.value) {
                    subjectInput.value = 'Resume / CV Request';
                }
                const contactSection = document.getElementById('contact');
                if (contactSection && typeof contactSection.scrollIntoView === 'function') {
                    contactSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                }
            }
        });
    }

    // Direct Email Copy-to-Clipboard Action
    const copyEmailBtn = document.getElementById('copyEmailBtn');
    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', async () => {
            const emailToCopy = copyEmailBtn.getAttribute('data-copy-email') || 'jomaricelis22@gmail.com';
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(emailToCopy);
                    copyEmailBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyEmailBtn.textContent = 'Copy';
                    }, 2500);
                }
            } catch (err) {
                copyEmailBtn.textContent = 'Use link';
            }
        });
    }

    /* ==========================================================================
       STRICT CLIENT-SIDE VALIDATION & HONEST SERVER DELIVERY INFRASTRUCTURE
       ========================================================================== */
    const form = document.getElementById('contactForm');

    if (form) {
        let isSubmitting = false;
        const fields = [
            { id: 'name', errorId: 'nameError', validator: val => val.trim().length >= 2 },
            { id: 'email', errorId: 'emailError', validator: val => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim()) },
            { id: 'subject', errorId: 'subjectError', validator: val => val.trim().length <= 160 },
            { id: 'message', errorId: 'messageError', validator: val => val.trim().length >= 10 }
        ];

        const setFieldValidity = (field, isValid, customMessage) => {
            const inputElement = document.getElementById(field.id);
            const errorElement = document.getElementById(field.errorId);
            if (!inputElement || !errorElement) return;

            if (!isValid) {
                if (customMessage) errorElement.textContent = customMessage;
                errorElement.classList.add('visible');
                inputElement.classList.add('form__input--error');
                inputElement.setAttribute('aria-invalid', 'true');
            } else {
                errorElement.classList.remove('visible');
                inputElement.classList.remove('form__input--error');
                inputElement.setAttribute('aria-invalid', 'false');
            }
        };

        fields.forEach(field => {
            const inputElement = document.getElementById(field.id);
            if (inputElement) {
                inputElement.addEventListener('input', () => {
                    if (inputElement.classList.contains('form__input--error') && field.validator(inputElement.value)) {
                        setFieldValidity(field, true);
                    }
                });
            }
        });

        const buildMailtoHref = (recipient, payload) => {
            const inquiryLabel = payload.inquiryType ? payload.inquiryType.toUpperCase() : 'INQUIRY';
            const subjectText = payload.subject || `Portfolio Inquiry from ${payload.name}`;
            const mailtoSubject = encodeURIComponent(`[Portfolio - ${inquiryLabel}] ${subjectText}`);
            const lines = [
                `Name: ${payload.name}`,
                `Email: ${payload.email}`,
                payload.company ? `Organization: ${payload.company}` : null,
                `Inquiry Type: ${payload.inquiryType || 'general'}`,
                '',
                payload.message
            ].filter(line => line !== null);
            const mailtoBody = encodeURIComponent(lines.join('\n'));
            return `mailto:${recipient}?subject=${mailtoSubject}&body=${mailtoBody}`;
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            let isFormValid = true;
            let firstInvalidInput = null;

            fields.forEach(field => {
                const inputElement = document.getElementById(field.id);
                const valid = inputElement ? field.validator(inputElement.value) : false;
                setFieldValidity(field, valid);
                if (!valid && !firstInvalidInput && inputElement) {
                    firstInvalidInput = inputElement;
                    isFormValid = false;
                } else if (!valid) {
                    isFormValid = false;
                }
            });

            if (!isFormValid) {
                if (firstInvalidInput) firstInvalidInput.focus();
                return;
            }

            const formStatus = document.getElementById('formSuccess');
            const fallbackBox = document.getElementById('formFallbackActions');
            const fallbackLink = document.getElementById('formMailtoFallbackLink');
            const submitBtn = document.getElementById('contactSubmitBtn');
            const endpoint = form.getAttribute('data-endpoint') || form.getAttribute('action') || '/api/contact';
            const recipient = form.getAttribute('data-recipient') || 'jomaricelis22@gmail.com';

            const companyEl = document.getElementById('company');
            const inquiryTypeEl = document.getElementById('inquiryType');
            const honeypotEl = document.getElementById('website');

            const analyticsCtx = (window.PortfolioAnalytics && !window.PortfolioAnalytics.isOptedOut())
                ? window.PortfolioAnalytics.getContext()
                : null;

            const payload = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                company: companyEl ? companyEl.value.trim() : '',
                inquiryType: inquiryTypeEl ? inquiryTypeEl.value : 'general',
                subject: document.getElementById('subject').value.trim(),
                message: document.getElementById('message').value.trim(),
                website: honeypotEl ? honeypotEl.value : '',
                visitorId: analyticsCtx ? analyticsCtx.visitorId : '',
                sessionId: analyticsCtx ? analyticsCtx.sessionId : ''
            };

            const mailtoHref = buildMailtoHref(recipient, payload);
            if (fallbackLink) fallbackLink.setAttribute('href', mailtoHref);
            if (fallbackBox) fallbackBox.hidden = true;

            isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending Message...';
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json().catch(() => ({}));

                if (response.status === 422 && result.errors) {
                    fields.forEach(field => {
                        if (result.errors[field.id]) {
                            setFieldValidity(field, false, result.errors[field.id]);
                        }
                    });
                    throw new Error(result.message || 'Please check the highlighted form fields.');
                }

                if (!response.ok || !result.ok) {
                    throw new Error(result.message || `Server returned HTTP ${response.status}.`);
                }

                if (formStatus) {
                    formStatus.classList.remove('form__success--error');
                    formStatus.textContent = result.message || 'Your inquiry has been submitted successfully. Thank you for reaching out.';
                    formStatus.classList.add('visible');
                }
                form.reset();
                fields.forEach(f => {
                    const el = document.getElementById(f.id);
                    if (el) el.removeAttribute('aria-invalid');
                });
            } catch (err) {
                // Preserve entered form values so the visitor never loses their message
                if (formStatus) {
                    formStatus.classList.add('form__success--error', 'visible');
                    formStatus.textContent = err && err.message
                        ? err.message
                        : `Unable to submit inquiry directly. Your message has been preserved—you may retry or use the email application fallback below.`;
                }
                if (fallbackBox) {
                    fallbackBox.hidden = false;
                }
            } finally {
                isSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                }
            }
        });
    }
});