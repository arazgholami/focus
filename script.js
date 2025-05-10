// Initialize variables
let currentDocumentId = null;
let isTyping = false;
let typingTimer = null;
let soundEnabled = true;
let isDarkMode = false;
let isFullscreen = false;
let documents = {};
let lastKeyPressed = null;

// DOM Elements
const editor = document.getElementById('editor');
const toolbar = document.getElementById('toolbar');
const statusBar = document.getElementById('status-bar');
const formattingPopup = document.getElementById('formatting-popup');
const counter = document.getElementById('counter');
const listPopup = document.getElementById('list-popup');
const documentsListElement = document.getElementById('documents-list');
const fileInput = document.getElementById('file-input');

// Sound elements
const sounds = {
  key: [
    new Audio('sounds/key-new-01.mp3'),
    new Audio('sounds/key-new-02.mp3'),
    new Audio('sounds/key-new-03.mp3'),
    new Audio('sounds/key-new-04.mp3'),
    new Audio('sounds/key-new-05.mp3')
  ],
  space: new Audio('sounds/space-new.mp3'),
  backspace: new Audio('sounds/backspace.mp3'),
  return: new Audio('sounds/return-new.mp3'),
  scrollUp: new Audio('sounds/scrollUp.mp3'),
  scrollDown: new Audio('sounds/scrollDown.mp3')
};

