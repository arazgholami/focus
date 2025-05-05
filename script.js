document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const editor = document.getElementById('editor');
    const toolbar = document.getElementById('toolbar');
    const statusBar = document.getElementById('status-bar');
    const counter = document.getElementById('counter');
    const saveBtn = document.getElementById('save-btn');
    const newBtn = document.getElementById('new-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const listBtn = document.getElementById('list-btn');
    const themeBtn = document.getElementById('theme-btn');
    const soundBtn = document.getElementById('sound-btn');
    const loadBtn = document.getElementById('load-btn');
    const downloadBtn = document.getElementById('download-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const writingsModal = document.getElementById('writings-modal');
    const writingsList = document.getElementById('writings-list');
    const closeModal = document.querySelector('.close-modal');
    
    // App state
    let currentId = null;
    let isSoundEnabled = true;
    let isFullscreen = false;
    let toolbarTimeout;
    let typingTimeout;
    let lastScrollPosition = 0;
    let paragraphCount = 0;
    const keysSounds = [
    'mp3-key-01', 'mp3-key-02', 'mp3-key-03', 'mp3-key-04',
    'mp3-key-new-01', 'mp3-key-new-02', 'mp3-key-new-03', 
    'mp3-key-new-04', 'mp3-key-new-05'
    ];

    function handleFullscreenChange() {
    if (!document.fullscreenElement &&
            !document.webkitFullscreenElement &&
            !document.mozFullScreenElement &&
            !document.msFullscreenElement) {
        isFullscreen = false;
        document.body.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
    }

    // Initialize app
    initApp();

    function initApp() {
    const sounds = [
        'mp3-key-01', 'mp3-key-02', 'mp3-key-03', 'mp3-key-04',
        'mp3-key-new-01', 'mp3-key-new-02', 'mp3-key-new-03',
        'mp3-key-new-04', 'mp3-key-new-05', 'mp3-return',
        'mp3-scrollDown', 'mp3-scrollUp',
        'mp3-space', 'mp3-space-new'
    ];
    sounds.forEach(id => {
        const audio = document.getElementById(id);
        audio.load();
    });

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Show toolbar and status bar initially
    showToolbar();
    updateToolbarVisibility();
    loadDraft();
    updateCounter();
    
    // Create first paragraph if none exists
    if (!editor.querySelector('p')) {
        createParagraph('', true);
    }
    
    // Set event listeners
    document.addEventListener('mousemove', showToolbar);
    saveBtn.addEventListener('click', saveWriting);
    newBtn.addEventListener('click', newDocument);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    listBtn.addEventListener('click', openWritingsList);
    themeBtn.addEventListener('click', toggleTheme);
    soundBtn.addEventListener('click', toggleSound);
    loadBtn.addEventListener('click', loadMarkdownFile);
    downloadBtn.addEventListener('click', downloadAsMarkdown);
    downloadAllBtn.addEventListener('click', downloadAllWritings);
    closeModal.addEventListener('click', closeModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === writingsModal) closeModalHandler();
    });

    // Handle scroll for scroll sounds
    document.getElementById('writing-area').addEventListener('scroll', handleScroll);

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Check for saved sound preference
    const savedSound = localStorage.getItem('soundEnabled');
    if (savedSound === 'false') {
        isSoundEnabled = false;
        soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
    
    // Set auto-save interval
    setInterval(autoSaveDraft, 5000);

    // Add input event listener for the editor
    editor.addEventListener('input', (e) => {
        handleEditorInput(e);
        updateCounter();
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(autoSaveDraft, 2000);
    });

    // Add keydown event listener for the editor
    editor.addEventListener('keydown', handleKeydown);
    }

    function createParagraph(content = '', isFirst = false) {
        const p = document.createElement('p');
        p.innerHTML = content;
        p.dir = 'auto';
        if (isFirst) {
            p.classList.add('first-paragraph');
        }
        editor.appendChild(p);
        return p;
    }

    function handleEditorInput(e) {
    // Ensure each line is wrapped in a paragraph
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const currentP = range.startContainer.closest('p');
    
    if (!currentP) {
        // If cursor is not in a paragraph, wrap the content in a paragraph
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editor.innerHTML;
        editor.innerHTML = '';
        
        Array.from(tempDiv.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                const p = document.createElement('p');
                p.textContent = node.textContent;
                p.dir = 'auto';
                editor.appendChild(p);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'P') {
                    editor.appendChild(node);
                } else {
                    const p = document.createElement('p');
                    p.dir = 'auto';
                    p.appendChild(node);
                    editor.appendChild(p);
                }
            }
        });
    }
    }

    function handleKeydown(e) {
        if (isSoundEnabled) {
            if (e.key === 'Enter') {
                if (!e.shiftKey) {
                    e.preventDefault();
                    playSound(Math.random() > 0.5 ? 'mp3-return' : 'mp3-return-new');
                    
                    // Create new paragraph
                    const selection = window.getSelection();
                    const range = selection.getRangeAt(0);
                    const currentP = range.startContainer.nodeType === Node.TEXT_NODE 
                        ? range.startContainer.parentElement 
                        : range.startContainer;
                    
                    if (currentP && currentP.tagName === 'P') {
                        // Create a temporary div to handle HTML content
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = currentP.innerHTML;
                        
                        // Split content at cursor position
                        const beforeCursor = tempDiv.innerHTML.substring(0, range.startOffset);
                        const afterCursor = tempDiv.innerHTML.substring(range.startOffset);
                        
                        // Update current paragraph
                        currentP.innerHTML = beforeCursor;
                        
                        // Create new paragraph with content after cursor
                        const newP = document.createElement('p');
                        newP.innerHTML = afterCursor;
                        newP.dir = 'auto';
                        
                        // Insert the new paragraph after the current one
                        currentP.parentNode.insertBefore(newP, currentP.nextSibling);
                        
                        // Set cursor position at the start of the new paragraph
                        const newRange = document.createRange();
                        const newSelection = window.getSelection();
                        
                        // If the new paragraph has content, place cursor at start of first text node
                        if (newP.firstChild) {
                            newRange.setStart(newP.firstChild, 0);
                        } else {
                            newRange.setStart(newP, 0);
                        }
                        newRange.collapse(true);
                        newSelection.removeAllRanges();
                        newSelection.addRange(newRange);
                        
                        // Focus new paragraph
                        newP.focus();
                    }
                    
                    updateCounter();
                    return;
                }
            } else if (e.key === ' ') {
                playSound(Math.random() > 0.5 ? 'mp3-space' : 'mp3-space-new');
            } else if (e.key.length === 1) {
                const randomKeySound = keysSounds[Math.floor(Math.random() * keysSounds.length)];
                playSound(randomKeySound);
            } else if (e.key === 'Backspace') {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const currentP = range.startContainer.nodeType === Node.TEXT_NODE 
                    ? range.startContainer.parentElement 
                    : range.startContainer;
                
                if (currentP && currentP.tagName === 'P' && range.startOffset === 0 && currentP.previousElementSibling) {
                    e.preventDefault();
                    
                    // Create a temporary div to handle HTML content
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = currentP.previousElementSibling.innerHTML + currentP.innerHTML;
                    
                    // Merge with previous paragraph
                    currentP.previousElementSibling.innerHTML = tempDiv.innerHTML;
                    currentP.remove();
                    
                    // Focus previous paragraph and set cursor at the end
                    currentP.previousElementSibling.focus();
                    placeCursorAtEnd(currentP.previousElementSibling);
                    
                    updateCounter();
                }
            }
        }
    }

    function placeCursorAtEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false); // false = collapse to end
    selection.removeAllRanges();
    selection.addRange(range);
    }

    function handleScroll(e) {
    if (!isSoundEnabled) return;
    
    const currentPosition = e.target.scrollTop;
    if (currentPosition > lastScrollPosition) {
        playSound('mp3-scrollDown');
    } else if (currentPosition < lastScrollPosition) {
        playSound('mp3-scrollUp');
    }
    lastScrollPosition = currentPosition;
    }

    function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Sound play error:', e));
    }
    }

    function showToolbar() {
    toolbar.classList.add('visible');
    statusBar.classList.add('visible');
    clearTimeout(toolbarTimeout);
    toolbarTimeout = setTimeout(() => {
        toolbar.classList.remove('visible');
        statusBar.classList.remove('visible');
    }, 3000);
    }

    function updateToolbarVisibility() {
    document.addEventListener('mousemove', () => {
        showToolbar();
    });
    }

    function updateCounter() {
    // Get all text from all paragraphs
    const paragraphs = document.querySelectorAll('p');
    const text = Array.from(paragraphs).map(p => p.textContent).join('\n');
    
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const nonEmptyParagraphs = Array.from(paragraphs).filter(p => p.textContent.trim().length > 0).length;
    
    counter.innerHTML = `<i class="fas fa-font"></i> ${wordCount} <i class="fas fa-paragraph"></i> ${nonEmptyParagraphs}`;
    }

    function getTitle() {
    const firstP = editor.querySelector('p');
    return firstP ? firstP.textContent.trim().substring(0, 50) || 'Untitled' : 'Untitled';
    }

    function getContent() {
    return editor.innerHTML;
    }

    function saveWriting() {
    const content = getContent();
    
    if (!content.trim()) {
        alert('Cannot save empty writing');
        return;
    }

    const writings = JSON.parse(localStorage.getItem('writings') || '[]');
    const title = getTitle();
    const date = new Date().toISOString();
    
    if (currentId) {
        // Update existing writing
        const index = writings.findIndex(w => w.id === currentId);
        if (index !== -1) {
        writings[index] = { ...writings[index], title, content, updatedAt: date };
        }
    } else {
        // Create new writing
        currentId = Date.now().toString();
        writings.push({
        id: currentId,
        title,
        content,
        createdAt: date,
        updatedAt: date
        });
    }
    
    localStorage.setItem('writings', JSON.stringify(writings));
    
    // Save as draft as well to prevent content loss on refresh
    localStorage.setItem('draft', JSON.stringify({
        content: content,
        timestamp: date
    }));
    
    alert('Writing saved!');
    }
    
    function newDocument() {
    // Save current document first if it has content
    const content = getContent();
    if (content.trim()) {
        if (confirm("Save current document before creating a new one?")) {
        saveWriting();
        }
    }
    
    // Clear current document
    clearDocument();
    
    // Create first paragraph
    createParagraph('', true);
    
    // Reset current ID
    currentId = null;
    
    updateCounter();
    }
    
    function clearDocument() {
    editor.innerHTML = '';
    paragraphCount = 0;
    }

    function autoSaveDraft() {
    const content = getContent();
    
    if (content.trim()) {
        localStorage.setItem('draft', JSON.stringify({
        content: content,
        timestamp: new Date().toISOString()
        }));
    }
    }

    function loadDraft() {
    const draftData = localStorage.getItem('draft');
    if (draftData) {
        const draft = JSON.parse(draftData);
        loadContent(draft.content);
    } else {
        // If no draft exists, create a new document with first paragraph
        const p = document.createElement('p');
        p.classList.add('first-paragraph');
        p.dir = 'auto';
        editor.appendChild(p);
    }
    }
    
    function loadContent(content) {
        clearDocument();
        
        // Create a temporary div to parse the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // If there's no content, create an empty first paragraph
        if (!tempDiv.innerHTML.trim()) {
            const p = document.createElement('p');
            p.classList.add('first-paragraph');
            p.dir = 'auto';
            editor.appendChild(p);
            return;
        }
        
        // Get all paragraphs from the content
        const paragraphs = tempDiv.querySelectorAll('p');
        
        // If no paragraphs found, split by newlines and create paragraphs
        if (paragraphs.length === 0) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                const p = document.createElement('p');
                p.innerHTML = line;
                p.dir = 'auto';
                if (index === 0) {
                    p.classList.add('first-paragraph');
                }
                editor.appendChild(p);
            });
        } else {
            // If paragraphs exist, preserve their structure
            paragraphs.forEach((p, index) => {
                const newP = document.createElement('p');
                newP.innerHTML = p.innerHTML;
                newP.dir = 'auto';
                if (index === 0) {
                    newP.classList.add('first-paragraph');
                }
                editor.appendChild(newP);
            });
        }
        
        updateCounter();
    }

    function loadWriting(id) {
    const writings = JSON.parse(localStorage.getItem('writings') || '[]');
    const writing = writings.find(w => w.id === id);
    
    if (writing) {
        // Save current draft before loading
        autoSaveDraft();
        
        // Load selected writing
        loadContent(writing.content);
        currentId = writing.id;
        closeModalHandler();
    }
    }

    function deleteWriting(id, event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this writing?')) {
        let writings = JSON.parse(localStorage.getItem('writings') || '[]');
        writings = writings.filter(w => w.id !== id);
        localStorage.setItem('writings', JSON.stringify(writings));
        
        if (currentId === id) {
        clearDocument();
        createParagraph('', true);
        currentId = null;
        updateCounter();
        }
        
        renderWritingsList();
    }
    }

    function openWritingsList() {
    renderWritingsList();
    writingsModal.style.display = 'block';
    }

    function renderWritingsList() {
    const writings = JSON.parse(localStorage.getItem('writings') || '[]');
    writingsList.innerHTML = '';
    
    if (writings.length === 0) {
        writingsList.innerHTML = '<li>No saved writings yet</li>';
        return;
    }
    
    // Sort by updated date (newest first)
    writings.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    writings.forEach(writing => {
        const li = document.createElement('li');
        li.className = 'writing-item';
        li.onclick = () => loadWriting(writing.id);
        
        const dateFormatted = new Date(writing.updatedAt).toLocaleString();
        
        li.innerHTML = `
        <div>
            <strong>${writing.title}</strong>
            <div><small>${dateFormatted}</small></div>
        </div>
        <i class="fas fa-trash delete-writing" title="Delete"></i>
        `;
        
        const deleteBtn = li.querySelector('.delete-writing');
        deleteBtn.onclick = (e) => deleteWriting(writing.id, e);
        
        writingsList.appendChild(li);
    });
    }

    function closeModalHandler() {
    writingsModal.style.display = 'none';
    }

    function toggleFullscreen() {
    if (!isFullscreen) {
        if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
        }
        document.body.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        if (document.exitFullscreen) {
        document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
        }
        document.body.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
    isFullscreen = !isFullscreen;
    }

    function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    themeBtn.innerHTML = newTheme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }

    function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('soundEnabled', isSoundEnabled.toString());

    soundBtn.innerHTML = isSoundEnabled
            ? '<i class="fas fa-volume-up"></i>'
            : '<i class="fas fa-volume-mute"></i>';
    }

    // Process node for Markdown conversion
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            let result = '';
            let prefix = '';
            let suffix = '';
            
            // Determine formatting based on node type or style
            if (node.nodeName === 'STRONG' || node.nodeName === 'B' || 
                (node.style && node.style.fontWeight === 'bold')) {
                prefix = '**';
                suffix = '**';
            } else if (node.nodeName === 'EM' || node.nodeName === 'I' || 
                        (node.style && node.style.fontStyle === 'italic')) {
                prefix = '_';
                suffix = '_';
            } else if (node.nodeName === 'U' || 
                        (node.style && node.style.textDecoration === 'underline')) {
                prefix = '__';
                suffix = '__';
            }
            
            // Process all child nodes
            for (const child of node.childNodes) {
                result += processNode(child);
            }
            
            return prefix + result + suffix;
        }
        
        return '';
    }

    function downloadAsMarkdown() {
    const content = getContent();

    if (!content.trim()) {
        alert('Nothing to download');
        return;
    }

    // Convert HTML to Markdown-like plain text
    let markdownContent = '';
    const paragraphs = document.querySelectorAll('p');
    
    paragraphs.forEach((p, index) => {
        // Create a deep clone to work with
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = p.innerHTML;
        
        // Process the paragraph content
        const processedText = processNode(tempDiv);
        markdownContent += processedText + (index < paragraphs.length - 1 ? '\n\n' : '');
    });

    // Get title from the first paragraph
    const title = getTitle().toLowerCase() || 'untitled';

    // Create blob with content
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Create download link and trigger click
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    }

    // Text formatting popup functionality
    const formatPopup = document.getElementById('format-popup');
    const boldBtn = document.getElementById('format-bold');
    const italicBtn = document.getElementById('format-italic');
    const underlineBtn = document.getElementById('format-underline');
    
    let currentSelection = null;

    // Add event listeners for text selection
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', (e) => {
        // Show popup on arrow keys or Shift+arrows to allow keyboard selection
        if (e.key.includes('Arrow') || e.key.includes('Shift')) {
            handleTextSelection(e);
        }
    });

    // Hide popup when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (!formatPopup.contains(e.target)) {
            formatPopup.style.display = 'none';
            currentSelection = null;
        }
    });

    // Format buttons event listeners
    boldBtn.addEventListener('click', () => applyFormat('bold'));
    italicBtn.addEventListener('click', () => applyFormat('italic'));
    underlineBtn.addEventListener('click', () => applyFormat('underline'));

    // Add undo/redo keyboard handlers
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            document.execCommand('undo', false, null);
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            document.execCommand('redo', false, null);
        }
    });

    function handleTextSelection(e) {
        const selection = window.getSelection();
        
        if (selection && !selection.isCollapsed) {
            // Store the current selection for later use
            currentSelection = selection;
            
            const range = selection.getRangeAt(0);
            const selectionRect = range.getBoundingClientRect();
            
            // Calculate popup dimensions
            const popupWidth = 120; 
            const popupHeight = 42; 
            
            // Calculate position ensuring it stays in viewport
            let left = selectionRect.left + (selectionRect.width / 2) - (popupWidth / 2);
            let top = selectionRect.top - popupHeight - 5;
            
            // Check if popup would go outside viewport boundaries
            if (left + popupWidth > window.innerWidth) {
                left = window.innerWidth - popupWidth - 10;
            }
            if (left < 10) {
                left = 10;
            }
            if (top < 10) {
                top = selectionRect.bottom + 5;
            }
            
            // Position popup
            formatPopup.style.left = left + 'px';
            formatPopup.style.top = top + 'px';
            formatPopup.style.display = 'flex';
            
            if (e) e.stopPropagation();
        } else {
            formatPopup.style.display = 'none';
            currentSelection = null;
        }
    }

    function applyFormat(format) {
        // Use the stored selection if available
        const selection = currentSelection || window.getSelection();
        
        if (!selection || selection.isCollapsed) return;
        
        // Apply formatting using document.execCommand
        document.execCommand('styleWithCSS', false, true);
        
        switch (format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
        }
        
        // Hide popup
        formatPopup.style.display = 'none';
        
        // Update counter and autosave
        updateCounter();
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(autoSaveDraft, 2000);
    }

    function loadMarkdownFile() {
        // Create a hidden file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.md';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Trigger click to open file dialog
        fileInput.click();
        
        // Handle file selection
        fileInput.addEventListener('change', function() {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                
                // Check if it's an MD file
                if (!file.name.toLowerCase().endsWith('.md')) {
                    alert('Please select a Markdown (.md) file');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    
                    // Confirm if the user wants to replace current content
                    if (getContent().trim() && !confirm('Do you want to replace the current content?')) {
                        return;
                    }
                    
                    // Clear current document and load markdown content
                    clearDocument();
                    
                    // Split by double newlines to get paragraphs
                    const paragraphs = content.split(/\n\n+/);
                    
                    // Create paragraphs for each section
                    paragraphs.forEach((text, index) => {
                        // Convert markdown formatting to HTML
                        // Bold: **text** or __text__
                        text = text.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
                        // Italic: *text* or _text_
                        text = text.replace(/(\*|_)([^\*_]+)\1/g, '<em>$2</em>');
                        // Underline: __text__
                        text = text.replace(/__(.+?)__/g, '<u>$1</u>');
                        
                        createParagraph(text, index === 0);
                    });
                    
                    // If no paragraphs were created, create an empty one
                    if (paragraphs.length === 0) {
                        createParagraph('', true);
                    }
                    
                    updateCounter();
                };
                reader.readAsText(file);
            }
            
            // Remove the file input
            document.body.removeChild(fileInput);
        });
    }

    function downloadAllWritings() {
        const writings = JSON.parse(localStorage.getItem('writings') || '[]');
        
        if (writings.length === 0) {
            alert('No writings to download.');
            return;
        }
        
        // Create a zip file
        const zip = new JSZip();
        const folder = zip.folder("focus-writings");
        
        // Add each writing as a separate markdown file
        writings.forEach(writing => {
            // Convert HTML content to markdown
            let markdownContent = '';
            
            // Split content by paragraphs
            const paragraphs = writing.content.split('\n');
            
            paragraphs.forEach(paragraphHTML => {
                // Create a temporary div to hold the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = paragraphHTML;
                
                // Process the paragraph content
                const processedText = processNode(tempDiv);
                markdownContent += processedText + '\n\n';
            });
            
            // Get title from the writing
            const title = writing.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase() || writing.title;
            const dateStr = new Date(writing.updatedAt).toISOString().split('T')[0];
            
            // Add to zip
            folder.file(`${dateStr}-${title}.md`, markdownContent);
        });
        
        // Generate and download the zip file
        zip.generateAsync({type:"blob"})
            .then(function(content) {
                // Create download link and trigger click
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = "focus-writings.zip";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            });
    }
});