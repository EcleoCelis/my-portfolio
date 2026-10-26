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
    };

    const toggleMenu = () => {
        if (!navbarMenu || !hamburger) return;
        const isOpen = navbarMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
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
        if (window.innerWidth > 768 && navbarMenu && navbarMenu.classList.contains('open')) {
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
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 100;
            const sectionId = current.getAttribute('id');
            const targetLink = document.querySelector(`.navbar__link[href="#${sectionId}"]`);

            if (targetLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    targetLink.classList.add('active-link');
                } else {
                    targetLink.classList.remove('active-link');
                }
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
    const phrases = ["Aspiring Developer.", "UI/UX System Designer.", "Graphics Designer."];
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
       ECOSYSTEM FILTER ENGINE & DENSITY OPTIMIZER (OVERCROWD PREVENTION)
       ========================================================================== */
    const INITIAL_PROJECTS_LIMIT = 4; // Max initial visible cards to prevent grid overcrowding
    let currentProjectsLimit = INITIAL_PROJECTS_LIMIT;
    let activeFilterCriterion = 'all';

    const projectsPaginationWrapper = document.getElementById('projectsPaginationWrapper');
    const projectsCountText = document.getElementById('projectsCountText');
    const projectsShowMoreBtn = document.getElementById('projectsShowMoreBtn');
    const projectsShowLessBtn = document.getElementById('projectsShowLessBtn');
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
                if (matchIndex < currentProjectsLimit) {
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

        // Manage Pagination / Density Controls
        if (projectsPaginationWrapper) {
            if (totalMatching <= INITIAL_PROJECTS_LIMIT) {
                projectsPaginationWrapper.hidden = true;
            } else {
                projectsPaginationWrapper.hidden = false;
                if (projectsCountText) {
                    projectsCountText.textContent = `Showing ${visibleCount} of ${totalMatching} projects`;
                }
                if (projectsShowMoreBtn && projectsShowLessBtn) {
                    const hasMore = visibleCount < totalMatching;
                    projectsShowMoreBtn.hidden = !hasMore;
                    projectsShowLessBtn.hidden = hasMore;
                }
            }
        }
    };

    const applyProjectFilter = (filterCriterion) => {
        activeFilterCriterion = filterCriterion || 'all';
        currentProjectsLimit = INITIAL_PROJECTS_LIMIT; // Reset density limit on category change
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

    if (projectsShowMoreBtn) {
        projectsShowMoreBtn.addEventListener('click', () => {
            currentProjectsLimit += 4; // Reveal next batch smoothly
            updateProjectsVisibility();
        });
    }

    if (projectsShowLessBtn) {
        projectsShowLessBtn.addEventListener('click', () => {
            currentProjectsLimit = INITIAL_PROJECTS_LIMIT;
            updateProjectsVisibility();
            const projectsSection = document.getElementById('projects');
            if (projectsSection) {
                projectsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

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

    const projectModal = document.getElementById('projectModal');
    const projectModalClose = document.getElementById('projectModalClose');
    const projectModalDismissBtn = document.getElementById('projectModalDismissBtn');
    const projectModalInquireBtn = document.getElementById('projectModalInquireBtn');
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
        if (projectModalClose) projectModalClose.focus();
    };

    const closeProjectModal = () => {
        if (!projectModal || projectModal.hidden) return;
        projectModal.hidden = true;
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
        if (e.key === 'Escape' && projectModal && !projectModal.hidden) {
            closeProjectModal();
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
                allBtn.textContent = 'All Ecosystems';
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

            data.projects.forEach(p => {
                const slug = p.slug || ('proj-' + p.id);
                const isDesign = p.project_type === 'design';
                PROJECT_CASE_STUDIES[slug] = {
                    tag: p.tag || (isDesign ? 'Design Showcase' : 'System Project'),
                    title: p.title,
                    desc: p.description || '',
                    project_type: p.project_type || 'system',
                    role: p.role_details || p.role_contributions || '',
                    highlights: Array.isArray(p.highlights) && p.highlights.length ? p.highlights : [
                        isDesign ? 'Created high-fidelity UI components and interactive user flows.' : 'Engineered core responsive interface and component architecture.',
                        isDesign ? 'Conducted design iterations and usability testing.' : 'Optimized relational data access and operational workflows.'
                    ],
                    tech: Array.isArray(p.tech_stack) ? p.tech_stack : [],
                    status: p.status_note || (isDesign
                        ? (p.live_url ? ('Interactive prototype available at ' + p.live_url + '.') : 'Design presentation and assets available upon request.')
                        : (p.repo_url ? ('Source code is publicly available at ' + p.repo_url + '.') : 'Pending public release.'))
                };
            });

            if (totalProjectsCountBadge && Array.isArray(data.projects)) {
                totalProjectsCountBadge.textContent = String(data.projects.length);
            }

            grid.innerHTML = '';
            data.projects.forEach(p => {
                const slug = p.slug || ('proj-' + p.id);
                const isDesign = p.project_type === 'design';
                const card = document.createElement('div');
                card.className = 'project-card scroll-reveal revealed';
                card.setAttribute('data-category', (p.category || 'general').toLowerCase());
                card.setAttribute('data-project-id', slug);

                const imageHtml = p.image_data
                    ? '<img src="' + p.image_data + '" alt="' + p.title + ' Screenshot" class="project-card__img" loading="lazy">'
                    : '<div class="project-card__placeholder">' + p.title + '</div>';

                const techHtml = (Array.isArray(p.tech_stack) ? p.tech_stack : [])
                    .map(t => '<span>' + t + '</span>')
                    .join('');

                let extLinksHtml = '';
                let statusPillHtml = '';

                if (isDesign) {
                    if (p.live_url) {
                        extLinksHtml += '<a href="' + p.live_url + '" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View prototype for ' + p.title + '"><span>Prototype</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>';
                    } else {
                        extLinksHtml = '<span class="project-card__dev-badge project-card__dev-badge--design" title="Interactive prototype in progress"><span class="project-card__dev-dot"></span>Design in Progress</span>';
                        statusPillHtml = '<span class="project-card__status-pill project-card__status-pill--design">Design in Progress</span>';
                    }
                } else {
                    if (p.live_url) {
                        extLinksHtml += '<a href="' + p.live_url + '" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="Visit live demo for ' + p.title + '"><span>Demo</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>';
                    }
                    if (p.repo_url) {
                        extLinksHtml += '<a href="' + p.repo_url + '" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View repository for ' + p.title + '"><span>GitHub</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>';
                    }
                    if (!p.live_url && !p.repo_url) {
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
                    '<span class="project-card__tag">' + (p.tag || (isDesign ? 'Design' : 'Featured')) + '</span>',
                    typePillHtml,
                    statusPillHtml,
                    '</div>',
                    '<h3 class="project-card__title">' + p.title + '</h3>',
                    '<p class="project-card__desc">' + (p.description || '') + '</p>',
                    '<div class="project-card__tech">',
                    techHtml,
                    '</div>',
                    '<div class="project-card__links">',
                    '<button type="button" class="project-card__case-btn project-case-study-btn" data-project-modal="' + slug + '" aria-haspopup="dialog">Case Study</button>',
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

    // Resume Download Verification & Honest Fallback
    const resumeLink = document.getElementById('resumeDownloadLink');
    const resumeStatusNote = document.getElementById('resumeStatusNote');

    if (resumeLink) {
        resumeLink.addEventListener('click', async (e) => {
            const href = resumeLink.getAttribute('href');
            if (!href) return;

            // Check if the static resume PDF is present on the server before navigating
            if (typeof fetch === 'function' && window.location && /^https?:$/i.test(window.location.protocol)) {
                e.preventDefault();
                try {
                    const res = await fetch(href, { method: 'HEAD' });
                    const contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
                    if (res.ok && contentType.includes('pdf')) {
                        if (resumeStatusNote) resumeStatusNote.hidden = true;
                        window.location.href = href;
                        return;
                    }
                } catch (err) {
                    // Fall through to honest missing-asset guidance
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

            const payload = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                company: companyEl ? companyEl.value.trim() : '',
                inquiryType: inquiryTypeEl ? inquiryTypeEl.value : 'general',
                subject: document.getElementById('subject').value.trim(),
                message: document.getElementById('message').value.trim(),
                website: honeypotEl ? honeypotEl.value : ''
            };

            const mailtoHref = buildMailtoHref(recipient, payload);
            if (fallbackLink) fallbackLink.setAttribute('href', mailtoHref);
            if (fallbackBox) fallbackBox.hidden = true;

            isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting Inquiry...';
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
                    submitBtn.textContent = 'Transmit Communication';
                }
            }
        });
    }
});