// Initialize the app
function init() {
  // Load saved documents from localStorage
  loadDocumentsFromStorage();
  
  // Load user preferences
  loadPreferences();
  
  // Create a new document or load the last edited one
  if (currentDocumentId && documents[currentDocumentId]) {
    loadDocument(currentDocumentId);
  } else {
    createNewDocument();
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Update word counter
  updateCounter();
  
  // Set initial theme
  applyTheme();
}

// Load documents from localStorage
function loadDocumentsFromStorage() {
  const savedDocuments = localStorage.getItem('focus_documents');
  if (savedDocuments) {
    documents = JSON.parse(savedDocuments);
  }
  
  const lastDocumentId = localStorage.getItem('focus_current_document');
  if (lastDocumentId) {
    currentDocumentId = lastDocumentId;
  }
}

// Load user preferences
function loadPreferences() {
  const savedSoundPreference = localStorage.getItem('focus_sound_enabled');
  if (savedSoundPreference !== null) {
    soundEnabled = savedSoundPreference === 'true';
    updateSoundButton();
  }
  
  const savedThemePreference = localStorage.getItem('focus_dark_mode');
  if (savedThemePreference !== null) {
    isDarkMode = savedThemePreference === 'true';
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Editor events
  editor.addEventListener('input', handleInput);
  editor.addEventListener('keydown', handleKeyDown);
  editor.addEventListener('mouseup', handleTextSelection);
  editor.addEventListener('dblclick', handleDoubleClick);
  // Force empty class when content is empty
  editor.addEventListener('input', () => {
    if (editor.textContent.trim() === '') {
      editor.textContent = '';
    }
  });
  editor.addEventListener('blur', () => {
    setTimeout(() => {
      if (!formattingPopup.contains(document.activeElement)) {
        formattingPopup.classList.add('hidden');
      }
    }, 100);
  });
  
  // Toolbar button events
  document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
  document.getElementById('list-btn').addEventListener('click', toggleDocumentsList);
  document.getElementById('theme-btn').addEventListener('click', toggleDarkMode);
  document.getElementById('sound-btn').addEventListener('click', toggleSound);
  document.getElementById('load-btn').addEventListener('click', () => fileInput.click());
  document.getElementById('download-btn').addEventListener('click', downloadCurrentDocument);
  
  // Status bar button events
  document.getElementById('new-btn').addEventListener('click', createNewDocument);
  document.getElementById('save-btn').addEventListener('click', saveCurrentDocument);
  
  // Format popup button events
  document.getElementById('format-bold').addEventListener('click', () => formatText('bold'));
  document.getElementById('format-italic').addEventListener('click', () => formatText('italic'));
  document.getElementById('format-underline').addEventListener('click', () => formatText('underline'));
  document.getElementById('format-h1').addEventListener('click', () => formatText('h1'));
  document.getElementById('format-h2').addEventListener('click', () => formatText('h2'));
  document.getElementById('format-h3').addEventListener('click', () => formatText('h3'));
  document.getElementById('format-quote').addEventListener('click', () => formatText('blockquote'));
  document.getElementById('format-link').addEventListener('click', () => formatText('link'));
  
  // List popup events
  document.getElementById('close-list').addEventListener('click', () => listPopup.classList.add('hidden'));
  document.getElementById('download-all-btn').addEventListener('click', downloadAllDocuments);
  
  // File input event
  fileInput.addEventListener('change', handleFileUpload);
  
  // Window events
  window.addEventListener('resize', positionFormattingPopup);
  window.addEventListener('scroll', () => {
    if (isTyping) return;
    positionFormattingPopup();
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleShortcuts);
}

// Handle input in the editor
function handleInput() {
  // Mark as typing to show typing behavior
  isTyping = true;
  
  // Hide toolbar and status bar when typing
  toolbar.classList.add('hidden');
  statusBar.classList.add('hidden');
  
  // Clear previous timer
  clearTimeout(typingTimer);
  
  // Set timer to detect when typing stops
  typingTimer = setTimeout(() => {
    isTyping = false;
    toolbar.classList.remove('hidden');
    statusBar.classList.remove('hidden');
    
    // Auto-save content
    saveCurrentDocumentContent();
    
    // Update counter
    updateCounter();
  }, 1500);
  
  // Set paragraph direction based on content
  setDirectionForParagraphs();
}

// Handle key down events for sounds
function handleKeyDown(e) {
  if (!soundEnabled) return;
  
  // Play appropriate sound based on key pressed
  if (e.key === 'Backspace') {
    playSound('backspace');
  } else if (e.key === 'Enter') {
    playSound('return');
  } else if (e.key === ' ') {
    playSound('space');
  } else if (e.key.length === 1) {
    playSound('key');
  }
  
  lastKeyPressed = e.key;
}

// Play typewriter sounds
function playSound(type) {
  if (!soundEnabled) return;
  
  if (type === 'key') {
    // Play random key sound
    const randomIndex = Math.floor(Math.random() * sounds.key.length);
    const sound = sounds.key[randomIndex].cloneNode();
    sound.volume = 0.5;
    sound.play();
  } else if (sounds[type]) {
    const sound = sounds[type].cloneNode();
    sound.volume = 0.5;
    sound.play();
  }
}

// Handle text selection for formatting popup
function handleTextSelection() {
  const selection = window.getSelection();
  
  if (selection.toString().trim().length > 0 && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position and show formatting popup
    formattingPopup.style.top = `${rect.top - formattingPopup.offsetHeight - 10}px`;
    formattingPopup.style.left = `${rect.left + (rect.width / 2) - (formattingPopup.offsetWidth / 2)}px`;
    formattingPopup.classList.remove('hidden');
    
    // Check for active formatting styles
    checkActiveFormattingStyles();
  } else {
    formattingPopup.classList.add('hidden');
  }
}

// Handle double click to show formatting popup
function handleDoubleClick(e) {
  if (e.target === editor || editor.contains(e.target)) {
    const selection = window.getSelection();
    if (selection.toString().trim().length > 0) {
      handleTextSelection();
    }
  }
}

// Check for active formatting styles in the current selection
function checkActiveFormattingStyles() {
  // Reset all buttons
  document.querySelectorAll('#formatting-popup button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Check for bold
  if (document.queryCommandState('bold')) {
    document.getElementById('format-bold').classList.add('active');
  }
  
  // Check for italic
  if (document.queryCommandState('italic')) {
    document.getElementById('format-italic').classList.add('active');
  }
  
  // Check for underline
  if (document.queryCommandState('underline')) {
    document.getElementById('format-underline').classList.add('active');
  }
  
  // Check for headings and blockquote
  const parentNode = window.getSelection().anchorNode.parentNode;
  const parentTagName = parentNode.tagName ? parentNode.tagName.toLowerCase() : '';
  
  if (parentTagName === 'h1' || parentNode.closest('h1')) {
    document.getElementById('format-h1').classList.add('active');
  } else if (parentTagName === 'h2' || parentNode.closest('h2')) {
    document.getElementById('format-h2').classList.add('active');
  } else if (parentTagName === 'h3' || parentNode.closest('h3')) {
    document.getElementById('format-h3').classList.add('active');
  } else if (parentTagName === 'blockquote' || parentNode.closest('blockquote')) {
    document.getElementById('format-quote').classList.add('active');
  }
  
  // Check for links
  if (document.queryCommandState('createLink') || parentTagName === 'a' || parentNode.closest('a')) {
    document.getElementById('format-link').classList.add('active');
  }
}

// Position formatting popup based on selection
function positionFormattingPopup() {
  const selection = window.getSelection();
  
  if (selection.toString().trim().length > 0 && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    formattingPopup.style.top = `${rect.top - formattingPopup.offsetHeight - 10}px`;
    formattingPopup.style.left = `${rect.left + (rect.width / 2) - (formattingPopup.offsetWidth / 2)}px`;
  }
}

// Format selected text
function formatText(format) {
  const selection = window.getSelection();
  
  if (selection.toString().trim().length === 0) {
    return;
  }
  
  // Save current selection
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  
  // Check if we need to remove formatting instead of applying it
  const parentNode = selection.anchorNode.parentNode;
  const parentTagName = parentNode.tagName ? parentNode.tagName.toLowerCase() : '';
  const isFormatActive = 
    (format === 'h1' && (parentTagName === 'h1' || parentNode.closest('h1'))) ||
    (format === 'h2' && (parentTagName === 'h2' || parentNode.closest('h2'))) ||
    (format === 'h3' && (parentTagName === 'h3' || parentNode.closest('h3'))) ||
    (format === 'blockquote' && (parentTagName === 'blockquote' || parentNode.closest('blockquote')));
  
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
    case 'h1':
    case 'h2':
    case 'h3':
      if (isFormatActive) {
        // Remove the heading format by converting to paragraph
        document.execCommand('formatBlock', false, '<p>');
      } else {
        // Apply heading format
        document.execCommand('formatBlock', false, `<${format}>`);
      }
      // Set dir attribute after formatting
      setTimeout(() => setDirectionForParagraphs(), 0);
      break;
    case 'blockquote':
      if (isFormatActive) {
        // Remove the blockquote format by converting to paragraph
        document.execCommand('formatBlock', false, '<p>');
      } else {
        // Apply blockquote format
        document.execCommand('formatBlock', false, '<blockquote>');
      }
      // Set dir attribute after formatting
      setTimeout(() => setDirectionForParagraphs(), 0);
      break;
    case 'link':
      const url = prompt('Enter URL:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
      }
      break;
  }
  
  // Hide formatting popup
  formattingPopup.classList.add('hidden');
  
  // Auto-save after formatting
  saveCurrentDocumentContent();
}

// Set direction for paragraphs based on content
function setDirectionForParagraphs() {
  const paragraphs = editor.querySelectorAll('div, p, h1, h2, h3, blockquote');
  
  paragraphs.forEach(p => {
    if (!p.hasAttribute('dir')) {
      p.setAttribute('dir', 'auto');
    }
  });
}

// Toggle fullscreen mode
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
    document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-compress"></i>';
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
    document.getElementById('fullscreen-btn').innerHTML = '<i class="fas fa-expand"></i>';
  }
  
  isFullscreen = !isFullscreen;
}

// Toggle dark mode
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  applyTheme();
  
  // Save preference
  localStorage.setItem('focus_dark_mode', isDarkMode);
  
  // Update button icon
  document.getElementById('theme-btn').innerHTML = isDarkMode ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
}

