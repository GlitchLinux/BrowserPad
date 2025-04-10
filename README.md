# BrowserPad

> Your self hosted notepad in your browser

![Image](https://github.com/user-attachments/assets/e48a5750-8323-437b-b32a-8d3715435623)

## About BrowserPad

BrowserPad is a web-based text and code editor designed to run directly in your browser. This current version operates entirely client-side, allowing you to open and edit local files or browse local folders selected via your browser. It utilizes the powerful CodeMirror library for syntax highlighting and provides a clean, dark-themed interface.

While originally conceived as a component for a self-hosted setup, this implementation focuses on providing a functional client-side editing experience.

## Features

* **Syntax Highlighting:** Powered by CodeMirror, supporting various languages (JS, Python, HTML, CSS, Shell, C/C++, Markdown, etc.).
* **Dark Theme:** Easy-on-the-eyes dark interface (`#212121` editor background).
* **Client-Side Operation:** Runs entirely within your web browser.
* **Local File Access:**
    * Open individual local files.
    * Open local folders (`webkitdirectory`) to browse files in the sidebar.
* **File List Persistence:** Remembers the structure of the last opened folder across refreshes using `localStorage` (requires re-opening the folder to load file content).
* **File Operations:**
    * Save current content (as Download).
    * Save As... (Download with a new name).
    * Create New File (blank editor).
* **Customizable Editor:**
    * Adjustable font size (+/-).
    * Toggle line numbers.
    * Toggle word wrap.
* **Collapsible Sidebar:** Hide or show the file explorer panel.
* **Invisible Scrollbars:** Minimalist scrollbars in the editor and file list.

## Tech Stack

* HTML5
* CSS3 (Flexbox for layout)
* JavaScript (ES6+)
* [CodeMirror](https://codemirror.net/) Library (v5.x via CDN)

## Getting Started / Usage

1.  **Download:** Download the following files into the *same directory* on your computer:
    * `editor.html`
    * `style.css`
    * `script.js`
2.  **Open:** Open the `editor.html` file directly in a modern web browser (like Chrome, Firefox, Edge - browsers supporting `webkitdirectory` are needed for folder opening).
3.  **Use:**
    * Click **"📁 Open Folder"** in the sidebar header to select a local folder. The files within will be listed. Click a file to load its content.
    * Use the **Dropdown Menu (▼)** > **"Open Local File..."** to open a single file.
    * Use the **Dropdown Menu (▼)** > **"Save As..."** or the main **"Save"** button to download the current content.
    * Use the **Toolbar Buttons** to create a new file or adjust font size.
    * Access **Settings** (Line Numbers, Word Wrap) via the Dropdown Menu.
    * Use the **⬅ / ➡** buttons to collapse/expand the sidebar.

## Limitations (Current Version)

* **Client-Side Only:** Does not interact with a server backend. Saving files triggers a browser download; it does not overwrite local files directly or save to a server.
* **Folder Access:** Relies on the non-standard `webkitdirectory` attribute for folder opening, which may not be supported in all browsers. Folder contents are loaded into memory; clicking a file from a list restored via `localStorage` requires the user to manually re-open the folder using "Open Folder" before content can be read.
* **No True "Save":** Saving functionality downloads the file due to browser security restrictions.
* **Basic File Browser:** The sidebar currently shows a flat list of files within the selected folder; nested directory navigation is not implemented.

## (Future) Deployment

The original goal was integration into a self-hosted environment (e.g., Apache). This would require significant backend development to handle:

* Authentication/Authorization
* Server-side file listing, reading, and writing.
* Securely managing file paths and permissions.

This client-side version serves as the front-end component.

## License

This project is licensed under the MIT License - see the LICENSE file for details (or choose another license like Apache 2.0 if preferred).
