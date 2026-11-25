'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle parity across public portfolio, archive, and admin CMS
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        const isCurrentDark = document.documentElement.getAttribute('data-theme') === 'dark';
        themeToggleBtn.setAttribute('aria-pressed', String(isCurrentDark));
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const nextTheme = isDark ? 'light' : 'dark';
            if (nextTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            themeToggleBtn.setAttribute('aria-pressed', String(nextTheme === 'dark'));
            try {
                localStorage.setItem('theme', nextTheme);
            } catch (e) {}
        });
    }

    const adminSystemBar = document.getElementById('adminSystemBar');
    const sysDbStatus = document.getElementById('sysDbStatus');
    const sysEmailStatus = document.getElementById('sysEmailStatus');
    const sysRecipient = document.getElementById('sysRecipient');

    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLoginError = document.getElementById('adminLoginError');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const adminDashboardSection = document.getElementById('adminDashboardSection');

    const tabProjectsBtn = document.getElementById('tabProjectsBtn');
    const tabMessagesBtn = document.getElementById('tabMessagesBtn');
    const tabAnalyticsBtn = document.getElementById('tabAnalyticsBtn');
    const panelProjects = document.getElementById('panelProjects');
    const panelMessages = document.getElementById('panelMessages');
    const panelAnalytics = document.getElementById('panelAnalytics');
    const unreadCountBadge = document.getElementById('unreadCountBadge');

    // Project Editor Form Elements
    const projectEditorForm = document.getElementById('projectEditorForm');
    const projectFormHeading = document.getElementById('projectFormHeading');
    const resetProjectFormBtn = document.getElementById('resetProjectFormBtn');
    const projId = document.getElementById('projId');
    const projType = document.getElementById('projType');
    const typeSystemBtn = document.getElementById('typeSystemBtn');
    const typeDesignBtn = document.getElementById('typeDesignBtn');
    const groupSystemFields = document.getElementById('groupSystemFields');
    const groupDesignFields = document.getElementById('groupDesignFields');

    const projTitle = document.getElementById('projTitle');
    const projSlug = document.getElementById('projSlug');
    const projCategory = document.getElementById('projCategory');
    const categoriesDatalist = document.getElementById('categoriesDatalist');
    const quickCategoryChips = document.getElementById('quickCategoryChips');
    const projDesc = document.getElementById('projDesc');
    const projDescLabel = document.getElementById('projDescLabel');
    const projOrder = document.getElementById('projOrder');

    // System Project specific fields
    const projRepoUrl = document.getElementById('projRepoUrl');
    const projLiveUrl = document.getElementById('projLiveUrl');
    const projTech = document.getElementById('projTech');
    const projRole = document.getElementById('projRole');
    const projHighlights = document.getElementById('projHighlights');
    const projStatusNote = document.getElementById('projStatusNote');

    // Design Showcase specific fields
    const projDesignPrototypeUrl = document.getElementById('projDesignPrototypeUrl');
    const projDesignTools = document.getElementById('projDesignTools');
    const projDesignRole = document.getElementById('projDesignRole');
    const projDesignHighlights = document.getElementById('projDesignHighlights');
    const projDesignStatusNote = document.getElementById('projDesignStatusNote');

    // Screenshot / Artwork upload
    const projImageSectionTag = document.getElementById('projImageSectionTag');
    const projDropzone = document.getElementById('projDropzone');
    const dropzoneMainText = document.getElementById('dropzoneMainText');
    const projImageInput = document.getElementById('projImageInput');
    const projImageData = document.getElementById('projImageData');
    const projImagePreviewBox = document.getElementById('projImagePreviewBox');
    const projImagePreview = document.getElementById('projImagePreview');
    const projImagePreviewLabel = document.getElementById('projImagePreviewLabel');
    const clearProjImageBtn = document.getElementById('clearProjImageBtn');
    const projectFormStatus = document.getElementById('projectFormStatus');

    const adminProjectsList = document.getElementById('adminProjectsList');
    const adminMessagesList = document.getElementById('adminMessagesList');
    const refreshMessagesBtn = document.getElementById('refreshMessagesBtn');

    let currentProjects = [];
    let currentMessages = [];

    // Switch between System Project and Design Showcase
    const setProjectType = (type) => {
        const isDesign = type === 'design';
        if (projType) projType.value = isDesign ? 'design' : 'system';

        if (typeSystemBtn && typeDesignBtn) {
            typeSystemBtn.classList.toggle('active', !isDesign);
            typeSystemBtn.setAttribute('aria-pressed', (!isDesign).toString());
            typeDesignBtn.classList.toggle('active', isDesign);
            typeDesignBtn.setAttribute('aria-pressed', isDesign.toString());
        }

        if (groupSystemFields && groupDesignFields) {
            groupSystemFields.hidden = isDesign;
            groupDesignFields.hidden = !isDesign;
        }



        if (projDescLabel) {
            projDescLabel.textContent = isDesign ? 'Card Summary / Concept *' : 'Short Card Overview *';
        }
        if (projImageSectionTag) {
            projImageSectionTag.textContent = isDesign ? '3. Artwork / Design Mockup (PostgreSQL)' : '3. Project Screenshot / System UI (PostgreSQL)';
        }
        if (dropzoneMainText) {
            dropzoneMainText.textContent = isDesign ? 'Click to upload design mockup' : 'Click to upload screenshot';
        }
        if (projImagePreviewLabel) {
            projImagePreviewLabel.textContent = isDesign ? 'Design mockup loaded' : 'Screenshot loaded';
        }
    };

    if (typeSystemBtn) {
        typeSystemBtn.addEventListener('click', () => setProjectType('system'));
    }
    if (typeDesignBtn) {
        typeDesignBtn.addEventListener('click', () => setProjectType('design'));
    }

    // Dynamic quick category suggestions and datalist
    const updateCategorySuggestions = (categories) => {
        if (!categoriesDatalist || !quickCategoryChips) return;

        const defaultCats = ['Health Tech', 'Education', 'Web Application', 'UI/UX Design', 'Graphic Design'];
        const uniqueCats = [...new Set([...(categories || []), ...defaultCats].filter(Boolean))];

        categoriesDatalist.innerHTML = uniqueCats
            .map(c => `<option value="${c}">`)
            .join('');

        quickCategoryChips.innerHTML = '';
        uniqueCats.forEach(cat => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'admin-chip-quick';
            chip.textContent = `+ ${cat}`;
            chip.addEventListener('click', () => {
                if (projCategory) {
                    projCategory.value = cat;
                    projCategory.focus();
                }
            });
            quickCategoryChips.appendChild(chip);
        });
    };

    // Auto-generate URL slug from title as user types (only when creating a new project)
    if (projTitle && projSlug) {
        projTitle.addEventListener('input', () => {
            if (!projId.value) {
                projSlug.value = projTitle.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
            }
        });
    }

    // Process Image File (Client-side Canvas auto-compression to WebP/JPEG for fast delivery & zero data loss)
    const handleImageFile = (file) => {
        if (!file) return;
        if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
            alert('Please select a valid image file (PNG, JPEG, WebP, or GIF).');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            alert('Image file size exceeds 8 MB. Please choose a smaller image.');
            if (projImageInput) projImageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const rawUri = reader.result;
            const img = new Image();
            img.onload = () => {
                const maxDim = 1200;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                // Export to WebP with 0.82 quality, or fallback to JPEG
                let compressedUri;
                try {
                    compressedUri = canvas.toDataURL('image/webp', 0.82);
                    if (!compressedUri.startsWith('data:image/webp')) {
                        compressedUri = canvas.toDataURL('image/jpeg', 0.82);
                    }
                } catch (e) {
                    compressedUri = canvas.toDataURL('image/jpeg', 0.82);
                }

                projImageData.value = compressedUri;
                if (projImagePreview) {
                    projImagePreview.src = compressedUri;
                }
                if (projImagePreviewBox) {
                    projImagePreviewBox.hidden = false;
                }
            };
            img.onerror = () => {
                projImageData.value = rawUri;
                if (projImagePreview) projImagePreview.src = rawUri;
                if (projImagePreviewBox) projImagePreviewBox.hidden = false;
            };
            img.src = rawUri;
        };
        reader.readAsDataURL(file);
    };

    if (projImageInput) {
        projImageInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            handleImageFile(file);
        });
    }

    // Drag-and-drop on dropzone
    if (projDropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            projDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                projDropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            projDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                projDropzone.classList.remove('dragover');
            });
        });

        projDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt && dt.files && dt.files[0];
            if (file) handleImageFile(file);
        });
    }

    if (clearProjImageBtn) {
        clearProjImageBtn.addEventListener('click', () => {
            projImageData.value = '';
            if (projImageInput) projImageInput.value = '';
            if (projImagePreview) projImagePreview.removeAttribute('src');
            if (projImagePreviewBox) projImagePreviewBox.hidden = true;
        });
    }

    // Switch Tabs
    const switchTab = (activeTab, syncHistory = true) => {
        const tabs = [
            { key: 'projects', btn: tabProjectsBtn, panel: panelProjects },
            { key: 'messages', btn: tabMessagesBtn, panel: panelMessages },
            { key: 'analytics', btn: tabAnalyticsBtn, panel: panelAnalytics }
        ];
        tabs.forEach(t => {
            const isActive = t.key === activeTab;
            if (t.btn) {
                t.btn.classList.toggle('active', isActive);
                t.btn.setAttribute('aria-selected', isActive.toString());
            }
            if (t.panel) {
                t.panel.hidden = !isActive;
            }
        });

        if (syncHistory && window.history && typeof window.history.replaceState === 'function') {
            const desiredPath = activeTab === 'analytics' ? '/admin/visitors' : '/admin';
            if (window.location.pathname !== desiredPath) {
                try {
                    window.history.replaceState(null, '', desiredPath);
                } catch (e) {}
            }
        }

        if (activeTab === 'messages') {
            loadMessages();
        } else if (activeTab === 'analytics') {
            loadAnalytics();
        }
    };

    if (tabProjectsBtn) tabProjectsBtn.addEventListener('click', () => switchTab('projects'));
    if (tabMessagesBtn) tabMessagesBtn.addEventListener('click', () => switchTab('messages'));
    if (tabAnalyticsBtn) tabAnalyticsBtn.addEventListener('click', () => switchTab('analytics'));
    if (refreshMessagesBtn) refreshMessagesBtn.addEventListener('click', () => loadMessages());

    // Check system & auth status
    const checkAuthStatus = async () => {
        try {
            const res = await fetch('/api/admin?action=status');
            const data = await res.json();

            if (sysDbStatus) {
                const isDbOk = Boolean(data.databaseConfigured);
                sysDbStatus.innerHTML = `
                    <span class="admin-status-dot ${isDbOk ? 'admin-status-dot--green' : 'admin-status-dot--warn'}" aria-hidden="true"></span>
                    <span class="admin-sys-pill__text">PostgreSQL: <strong>${isDbOk ? 'Connected' : 'Not configured'}</strong></span>
                `;
            }

            if (sysEmailStatus) {
                const isEmailOk = Boolean(data.emailProviderConfigured);
                sysEmailStatus.innerHTML = `
                    <span class="admin-status-dot ${isEmailOk ? 'admin-status-dot--green' : 'admin-status-dot--warn'}" aria-hidden="true"></span>
                    <span class="admin-sys-pill__text">Email: <strong>${isEmailOk ? 'Resend Active' : 'Unconfigured'}</strong></span>
                `;
            }

            if (sysRecipient && data.recipientEmail) {
                sysRecipient.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span class="admin-sys-pill__text">Recipient: <strong>${data.recipientEmail}</strong></span>
                `;
            }

            if (data.authenticated) {
                if (adminLoginSection) adminLoginSection.hidden = true;
                if (adminDashboardSection) adminDashboardSection.hidden = false;
                if (adminLogoutBtn) adminLogoutBtn.hidden = false;
                loadProjects();
                loadMessages();
                if (window.location && window.location.pathname && window.location.pathname.includes('/visitors')) {
                    switchTab('analytics', false);
                }
            } else {
                if (adminLoginSection) adminLoginSection.hidden = false;
                if (adminDashboardSection) adminDashboardSection.hidden = true;
                if (adminLogoutBtn) adminLogoutBtn.hidden = true;
            }
        } catch (err) {
            console.error('Failed to query admin status:', err);
        }
    };

    // Admin Login
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;
            if (!password) return;

            adminLoginError.classList.remove('visible');
            try {
                const res = await fetch('/api/admin?action=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Login failed');

                adminLoginForm.reset();
                checkAuthStatus();
            } catch (err) {
                adminLoginError.textContent = err.message;
                adminLoginError.classList.add('visible');
            }
        });
    }

    // Admin Logout
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/admin?action=logout', { method: 'POST' });
            } catch (e) {}
            checkAuthStatus();
        });
    }

    // Load Projects from /api/projects
    const loadProjects = async () => {
        if (!adminProjectsList) return;
        adminProjectsList.innerHTML = '<p class="admin-panel-card__desc">Loading projects from PostgreSQL...</p>';
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            currentProjects = data.projects || [];
            renderProjectsList(currentProjects);

            const allCats = [...new Set([
                ...(data.categories || []),
                ...currentProjects.map(p => p.tag || p.category)
            ].filter(Boolean))];
            updateCategorySuggestions(allCats);
        } catch (err) {
            adminProjectsList.innerHTML = `<p class="form__error visible">Failed to load projects: ${err.message}</p>`;
        }
    };

    const renderProjectsList = (projects) => {
        if (!adminProjectsList) return;
        if (!projects || projects.length === 0) {
            adminProjectsList.innerHTML = '<p class="admin-panel-card__desc">No projects stored in PostgreSQL yet. Create your first project using the form on the left.</p>';
            return;
        }

        adminProjectsList.innerHTML = '';
        projects.forEach(p => {
            const card = document.createElement('div');
            card.className = 'admin-project-card';
            const isDesign = p.project_type === 'design';

            const previewImgHtml = p.image_data
                ? `<div class="admin-project-card__thumb"><img src="${p.image_data}" alt="${p.title} preview" loading="lazy"></div>`
                : `<div class="admin-project-card__thumb"><div class="admin-project-card__thumb-empty" title="No screenshot uploaded"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></div></div>`;

            const typeBadgeHtml = isDesign
                ? `<span class="admin-chip" style="color: #ec4899; border-color: rgba(236, 72, 153, 0.3); background: rgba(236, 72, 153, 0.08);">🎨 Design</span>`
                : `<span class="admin-chip" style="color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.08);">💻 System</span>`;

            let linkChipsHtml = '';
            if (isDesign) {
                linkChipsHtml = p.live_url
                    ? `<a href="${p.live_url}" target="_blank" rel="noopener noreferrer" class="admin-chip admin-chip--active" title="Open Interactive Prototype"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> Prototype</a>`
                    : `<span class="admin-chip admin-chip--design-dev" title="Prototype URL is empty - labeled as Design in Progress on cards"><span class="project-card__dev-dot"></span> Design in Progress</span>`;
            } else {
                const repoChipHtml = p.repo_url
                    ? `<a href="${p.repo_url}" target="_blank" rel="noopener noreferrer" class="admin-chip admin-chip--active" title="Open GitHub Repository"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg> GitHub</a>`
                    : '';

                const liveChipHtml = p.live_url
                    ? `<a href="${p.live_url}" target="_blank" rel="noopener noreferrer" class="admin-chip admin-chip--active" title="Open Live Demo"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> Live Demo</a>`
                    : '';

                if (!p.repo_url && !p.live_url) {
                    linkChipsHtml = `<span class="admin-chip admin-chip--dev" title="GitHub &amp; Demo URLs are empty - labeled as In-development on cards"><span class="project-card__dev-dot"></span> In-development</span>`;
                } else {
                    linkChipsHtml = (repoChipHtml || `<span class="admin-chip" title="Repository URL pending"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> No Repo</span>`) +
                                    (liveChipHtml || `<span class="admin-chip" title="Live demo URL pending"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> No Demo</span>`);
                }
            }

            card.innerHTML = `
                ${previewImgHtml}
                <div class="admin-project-card__content">
                    <div class="admin-project-card__header">
                        <span class="admin-chip admin-chip--tag">${p.tag || p.category}</span>
                        ${typeBadgeHtml}
                        <h3 class="admin-project-card__title">${p.title}</h3>
                        <span class="admin-project-card__slug">/${p.slug}</span>
                    </div>
                    <p class="admin-project-card__desc">${p.description || ''}</p>
                    <div class="admin-project-card__chips">
                        <span class="admin-chip"><strong>Order:</strong> ${p.display_order || 0}</span>
                        ${linkChipsHtml}
                    </div>
                </div>
                <div class="admin-project-card__actions">
                    <button type="button" class="admin-btn-action edit-proj-btn" data-id="${p.id}" aria-label="Edit project ${p.title}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Edit</span>
                    </button>
                    <button type="button" class="admin-btn-action admin-btn-action--delete delete-proj-btn" data-id="${p.id}" data-title="${p.title}" aria-label="Delete project ${p.title}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Delete</span>
                    </button>
                </div>
            `;
            adminProjectsList.appendChild(card);
        });

        // Attach action listeners
        adminProjectsList.querySelectorAll('.edit-proj-btn').forEach(b => {
            b.addEventListener('click', () => {
                const id = b.getAttribute('data-id');
                const project = currentProjects.find(item => String(item.id) === String(id));
                if (project) populateProjectForm(project);
            });
        });

        adminProjectsList.querySelectorAll('.delete-proj-btn').forEach(b => {
            b.addEventListener('click', async () => {
                const id = b.getAttribute('data-id');
                const title = b.getAttribute('data-title');
                if (!confirm(`Are you sure you want to permanently delete "${title}" from PostgreSQL?`)) return;

                try {
                    const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Failed to delete');
                    loadProjects();
                } catch (err) {
                    alert(`Error deleting project: ${err.message}`);
                }
            });
        });
    };

    const populateProjectForm = (project) => {
        const isDesign = project.project_type === 'design';
        setProjectType(isDesign ? 'design' : 'system');

        projId.value = project.id || '';
        projTitle.value = project.title || '';
        projSlug.value = project.slug || '';
        projCategory.value = project.tag || project.category || '';
        projDesc.value = project.description || '';
        projOrder.value = project.display_order || 0;

        if (isDesign) {
            projDesignPrototypeUrl.value = project.live_url || '';
            const toolsArray = Array.isArray(project.tech_stack) ? project.tech_stack : [];
            projDesignTools.value = toolsArray.join(', ');
            projDesignRole.value = project.role_details || project.role_contributions || '';
            const highlightsArray = Array.isArray(project.highlights) ? project.highlights : [];
            projDesignHighlights.value = highlightsArray.join('\n');
            projDesignStatusNote.value = project.status_note || '';

            // reset system inputs
            projRepoUrl.value = '';
            projLiveUrl.value = '';
            projTech.value = '';
            projRole.value = '';
            projHighlights.value = '';
            projStatusNote.value = '';
        } else {
            projRepoUrl.value = project.repo_url || '';
            projLiveUrl.value = project.live_url || '';
            const techArray = Array.isArray(project.tech_stack) ? project.tech_stack : [];
            projTech.value = techArray.join(', ');
            projRole.value = project.role_details || project.role_contributions || '';
            const highlightsArray = Array.isArray(project.highlights) ? project.highlights : [];
            projHighlights.value = highlightsArray.join('\n');
            projStatusNote.value = project.status_note || '';

            // reset design inputs
            projDesignPrototypeUrl.value = '';
            projDesignTools.value = '';
            projDesignRole.value = '';
            projDesignHighlights.value = '';
            projDesignStatusNote.value = '';
        }

        if (project.image_data) {
            projImageData.value = project.image_data;
            if (projImagePreview) {
                projImagePreview.src = project.image_data;
            }
            if (projImagePreviewBox) {
                projImagePreviewBox.hidden = false;
            }
        } else {
            projImageData.value = '';
            if (projImagePreview) {
                projImagePreview.removeAttribute('src');
            }
            if (projImagePreviewBox) {
                projImagePreviewBox.hidden = true;
            }
        }

        projectFormHeading.textContent = `Edit ${isDesign ? 'Design Showcase' : 'System Project'}: ${project.title}`;
        resetProjectFormBtn.hidden = false;
        projectEditorForm.scrollIntoView({ behavior: 'smooth' });
    };

    const resetProjectForm = () => {
        projectEditorForm.reset();
        setProjectType('system');
        projId.value = '';
        projSlug.value = '';
        projImageData.value = '';
        if (projImageInput) projImageInput.value = '';
        if (projImagePreview) projImagePreview.removeAttribute('src');
        if (projImagePreviewBox) projImagePreviewBox.hidden = true;
        projectFormHeading.textContent = 'Add New Project';
        resetProjectFormBtn.hidden = true;
        projectFormStatus.classList.remove('visible', 'form__success--error');
    };

    if (resetProjectFormBtn) resetProjectFormBtn.addEventListener('click', resetProjectForm);

    // Save or Update Project Form Submit
    if (projectEditorForm) {
        projectEditorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = projId.value;
            const isEditing = Boolean(id);
            const isDesign = projType.value === 'design';

            const rawTitle = projTitle.value.trim();
            const rawCategory = projCategory.value.trim();
            const autoSlug = projSlug.value.trim() || rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

            let repo_url = '';
            let live_url = '';
            let tech_stack = [];
            let role_details = '';
            let highlights = [];
            let status_note = '';

            if (isDesign) {
                live_url = projDesignPrototypeUrl.value.trim();
                repo_url = '';
                tech_stack = projDesignTools.value.split(',').map(s => s.trim()).filter(Boolean);
                role_details = projDesignRole.value.trim();
                highlights = projDesignHighlights.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                status_note = projDesignStatusNote.value.trim();
            } else {
                repo_url = projRepoUrl.value.trim();
                live_url = projLiveUrl.value.trim();
                tech_stack = projTech.value.split(',').map(s => s.trim()).filter(Boolean);
                role_details = projRole.value.trim();
                highlights = projHighlights.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                status_note = projStatusNote.value.trim();
            }

            const payload = {
                title: rawTitle,
                slug: autoSlug,
                project_type: isDesign ? 'design' : 'system',
                category: rawCategory,
                tag: rawCategory,
                description: projDesc.value.trim(),
                repo_url,
                live_url,
                tech_stack,
                display_order: Number(projOrder.value) || 0,
                role_details,
                role_contributions: role_details,
                highlights,
                status_note,
                image_data: projImageData.value.trim()
            };

            if (isEditing) payload.id = Number(id);

            projectFormStatus.classList.remove('visible', 'form__success--error');
            try {
                const res = await fetch('/api/projects', {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Failed to save project');

                projectFormStatus.textContent = result.message || 'Project saved successfully in PostgreSQL!';
                projectFormStatus.classList.add('visible');
                resetProjectForm();
                loadProjects();
            } catch (err) {
                projectFormStatus.textContent = err.message;
                projectFormStatus.classList.add('visible', 'form__success--error');
            }
        });
    }

    // Inquiries Toolbar Elements
    const inquiriesToolbar = document.getElementById('inquiriesToolbar');
    const selectAllInquiries = document.getElementById('selectAllInquiries');
    const inquiriesSelectedCount = document.getElementById('inquiriesSelectedCount');
    const bulkDeleteInquiriesBtn = document.getElementById('bulkDeleteInquiriesBtn');
    const toggleAllInquiriesAccordionBtn = document.getElementById('toggleAllInquiriesAccordionBtn');
    const toggleAllAccordionLabel = document.getElementById('toggleAllAccordionLabel');

    let selectedInquiryIds = new Set();
    let areAllExpanded = false;

    const updateInquirySelectionState = () => {
        const count = selectedInquiryIds.size;
        if (inquiriesSelectedCount) {
            inquiriesSelectedCount.textContent = `${count} selected`;
        }
        if (bulkDeleteInquiriesBtn) {
            bulkDeleteInquiriesBtn.disabled = count === 0;
            bulkDeleteInquiriesBtn.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>${count > 0 ? `Delete Selected (${count})` : 'Delete Selected'}</span>
            `;
        }
        if (selectAllInquiries) {
            const total = currentMessages.length;
            selectAllInquiries.checked = total > 0 && count === total;
            selectAllInquiries.indeterminate = count > 0 && count < total;
        }
    };

    if (selectAllInquiries) {
        selectAllInquiries.addEventListener('change', () => {
            const isChecked = selectAllInquiries.checked;
            selectedInquiryIds.clear();
            const checkboxes = adminMessagesList.querySelectorAll('.inquiry-select-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
                const id = Number(cb.getAttribute('data-id'));
                if (isChecked && id) {
                    selectedInquiryIds.add(id);
                }
                const card = cb.closest('.admin-inquiry-card');
                if (card) card.classList.toggle('selected', isChecked);
            });
            updateInquirySelectionState();
        });
    }

    if (bulkDeleteInquiriesBtn) {
        bulkDeleteInquiriesBtn.addEventListener('click', async () => {
            const count = selectedInquiryIds.size;
            if (count === 0) return;
            if (!confirm(`Are you sure you want to permanently delete ${count} selected contact inquiries from PostgreSQL?`)) return;

            try {
                const res = await fetch('/api/admin?action=messages', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedInquiryIds) })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Failed to delete inquiries');
                selectedInquiryIds.clear();
                loadMessages();
            } catch (err) {
                alert(`Error deleting inquiries: ${err.message}`);
            }
        });
    }

    if (toggleAllInquiriesAccordionBtn) {
        toggleAllInquiriesAccordionBtn.addEventListener('click', () => {
            areAllExpanded = !areAllExpanded;
            const cards = adminMessagesList.querySelectorAll('.admin-inquiry-card');
            cards.forEach(card => {
                card.classList.toggle('expanded', areAllExpanded);
                const headerBar = card.querySelector('.admin-inquiry-card__header-bar');
                if (headerBar) headerBar.setAttribute('aria-expanded', areAllExpanded.toString());
            });
            if (toggleAllAccordionLabel) {
                toggleAllAccordionLabel.textContent = areAllExpanded ? 'Collapse All' : 'Expand All';
            }
        });
    }

    // Load Messages from /api/admin?action=messages
    const loadMessages = async () => {
        if (!adminMessagesList) return;
        adminMessagesList.innerHTML = '<p class="admin-panel-card__desc">Loading contact messages from PostgreSQL...</p>';
        try {
            const res = await fetch('/api/admin?action=messages');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to load messages');

            currentMessages = data.messages || [];
            renderMessagesList(currentMessages);
        } catch (err) {
            adminMessagesList.innerHTML = `<p class="form__error visible">Failed to load messages: ${err.message}</p>`;
        }
    };

    const renderMessagesList = (messages) => {
        if (!adminMessagesList) return;
        const unreadCount = messages.filter(m => !m.is_read).length;
        if (unreadCountBadge) unreadCountBadge.textContent = unreadCount;

        if (!messages || messages.length === 0) {
            if (inquiriesToolbar) inquiriesToolbar.hidden = true;
            adminMessagesList.innerHTML = '<p class="admin-panel-card__desc">No contact messages received in PostgreSQL yet. Incoming messages will appear here.</p>';
            return;
        }

        if (inquiriesToolbar) inquiriesToolbar.hidden = false;
        selectedInquiryIds.clear();
        updateInquirySelectionState();

        adminMessagesList.innerHTML = '';
        messages.forEach(m => {
            const item = document.createElement('div');
            item.className = `admin-inquiry-card ${m.is_read ? 'admin-inquiry-card--read' : 'admin-inquiry-card--unread'}`;
            item.setAttribute('data-id', m.id);

            const dateStr = new Date(m.created_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const deliveryPill = m.email_delivered
                ? `<span class="admin-pill admin-pill--ok">Delivered (${m.email_provider})</span>`
                : `<span class="admin-pill admin-pill--warn">Relay Pending</span>`;

            item.innerHTML = `
                <div class="admin-inquiry-card__header-bar" role="button" tabindex="0" aria-expanded="false" title="Click to expand/collapse details">
                    <div class="admin-inquiry-card__header-left">
                        <input type="checkbox" class="admin-checkbox inquiry-select-checkbox" data-id="${m.id}" aria-label="Select inquiry from ${m.name}">
                        <div class="admin-inquiry-card__info-snippet">
                            <div class="admin-inquiry-card__sender-line">
                                <span class="admin-chip admin-chip--tag">${m.inquiry_label || m.inquiry_type}</span>
                                <strong>${m.name}</strong>
                                <span class="admin-inquiry-card__date" style="color: var(--clr-accent);">&lt;${m.email}&gt;</span>
                            </div>
                            <div class="admin-inquiry-card__subject-preview">
                                <strong>Subject:</strong> ${m.subject}
                            </div>
                        </div>
                    </div>
                    <div class="admin-inquiry-card__header-right">
                        <span class="admin-inquiry-card__date">${dateStr}</span>
                        ${deliveryPill}
                        <span class="admin-accordion-chevron" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </span>
                    </div>
                </div>
                <div class="admin-inquiry-card__collapse">
                    ${m.company ? `<p class="admin-inquiry-card__company"><strong>Company / Org:</strong> ${m.company}</p>` : ''}
                    <div class="admin-inquiry-card__subject">
                        <strong>Full Subject:</strong> ${m.subject}
                    </div>
                    <div class="admin-inquiry-card__body">${m.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
                    <div class="admin-inquiry-card__actions">
                        <a href="mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}" class="admin-btn-action" style="background: var(--clr-accent); color: #ffffff; border-color: var(--clr-accent);">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            <span>Reply via Email</span>
                        </a>
                        <button type="button" class="admin-btn-action toggle-read-btn" data-id="${m.id}" data-read="${m.is_read}">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>${m.is_read ? 'Mark as Unread' : 'Mark as Read'}</span>
                        </button>
                        <button type="button" class="admin-btn-action admin-btn-action--delete delete-msg-btn" data-id="${m.id}">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            `;
            adminMessagesList.appendChild(item);

            const headerBar = item.querySelector('.admin-inquiry-card__header-bar');
            const checkbox = item.querySelector('.inquiry-select-checkbox');

            headerBar.addEventListener('click', (e) => {
                if (e.target.closest('.inquiry-select-checkbox')) return;
                const isNowExpanded = item.classList.toggle('expanded');
                headerBar.setAttribute('aria-expanded', isNowExpanded.toString());
            });

            headerBar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    if (e.target.closest('.inquiry-select-checkbox')) return;
                    e.preventDefault();
                    const isNowExpanded = item.classList.toggle('expanded');
                    headerBar.setAttribute('aria-expanded', isNowExpanded.toString());
                }
            });

            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const id = Number(checkbox.getAttribute('data-id'));
                if (checkbox.checked) {
                    selectedInquiryIds.add(id);
                    item.classList.add('selected');
                } else {
                    selectedInquiryIds.delete(id);
                    item.classList.remove('selected');
                }
                updateInquirySelectionState();
            });
        });

        // Attach action handlers for messages inside collapse
        adminMessagesList.querySelectorAll('.toggle-read-btn').forEach(b => {
            b.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = b.getAttribute('data-id');
                const isCurrentlyRead = b.getAttribute('data-read') === 'true';
                try {
                    await fetch(`/api/admin?action=messages&id=${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_read: !isCurrentlyRead })
                    });
                    loadMessages();
                } catch (e) {
                    alert('Failed to update message status.');
                }
            });
        });

        adminMessagesList.querySelectorAll('.delete-msg-btn').forEach(b => {
            b.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = b.getAttribute('data-id');
                if (!confirm('Permanently delete this contact message from PostgreSQL?')) return;
                try {
                    await fetch(`/api/admin?action=messages&id=${id}`, { method: 'DELETE' });
                    loadMessages();
                } catch (e) {
                    alert('Failed to delete message.');
                }
            });
        });
    };

    /* ==========================================================================
       VISITORS & ANALYTICS DASHBOARD ENGINE
       ========================================================================== */
    const analyticsState = {
        range: '30d',
        startDate: '',
        endDate: '',
        granularity: 'daily',
        timezone: 'Asia/Manila',
        activityPage: 1,
        activityFilter: 'all',
        downloadsPage: 1
    };

    const analyticsTzDisplay = document.getElementById('analyticsTzDisplay');
    const analyticsTzSelect = document.getElementById('analyticsTzSelect');
    const analyticsCustomRangeBar = document.getElementById('analyticsCustomRangeBar');
    const analyticsStartDate = document.getElementById('analyticsStartDate');
    const analyticsEndDate = document.getElementById('analyticsEndDate');
    const applyCustomRangeBtn = document.getElementById('applyCustomRangeBtn');
    const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
    const analyticsErrorBox = document.getElementById('analyticsErrorBox');

    const kpiTotalVisits = document.getElementById('kpiTotalVisits');
    const kpiVisitsBreakdown = document.getElementById('kpiVisitsBreakdown');
    const kpiUniqueVisitors = document.getElementById('kpiUniqueVisitors');
    const kpiIdentifiedSub = document.getElementById('kpiIdentifiedSub');
    const kpiPageViews = document.getElementById('kpiPageViews');
    const kpiResumeServed = document.getElementById('kpiResumeServed');
    const kpiResumeBreakdown = document.getElementById('kpiResumeBreakdown');

    const analyticsResumeFileBadge = document.getElementById('analyticsResumeFileBadge');
    const analyticsBotsBadge = document.getElementById('analyticsBotsBadge');
    const analyticsActiveRangeLabel = document.getElementById('analyticsActiveRangeLabel');

    const visitorTrafficChart = document.getElementById('visitorTrafficChart');
    const resumeTrendChart = document.getElementById('resumeTrendChart');

    const recentActivityTableBody = document.getElementById('recentActivityTableBody');
    const activityPageInfo = document.getElementById('activityPageInfo');
    const activityPrevBtn = document.getElementById('activityPrevBtn');
    const activityNextBtn = document.getElementById('activityNextBtn');

    const resumeDownloadsTableBody = document.getElementById('resumeDownloadsTableBody');
    const downloadsPageInfo = document.getElementById('downloadsPageInfo');
    const downloadsPrevBtn = document.getElementById('downloadsPrevBtn');
    const downloadsNextBtn = document.getElementById('downloadsNextBtn');

    const identifiedVisitorsTableBody = document.getElementById('identifiedVisitorsTableBody');
    const analyticsRetentionSelect = document.getElementById('analyticsRetentionSelect');
    const purgeAnalyticsBtn = document.getElementById('purgeAnalyticsBtn');

    const escapeAnalyticsHtml = (str) => String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const formatTimestampInTz = (isoStr, tz) => {
        if (!isoStr) return '—';
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: tz || 'Asia/Manila',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(isoStr));
        } catch (e) {
            return new Date(isoStr).toLocaleString();
        }
    };

    const renderDualLineChart = (container, series) => {
        if (!container) return;
        if (!Array.isArray(series) || series.length === 0) {
            container.innerHTML = '<div class="analytics-chart-empty">No traffic data available for the selected range.</div>';
            return;
        }

        const W = 560;
        const H = 220;
        const padL = 38;
        const padR = 16;
        const padT = 16;
        const padB = 34;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        const maxVal = Math.max(4, ...series.map(d => Math.max(d.visits || 0, d.pageViews || 0)));
        const ySteps = 4;
        const stepX = series.length > 1 ? plotW / (series.length - 1) : 0;

        const getX = (idx) => series.length === 1 ? padL + plotW / 2 : padL + idx * stepX;
        const getY = (val) => padT + plotH - ((val || 0) / maxVal) * plotH;

        let gridLines = '';
        for (let i = 0; i <= ySteps; i++) {
            const val = Math.round((maxVal * i) / ySteps);
            const y = getY(val);
            gridLines += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="chart-grid-line" />`;
            gridLines += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart-axis-text">${val}</text>`;
        }

        const visitPoints = series.map((d, i) => `${getX(i).toFixed(1)},${getY(d.visits).toFixed(1)}`).join(' ');
        const viewPoints = series.map((d, i) => `${getX(i).toFixed(1)},${getY(d.pageViews).toFixed(1)}`).join(' ');

        // X-axis labels (show at most 6 evenly spaced labels to avoid overlap)
        const maxLabels = Math.min(6, series.length);
        const labelStep = series.length <= maxLabels ? 1 : Math.ceil((series.length - 1) / (maxLabels - 1));
        let xLabels = '';
        series.forEach((d, i) => {
            if (i === 0 || i === series.length - 1 || i % labelStep === 0) {
                xLabels += `<text x="${getX(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="chart-axis-text">${escapeAnalyticsHtml(d.label)}</text>`;
            }
        });

        let dotsHtml = '';
        series.forEach((d, i) => {
            const cx = getX(i).toFixed(1);
            const cyVisits = getY(d.visits).toFixed(1);
            const cyViews = getY(d.pageViews).toFixed(1);
            const tipText = `${d.label}: ${d.visits} visit(s), ${d.pageViews} page view(s), ${d.uniqueVisitors} unique`;
            dotsHtml += `
                <circle cx="${cx}" cy="${cyViews}" r="3.5" class="chart-dot chart-dot--views" tabindex="0" data-tip="${escapeAnalyticsHtml(tipText)}" aria-label="${escapeAnalyticsHtml(tipText)}" />
                <circle cx="${cx}" cy="${cyVisits}" r="4" class="chart-dot chart-dot--visits" tabindex="0" data-tip="${escapeAnalyticsHtml(tipText)}" aria-label="${escapeAnalyticsHtml(tipText)}" />
            `;
        });

        const lineHtml = series.length > 1
            ? `<polyline fill="none" points="${viewPoints}" class="chart-line chart-line--views" />
               <polyline fill="none" points="${visitPoints}" class="chart-line chart-line--visits" />`
            : '';

        container.innerHTML = `
            <div class="analytics-svg-wrap">
                <svg viewBox="0 0 ${W} ${H}" class="analytics-svg" preserveAspectRatio="xMidYMid meet">
                    ${gridLines}
                    ${lineHtml}
                    ${dotsHtml}
                    ${xLabels}
                </svg>
                <div class="analytics-chart-tooltip" hidden></div>
            </div>
        `;
        bindChartTooltips(container);
    };

    const renderGroupedBarChart = (container, series) => {
        if (!container) return;
        if (!Array.isArray(series) || series.length === 0) {
            container.innerHTML = '<div class="analytics-chart-empty">No résumé download activity in this range.</div>';
            return;
        }

        const W = 560;
        const H = 220;
        const padL = 38;
        const padR = 16;
        const padT = 16;
        const padB = 34;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        const maxVal = Math.max(4, ...series.map(d => Math.max(d.requested || 0, d.served || 0)));
        const ySteps = 4;
        const groupW = plotW / series.length;
        const barW = Math.max(4, Math.min(18, (groupW * 0.65) / 2));

        const getY = (val) => padT + plotH - ((val || 0) / maxVal) * plotH;

        let gridLines = '';
        for (let i = 0; i <= ySteps; i++) {
            const val = Math.round((maxVal * i) / ySteps);
            const y = getY(val);
            gridLines += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="chart-grid-line" />`;
            gridLines += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart-axis-text">${val}</text>`;
        }

        const maxLabels = Math.min(6, series.length);
        const labelStep = series.length <= maxLabels ? 1 : Math.ceil((series.length - 1) / (maxLabels - 1));
        let barsHtml = '';
        let xLabels = '';

        series.forEach((d, i) => {
            const centerX = padL + i * groupW + groupW / 2;
            const reqH = Math.max(d.requested > 0 ? 3 : 0, (d.requested / maxVal) * plotH);
            const srvH = Math.max(d.served > 0 ? 3 : 0, (d.served / maxVal) * plotH);
            const reqY = padT + plotH - reqH;
            const srvY = padT + plotH - srvH;
            const tipText = `${d.label}: ${d.requested} requested, ${d.served} served${d.unavailable ? ', ' + d.unavailable + ' unavailable' : ''}`;

            barsHtml += `
                <rect x="${(centerX - barW - 1).toFixed(1)}" y="${reqY.toFixed(1)}" width="${barW.toFixed(1)}" height="${reqH.toFixed(1)}" rx="2" class="chart-bar chart-bar--requested" tabindex="0" data-tip="${escapeAnalyticsHtml(tipText)}" aria-label="${escapeAnalyticsHtml(tipText)}" />
                <rect x="${(centerX + 1).toFixed(1)}" y="${srvY.toFixed(1)}" width="${barW.toFixed(1)}" height="${srvH.toFixed(1)}" rx="2" class="chart-bar chart-bar--served" tabindex="0" data-tip="${escapeAnalyticsHtml(tipText)}" aria-label="${escapeAnalyticsHtml(tipText)}" />
            `;

            if (i === 0 || i === series.length - 1 || i % labelStep === 0) {
                xLabels += `<text x="${centerX.toFixed(1)}" y="${H - 10}" text-anchor="middle" class="chart-axis-text">${escapeAnalyticsHtml(d.label)}</text>`;
            }
        });

        container.innerHTML = `
            <div class="analytics-svg-wrap">
                <svg viewBox="0 0 ${W} ${H}" class="analytics-svg" preserveAspectRatio="xMidYMid meet">
                    ${gridLines}
                    ${barsHtml}
                    ${xLabels}
                </svg>
                <div class="analytics-chart-tooltip" hidden></div>
            </div>
        `;
        bindChartTooltips(container);
    };

    const bindChartTooltips = (container) => {
        const tooltip = container.querySelector('.analytics-chart-tooltip');
        if (!tooltip) return;
        const targets = container.querySelectorAll('[data-tip]');
        targets.forEach(el => {
            const showTip = () => {
                tooltip.textContent = el.getAttribute('data-tip') || '';
                tooltip.hidden = false;
            };
            const hideTip = () => {
                tooltip.hidden = true;
            };
            el.addEventListener('mouseenter', showTip);
            el.addEventListener('mouseleave', hideTip);
            el.addEventListener('focus', showTip);
            el.addEventListener('blur', hideTip);
        });
    };

    const renderRecentActivity = (actData, tz) => {
        if (!recentActivityTableBody) return;
        const items = (actData && actData.items) || [];
        if (items.length === 0) {
            recentActivityTableBody.innerHTML = '<tr><td colspan="5" class="analytics-table-empty">No visitor activity recorded for this filter and date range.</td></tr>';
        } else {
            recentActivityTableBody.innerHTML = items.map(item => {
                const isId = item.classification === 'identified';
                const visitorCell = isId
                    ? `<div class="analytics-visitor-cell">
                           <span class="analytics-badge analytics-badge--identified">Identified</span>
                           <strong>${escapeAnalyticsHtml(item.visitorName)}</strong>
                           ${item.company ? `<span class="analytics-company-sub">· ${escapeAnalyticsHtml(item.company)}</span>` : ''}
                       </div>`
                    : `<div class="analytics-visitor-cell">
                           <span class="analytics-badge analytics-badge--anon">Anonymous</span>
                           <span class="analytics-anon-name">Anonymous Visitor</span>
                       </div>`;

                return `
                    <tr>
                        <td>${visitorCell}</td>
                        <td>${escapeAnalyticsHtml(item.activityLabel)}</td>
                        <td class="analytics-nowrap">${escapeAnalyticsHtml(formatTimestampInTz(item.timestamp, tz))}</td>
                        <td><span class="analytics-source-chip">${escapeAnalyticsHtml(item.source)}</span></td>
                        <td class="analytics-capitalize">${escapeAnalyticsHtml(item.deviceCategory)}</td>
                    </tr>
                `;
            }).join('');
        }

        const page = (actData && actData.page) || 1;
        const totalPages = (actData && actData.totalPages) || 1;
        const total = (actData && actData.total) || 0;
        if (activityPageInfo) activityPageInfo.textContent = `Page ${page} of ${totalPages} (${total} events)`;
        if (activityPrevBtn) activityPrevBtn.disabled = page <= 1;
        if (activityNextBtn) activityNextBtn.disabled = page >= totalPages;
    };

    const renderResumeDownloads = (dlData, tz) => {
        if (!resumeDownloadsTableBody) return;
        const items = (dlData && dlData.items) || [];
        if (items.length === 0) {
            resumeDownloadsTableBody.innerHTML = '<tr><td colspan="6" class="analytics-table-empty">No résumé download events recorded in this date range.</td></tr>';
        } else {
            resumeDownloadsTableBody.innerHTML = items.map(item => {
                const isId = item.classification === 'identified';
                let outcomeClass = 'analytics-badge--requested';
                if (item.eventType === 'resume_served') outcomeClass = 'analytics-badge--served';
                else if (item.eventType === 'resume_unavailable') outcomeClass = 'analytics-badge--warn';

                return `
                    <tr>
                        <td>${isId ? `<strong>${escapeAnalyticsHtml(item.visitorName)}</strong>` : '<span class="analytics-anon-name">Anonymous Visitor</span>'}</td>
                        <td><span class="analytics-badge ${isId ? 'analytics-badge--identified' : 'analytics-badge--anon'}">${isId ? 'Identified' : 'Anonymous'}</span></td>
                        <td>${item.company ? escapeAnalyticsHtml(item.company) : '—'}</td>
                        <td><code>${escapeAnalyticsHtml(item.resource)}</code></td>
                        <td><span class="analytics-badge ${outcomeClass}">${escapeAnalyticsHtml(item.outcome)}</span></td>
                        <td class="analytics-nowrap">${escapeAnalyticsHtml(formatTimestampInTz(item.timestamp, tz))}</td>
                    </tr>
                `;
            }).join('');
        }

        const page = (dlData && dlData.page) || 1;
        const totalPages = (dlData && dlData.totalPages) || 1;
        const total = (dlData && dlData.total) || 0;
        if (downloadsPageInfo) downloadsPageInfo.textContent = `Page ${page} of ${totalPages} (${total} records)`;
        if (downloadsPrevBtn) downloadsPrevBtn.disabled = page <= 1;
        if (downloadsNextBtn) downloadsNextBtn.disabled = page >= totalPages;
    };

    const renderIdentifiedVisitors = (list, tz) => {
        if (!identifiedVisitorsTableBody) return;
        if (!Array.isArray(list) || list.length === 0) {
            identifiedVisitorsTableBody.innerHTML = '<tr><td colspan="6" class="analytics-table-empty">No visitors have voluntarily identified themselves yet.</td></tr>';
            return;
        }

        identifiedVisitorsTableBody.innerHTML = list.map(v => {
            const sourceLabel = v.source === 'resume_request' ? 'Résumé Request Form' : 'Contact Form';
            return `
                <tr>
                    <td><strong>${escapeAnalyticsHtml(v.full_name)}</strong></td>
                    <td>${v.company ? escapeAnalyticsHtml(v.company) : '—'}</td>
                    <td>${v.email ? escapeAnalyticsHtml(v.email) : '—'}</td>
                    <td><span class="analytics-source-chip">${escapeAnalyticsHtml(sourceLabel)}</span></td>
                    <td class="analytics-nowrap">${escapeAnalyticsHtml(formatTimestampInTz(v.identified_at, tz))}</td>
                    <td>
                        <button type="button" class="admin-btn-action admin-btn-action--delete delete-identity-btn" data-id="${v.id}">
                            Delete PII
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        identifiedVisitorsTableBody.querySelectorAll('.delete-identity-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!confirm('Delete this visitor\'s personal identity record? Linked historical traffic will remain as Anonymous Visitor.')) return;
                try {
                    const res = await fetch(`/api/analytics?action=delete_identity&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Deletion failed');
                    loadAnalytics();
                } catch (err) {
                    alert(err.message || 'Unable to delete identity record.');
                }
            });
        });
    };

    const loadAnalytics = async () => {
        if (!panelAnalytics) return;
        if (analyticsErrorBox) {
            analyticsErrorBox.textContent = '';
            analyticsErrorBox.classList.remove('visible');
        }

        const params = new URLSearchParams({
            range: analyticsState.range,
            granularity: analyticsState.granularity,
            tz: analyticsState.timezone,
            activityPage: String(analyticsState.activityPage),
            activityFilter: analyticsState.activityFilter,
            downloadsPage: String(analyticsState.downloadsPage)
        });
        if (analyticsState.range === 'custom' && analyticsState.startDate && analyticsState.endDate) {
            params.set('start', analyticsState.startDate);
            params.set('end', analyticsState.endDate);
        }

        try {
            const res = await fetch(`/api/analytics?${params.toString()}`);
            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data.message || 'Failed to load analytics data.');
            }

            const s = data.summary || {};
            if (analyticsTzDisplay) analyticsTzDisplay.textContent = data.timezone || analyticsState.timezone;
            if (analyticsActiveRangeLabel) {
                analyticsActiveRangeLabel.textContent = `Period: ${data.startDate} to ${data.endDate} (${data.granularity})`;
            }
            if (analyticsStartDate && !analyticsStartDate.value) analyticsStartDate.value = data.startDate;
            if (analyticsEndDate && !analyticsEndDate.value) analyticsEndDate.value = data.endDate;

            if (kpiTotalVisits) kpiTotalVisits.textContent = String(s.totalVisits ?? 0);
            if (kpiVisitsBreakdown) {
                kpiVisitsBreakdown.textContent = `Today: ${s.todayVisits ?? 0} · Week: ${s.weeklyVisits ?? 0} · Month: ${s.monthlyVisits ?? 0}`;
            }
            if (kpiUniqueVisitors) kpiUniqueVisitors.textContent = String(s.uniqueVisitors ?? 0);
            if (kpiIdentifiedSub) {
                kpiIdentifiedSub.textContent = `Identified: ${s.identifiedVisitors ?? 0} total (${s.identifiedVisitorsInRange ?? 0} in range)`;
            }
            if (kpiPageViews) kpiPageViews.textContent = String(s.totalPageViews ?? 0);
            if (kpiResumeServed) kpiResumeServed.textContent = String(s.resumeServed ?? 0);
            if (kpiResumeBreakdown) {
                kpiResumeBreakdown.textContent = `Requested: ${s.resumeRequested ?? 0} · Today: ${s.todayDownloads ?? 0} · Month: ${s.monthlyDownloads ?? 0}`;
            }

            if (analyticsResumeFileBadge) {
                analyticsResumeFileBadge.textContent = data.resumeFileAvailable
                    ? `Résumé PDF (${data.resumeFilename}): Ready`
                    : `Résumé PDF (${data.resumeFilename}): Pending upload`;
                analyticsResumeFileBadge.className = 'analytics-meta-badge ' + (data.resumeFileAvailable ? 'analytics-meta-badge--ok' : 'analytics-meta-badge--warn');
            }
            if (analyticsBotsBadge) {
                analyticsBotsBadge.textContent = `Automated bots filtered: ${s.botsFiltered ?? 0}`;
            }

            renderDualLineChart(visitorTrafficChart, data.trafficSeries);
            renderGroupedBarChart(resumeTrendChart, data.downloadSeries);
            renderRecentActivity(data.recentActivity, data.timezone);
            renderResumeDownloads(data.resumeDownloads, data.timezone);
            renderIdentifiedVisitors(data.identifiedVisitorsList, data.timezone);
        } catch (err) {
            if (analyticsErrorBox) {
                analyticsErrorBox.textContent = err.message || 'Unable to load visitor analytics.';
                analyticsErrorBox.classList.add('visible');
            }
        }
    };

    // Bind Analytics Controls
    document.querySelectorAll('.analytics-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const selected = btn.getAttribute('data-range') || '30d';
            analyticsState.range = selected;
            analyticsState.activityPage = 1;
            analyticsState.downloadsPage = 1;
            if (analyticsCustomRangeBar) {
                analyticsCustomRangeBar.hidden = selected !== 'custom';
            }
            if (selected !== 'custom') {
                loadAnalytics();
            }
        });
    });

    if (applyCustomRangeBtn) {
        applyCustomRangeBtn.addEventListener('click', () => {
            if (!analyticsStartDate || !analyticsEndDate || !analyticsStartDate.value || !analyticsEndDate.value) {
                alert('Please select both Start and End dates.');
                return;
            }
            analyticsState.range = 'custom';
            analyticsState.startDate = analyticsStartDate.value;
            analyticsState.endDate = analyticsEndDate.value;
            analyticsState.activityPage = 1;
            analyticsState.downloadsPage = 1;
            loadAnalytics();
        });
    }

    document.querySelectorAll('.analytics-gran-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.analytics-gran-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            analyticsState.granularity = btn.getAttribute('data-granularity') || 'daily';
            loadAnalytics();
        });
    });

    if (analyticsTzSelect) {
        analyticsTzSelect.addEventListener('change', () => {
            analyticsState.timezone = analyticsTzSelect.value || 'Asia/Manila';
            loadAnalytics();
        });
    }

    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener('click', () => loadAnalytics());
    }

    document.querySelectorAll('.analytics-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.analytics-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            analyticsState.activityFilter = pill.getAttribute('data-filter') || 'all';
            analyticsState.activityPage = 1;
            loadAnalytics();
        });
    });

    if (activityPrevBtn) {
        activityPrevBtn.addEventListener('click', () => {
            if (analyticsState.activityPage > 1) {
                analyticsState.activityPage--;
                loadAnalytics();
            }
        });
    }
    if (activityNextBtn) {
        activityNextBtn.addEventListener('click', () => {
            analyticsState.activityPage++;
            loadAnalytics();
        });
    }
    if (downloadsPrevBtn) {
        downloadsPrevBtn.addEventListener('click', () => {
            if (analyticsState.downloadsPage > 1) {
                analyticsState.downloadsPage--;
                loadAnalytics();
            }
        });
    }
    if (downloadsNextBtn) {
        downloadsNextBtn.addEventListener('click', () => {
            analyticsState.downloadsPage++;
            loadAnalytics();
        });
    }

    if (purgeAnalyticsBtn) {
        purgeAnalyticsBtn.addEventListener('click', async () => {
            const days = analyticsRetentionSelect ? analyticsRetentionSelect.value : '180';
            if (!confirm(`Permanently delete visitor analytics events and sessions older than ${days} days?`)) return;
            try {
                const res = await fetch(`/api/analytics?action=purge&retentionDays=${encodeURIComponent(days)}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Retention purge failed');
                alert(data.message || 'Old analytics data purged.');
                loadAnalytics();
            } catch (err) {
                alert(err.message || 'Unable to purge analytics records.');
            }
        });
    }

    // Initial check
    checkAuthStatus();
});