// Apply current theme
function applyTheme() {
  if (isDarkMode) {
    document.body.setAttribute('data-theme', 'dark');
  } else {
    document.body.setAttribute('data-theme', 'light');
  }
}

// Toggle typewriter sounds
function toggleSound() {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  
  // Save preference
  localStorage.setItem('focus_sound_enabled', soundEnabled);
}

// Update sound button icon
function updateSoundButton() {
  document.getElementById('sound-btn').innerHTML = soundEnabled ? 
    '<i class="fas fa-volume-up"></i>' : 
    '<i class="fas fa-volume-mute"></i>';
}

// Create a new document
function createNewDocument() {
  // Generate a unique ID
  const newId = 'doc_' + Date.now();
  
  // Create new document object
  documents[newId] = {
    id: newId,
    title: 'Untitled Document',
    content: '',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  // Set as current document
  currentDocumentId = newId;
  
  // Save to localStorage
  saveDocumentsToStorage();
  
  // Load the new document
  loadDocument(newId);
  
  // Focus editor
  editor.focus();
}

// Save current document content
function saveCurrentDocumentContent() {
  if (!currentDocumentId) return;
  
  // Get current content
  const content = editor.innerHTML;
  
  // Get title from first line
  let title = 'Untitled Document';
  const firstLine = editor.textContent.trim().split('\n')[0];
  if (firstLine) {
    title = firstLine.substring(0, 20);
  }
  
  // Update document
  documents[currentDocumentId].title = title;
  documents[currentDocumentId].content = content;
  documents[currentDocumentId].updated = new Date().toISOString();
  
  // Save to localStorage
  saveDocumentsToStorage();
}

// Save current document (explicit save)
function saveCurrentDocument() {
  saveCurrentDocumentContent();
  
  // Show brief saved notification
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved.';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
  }, 1500);
}

