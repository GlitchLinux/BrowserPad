document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const bodyElement = document.body;
    const fileBrowser = document.querySelector('.file-browser');
    const fileListElement = document.getElementById('file-list');
    const editorTextArea = document.getElementById('editor-area');
    const currentFileDisplay = document.getElementById('current-file');
    const saveButton = document.getElementById('save-btn');
    const collapseSidebarButton = document.getElementById('collapse-sidebar-btn');
    const expandSidebarButton = document.getElementById('expand-sidebar-btn');
    const openFolderButton = document.getElementById('open-folder-btn');
    const newFileButton = document.getElementById('new-file-btn');
    const fontDecreaseButton = document.getElementById('font-decrease-btn');
    const fontIncreaseButton = document.getElementById('font-increase-btn');
    const currentFontSizeSpan = document.getElementById('current-font-size');
    const dropdownButton = document.getElementById('dropdown-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const deleteFileButton = document.getElementById('delete-file-btn');
    const newFolderButton = document.getElementById('new-folder-btn');
    let selectedFilePath = null;

    // --- State Variables ---
    let activeListItem = null;
    let currentFileName = 'untitled.txt';
    let currentFontSize = 14;
    let editorInstance = null;
    let isSidebarCollapsed = false;
    let serverFilePath = null;
    let hasUnsavedChanges = false;
    let isNewFile = true;
    let isTempFile = true;
    let showLineNumbers = true;
    let syntaxHighlightingEnabled = true;
    let currentTheme = 'material-darker';
    let expandedFolders = {};

    const API_URL = 'https://glitchlinux.wtf/browserpad/api/files.php';
    const ICONS_URL = 'https://glitchlinux.wtf/browserpad/icons';

    // --- Get Icon URL by file extension ---
    function getIconUrl(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        const iconMap = {
            'js': 'js.png',
            'py': 'py.png',
            'sh': 'sh.png',
            'bash': 'sh.png',
            'c': 'c.png',
            'cpp': 'c++.png',
            'cc': 'c++.png',
            'cxx': 'c++.png',
            'cs': 'c#.png',
            'xml': 'xlm.png',
            'md': 'md.png',
            'markdown': 'md.png',
            'txt': 'txt.png'
        };
        
        // If extension not in map, check if filename has no extension
        if (!iconMap[ext] && !filename.includes('.')) {
            return `${ICONS_URL}/no-file-extension.png`;
        }
        
        return iconMap[ext] ? `${ICONS_URL}/${iconMap[ext]}` : null;
    }

    // --- CodeMirror Initialization ---
    try {
        editorInstance = CodeMirror.fromTextArea(editorTextArea, {
            lineNumbers: showLineNumbers,
            mode: 'text/plain',
            theme: currentTheme,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: false
        });
        console.log("CodeMirror initialized successfully.");
    } catch (error) {
        console.error("Error initializing CodeMirror:", error);
        alert("Failed to initialize editor");
        return;
    }

    // --- Auto-detect language based on filename ---
    function detectMode(filename) {
        if (!syntaxHighlightingEnabled) return 'text/plain';
        
        const ext = filename.split('.').pop().toLowerCase();
        
        const modeMap = {
            'js': 'javascript',
            'py': 'python',
            'sh': 'application/x-sh',
            'bash': 'application/x-sh',
            'c': 'text/x-csrc',
            'cpp': 'text/x-c++src',
            'cc': 'text/x-c++src',
            'h': 'text/x-csrc',
            'hpp': 'text/x-c++src',
            'java': 'text/x-java',
            'html': 'text/html',
            'xml': 'application/xml',
            'css': 'text/css',
            'json': 'application/json',
            'md': 'text/plain',
            'markdown': 'text/plain',
            'txt': 'text/plain'
        };
        
        return modeMap[ext] || 'text/plain';
    }

    // --- Track unsaved changes ---
    if (editorInstance) {
        editorInstance.on('change', () => {
            hasUnsavedChanges = true;
        });
    }

    // --- Warn before leaving page with unsaved changes ---
    window.addEventListener('beforeunload', (event) => {
        if (hasUnsavedChanges && serverFilePath) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    // --- Load settings from localStorage ---
    function loadSettings() {
        showLineNumbers = localStorage.getItem('showLineNumbers') !== 'false';
        syntaxHighlightingEnabled = localStorage.getItem('syntaxHighlighting') !== 'false';
        currentTheme = localStorage.getItem('theme') || 'material-darker';
        
        if (editorInstance) {
            editorInstance.setOption('lineNumbers', showLineNumbers);
            editorInstance.setOption('theme', currentTheme);
        }
        
        updateSettingsUI();
    }

    function updateSettingsUI() {
        const toggleLineNumbers = document.getElementById('toggle-linenumbers-link');
        const toggleHighlighting = document.getElementById('toggle-highlighting-link');
        const toggleTheme = document.getElementById('toggle-theme-link');
        
        if (toggleLineNumbers) toggleLineNumbers.textContent = showLineNumbers ? '☑ Line Numbers' : '☐ Line Numbers';
        if (toggleHighlighting) toggleHighlighting.textContent = syntaxHighlightingEnabled ? '☑ Syntax Highlighting' : '☐ Syntax Highlighting';
        if (toggleTheme) toggleTheme.textContent = `🎨 Theme: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`;
    }

    // --- Font Size Control ---
    function updateEditorFontSize() {
        if (!editorInstance) return;
        const cmWrapper = editorInstance.getWrapperElement();
        cmWrapper.style.fontSize = `${currentFontSize}px`;
        currentFontSizeSpan.textContent = `${currentFontSize}px`;
        editorInstance.refresh();
        localStorage.setItem('fontSize', currentFontSize);
    }

    fontIncreaseButton.addEventListener('click', () => {
        if (currentFontSize < 32) {
            currentFontSize += 1;
            updateEditorFontSize();
        }
    });

    fontDecreaseButton.addEventListener('click', () => {
        if (currentFontSize > 8) {
            currentFontSize -= 1;
            updateEditorFontSize();
        }
    });

    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) currentFontSize = parseInt(savedFontSize);
    updateEditorFontSize();

    // --- Sidebar Collapse/Expand ---
    function toggleSidebar(collapse) {
        isSidebarCollapsed = collapse;
        fileBrowser.classList.toggle('collapsed', isSidebarCollapsed);
        bodyElement.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
        
        if (isSidebarCollapsed) {
            expandSidebarButton.style.display = 'block';
        } else {
            expandSidebarButton.style.display = 'none';
            // Auto-load files when expanding sidebar
            loadServerFiles();
        }
        
        if (editorInstance) editorInstance.refresh();
    }

    collapseSidebarButton.addEventListener('click', () => {
        toggleSidebar(true);
    });

    expandSidebarButton.addEventListener('click', () => {
        toggleSidebar(false);
    });

    // --- Render file/folder tree ---
    function renderFileTree(files, parentElement, parentPath = '') {
        const folders = files.filter(f => f.type === 'dir').sort((a, b) => a.name.localeCompare(b.name));
        const filelist = files.filter(f => f.type === 'file' && f.name !== 'untitled.txt').sort((a, b) => a.name.localeCompare(b.name));

        // Render folders first
        folders.forEach(folder => {
            const li = document.createElement('li');
            li.className = 'type-folder';
            li.dataset.path = folder.path;
            li.dataset.isFolder = 'true';
            li.style.paddingLeft = '0';
            
            const toggleBtn = document.createElement('span');
            toggleBtn.className = 'folder-toggle';
            toggleBtn.textContent = '▶ ';
            toggleBtn.style.cursor = 'pointer';
            toggleBtn.style.marginRight = '5px';
            toggleBtn.style.userSelect = 'none';
            
            const folderIcon = document.createElement('span');
            folderIcon.textContent = '📁';
            folderIcon.style.marginRight = '5px';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = folder.name;
            
            li.appendChild(toggleBtn);
            li.appendChild(folderIcon);
            li.appendChild(nameSpan);
            
            const subList = document.createElement('ul');
            subList.className = 'folder-contents';
            subList.style.display = 'none';
            subList.style.marginLeft = '20px';
            subList.style.listStyle = 'none';
            subList.style.padding = '0';
            
            // Load folder contents
            const loadFolderContents = async () => {
                try {
                    const response = await fetch(`${API_URL}?action=list&dir=${encodeURIComponent(folder.path)}`);
                    const data = await response.json();
                    if (data.success && data.files) {
                        subList.innerHTML = '';
                        renderFileTree(data.files, subList, folder.path);
                    }
                } catch (error) {
                    console.error('Error loading folder:', error);
                }
            };
            
            toggleBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                expandedFolders[folder.path] = !expandedFolders[folder.path];
                toggleBtn.textContent = expandedFolders[folder.path] ? '▼ ' : '▶ ';
                subList.style.display = expandedFolders[folder.path] ? 'block' : 'none';
                
                if (expandedFolders[folder.path] && subList.children.length === 0) {
                    await loadFolderContents();
                }
            });
            
            
            // Click on folder name to select it (for deletion)
            nameSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeListItem) activeListItem.classList.remove('active');
                li.classList.add('active');
                activeListItem = li;
                selectedFilePath = folder.path;
                showFileActions();
            });
            li.appendChild(subList);
            parentElement.appendChild(li);
            
