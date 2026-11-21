'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Management (Sync with homepage)
    const themeToggleBtn = document.getElementById('themeToggle');
    const updateThemeToggleUI = (isDark) => {
        if (!themeToggleBtn) return;
        themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    };

    if (themeToggleBtn) {
        const isCurrentDark = document.documentElement.getAttribute('data-theme') === 'dark';
        updateThemeToggleUI(isCurrentDark);

        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const nextTheme = isDark ? 'light' : 'dark';
            if (nextTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            try {
                localStorage.setItem('theme', nextTheme);
            } catch (e) {}
            updateThemeToggleUI(!isDark);
        });
    }

    // Set Copyright Year
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 2. DOM Elements for Archive
    const archiveSearchInput = document.getElementById('archiveSearchInput');
    const archiveSearchClear = document.getElementById('archiveSearchClear');
    const archiveCategoryTabs = document.getElementById('archiveCategoryTabs');
    const archiveTypeTabs = document.getElementById('archiveTypeTabs');
    const archiveFilteredCount = document.getElementById('archiveFilteredCount');
    const archiveTotalCount = document.getElementById('archiveTotalCount');
    const activeFilterLabel = document.getElementById('activeFilterLabel');
    const archiveGrid = document.getElementById('archiveGrid');
    const archiveEmptyState = document.getElementById('archiveEmptyState');
    const resetArchiveFiltersBtn = document.getElementById('resetArchiveFiltersBtn');

    // Case Study Modal Elements
    const projectModal = document.getElementById('projectModal');
    const projectModalClose = document.getElementById('projectModalClose');
    const projectModalDismissBtn = document.getElementById('projectModalDismissBtn');
    const projectModalInquireBtn = document.getElementById('projectModalInquireBtn');
    const projectModalImageContainer = document.getElementById('projectModalImageContainer');
    const projectModalImg = document.getElementById('projectModalImg');
    const projectModalZoomBtn = document.getElementById('projectModalZoomBtn');

    // Image Lightbox Elements
    const imageLightboxModal = document.getElementById('imageLightboxModal');
    const imageLightboxBackdrop = document.getElementById('imageLightboxBackdrop');
    const imageLightboxClose = document.getElementById('imageLightboxClose');
    const imageLightboxImg = document.getElementById('imageLightboxImg');
    const imageLightboxTitle = document.getElementById('imageLightboxTitle');
    const imageLightboxTag = document.getElementById('imageLightboxTag');
    let lastFocusedLightboxTrigger = null;

    let allProjects = [];
    const PROJECT_CASE_STUDIES = {};
    let activeCategory = 'all';
    let activeType = 'all';
    let searchQuery = '';
    let lastFocusedTrigger = null;

    // Check URL parameters for preset category
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('category')) {
        activeCategory = (urlParams.get('category') || 'all').toLowerCase();
    }
    if (urlParams.has('q')) {
        searchQuery = urlParams.get('q').trim();
        if (archiveSearchInput) archiveSearchInput.value = searchQuery;
    }

    // Lightbox Controls
    const openImageLightbox = (imageUrl, title, tag) => {
        if (!imageLightboxModal || !imageUrl) return;
        lastFocusedLightboxTrigger = document.activeElement;
        if (imageLightboxImg) {
            imageLightboxImg.src = imageUrl;
            imageLightboxImg.alt = title ? `${title} full view` : 'Project preview';
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

    // 3. Modal Dialog Handlers
    const openProjectModal = (projectId, triggerEl) => {
        const data = PROJECT_CASE_STUDIES[projectId];
        if (!projectModal || !data) return;

        lastFocusedTrigger = triggerEl || document.activeElement;
        const tagEl = document.getElementById('projectModalTag');
        const titleEl = document.getElementById('projectModalTitle');
        const descEl = document.getElementById('projectModalDesc');
        const roleEl = document.getElementById('projectModalRole');
        const highlightsEl = document.getElementById('projectModalHighlights');
        const techEl = document.getElementById('projectModalTech');
        const statusEl = document.getElementById('projectModalStatus');

        const roleHeading = document.getElementById('projectModalRoleHeading');
        const highlightsHeading = document.getElementById('projectModalHighlightsHeading');
        const techHeading = document.getElementById('projectModalTechHeading');
        const statusHeading = document.getElementById('projectModalStatusHeading');

        const isDesign = data.project_type === 'design';

        if (tagEl) tagEl.textContent = data.tag;
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        if (roleEl) roleEl.textContent = data.role;
        if (statusEl) statusEl.textContent = data.status;

        // Populate Image Showcase in Case Study Modal
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
            highlightsEl.innerHTML = '';
            (data.highlights || []).forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                highlightsEl.appendChild(li);
            });
        }

        if (techEl) {
            techEl.innerHTML = '';
            (data.tech || []).forEach(t => {
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
        if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
            lastFocusedTrigger.focus();
        }
    };

    if (projectModalClose) projectModalClose.addEventListener('click', closeProjectModal);
    if (projectModalDismissBtn) projectModalDismissBtn.addEventListener('click', closeProjectModal);
    if (projectModal) {
        projectModal.addEventListener('click', (e) => {
            if (e.target === projectModal) closeProjectModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (imageLightboxModal && !imageLightboxModal.hidden) {
                closeImageLightbox();
            } else if (projectModal && !projectModal.hidden) {
                closeProjectModal();
            }
        }
    });

    // 4. Render Projects Function
    const renderFilteredProjects = () => {
        if (!archiveGrid) return;

        const normalizedQuery = searchQuery.toLowerCase().trim();
        const filtered = allProjects.filter(p => {
            // Category check
            const pCat = (p.category || 'general').toLowerCase();
            if (activeCategory !== 'all' && pCat !== activeCategory) {
                return false;
            }

            // Type check
            const pType = p.project_type || 'system';
            if (activeType !== 'all' && pType !== activeType) {
                return false;
            }

            // Search query check
            if (normalizedQuery) {
                const title = (p.title || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                const tech = (Array.isArray(p.tech_stack) ? p.tech_stack.join(' ') : '').toLowerCase();
                const tag = (p.tag || '').toLowerCase();
                const role = (p.role_details || p.role_contributions || '').toLowerCase();

                const matchesSearch = title.includes(normalizedQuery) ||
                    desc.includes(normalizedQuery) ||
                    tech.includes(normalizedQuery) ||
                    tag.includes(normalizedQuery) ||
                    role.includes(normalizedQuery);

                if (!matchesSearch) return false;
            }

            return true;
        });

        // Update counts
        if (archiveFilteredCount) archiveFilteredCount.textContent = String(filtered.length);
        if (archiveTotalCount) archiveTotalCount.textContent = String(allProjects.length);

        // Update clear button visibility
        if (archiveSearchClear) {
            archiveSearchClear.hidden = !searchQuery;
        }

        // Manage Empty State
        if (filtered.length === 0) {
            archiveGrid.innerHTML = '';
            if (archiveEmptyState) archiveEmptyState.hidden = false;
            return;
        }

        if (archiveEmptyState) archiveEmptyState.hidden = true;
        archiveGrid.innerHTML = '';

        filtered.forEach(p => {
            const slug = p.slug || ('proj-' + p.id);
            const isDesign = p.project_type === 'design';
            const card = document.createElement('div');
            card.className = 'project-card scroll-reveal revealed';
            card.setAttribute('data-category', (p.category || 'general').toLowerCase());
            card.setAttribute('data-project-id', slug);

            const escapeHtml = (str) => String(str == null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const safeSlug = escapeHtml(slug);
            const safeTitle = escapeHtml(p.title);
            const safeDesc = escapeHtml(p.description || '');
            const safeTag = escapeHtml(p.tag || (isDesign ? 'Design' : 'Featured'));
            const safeLiveUrl = p.live_url ? escapeHtml(p.live_url) : '';
            const safeRepoUrl = p.repo_url ? escapeHtml(p.repo_url) : '';

            const imageHtml = p.image_data
                ? `<div class="project-card__image-clickable" role="button" tabindex="0" aria-label="View full image for ${safeTitle}">
                     <img src="${escapeHtml(p.image_data)}" alt="${safeTitle} Preview" class="project-card__img" loading="lazy">
                     <span class="project-card__zoom-badge" aria-hidden="true">
                       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                       <span>View Image</span>
                     </span>
                   </div>`
                : `<div class="project-card__placeholder"><span>${safeTitle}</span></div>`;

            const techHtml = (Array.isArray(p.tech_stack) ? p.tech_stack : [])
                .map(t => `<span>${escapeHtml(t)}</span>`)
                .join('');

            const typePillHtml = isDesign
                ? `<span class="project-card__type-pill project-card__type-pill--design">🎨 Design</span>`
                : `<span class="project-card__type-pill project-card__type-pill--system">💻 Code</span>`;

            let extLinksHtml = '';
            let statusPillHtml = '';

            if (isDesign) {
                if (safeLiveUrl) {
                    extLinksHtml += `<a href="${safeLiveUrl}" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View prototype for ${safeTitle}"><span>Prototype</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
                } else if (p.image_data) {
                    extLinksHtml = `<button type="button" class="project-card__ext-link project-card__preview-btn" aria-label="Open full-screen preview for ${safeTitle}"><span>Full Preview</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>`;
                } else {
                    extLinksHtml = `<span class="project-card__dev-badge project-card__dev-badge--design" title="Interactive prototype in progress"><span class="project-card__dev-dot"></span>Design in Progress</span>`;
                    statusPillHtml = `<span class="project-card__status-pill project-card__status-pill--design">Design in Progress</span>`;
                }
            } else {
                if (safeLiveUrl) {
                    extLinksHtml += `<a href="${safeLiveUrl}" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="Visit live demo for ${safeTitle}"><span>Demo</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
                }
                if (safeRepoUrl) {
                    extLinksHtml += `<a href="${safeRepoUrl}" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View repository for ${safeTitle}"><span>GitHub</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>`;
                }
                if (!safeLiveUrl && !safeRepoUrl) {
                    extLinksHtml = `<span class="project-card__dev-badge" title="Source repository and live deployment in active development"><span class="project-card__dev-dot"></span>In-development</span>`;
                    statusPillHtml = `<span class="project-card__status-pill project-card__status-pill--dev">In-development</span>`;
                }
            }

            const linksHtml = `
                <button type="button" class="project-card__case-btn project-case-study-btn" data-project-modal="${safeSlug}" aria-haspopup="dialog">Case Study</button>
                <div class="project-card__ext-links">
                    ${extLinksHtml}
                </div>
            `;

            card.innerHTML = `
                <div class="project-card__image-wrapper">
                    ${imageHtml}
                </div>
                <div class="project-card__content">
                    <div class="project-card__header-meta">
                        <span class="project-card__tag">${safeTag}</span>
                        ${typePillHtml}
                        ${statusPillHtml}
                    </div>
                    <h3 class="project-card__title">${safeTitle}</h3>
                    <p class="project-card__desc">${safeDesc}</p>
                    <div class="project-card__tech">
                        ${techHtml}
                    </div>
                    <div class="project-card__links">
                        ${linksHtml}
                    </div>
                </div>
            `;

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

            archiveGrid.appendChild(card);
        });
    };

    // 5. Build Dynamic Category Buttons
    const populateCategoryTabs = (categories, projects) => {
        if (!archiveCategoryTabs) return;

        const categoryMap = new Map();
        projects.forEach(p => {
            const slug = (p.category || 'general').toLowerCase();
            const name = p.tag || p.category || 'General';
            if (!categoryMap.has(slug)) {
                categoryMap.set(slug, name);
            }
        });

        archiveCategoryTabs.innerHTML = '';

        // All Button
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = 'filter-btn' + (activeCategory === 'all' ? ' active' : '');
        allBtn.setAttribute('data-category', 'all');
        allBtn.setAttribute('aria-pressed', (activeCategory === 'all').toString());
        allBtn.textContent = 'All Projects';
        allBtn.addEventListener('click', () => {
            activeCategory = 'all';
            updateCategoryActiveUI();
            renderFilteredProjects();
        });
        archiveCategoryTabs.appendChild(allBtn);

        // Dynamic Category Buttons
        categoryMap.forEach((name, slug) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-btn' + (activeCategory === slug ? ' active' : '');
            btn.setAttribute('data-category', slug);
            btn.setAttribute('aria-pressed', (activeCategory === slug).toString());
            btn.textContent = name;
            btn.addEventListener('click', () => {
                activeCategory = slug;
                updateCategoryActiveUI();
                renderFilteredProjects();
            });
            archiveCategoryTabs.appendChild(btn);
        });
    };

    const updateCategoryActiveUI = () => {
        if (!archiveCategoryTabs) return;
        const buttons = archiveCategoryTabs.querySelectorAll('.filter-btn');
        let currentLabel = 'All Projects';
        buttons.forEach(btn => {
            const cat = btn.getAttribute('data-category');
            const isActive = cat === activeCategory;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
            if (isActive) currentLabel = btn.textContent;
        });
        if (activeFilterLabel) {
            activeFilterLabel.textContent = currentLabel;
        }
    };

    // 6. Project Type Tabs Event Handlers
    if (archiveTypeTabs) {
        archiveTypeTabs.querySelectorAll('.archive-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                archiveTypeTabs.querySelectorAll('.archive-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeType = btn.getAttribute('data-type') || 'all';
                renderFilteredProjects();
            });
        });
    }

    // 7. Search Input Listeners (with slight debounce)
    let searchDebounceTimer = null;
    if (archiveSearchInput) {
        archiveSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                searchQuery = e.target.value;
                renderFilteredProjects();
            }, 150);
        });
    }

    if (archiveSearchClear) {
        archiveSearchClear.addEventListener('click', () => {
            searchQuery = '';
            if (archiveSearchInput) archiveSearchInput.value = '';
            renderFilteredProjects();
            if (archiveSearchInput) archiveSearchInput.focus();
        });
    }

    if (resetArchiveFiltersBtn) {
        resetArchiveFiltersBtn.addEventListener('click', () => {
            activeCategory = 'all';
            activeType = 'all';
            searchQuery = '';
            if (archiveSearchInput) archiveSearchInput.value = '';
            if (archiveTypeTabs) {
                archiveTypeTabs.querySelectorAll('.archive-type-btn').forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-type') === 'all');
                });
            }
            updateCategoryActiveUI();
            renderFilteredProjects();
        });
    }

    // 8. Ingest Projects from API
    const loadArchiveProjects = async () => {
        if (archiveGrid) {
            archiveGrid.innerHTML = '<p class="projects__count-text" style="grid-column: 1 / -1; padding: 40px 0;">Loading projects from database...</p>';
        }

        try {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            allProjects = Array.isArray(data.projects) ? data.projects : [];

            // Populate Case Studies cache
            allProjects.forEach(p => {
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

            populateCategoryTabs(data.categories, allProjects);
            updateCategoryActiveUI();
            renderFilteredProjects();
        } catch (err) {
            if (archiveGrid) {
                archiveGrid.innerHTML = `<p class="form__error visible" style="grid-column: 1 / -1;">Failed to load project archive: ${err.message}</p>`;
            }
        }
    };

    loadArchiveProjects();
});
