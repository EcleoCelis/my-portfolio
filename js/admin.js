'use strict';

document.addEventListener('DOMContentLoaded', () => {
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
    const panelProjects = document.getElementById('panelProjects');
    const panelMessages = document.getElementById('panelMessages');
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

    // Process Image File (Base64 conversion and preview)
    const handleImageFile = (file) => {
        if (!file) return;
        if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
            alert('Please select a valid image file (PNG, JPEG, WebP, or GIF).');
            return;
        }

        if (file.size > 2.8 * 1024 * 1024) {
            alert('Image file size exceeds 2.8 MB. Please choose a smaller screenshot or optimize it first.');
            if (projImageInput) projImageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64Uri = reader.result;
            projImageData.value = base64Uri;
            if (projImagePreview) {
                projImagePreview.src = base64Uri;
            }
            if (projImagePreviewBox) {
                projImagePreviewBox.hidden = false;
            }
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
    const switchTab = (activeTab) => {
        if (activeTab === 'projects') {
            tabProjectsBtn.classList.add('active');
            tabProjectsBtn.setAttribute('aria-selected', 'true');
            tabMessagesBtn.classList.remove('active');
            tabMessagesBtn.setAttribute('aria-selected', 'false');
            panelProjects.hidden = false;
            panelMessages.hidden = true;
        } else {
            tabMessagesBtn.classList.add('active');
            tabMessagesBtn.setAttribute('aria-selected', 'true');
            tabProjectsBtn.classList.remove('active');
            tabProjectsBtn.setAttribute('aria-selected', 'false');
            panelMessages.hidden = false;
            panelProjects.hidden = true;
            loadMessages();
        }
    };

    if (tabProjectsBtn) tabProjectsBtn.addEventListener('click', () => switchTab('projects'));
    if (tabMessagesBtn) tabMessagesBtn.addEventListener('click', () => switchTab('messages'));
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

    // Initial check
    checkAuthStatus();
});
