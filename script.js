// Initialize variables
let currentDocumentId = null;
let isTyping = false;
let typingTimer = null;
let soundEnabled = true;
let soundVolume = 0.5; // Default volume at 50%
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
  
  // Initialize Bootstrap tooltips
  initBootstrapTooltips();
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
  const savedSoundVolume = localStorage.getItem('focus_sound_volume');
  if (savedSoundVolume !== null) {
    soundVolume = parseFloat(savedSoundVolume);
    document.getElementById('volume-slider').value = soundVolume * 100;
    document.getElementById('volume-value').textContent = Math.round(soundVolume * 100) + '%';
    soundEnabled = soundVolume > 0;
    updateSoundButton();
  } else {
    // Set default volume to 50%
    soundVolume = 0.5;
    document.getElementById('volume-slider').value = 50;
    document.getElementById('volume-value').textContent = '50%';
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
  
  // Add click handler for links to make them Ctrl+Click openable
  editor.addEventListener('click', (e) => {
    // Check if the click is on a link and Ctrl/Cmd key is pressed
    if ((e.ctrlKey || e.metaKey) && e.target.tagName === 'A') {
      e.preventDefault();
      window.open(e.target.href, '_blank');
    }
  });
  
  // Toolbar button events
  document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
  document.getElementById('list-btn').addEventListener('click', toggleDocumentsList);
  document.getElementById('theme-btn').addEventListener('click', toggleDarkMode);
  document.getElementById('sound-btn').addEventListener('click', toggleSound);
  document.getElementById('load-btn').addEventListener('click', () => fileInput.click());
  document.getElementById('download-btn').addEventListener('click', downloadCurrentDocument);
  
  // Volume slider event
  document.getElementById('volume-slider').addEventListener('input', function() {
    soundVolume = this.value / 100;
    updateSoundButton();
    localStorage.setItem('focus_sound_volume', soundVolume);
    
    // Update volume percentage display
    document.getElementById('volume-value').textContent = Math.round(soundVolume * 100) + '%';
  });
  
  // Close volume popup when clicking outside
  document.addEventListener('click', function(e) {
    const volumePopup = document.getElementById('volume-popup');
    const soundBtn = document.getElementById('sound-btn');
    
    if (volumePopup && !volumePopup.classList.contains('hidden') && 
        !volumePopup.contains(e.target) && e.target !== soundBtn && !soundBtn.contains(e.target)) {
      volumePopup.classList.add('hidden');
    }
  });
  
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
  document.getElementById('format-unlink').addEventListener('click', () => formatText('unlink'));
  
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
    sound.volume = soundVolume;
    sound.play();
  } else if (sounds[type]) {
    const sound = sounds[type].cloneNode();
    sound.volume = soundVolume;
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
  // Prevent default behavior to avoid text selection
  e.preventDefault();
  
  const selection = window.getSelection();
  
  // If there's text selected, show the formatting popup
  if (selection.toString().trim().length > 0) {
    formattingPopup.classList.remove('hidden');
    checkActiveFormattingStyles();
    positionFormattingPopup();
    return;
  } 
  
  // Handle double-click on empty areas or between paragraphs
  if (e.target === editor || 
      (e.target.tagName === 'P' && e.target.textContent.trim() === '') ||
      (e.target.tagName === 'DIV' && e.target.id === 'editor') ||
      (e.target === document.body && editor.contains(selection.anchorNode))) {
    
    // Position cursor at the double-click position
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      // If editor is empty, add a paragraph
      if (editor.innerHTML.trim() === '') {
        editor.innerHTML = '<p><br></p>';
        const newRange = document.createRange();
        newRange.setStart(editor.querySelector('p'), 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    // Always show the formatting popup on double-click, even in empty areas
    formattingPopup.classList.remove('hidden');
    checkActiveFormattingStyles();
    positionFormattingPopup();
  }
}

// Check for active formatting styles in the current selection
function checkActiveFormattingStyles() {
  const boldButton = document.getElementById('format-bold');
  const italicButton = document.getElementById('format-italic');
  const underlineButton = document.getElementById('format-underline');
  const h1Button = document.getElementById('format-h1');
  const h2Button = document.getElementById('format-h2');
  const h3Button = document.getElementById('format-h3');
  const quoteButton = document.getElementById('format-quote');
  const linkButton = document.getElementById('format-link');
  const unlinkButton = document.getElementById('format-unlink');
  
  // Reset all buttons
  boldButton.classList.remove('active');
  italicButton.classList.remove('active');
  underlineButton.classList.remove('active');
  h1Button.classList.remove('active');
  h2Button.classList.remove('active');
  h3Button.classList.remove('active');
  quoteButton.classList.remove('active');
  linkButton.classList.remove('active');
  
  // Hide unlink button by default
  if (unlinkButton) {
    unlinkButton.style.display = 'none';
  }
  
  // Check for active styles
  if (document.queryCommandState('bold')) {
    boldButton.classList.add('active');
  }
  
  if (document.queryCommandState('italic')) {
    italicButton.classList.add('active');
  }
  
  if (document.queryCommandState('underline')) {
    underlineButton.classList.add('active');
  }
  
  // Check for block formats
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const parentNode = selection.anchorNode.parentNode;
    const parentTagName = parentNode.tagName ? parentNode.tagName.toLowerCase() : '';
    
    // Check for headings and blockquote
    if (parentTagName === 'h1' || parentNode.closest('h1')) {
      h1Button.classList.add('active');
    } else if (parentTagName === 'h2' || parentNode.closest('h2')) {
      h2Button.classList.add('active');
    } else if (parentTagName === 'h3' || parentNode.closest('h3')) {
      h3Button.classList.add('active');
    } else if (parentTagName === 'blockquote' || parentNode.closest('blockquote')) {
      quoteButton.classList.add('active');
    }
    
    // Check for links
    const isLink = parentTagName === 'a' || parentNode.closest('a');
    if (isLink) {
      linkButton.classList.add('active');
      
      // Show unlink button when a link is selected
      if (unlinkButton) {
        unlinkButton.style.display = 'inline-block';
      }
    }
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
  
  if (selection.toString().trim().length === 0 && format !== 'unlink') {
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
  
  // Check if the selection is within a link for the link format
  let linkNode = null;
  if (format === 'link' || format === 'unlink') {
    linkNode = parentTagName === 'a' ? parentNode : parentNode.closest('a');
  }
  
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
    case 'unlink':
      if (linkNode) {
        document.execCommand('unlink', false, null);
      }
      break;
    case 'link':
      // If selection is already a link, get the current URL for editing
      let initialUrl = 'https://';
      if (linkNode) {
        initialUrl = linkNode.getAttribute('href') || 'https://';
      }
      
      const url = prompt('Enter URL:', initialUrl);
      if (url) {
        document.execCommand('createLink', false, url);
        
        // Add ctrl+click functionality to all links
        setTimeout(() => {
          const links = editor.querySelectorAll('a');
          links.forEach(link => {
            if (!link.hasAttribute('data-link-handler')) {
              link.setAttribute('data-link-handler', 'true');
            }
          });
        }, 0);
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

// Show volume control popup
function toggleSound() {
  const soundBtn = document.getElementById('sound-btn');
  const volumePopup = document.getElementById('volume-popup');
  
  // Toggle volume popup visibility
  if (volumePopup.classList.contains('hidden')) {
    volumePopup.classList.remove('hidden');
    // Position the popup to the right of the sound button
    const btnRect = soundBtn.getBoundingClientRect();
    volumePopup.style.left = (btnRect.right + 115) + 'px';
    volumePopup.style.top = (btnRect.top + 10) + 'px';
  } else {
    volumePopup.classList.add('hidden');
  }
}

// Update sound button icon based on volume level
function updateSoundButton() {
  let iconClass = 'fa-volume-mute';
  
  if (soundVolume > 0) {
    soundEnabled = true;
    if (soundVolume < 0.3) {
      iconClass = 'fa-volume-off';
    } else if (soundVolume < 0.7) {
      iconClass = 'fa-volume-down';
    } else {
      iconClass = 'fa-volume-up';
    }
  } else {
    soundEnabled = false;
  }
  
  document.getElementById('sound-btn').innerHTML = `<i class="fas ${iconClass}"></i>`;
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
  if (!currentDocumentId) return;
  
  // Show brief saved notification
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved.';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
  }, 1500);
}

// Save document title
function saveDocumentTitle(id, newTitle) {
  if (!id || !documents[id]) return;
  
  // Don't save empty titles
  if (!newTitle.trim()) {
    newTitle = 'Untitled Document';
  }
  
  // Update document title
  documents[id].title = newTitle;
  documents[id].updated = new Date().toISOString();
  
  // Save to storage
  saveDocumentsToStorage();
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
    docTitle.setAttribute('title', 'Double-click to rename');
    
    // Track clicks for distinguishing between single and double clicks
    let clickTimer = null;
    let preventSingleClick = false;
    
    docTitle.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (preventSingleClick) {
        return;
      }
      
      // If we're in edit mode, don't do anything on click
      if (docTitle.contentEditable === 'true') {
        return;
      }
      
      // Set a timer to detect if this is a double click
      if (clickTimer === null) {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          if (!preventSingleClick) {
            // This was a single click, load the document
            loadDocument(doc.id);
            listPopup.classList.add('hidden');
          }
        }, 300); // 300ms is typical double-click threshold
      }
    });
    
    // Add double-click event to make title editable
    docTitle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      
      // Clear any pending single-click timer
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      
      // Prevent the single-click action
      preventSingleClick = true;
      
      // Make title editable
      docTitle.contentEditable = true;
      docTitle.focus();
      
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(docTitle);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    
    // Save title on blur or Enter key
    docTitle.addEventListener('blur', () => {
      saveDocumentTitle(doc.id, docTitle.textContent.trim());
      docTitle.contentEditable = false;
      
      // Reset click tracking after a short delay
      setTimeout(() => {
        preventSingleClick = false;
      }, 300);
    });
    
    docTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        docTitle.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        docTitle.textContent = doc.title; // Revert changes
        docTitle.contentEditable = false;
        
        // Reset click tracking after a short delay
        setTimeout(() => {
          preventSingleClick = false;
        }, 300);
      }
    });
    
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
  
  // Process the HTML elements recursively
  function processNode(node) {
    let result = '';
    
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const childContent = Array.from(node.childNodes).map(child => processNode(child)).join('');
      
      switch (tagName) {
        case 'h1':
          return `# ${childContent}\n\n`;
        case 'h2':
          return `## ${childContent}\n\n`;
        case 'h3':
          return `### ${childContent}\n\n`;
        case 'p':
          return `${childContent}\n\n`;
        case 'blockquote':
          return `> ${childContent}\n\n`;
        case 'strong':
        case 'b':
          return `**${childContent}**`;
        case 'em':
        case 'i':
          return `*${childContent}*`;
        case 'u':
          return `<u>${childContent}</u>`;
        case 'a':
          return `[${childContent}](${node.getAttribute('href')})`;
        case 'br':
          return '\n';
        case 'img':
          return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src')})`;
        default:
          return childContent;
      }
    }
    
    return result;
  }
  
  let markdown = '';
  Array.from(temp.childNodes).forEach(node => {
    markdown += processNode(node);
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
  
  // Images - process these first to avoid conflicts with links
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1 dir="auto">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 dir="auto">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 dir="auto">$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Underline - HTML tag in markdown
  html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote dir="auto">$1</blockquote>');
  
  // Paragraphs
  html = html.replace(/^(?!<h|<blockquote|<img)(.*$)/gm, function(match) {
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





// Initialize Bootstrap tooltips
function initBootstrapTooltips() {
  // Check if Bootstrap is available first
  if (typeof bootstrap === 'undefined') {
    console.warn('Bootstrap library not loaded, skipping tooltip initialization');
    return;
  }
  
  try {
    // Remove default title attributes and replace with data-bs-toggle and data-bs-title
    const elementsWithTitle = document.querySelectorAll('[title]');
    elementsWithTitle.forEach(el => {
      const title = el.getAttribute('title');
      if (title) {
        el.removeAttribute('title');
        el.setAttribute('data-bs-toggle', 'tooltip');
        el.setAttribute('data-bs-title', title);
      }
    });
    
    // Initialize all tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl, {
        trigger: 'hover'
      });
    });
  } catch (error) {
    console.error('Error initializing Bootstrap tooltips:', error);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  init();
});