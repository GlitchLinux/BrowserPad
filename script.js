document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const bodyElement = document.body; // Get body for collapse class
    const editorContainer = document.querySelector('.editor-container');
    const fileBrowser = document.querySelector('.file-browser');
    const fileListElement = document.getElementById('file-list');
    const editorTextArea = document.getElementById('editor-area'); // Target for CM
    const currentFileDisplay = document.getElementById('current-file');
    const saveButton = document.getElementById('save-btn');
    const dropdownButton = document.getElementById('dropdown-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const saveAsLink = document.getElementById('save-as-link');
    const openLink = document.getElementById('open-link');
    const settingsLink = document.getElementById('settings-link');
    const collapseSidebarButton = document.getElementById('collapse-sidebar-btn');
    const expandSidebarButton = document.getElementById('expand-sidebar-btn'); // Expand Button
    const openFolderButton = document.getElementById('open-folder-btn'); // Open Folder Button
    const newFileButton = document.getElementById('new-file-btn'); // New File button
    const fileInput = document.getElementById('file-input'); // Single file input
    const folderInput = document.getElementById('folder-input'); // Folder input
    const fontDecreaseButton = document.getElementById('font-decrease-btn');
    const fontIncreaseButton = document.getElementById('font-increase-btn');
    const currentFontSizeSpan = document.getElementById('current-font-size');

    // --- State Variables ---
    let activeListItem = null;
    let currentFileName = 'untitled.txt';
    let currentFontSize = 14; // Initial font size in pixels
    let editorInstance = null; // To hold the CodeMirror instance
    let isSidebarCollapsed = false; // Track sidebar state
    let openedFolderFiles = []; // Holds { file: File, path: string } for opened folder
    let currentRenderedListStructure = []; // Store the structure used for rendering


    // --- CodeMirror Initialization ---
    try {
        editorInstance = CodeMirror.fromTextArea(editorTextArea, {
            lineNumbers: true, // Default ON
            mode: 'text/plain',
            theme: 'material-darker', // Match the theme CSS link
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: false // Default OFF
            // Addons can be added here after including their JS files
            // Example: styleActiveLine: true (requires addon/selection/active-line.js)
        });
        console.log("CodeMirror initialized successfully.");
    } catch (error) {
        console.error("Error initializing CodeMirror:", error);
        // Display error more visibly if CodeMirror failed to initialize
        const editorElement = document.getElementById('editor-area');
        if (editorElement) {
             const errorDiv = document.createElement('div');
             errorDiv.style.padding = '20px';
             errorDiv.style.color = '#ff5555'; // Red error color
             errorDiv.textContent = 'ERROR: Code editor failed to load. Check browser console (F12) for details, ensure CodeMirror files (JS/CSS) are accessible, and try refreshing.';
             editorElement.parentNode.replaceChild(errorDiv, editorElement);
        }
    }


    // --- Font Size Control ---
    function updateEditorFontSize() {
        if (!editorInstance) return; // Don't run if editor failed to init
        const cmWrapper = editorInstance.getWrapperElement();
        // Set font size on the wrapper element, CodeMirror will adapt
        cmWrapper.style.fontSize = `${currentFontSize}px`;
        currentFontSizeSpan.textContent = `${currentFontSize}px`;
        // Crucially, ensure CM redraws IF the font size change affects layout
        editorInstance.refresh();
        console.log(`Font size set to: ${currentFontSize}px`);
    }

    fontIncreaseButton.addEventListener('click', () => {
        console.log('Font Increase Button Clicked!'); // Debug log
        currentFontSize += 1;
        updateEditorFontSize();
    });

    fontDecreaseButton.addEventListener('click', () => {
        console.log('Font Decrease Button Clicked!'); // Debug log
        if (currentFontSize > 8) { // Set a minimum font size
            currentFontSize -= 1;
            updateEditorFontSize();
        }
    });

    // Initialize font size display and editor based on the default state
    updateEditorFontSize();

    // --- Sidebar Collapse/Expand ---
    function toggleSidebar(collapse) {
        console.log(`Toggling sidebar - collapsing: ${collapse}`); // Debug log
        isSidebarCollapsed = collapse;
        fileBrowser.classList.toggle('collapsed', isSidebarCollapsed);
        bodyElement.classList.toggle('sidebar-collapsed', isSidebarCollapsed); // Toggle class on body
        console.log(`Body classList after toggle:`, bodyElement.classList); // Debug log
        // Expand button visibility is now handled by CSS based on body class
        // Collapse button visibility is handled by parent (.file-browser) collapsing
        setTimeout(() => {
            if (editorInstance) {
                editorInstance.refresh();
            }
        }, 300); // Should match CSS transition duration
    }
    collapseSidebarButton.addEventListener('click', () => toggleSidebar(true));
    expandSidebarButton.addEventListener('click', () => toggleSidebar(false));


    // --- File Browser & Folder Handling ---
    openFolderButton.addEventListener('click', () => {
        folderInput.click();
    });

    folderInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        openedFolderFiles = []; // Clear previous actual file objects
        let fileStructure = []; // Array for rendering list

        console.log(`Processing ${files.length} files from selected folder...`);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Use webkitRelativePath if available, otherwise just filename
            const path = file.webkitRelativePath || file.name;
            // Optional: Filter out system/hidden files/folders
            if (path.includes('/.') || file.name.startsWith('.')) {
                 console.log(`Skipping hidden/system file: ${path}`);
                 continue;
            }

            openedFolderFiles.push({ file: file, path: path }); // Store the actual File object
            // For now, create a flat list structure for rendering
            fileStructure.push({
                name: file.name,
                type: 'file', // Assume everything listed is a file for simplicity now
                lookupPath: path // Store the unique webkitRelativePath for later lookup
            });
        }

        // Sort the flat list alphabetically
        fileStructure.sort((a, b) => a.name.localeCompare(b.name));

        currentRenderedListStructure = fileStructure; // Update global structure state
        renderFileList(currentRenderedListStructure, fileListElement); // Render the new list

        // --- Add localStorage Saving ---
        try {
            // Only save the structure (paths/names), not the File objects
            const structureToSave = currentRenderedListStructure.map(item => ({
                name: item.name,
                type: item.type,
                lookupPath: item.lookupPath
            }));
            localStorage.setItem('lastOpenedFolderStructure', JSON.stringify(structureToSave));
            console.log("Saved folder structure to localStorage.");
        } catch (e) {
            console.error("Error saving folder structure to localStorage:", e);
            // Optionally alert user or clear storage if quota exceeded
            // localStorage.removeItem('lastOpenedFolderStructure');
        }
        // --- End Add ---

        event.target.value = null; // Reset input
    });


    // Function to render the file list (handles data from folder input)
    function renderFileList(items, parentElement) {
         parentElement.innerHTML = ''; // Clear previous list
         if (!items || items.length === 0) { // Check if items is null or empty
             parentElement.innerHTML = '<li class="empty-list-msg">No files found or folder empty.</li>';
             return;
         }

        items.forEach(item => {
            const li = document.createElement('li');
            // Display only the base filename for clarity
            li.textContent = item.name;
            // Use the lookupPath (webkitRelativePath) in the title for context
            li.title = item.lookupPath;
            li.classList.add(`type-${item.type}`); // Currently always 'file'
            // Store the lookup path on the element for the click handler
            li.dataset.lookupPath = item.lookupPath;

            // Add listener only if it's designated as a file (currently everything is)
            if (item.type === 'file') {
                li.addEventListener('click', (event) => {
                    if (!editorInstance) return;
                    event.stopPropagation();

                    // --- Add Check for Stale Data ---
                    // Check if the actual File objects are loaded in memory
                    if (!openedFolderFiles || openedFolderFiles.length === 0) {
                        alert('Folder data is not currently loaded in memory.\nPlease use "Open Folder" to select the directory containing this file to load its content.');
                        console.warn("Attempted to load file from list restored via localStorage. User needs to re-open folder.");
                        return; // Prevent trying to read if File objects aren't loaded
                    }
                    // --- End Check ---

                    const lookupPath = li.dataset.lookupPath; // Get path from data attribute
                    // Find the corresponding file object in our stored array
                    const fileData = openedFolderFiles.find(f => f.path === lookupPath);

                    if (fileData && fileData.file) {
                        console.log(`Reading file: ${fileData.file.name} (Path: ${lookupPath})`);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            loadContentIntoEditor(e.target.result, fileData.file.name); // Use original file name
                        };
                        reader.onerror = (e) => {
                            console.error("Error reading file:", fileData.file.name, e);
                            loadContentIntoEditor(`// Error reading file: ${fileData.file.name}`, fileData.file.name);
                        };
                        reader.readAsText(fileData.file); // Read the actual file content
                    } else {
                        // This case should be less likely now due to the check above, but good failsafe
                        console.error("Could not find active file data for lookup path (may need to reopen folder):", lookupPath);
                         alert('Could not find file data. Please re-open the folder using "Open Folder".');
                    }

                    // Visually mark active file
                    if (activeListItem) activeListItem.classList.remove('active');
                    li.classList.add('active');
                    activeListItem = li;
                });
            }
            // Note: Folder click/expansion logic still not implemented
            parentElement.appendChild(li);
        });
    } // End renderFileList


    // --- Syntax Highlighting Helper ---
    function getModeForFilename(filename) {
        const lowerName = filename ? filename.toLowerCase() : '';
        // Handle cases where filename might not have an extension
        const extension = lowerName.includes('.') ? lowerName.split('.').pop() : '';

        // Mapping based on CodeMirror mime types or mode names
        const modeMap = {
            'py': 'python',
            'js': 'javascript',
            'json': {name: 'javascript', json: true},
            'css': 'css',
            'html': 'xml', // CodeMirror often uses 'xml' mode for HTML
            'htm': 'xml',
            'xml': 'xml',
            'sh': 'shell',
            'bash': 'shell',
            'zsh': 'shell',
            'c': 'text/x-csrc',
            'h': 'text/x-csrc', // Added .h files
            'cpp': 'text/x-c++src',
            'hpp': 'text/x-c++src', // Added .hpp
            'java': 'text/x-java',
            'cs': 'text/x-csharp',
            'md': 'markdown',
            'conf': 'properties', // Or 'shell' if applicable
            'ini': 'properties',
            'log': 'text/plain', // Treat logs as plain text
            'txt': 'text/plain',
            // Add more mappings as needed
        };

        const mode = extension ? (modeMap[extension] || 'text/plain') : 'text/plain'; // Default if no extension
        // console.log(`Determined mode: ${typeof mode === 'object' ? mode.name : mode} for ${filename}`); // Reduce console noise
        return mode;
    }


    // --- Editor Content Loading ---
    function loadContentIntoEditor(content, filename) {
        if (!editorInstance) {
            console.error("CodeMirror instance not available.");
            return;
        }
        editorInstance.setValue(content);
        currentFileName = filename;
        currentFileDisplay.textContent = `Editing: ${filename}`;
        currentFileDisplay.title = `Editing: ${filename}`;
        // saveButton.disabled = true; // Disable save on load, enable on change (handled by 'change' listener now)

        // Set CodeMirror mode based on filename
        const mode = getModeForFilename(filename);
        try {
            editorInstance.setOption('mode', mode); // setOption handles string or object modes
        } catch (e) {
            console.error(`Failed to set mode ${JSON.stringify(mode)} for ${filename}. Falling back to plain text. Error:`, e);
            editorInstance.setOption('mode', 'text/plain');
        }

        // Clear selection history after loading new content
        editorInstance.clearHistory();
        // Ensure focus
         editorInstance.focus();
         // Reset scroll position
         editorInstance.scrollTo(0, 0);
    }

    // --- New File ---
    newFileButton.addEventListener('click', () => {
        if (!editorInstance) return;
        loadContentIntoEditor('', 'untitled.txt'); // Load empty content
        if (activeListItem) { // Deselect any active file in browser
            activeListItem.classList.remove('active');
            activeListItem = null;
        }
        // Reset the internal state related to opened folders if needed
        // openedFolderFiles = []; // Decide if a new file should clear the folder context
        // currentRenderedListStructure = []; // Decide if a new file should clear the folder list display
        // renderFileList(currentRenderedListStructure, fileListElement); // Update display
        // localStorage.removeItem('lastOpenedFolderStructure'); // Clear persistence? - maybe too aggressive

        console.log("New file created.");
        saveButton.disabled = true; // Disable save for empty new file
    });


    // --- Local Single File Handling ---
    function openLocalFile() {
        fileInput.click(); // Trigger hidden file input
    }
    // Attach to link in dropdown menu
    openLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        openLocalFile();
        dropdownMenu.classList.remove('show'); // Hide menu after clicking
    });

    // Listener for the hidden single file input
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return; // No file selected

        const reader = new FileReader();
        reader.onload = (e) => {
            loadContentIntoEditor(e.target.result, file.name);
             // Deselect any simulated file in the browser list since we loaded a local one
             if (activeListItem) {
                activeListItem.classList.remove('active');
                activeListItem = null;
             }
             // Clear the folder context as we loaded a single file
             openedFolderFiles = [];
             currentRenderedListStructure = [];
             localStorage.removeItem('lastOpenedFolderStructure'); // Clear persistence
             renderFileList([], fileListElement); // Clear file list display
        };
        reader.onerror = (e) => {
            console.error("Error reading file:", e);
            alert(`Error reading file: ${file.name}`);
        };
        reader.readAsText(file); // Read the file as plain text
        event.target.value = null; // Reset input value to allow opening same file again
    });

    // --- Save / Download ---
    function downloadFile(filename = currentFileName) {
        if (!editorInstance) {
             alert("Editor not initialized. Cannot save.");
             return;
        }
        const content = editorInstance.getValue(); // Get content from CodeMirror
        // Use a generic MIME type for download, browser handles it
        const mimeType = 'application/octet-stream';

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename; // Use the desired filename
        document.body.appendChild(a); // Append anchor to body temporarily
        a.click(); // Trigger download programmatically
        document.body.removeChild(a); // Clean up anchor
        URL.revokeObjectURL(url); // Release object URL resource
        console.log(`Triggered download for: ${filename}`);
        // saveButton.disabled = true; // Optionally re-disable save button after downloading
    }

    saveButton.addEventListener('click', () => downloadFile());

    saveAsLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent link navigation
        const newFilename = prompt("Enter filename to save as:", currentFileName);
        if (newFilename) { // Check if user entered a name (didn't cancel)
            downloadFile(newFilename);
        }
        dropdownMenu.classList.remove('show'); // Hide menu after action
    });

    // --- Dropdown Menu ---
    dropdownButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent window click listener from closing it immediately
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown if clicking anywhere else in the window
    window.addEventListener('click', (event) => {
        // Check if the click was outside the dropdown button AND outside the dropdown menu itself
        if (dropdownMenu.classList.contains('show') && !dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // --- Settings ---
    settingsLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent link navigation
        if (!editorInstance) return;

        // Toggle Line Numbers
        const currentLineNumbers = editorInstance.getOption('lineNumbers');
        // Using confirm() provides a simple boolean yes/no dialog
        if (confirm(`Line numbers are currently ${currentLineNumbers ? 'ON' : 'OFF'}.\nTurn them ${currentLineNumbers ? 'OFF' : 'ON'}?`)) {
            editorInstance.setOption('lineNumbers', !currentLineNumbers);
            console.log(`Line numbers set to: ${!currentLineNumbers}`);
        } // If user cancels, do nothing

        // Toggle Word Wrap (lineWrapping in CodeMirror)
        const currentLineWrapping = editorInstance.getOption('lineWrapping');
        if (confirm(`Word wrap is currently ${currentLineWrapping ? 'ON' : 'OFF'}.\nTurn it ${currentLineWrapping ? 'ON' : 'OFF'}?`)) {
            editorInstance.setOption('lineWrapping', !currentLineWrapping);
            console.log(`Word wrap set to: ${!currentLineWrapping}`);
        } // If user cancels, do nothing

        editorInstance.focus(); // Refocus editor after prompts potentially stole focus
        dropdownMenu.classList.remove('show'); // Hide menu after action
    });

    // --- Initial State ---
    // Check localStorage on load first
    const savedStructureJson = localStorage.getItem('lastOpenedFolderStructure');
    if (savedStructureJson) {
        try {
            currentRenderedListStructure = JSON.parse(savedStructureJson);
            renderFileList(currentRenderedListStructure, fileListElement);
            console.log('Restored file list structure from localStorage. Re-open folder to load content.');
        } catch (e) {
            console.error('Error parsing saved file structure:', e);
            fileListElement.innerHTML = '<li class="empty-list-msg">Could not restore previous list. Use "Open Folder".</li>';
        }
    } else {
        // Only show this message if nothing was restored
         fileListElement.innerHTML = '<li class="empty-list-msg">Use "Open Folder" to browse local files.</li>';
    }

    // Load initial welcome message into editor AFTER potentially restoring list
    if (editorInstance) {
        loadContentIntoEditor('// Welcome!\n// Use "Open Folder" to browse local files or use the dropdown menu -> "Open Local File..."', 'welcome.txt');
        saveButton.disabled = true; // Disable save initially
        // Re-enable save button if content changes
        editorInstance.on('change', () => {
             if (saveButton) saveButton.disabled = false;
        });
    }
    // Error handling for failed init is now inside the try...catch block


}); // End DOMContentLoaded wrapper