// Save all documents to localStorage
function saveDocumentsToStorage() {
  localStorage.setItem('focus_documents', JSON.stringify(documents));
  localStorage.setItem('focus_current_document', currentDocumentId);
}

// Load a document into the editor
function loadDocument(id) {
  if (!documents[id]) return;
  
  // Set current document ID
  currentDocumentId = id;
  
  // Load content into editor
  editor.innerHTML = documents[id].content;
  
  // Update counter
  updateCounter();
  
  // Save current document ID
  localStorage.setItem('focus_current_document', currentDocumentId);
}

// Toggle documents list popup
function toggleDocumentsList() {
  // Update the list
  updateDocumentsList();
  
  // Toggle visibility
  listPopup.classList.toggle('hidden');
}

// Update documents list in the popup
function updateDocumentsList() {
  // Clear current list
  documentsListElement.innerHTML = '';
  
  // Sort documents by updated date (newest first)
  const sortedDocs = Object.values(documents).sort((a, b) => {
    return new Date(b.updated) - new Date(a.updated);
  });
  
  // Add each document to the list
  sortedDocs.forEach(doc => {
    const docItem = document.createElement('div');
    docItem.className = 'document-item';
    if (doc.id === currentDocumentId) {
      docItem.classList.add('active');
    }
    
    const docTitle = document.createElement('div');
    docTitle.className = 'document-title';
    docTitle.textContent = doc.title;
    
    const docDate = document.createElement('div');
    docDate.className = 'document-date';
    docDate.textContent = formatDate(doc.updated);
    
    const docActions = document.createElement('div');
    docActions.className = 'document-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this document?')) {
        deleteDocument(doc.id);
      }
    });
    
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.title = 'Download';
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadDocument(doc.id);
    });
    
    docActions.appendChild(downloadBtn);
    docActions.appendChild(deleteBtn);
    
    docItem.appendChild(docTitle);
    docItem.appendChild(docDate);
    docItem.appendChild(docActions);
    
    // Add click event to load document
    docItem.addEventListener('click', () => {
      loadDocument(doc.id);
      listPopup.classList.add('hidden');
    });
    
    documentsListElement.appendChild(docItem);
  });
  
  // Show message if no documents
  if (sortedDocs.length === 0) {
    documentsListElement.innerHTML = '<div class="no-documents">No documents yet</div>';
  }
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Delete a document
function deleteDocument(id) {
  // Delete the document
  delete documents[id];
  
  // Save to localStorage
  saveDocumentsToStorage();
  
  // Update the list
  updateDocumentsList();
  
  // If current document was deleted, create a new one
  if (id === currentDocumentId) {
    createNewDocument();
  }
}

// Download current document as markdown
function downloadCurrentDocument() {
  if (!currentDocumentId) return;
  downloadDocument(currentDocumentId);
}

