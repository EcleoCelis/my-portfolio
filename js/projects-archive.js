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
        if (projectModalClose) projectModalClose.focus();
    };

    const closeProjectModal = () => {
        if (!projectModal || projectModal.hidden) return;
        projectModal.hidden = true;
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
        if (e.key === 'Escape' && projectModal && !projectModal.hidden) {
            closeProjectModal();
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

            const imageHtml = p.image_data
                ? `<img src="${p.image_data}" alt="${p.title} Preview" class="project-card__img" loading="lazy">`
                : `<div class="project-card__placeholder"><span>${p.title}</span></div>`;

            const techHtml = (Array.isArray(p.tech_stack) ? p.tech_stack : [])
                .map(t => `<span>${t}</span>`)
                .join('');

            const typePillHtml = isDesign
                ? `<span class="project-card__type-pill project-card__type-pill--design">🎨 Design</span>`
                : `<span class="project-card__type-pill project-card__type-pill--system">💻 Code</span>`;

            let extLinksHtml = '';
            let statusPillHtml = '';

            if (isDesign) {
                if (p.live_url) {
                    extLinksHtml += `<a href="${p.live_url}" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View prototype for ${p.title}"><span>Prototype</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
                } else {
                    extLinksHtml = `<span class="project-card__dev-badge project-card__dev-badge--design" title="Interactive prototype in progress"><span class="project-card__dev-dot"></span>Design in Progress</span>`;
                    statusPillHtml = `<span class="project-card__status-pill project-card__status-pill--design">Design in Progress</span>`;
                }
            } else {
                if (p.live_url) {
                    extLinksHtml += `<a href="${p.live_url}" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="Visit live demo for ${p.title}"><span>Demo</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
                }
                if (p.repo_url) {
                    extLinksHtml += `<a href="${p.repo_url}" target="_blank" rel="noopener noreferrer" class="project-card__ext-link" aria-label="View repository for ${p.title}"><span>GitHub</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>`;
                }
                if (!p.live_url && !p.repo_url) {
                    extLinksHtml = `<span class="project-card__dev-badge" title="Source repository and live deployment in active development"><span class="project-card__dev-dot"></span>In-development</span>`;
                    statusPillHtml = `<span class="project-card__status-pill project-card__status-pill--dev">In-development</span>`;
                }
            }

            const linksHtml = `
                <button type="button" class="project-card__case-btn project-case-study-btn" data-project-modal="${slug}" aria-haspopup="dialog">Case Study</button>
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
                        <span class="project-card__tag">${p.tag || (isDesign ? 'Design' : 'Featured')}</span>
                        ${typePillHtml}
                        ${statusPillHtml}
                    </div>
                    <h3 class="project-card__title">${p.title}</h3>
                    <p class="project-card__desc">${p.description || ''}</p>
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
        let currentLabel = 'All Ecosystems';
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
                    project_type: p.project_type || 'system',
                    role: p.role_details || p.role_contributions || '',
                    highlights: Array.isArray(p.highlights) && p.highlights.length ? p.highlights : [
                        isDesign ? 'Created scalable component library and token-based design system.' : 'Engineered core responsive interface and component architecture.',
                        isDesign ? 'Conducted usability testing across mobile viewports.' : 'Optimized relational data access and query latency.'
                    ],
                    tech: Array.isArray(p.tech_stack) ? p.tech_stack : [],
                    status: p.status_note || (isDesign
                        ? (p.live_url ? ('Interactive prototype available at ' + p.live_url + '.') : 'Design assets available upon request.')
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