// REMOVED:             // Load folder contents immediately on first render
// REMOVED:             if (subList.children.length === 0) {
// REMOVED:                 loadFolderContents();
// REMOVED:             }
        });

        // Render files
        filelist.forEach(file => {
            const li = document.createElement('li');
            const iconUrl = getIconUrl(file.name);
            
            if (iconUrl) {
                const img = document.createElement('img');
                img.src = iconUrl;
                img.style.width = '16px';
                img.style.height = '16px';
                img.style.marginRight = '8px';
                img.style.verticalAlign = 'middle';
                li.appendChild(img);
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = file.name;
            li.appendChild(nameSpan);
            
            li.title = file.path;
            li.dataset.path = file.path;
            
            li.addEventListener('click', async () => {
                // Always select file first (enables rename/delete)
                if (activeListItem) activeListItem.classList.remove('active');
                li.classList.add('active');
                activeListItem = li;
                selectedFilePath = file.path;
                showFileActions();
                
                // Check if file is binary/non-editable
                const ext = file.name.split('.').pop().toLowerCase();
                const binaryExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 
                                          'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'webm',
                                          'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
                                          'exe', 'dll', 'so', 'bin', 'dat',
                                          'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                                          'ttf', 'otf', 'woff', 'woff2', 'eot'];
                
                if (binaryExtensions.includes(ext)) {
                    // Binary file - don't try to read, just show notice
                    currentFileDisplay.textContent = `Selected: ${file.name} (binary)`;
                    editorInstance.setValue(`// Binary file: ${file.name}\n// This file type cannot be edited in BrowserPad.\n// You can rename or delete it using the toolbar buttons.`);
                    editorInstance.setOption('mode', 'text/plain');
                    serverFilePath = null; // Prevent saving
                    currentFileName = file.name;
                    saveButton.disabled = true;
                    return;
                }
                
                // Text file - try to read
                try {
                    const fileUrl = `${API_URL}?action=read&file=${encodeURIComponent(file.path)}`;
                    const fileResponse = await fetch(fileUrl);
                    const fileData = await fileResponse.json();
                    
                    if (fileData.success) {
                        editorInstance.setValue(fileData.content);
                        serverFilePath = file.path;
                        currentFileName = file.name;
                        currentFileDisplay.textContent = `Editing: ${file.name}`;
                        hasUnsavedChanges = false;
                        isNewFile = false;
                        isTempFile = false;
                        saveButton.disabled = false;
                        
                        const mode = detectMode(file.name);
                        editorInstance.setOption('mode', mode);
                        
                        editorInstance.clearHistory();
                    } else {
                        // Server returned error - file might be binary or unreadable
                        currentFileDisplay.textContent = `Selected: ${file.name}`;
                        editorInstance.setValue(`// Cannot read file: ${file.name}\n// ${fileData.message || 'Unknown error'}\n// You can rename or delete it using the toolbar buttons.`);
                        editorInstance.setOption('mode', 'text/plain');
                        serverFilePath = null;
                        saveButton.disabled = true;
                    }
                } catch (error) {
                    // Network or parse error
                    currentFileDisplay.textContent = `Selected: ${file.name}`;
                    editorInstance.setValue(`// Error reading file: ${file.name}\n// ${error.message}\n// You can rename or delete it using the toolbar buttons.`);
                    editorInstance.setOption('mode', 'text/plain');
                    serverFilePath = null;
                    saveButton.disabled = true;
                }
            });
            parentElement.appendChild(li);
        });
    }

    // --- Load files from server ---
    async function loadServerFiles() {
        try {
            fileListElement.innerHTML = '<li class="empty-list-msg">Loading files...</li>';
            
            const url = `${API_URL}?action=list&dir=/`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.success) {
                fileListElement.innerHTML = '<li class="empty-list-msg">Error loading files</li>';
                console.error('Error:', data.message);
                return;
            }

            if (!data.files || data.files.length === 0) {
                fileListElement.innerHTML = '<li class="empty-list-msg">No files found</li>';
                return;
            }

            fileListElement.innerHTML = '';
            renderFileTree(data.files, fileListElement);
        } catch (error) {
            console.error('Error loading files:', error);
            fileListElement.innerHTML = '<li class="empty-list-msg">Error loading files</li>';
        }
    }

    // --- New File ---
    newFileButton.addEventListener('click', () => {
        editorInstance.setValue('');
        serverFilePath = null;
        currentFileName = 'untitled.txt';
        currentFileDisplay.textContent = `Editing: ${currentFileName}`;
        hasUnsavedChanges = false;
        isNewFile = true;
        isTempFile = true;
        saveButton.disabled = false;
        
        editorInstance.setOption('mode', 'text/plain');
        
        if (activeListItem) activeListItem.classList.remove('active');
                        
        activeListItem = null;
        
        editorInstance.clearHistory();
        editorInstance.focus();
    });

    // --- Save File ---
    saveButton.addEventListener('click', async () => {
        if (!editorInstance) return;
        
        const content = editorInstance.getValue();
        
        // If it's a new file without a server path, ask for filename
        if (!serverFilePath) {
            let filename = '';
            do {
                filename = await customPrompt('Enter filename:', currentFileName, 'Save File');
                if (!filename) return; // User cancelled
                
                if (filename === 'untitled.txt') {
                    await customAlert('Please enter a valid filename (not "untitled.txt")', 'Invalid Filename');
                    filename = ''; // Force loop to continue
                }
            } while (!filename);
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create',
                        filename: filename,
                        content: content,
                        dir: '/'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await customAlert(`File saved: ${filename}`, "Success");
                    serverFilePath = data.path || '/' + filename;
                    currentFileName = filename;
                    currentFileDisplay.textContent = `Editing: ${filename}`;
                    hasUnsavedChanges = false;
                    isNewFile = false;
                    isTempFile = false;
                    editorInstance.clearHistory();
                    
                    const mode = detectMode(filename);
                    editorInstance.setOption('mode', mode);
                    
                    loadServerFiles();
                } else {
                    await customAlert('Error saving file: ' + data.message, 'Error');
                }
            } catch (error) {
                await customAlert('Error saving file: ' + error.message, 'Error');
            }
        } else {
            // Update existing file
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'write',
                        file: serverFilePath,
                        content: content
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    hasUnsavedChanges = false;
                    editorInstance.clearHistory();
                    await customAlert('File saved successfully!', 'Success');
                } else {
                    await customAlert('Error saving file: ' + data.message, 'Error');
                }
            } catch (error) {
                await customAlert('Error saving file: ' + error.message, 'Error');
            }
        }
    });

    // --- Hide open folder button since it auto-loads ---
    if (openFolderButton) {
        openFolderButton.style.display = 'none';
    }

    // --- Settings Menu ---
    const toggleLineNumbersLink = document.getElementById('toggle-linenumbers-link');
    const toggleHighlightingLink = document.getElementById('toggle-highlighting-link');
    const toggleThemeLink = document.getElementById('toggle-theme-link');

    if (toggleLineNumbersLink) {
        toggleLineNumbersLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLineNumbers = !showLineNumbers;
            if (editorInstance) {
                editorInstance.setOption('gutters', showLineNumbers ? ['CodeMirror-linenumbers'] : []);
                editorInstance.setOption('lineNumbers', showLineNumbers);
            }
            localStorage.setItem('showLineNumbers', showLineNumbers);
            updateSettingsUI();
        });
    }

    if (toggleHighlightingLink) {
        toggleHighlightingLink.addEventListener('click', (e) => {
            e.preventDefault();
            syntaxHighlightingEnabled = !syntaxHighlightingEnabled;
            if (currentFileName && editorInstance) {
                const mode = detectMode(currentFileName);
                editorInstance.setOption('mode', mode);
            }
            localStorage.setItem('syntaxHighlighting', syntaxHighlightingEnabled);
            updateSettingsUI();
        });
    }

    if (toggleThemeLink) {
        toggleThemeLink.addEventListener('click', (e) => {
            e.preventDefault();
            currentTheme = currentTheme === 'dracula' ? 'material-darker' : 'dracula';
            if (editorInstance) {
                editorInstance.setOption('theme', currentTheme);
            }
            localStorage.setItem('theme', currentTheme);
            updateSettingsUI();
        });
    }

    // --- Dropdown Menu ---
    dropdownButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });

    // --- Initialize on startup ---

    loadSettings();

    // --- Delete File Button ---
    deleteFileButton.addEventListener('click', async () => {
        if (!selectedFilePath) {
            await customAlert('No file selected', 'Notice');
            return;
        }
        
        const fileName = selectedFilePath.split('/').pop();
        const isFolder = activeListItem && activeListItem.classList.contains('type-folder');
        const itemType = isFolder ? 'folder and all its contents' : 'file';
        const confirmed = await customConfirm(`Are you sure you want to delete ${itemType} "${fileName}"? This action cannot be undone.`, "Delete " + itemType.charAt(0).toUpperCase() + itemType.slice(1), true);
        
        if (!confirmed) return;
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    file: selectedFilePath
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Reload file list
                loadServerFiles();
                
                // Clear editor if deleted file was being edited
                if (serverFilePath === selectedFilePath) {
                    editorInstance.setValue('');
                    currentFileDisplay.textContent = 'Editing: untitled.txt';
                    serverFilePath = null;
                    currentFileName = 'untitled.txt';
                    isNewFile = true;
                }
                
                // Hide delete button and clear selection
                selectedFilePath = null;
                hideFileActions();
            } else {
                await customAlert('Error deleting file: ' + data.message, 'Error');
            }
        } catch (error) {
            await customAlert('Error deleting file: ' + error.message, 'Error');
        }
    });

    // --- New Folder Button ---
    newFolderButton.addEventListener('click', async () => {
        const folderName = await customPrompt('Enter folder name:', '', 'New Folder');
        
        if (!folderName || folderName.trim() === '') return;
        
        // Determine parent directory (root if nothing selected, or selected folder's parent)
        let parentDir = '/';
        if (selectedFilePath) {
            // Get parent directory of selected file/folder
            const parts = selectedFilePath.split('/');
            parts.pop();
            parentDir = parts.join('/') || '/';
        }
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mkdir',
                    dirname: folderName.trim(),
                    parent: parentDir
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Reload file list to show new folder
                loadServerFiles();
            } else {
                await customAlert('Error creating folder: ' + data.message, 'Error');
            }
        } catch (error) {
            await customAlert('Error creating folder: ' + error.message, 'Error');
        }
    });

    toggleSidebar(true);
    editorInstance.setValue('');
    editorInstance.focus();

    // =============================================

    // =============================================
    // CUSTOM MODAL SYSTEM
    // =============================================
    
    const customModal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalInput = document.getElementById('modal-input');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCloseX = document.getElementById('modal-close-x');
    
    let modalResolve = null;
    
    function showModal(options) {
        return new Promise((resolve) => {
            modalResolve = resolve;
            
            // Set content
            modalTitle.textContent = options.title || 'Confirm';
            modalMessage.textContent = options.message || '';
            modalMessage.style.display = options.message ? 'block' : 'none';
            
            // Handle input field
            if (options.input) {
                modalInput.style.display = 'block';
                modalInput.value = options.defaultValue || '';
                modalInput.placeholder = options.placeholder || '';
                setTimeout(() => { modalInput.focus(); modalInput.select(); }, 100);
            } else {
                modalInput.style.display = 'none';
            }
            
            // Set button text
            modalCancel.textContent = options.cancelText || 'Cancel';
            modalConfirm.textContent = options.confirmText || 'OK';
            
            // Danger mode for delete actions
            if (options.danger) {
                modalConfirm.classList.add('danger');
            } else {
                modalConfirm.classList.remove('danger');
            }
            
            // Show/hide cancel button
            modalCancel.style.display = options.hideCancel ? 'none' : 'inline-block';
            
            // Show modal
            customModal.classList.add('show');
        });
    }
    
    function closeModal(result) {
        customModal.classList.remove('show');
        if (modalResolve) {
            modalResolve(result);
            modalResolve = null;
        }
    }
    
    // Modal event listeners
    modalConfirm.addEventListener('click', () => {
        const result = modalInput.style.display !== 'none' ? modalInput.value : true;
        closeModal(result);
    });
    
    modalCancel.addEventListener('click', () => closeModal(null));
    modalCloseX.addEventListener('click', () => closeModal(null));
    
    customModal.addEventListener('click', (e) => {
        if (e.target === customModal) closeModal(null);
    });
    
    // Enter key submits, Escape cancels
    modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            closeModal(modalInput.value);
        } else if (e.key === 'Escape') {
            closeModal(null);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (customModal.classList.contains('show') && e.key === 'Escape') {
            closeModal(null);
        }
    });
    
    // =============================================
    // HELPER FUNCTIONS (replacements for native dialogs)
    // =============================================
    
    async function customAlert(message, title = 'Notice') {
        return showModal({
            title: title,
            message: message,
            hideCancel: true,
            confirmText: 'OK'
        });
    }
    
    async function customConfirm(message, title = 'Confirm', danger = false) {
        return showModal({
            title: title,
            message: message,
            danger: danger,
            confirmText: danger ? 'Delete' : 'OK',
            cancelText: 'Cancel'
        });
    }
    
    async function customPrompt(message, defaultValue = '', title = 'Input') {
        return showModal({
            title: title,
            message: message,
            input: true,
            defaultValue: defaultValue,
            confirmText: 'OK',
            cancelText: 'Cancel'
        });
    }

    // BROWSERPAD V2 FEATURES
    // =============================================

    // --- V2 DOM Elements ---
    const renameButton = document.getElementById('rename-btn');
    const trashButton = document.getElementById('trash-btn');
    const trashModal = document.getElementById('trash-modal');
    const trashListEl = document.getElementById('trash-list');
    const trashClose = document.getElementById('trash-close');
    const emptyTrashBtn = document.getElementById('empty-trash-btn');

    // --- Show/Hide action buttons ---
    function showFileActions() {
        if (deleteFileButton) deleteFileButton.style.display = 'inline-block';
        if (renameButton) renameButton.style.display = 'inline-block';
        const dlBtn = document.getElementById('download-btn'); if (dlBtn) dlBtn.style.display = 'inline-block';
    }
    
    function hideFileActions() {
        if (deleteFileButton) deleteFileButton.style.display = 'none';
        if (renameButton) renameButton.style.display = 'none';
        const dlBtnHide = document.getElementById('download-btn'); if (dlBtnHide) dlBtnHide.style.display = 'none';
        selectedFilePath = null;
    }

    // --- Rename Handler ---
    if (renameButton) {
        renameButton.addEventListener('click', async () => {
            if (!selectedFilePath) {
                await customAlert('No file selected', 'Notice');
                return;
            }
            
            const currentName = selectedFilePath.split('/').pop();
            const newName = await customPrompt('Enter new name:', currentName, 'Rename');
            
            if (!newName || newName === currentName || newName.trim() === '') return;
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'rename',
                        file: selectedFilePath,
                        newname: newName.trim()
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (serverFilePath === selectedFilePath) {
                        serverFilePath = data.path;
                        currentFileName = data.newname;
                        currentFileDisplay.textContent = 'Editing: ' + data.newname;
                    }
                    loadServerFiles();
                    hideFileActions();
                } else {
                    await customAlert('Error renaming: ' + data.message, 'Error');
                }
            } catch (error) {
                await customAlert('Error renaming: ' + error.message, 'Error');
            }
        });
    }

    // --- Trash Functions ---
    async function loadTrash() {
        if (!trashListEl) return;
        try {
            const response = await fetch(API_URL + '?action=trash_list');
            const data = await response.json();
            
            if (!data.success || !data.files || data.files.length === 0) {
                trashListEl.innerHTML = '<div class="trash-empty">🗑 Trash is empty</div>';
                return;
            }
            
            trashListEl.innerHTML = data.files.map(function(file) {
                return '<div class="trash-item" data-path="' + file.trash_name + '">' +
                    '<span class="trash-item-name">' + (file.type === 'dir' ? '📁' : '📄') + ' ' + file.name + '</span>' +
                    '<span class="trash-item-date">' + file.deleted_date + '</span>' +
                    '<div class="trash-item-actions">' +
                        '<button class="restore-btn" data-file="' + file.trash_name + '">Restore</button>' +
                        '<button class="perm-delete-btn" data-file="' + file.trash_name + '">Delete</button>' +
                    '</div>' +
                '</div>';
            }).join('');
            
            // Add event listeners
            trashListEl.querySelectorAll('.restore-btn').forEach(function(btn) {
                btn.addEventListener('click', function() { restoreFromTrash(this.dataset.file); });
            });
            trashListEl.querySelectorAll('.perm-delete-btn').forEach(function(btn) {
                btn.addEventListener('click', function() { permanentDeleteFromTrash(this.dataset.file); });
            });
        } catch (error) {
            trashListEl.innerHTML = '<div class="trash-empty">Error loading trash</div>';
        }
    }

    async function restoreFromTrash(trashName) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore', file: trashName })
            });
            const data = await response.json();
            if (data.success) {
                loadTrash();
                loadServerFiles();
            } else {
                await customAlert('Error restoring: ' + data.message, 'Error');
            }
        } catch (error) {
            await customAlert('Error restoring: ' + error.message, 'Error');
        }
    }

    async function permanentDeleteFromTrash(trashName) {
        const permConfirm = await customConfirm('Permanently delete this item? This cannot be undone.', 'Permanent Delete', true); if (!permConfirm) return;
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', file: '/.trash/' + trashName, permanent: true })
            });
            const data = await response.json();
            if (data.success) {
                loadTrash();
            } else {
                await customAlert('Error: ' + data.message, 'Error');
            }
        } catch (error) {
            await customAlert('Error: ' + error.message, 'Error');
        }
    }

    // Trash button
    if (trashButton) {
        trashButton.addEventListener('click', function() {
            if (trashModal) {
                trashModal.classList.add('show');
                loadTrash();
            }
        });
    }

    // Close trash modal
    if (trashClose) {
        trashClose.addEventListener('click', function() {
            if (trashModal) trashModal.classList.remove('show');
        });
    }

    if (trashModal) {
        trashModal.addEventListener('click', function(e) {
            if (e.target === trashModal) trashModal.classList.remove('show');
        });
    }

    // Empty trash
    if (emptyTrashBtn) {
        emptyTrashBtn.addEventListener('click', async function() {
            const emptyConfirm = await customConfirm('Empty trash? All items will be permanently deleted.', 'Empty Trash', true); if (!emptyConfirm) return;
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'empty_trash' })
                });
                const data = await response.json();
                if (data.success) {
                    loadTrash();
                } else {
                    await customAlert('Error: ' + data.message, 'Error');
                }
            } catch (error) {
                await customAlert('Error: ' + error.message, 'Error');
            }
        });
    }


    // =============================================
    // DOWNLOAD BUTTON
    // =============================================
    
    const downloadButton = document.getElementById('download-btn');
    
    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            if (!selectedFilePath) {
                customAlert('No file selected', 'Notice');
                return;
            }
            
            // Build absolute URL
            const fileUrl = 'https://glitchlinux.wtf/browserpad/files' + selectedFilePath;
            
            // Create temporary link and trigger download
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = selectedFilePath.split('/').pop();
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

});