// Download a specific document as markdown
function downloadDocument(id) {
  if (!documents[id]) return;
  
  const doc = documents[id];
  const markdownContent = convertToMarkdown(doc.content);
  
  // Get first line as title or use default title
  const firstLine = markdownContent.split('\n')[0].replace(/^#\s+/, '').trim();
  const fileName = firstLine && firstLine.length > 0 ? 
    `${firstLine.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` : 
    `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  
  // Create file and trigger download
  const blob = new Blob([markdownContent], {type: 'text/markdown'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download all documents as a zip file
function downloadAllDocuments() {
  // Load JSZip from CDN if it's not already loaded
  if (typeof JSZip === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
      // Once loaded, proceed with zip creation
      createAndDownloadZip();
    };
    document.head.appendChild(script);
  } else {
    // JSZip already loaded, proceed with zip creation
    createAndDownloadZip();
  }
}

// Create and download a zip file containing all documents
function createAndDownloadZip() {
  const zip = new JSZip();
  const docs = Object.values(documents);
  
  // Add each document to the zip
  docs.forEach(doc => {
    // Get the document content
    const content = doc.content;
    // Convert HTML to Markdown
    const markdown = convertToMarkdown(content);
    // Get first line as title or use default title
    const firstLine = markdown.split('\n')[0].replace(/^#\s+/, '').trim();
    const fileName = firstLine && firstLine.length > 0 ? 
      `${firstLine}.md` : 
      `${doc.title}.md`;
    
    // Add file to zip
    zip.file(fileName, markdown);
  });
  
  // Generate the zip file
  zip.generateAsync({type: 'blob'}).then(blob => {
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focus-writings.zip';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });
}

// Convert HTML content to Markdown
function convertToMarkdown(html) {
  // Create a temporary div to work with the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Process the HTML elements
  let markdown = '';
  
  // Process each child node
  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      markdown += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
          markdown += `# ${node.textContent}\n\n`;
          break;
        case 'h2':
          markdown += `## ${node.textContent}\n\n`;
          break;
        case 'h3':
          markdown += `### ${node.textContent}\n\n`;
          break;
        case 'p':
          markdown += `${node.textContent}\n\n`;
          break;
        case 'blockquote':
          markdown += `> ${node.textContent}\n\n`;
          break;
        case 'strong':
        case 'b':
          markdown += `**${node.textContent}**`;
          break;
        case 'em':
        case 'i':
          markdown += `*${node.textContent}*`;
          break;
        case 'u':
          markdown += `<u>${node.textContent}</u>`;
          break;
        case 'a':
          markdown += `[${node.textContent}](${node.getAttribute('href')})`;
          break;
        case 'br':
          markdown += '\n';
          break;
        default:
          markdown += node.textContent;
      }
    }
  });
  
  return markdown;
}

// Handle file upload
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    
    // Create a new document
    const newId = 'doc_' + Date.now();
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    
    // Convert markdown to HTML if it's a markdown file
    let htmlContent = '';
    if (file.name.endsWith('.md')) {
      htmlContent = convertMarkdownToHtml(content);
    } else {
      // Assume it's plain text
      htmlContent = `<p dir="auto">${content.replace(/\n/g, '</p><p dir="auto">')}</p>`;
    }
    
    // Create document
    documents[newId] = {
      id: newId,
      title: fileName,
      content: htmlContent,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    // Set as current and save
    currentDocumentId = newId;
    saveDocumentsToStorage();
    
    // Load the document
    loadDocument(newId);
  };
  
  reader.readAsText(file);
  
  // Reset file input
  fileInput.value = '';
}

// Convert Markdown to HTML
function convertMarkdownToHtml(markdown) {
  let html = markdown;
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1 dir="auto">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 dir="auto">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 dir="auto">$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote dir="auto">$1</blockquote>');
  
  // Paragraphs
  html = html.replace(/^(?!<h|<blockquote)(.*$)/gm, function(match) {
    if (match.trim() === '') return '';
    return '<p dir="auto">' + match + '</p>';
  });
  
  return html;
}

// Update word and paragraph counter
function updateCounter() {
  const text = editor.textContent;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  // Count paragraphs by splitting content on double line breaks
  // This is more accurate than counting <p> elements which may not be properly formed
  const paragraphText = editor.innerText.trim();
  const paragraphCount = paragraphText === '' ? 0 : paragraphText.split(/\n\s*\n+/).length;
  
  counter.textContent = `${wordCount} words, ${paragraphCount} paragraphs`;
}

// Handle keyboard shortcuts
function handleShortcuts(e) {
  // Ctrl+S to save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveCurrentDocument();
  }
  
  // Ctrl+N for new document
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    createNewDocument();
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);