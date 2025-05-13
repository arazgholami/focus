let currentDocumentId = null;
let isTyping = false;
let typingTimer = null;
let soundEnabled = true;
let soundVolume = 0.5; 
let isDarkMode = false;
let isFullscreen = false;
let documents = {};
let customBackground = null; 

let fontFamily = 'Vazir'; 
let fontSize = 120; 
let editorWidth = 830; 
let systemFonts = []; 
let useCustomBg = false; 

const editor = document.getElementById('editor');
const toolbar = document.getElementById('toolbar');
const statusBar = document.getElementById('status-bar');
const formattingPopup = document.getElementById('formatting-popup');
const settingsPopup = document.getElementById('settings-popup');
const counter = document.getElementById('counter');
const listPopup = document.getElementById('list-popup');
const documentsListElement = document.getElementById('documents-list');
const fileInput = document.getElementById('file-input');

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

function init() {
  
  loadDocumentsFromStorage();
  
  
  loadPreferences();
  
  
  if (currentDocumentId && documents[currentDocumentId]) {
    loadDocument(currentDocumentId);
  } else {
    createNewDocument();
  }
  
  
  setupEventListeners();
  
  
  updateCounter();
  
  
  applyTheme();
  
  
  applyBackground();
  updateBackgroundSelection();
  
  
  initBootstrapTooltips();
}

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

function loadPreferences() {
  
  const savedSoundVolume = localStorage.getItem('focus_sound_volume');
  if (savedSoundVolume !== null) {
    soundVolume = parseFloat(savedSoundVolume);
    document.getElementById('volume-slider').value = soundVolume * 100;
    document.getElementById('volume-value').textContent = Math.round(soundVolume * 100) + '%';
    soundEnabled = soundVolume > 0;
    updateSoundButton();
  } else {
    
    soundVolume = 0.5;
    document.getElementById('volume-slider').value = 50;
    document.getElementById('volume-value').textContent = '50%';
    updateSoundButton();
  }
  
  
  const savedThemePreference = localStorage.getItem('focus_dark_mode');
  if (savedThemePreference !== null) {
    isDarkMode = savedThemePreference === 'true';
  }
  
  
  const savedFontFamily = localStorage.getItem('focus_font_family');
  if (savedFontFamily !== null) {
    fontFamily = savedFontFamily;
  }
  
  
  const savedFontSize = localStorage.getItem('focus_font_size');
  if (savedFontSize !== null) {
    fontSize = parseInt(savedFontSize);
  }
  document.getElementById('font-size-slider').value = fontSize;
  updateFontSizeLabel();
  
  
  const savedEditorWidth = localStorage.getItem('focus_editor_width');
  if (savedEditorWidth !== null) {
    editorWidth = parseInt(savedEditorWidth);
    document.getElementById('editor-width-input').value = editorWidth;
  }
  
  
  try {
    const savedCustomBackground = localStorage.getItem('focus_custom_background');
    const savedUseCustomBg = localStorage.getItem('focus_use_custom_bg');
    
    if (savedCustomBackground && savedCustomBackground !== 'null') {
      customBackground = savedCustomBackground;
      
      
      const customBgElement = document.getElementById('custom-bg');
      customBgElement.style.backgroundImage = `url(${customBackground})`;
      customBgElement.classList.remove('hidden');
    }
    
    
    useCustomBg = savedUseCustomBg === 'true';
  } catch (error) {
    console.error('Error loading background settings:', error);
    useCustomBg = false;
    
    localStorage.removeItem('focus_custom_background');
    localStorage.setItem('focus_use_custom_bg', 'false');
  }
  
  
  applySettings();
}

function setupEventListeners() {
  
  editor.addEventListener('input', handleInput);
  editor.addEventListener('keydown', handleKeyDown);
  editor.addEventListener('mouseup', handleTextSelection);
  editor.addEventListener('dblclick', handleDoubleClick);
  
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
  
  
  editor.addEventListener('click', (e) => {
    
    if ((e.ctrlKey || e.metaKey) && e.target.tagName === 'A') {
      e.preventDefault();
      window.open(e.target.href, '_blank');
    }
  });
  
  
  document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
  document.getElementById('list-btn').addEventListener('click', toggleDocumentsList);
  document.getElementById('sound-btn').addEventListener('click', toggleSound);
  document.getElementById('settings-btn').addEventListener('click', toggleSettings);
  document.getElementById('load-btn').addEventListener('click', () => fileInput.click());
  document.getElementById('download-btn').addEventListener('click', downloadCurrentDocument);
  
  
  document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);
  
  
  document.getElementById('volume-slider').addEventListener('input', function() {
    soundVolume = this.value / 100;
    updateSoundButton();
    localStorage.setItem('focus_sound_volume', soundVolume);
    
    
    document.getElementById('volume-value').textContent = Math.round(soundVolume * 100) + '%';
  });
  
  
  document.addEventListener('click', function(e) {
    
    const volumePopup = document.getElementById('volume-popup');
    const soundBtn = document.getElementById('sound-btn');
    
    if (volumePopup && !volumePopup.classList.contains('hidden') && 
        !volumePopup.contains(e.target) && e.target !== soundBtn && !soundBtn.contains(e.target)) {
      volumePopup.classList.add('hidden');
    }
    
    
    const settingsBtn = document.getElementById('settings-btn');
    
    if (settingsPopup && !settingsPopup.classList.contains('hidden') && 
        !settingsPopup.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
      settingsPopup.classList.add('hidden');
    }
  });
  
  
  document.getElementById('new-btn').addEventListener('click', createNewDocument);
  document.getElementById('save-btn').addEventListener('click', saveCurrentDocument);
  
  
  document.getElementById('format-bold').addEventListener('click', () => formatText('bold'));
  document.getElementById('format-italic').addEventListener('click', () => formatText('italic'));
  document.getElementById('format-underline').addEventListener('click', () => formatText('underline'));
  document.getElementById('format-h1').addEventListener('click', () => formatText('h1'));
  document.getElementById('format-h2').addEventListener('click', () => formatText('h2'));
  document.getElementById('format-h3').addEventListener('click', () => formatText('h3'));
  document.getElementById('format-quote').addEventListener('click', () => formatText('blockquote'));
  document.getElementById('format-link').addEventListener('click', () => formatText('link'));
  document.getElementById('format-unlink').addEventListener('click', () => formatText('unlink'));
  
  
  document.getElementById('close-list').addEventListener('click', () => listPopup.classList.add('hidden'));
  document.getElementById('download-all-btn').addEventListener('click', downloadAllDocuments);
  
  
  document.getElementById('close-settings').addEventListener('click', () => settingsPopup.classList.add('hidden'));
  
  
  document.getElementById('font-family-select').addEventListener('change', function() {
    fontFamily = this.value;
    localStorage.setItem('focus_font_family', fontFamily);
    applySettings();
  });
  
  
  document.getElementById('font-size-slider').addEventListener('input', function() {
    fontSize = parseInt(this.value);
    updateFontSizeLabel();
    localStorage.setItem('focus_font_size', fontSize);
    applySettings();
  });
  
  
  document.getElementById('editor-width-input').addEventListener('change', function() {
    editorWidth = parseInt(this.value);
    localStorage.setItem('focus_editor_width', editorWidth);
    applySettings();
  });
  
  
  document.getElementById('default-bg').addEventListener('click', function() {
    useCustomBg = false;
    localStorage.setItem('focus_use_custom_bg', 'false');
    updateBackgroundSelection();
    applyBackground();
  });
  
  document.getElementById('custom-bg').addEventListener('click', function() {
    if (customBackground) {
      useCustomBg = true;
      localStorage.setItem('focus_use_custom_bg', 'true');
      updateBackgroundSelection();
      applyBackground();
    }
  });
  
  document.getElementById('upload-bg-btn').addEventListener('click', function() {
    document.getElementById('bg-file-input').click();
  });
  
  document.getElementById('bg-file-input').addEventListener('change', handleBackgroundUpload);
  
  
  fileInput.addEventListener('change', handleFileUpload);
  
  
  window.addEventListener('resize', positionFormattingPopup);
  window.addEventListener('scroll', () => {
    if (isTyping) return;
    positionFormattingPopup();
  });
  
  
  document.addEventListener('keydown', handleShortcuts);
}

function handleInput() {
  
  isTyping = true;
  
  
  toolbar.classList.add('hidden');
  statusBar.classList.add('hidden');
  
  
  clearTimeout(typingTimer);
  
  
  typingTimer = setTimeout(() => {
    isTyping = false;
    toolbar.classList.remove('hidden');
    statusBar.classList.remove('hidden');
    
    
    saveCurrentDocumentContent();
    
    
    updateCounter();
  }, 1500);
  
  
  setDirectionForParagraphs();
}

function handleKeyDown(e) {
  if (!soundEnabled) return;
  
  
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

function playSound(type) {
  if (!soundEnabled) return;
  
  if (type === 'key') {
    
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

function handleTextSelection() {
  const selection = window.getSelection();
  
  if (selection.toString().trim().length > 0 && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    
    formattingPopup.style.top = `${rect.top - formattingPopup.offsetHeight - 10}px`;
    formattingPopup.style.left = `${rect.left + (rect.width / 2) - (formattingPopup.offsetWidth / 2)}px`;
    formattingPopup.classList.remove('hidden');
    
    
    checkActiveFormattingStyles();
  } else {
    formattingPopup.classList.add('hidden');
  }
}

function handleDoubleClick(e) {
  
  e.preventDefault();
  
  const selection = window.getSelection();
  
  
  if (selection.toString().trim().length > 0) {
    formattingPopup.classList.remove('hidden');
    checkActiveFormattingStyles();
    positionFormattingPopup();
    return;
  } 
  
  
  if (e.target === editor || 
      (e.target.tagName === 'P' && e.target.textContent.trim() === '') ||
      (e.target.tagName === 'DIV' && e.target.id === 'editor') ||
      (e.target === document.body && editor.contains(selection.anchorNode))) {
    
    
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      
      if (editor.innerHTML.trim() === '') {
        editor.innerHTML = '<p><br></p>';
        const newRange = document.createRange();
        newRange.setStart(editor.querySelector('p'), 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    
    formattingPopup.classList.remove('hidden');
    checkActiveFormattingStyles();
    positionFormattingPopup();
  }
}

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
  
  
  boldButton.classList.remove('active');
  italicButton.classList.remove('active');
  underlineButton.classList.remove('active');
  h1Button.classList.remove('active');
  h2Button.classList.remove('active');
  h3Button.classList.remove('active');
  quoteButton.classList.remove('active');
  linkButton.classList.remove('active');
  
  
  if (unlinkButton) {
    unlinkButton.style.display = 'none';
  }
  
  
  if (document.queryCommandState('bold')) {
    boldButton.classList.add('active');
  }
  
  if (document.queryCommandState('italic')) {
    italicButton.classList.add('active');
  }
  
  if (document.queryCommandState('underline')) {
    underlineButton.classList.add('active');
  }
  
  
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const parentNode = selection.anchorNode.parentNode;
    const parentTagName = parentNode.tagName ? parentNode.tagName.toLowerCase() : '';
    
    
    if (parentTagName === 'h1' || parentNode.closest('h1')) {
      h1Button.classList.add('active');
    } else if (parentTagName === 'h2' || parentNode.closest('h2')) {
      h2Button.classList.add('active');
    } else if (parentTagName === 'h3' || parentNode.closest('h3')) {
      h3Button.classList.add('active');
    } else if (parentTagName === 'blockquote' || parentNode.closest('blockquote')) {
      quoteButton.classList.add('active');
    }
    
    
    const isLink = parentTagName === 'a' || parentNode.closest('a');
    if (isLink) {
      linkButton.classList.add('active');
      
      
      if (unlinkButton) {
        unlinkButton.style.display = 'inline-block';
      }
    }
  }
}

function positionFormattingPopup() {
  const selection = window.getSelection();
  
  if (selection.toString().trim().length > 0 && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    formattingPopup.style.top = `${rect.top - formattingPopup.offsetHeight - 10}px`;
    formattingPopup.style.left = `${rect.left + (rect.width / 2) - (formattingPopup.offsetWidth / 2)}px`;
  }
}

function formatText(format) {
  const selection = window.getSelection();
  
  if (selection.toString().trim().length === 0 && format !== 'unlink') {
    return;
  }
  
  
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  
  
  const parentNode = selection.anchorNode.parentNode;
  const parentTagName = parentNode.tagName ? parentNode.tagName.toLowerCase() : '';
  const isFormatActive = 
    (format === 'h1' && (parentTagName === 'h1' || parentNode.closest('h1'))) ||
    (format === 'h2' && (parentTagName === 'h2' || parentNode.closest('h2'))) ||
    (format === 'h3' && (parentTagName === 'h3' || parentNode.closest('h3'))) ||
    (format === 'blockquote' && (parentTagName === 'blockquote' || parentNode.closest('blockquote')));
  
  
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
        
        document.execCommand('formatBlock', false, '<p>');
      } else {
        
        document.execCommand('formatBlock', false, `<${format}>`);
      }
      
      setTimeout(() => setDirectionForParagraphs(), 0);
      break;
    case 'blockquote':
      if (isFormatActive) {
        
        document.execCommand('formatBlock', false, '<p>');
      } else {
        
        document.execCommand('formatBlock', false, '<blockquote>');
      }
      
      setTimeout(() => setDirectionForParagraphs(), 0);
      break;
    case 'unlink':
      if (linkNode) {
        document.execCommand('unlink', false, null);
      }
      break;
    case 'link':
      
      let initialUrl = 'https://';
      if (linkNode) {
        initialUrl = linkNode.getAttribute('href') || 'https://';
      }
      
      const url = prompt('Enter URL:', initialUrl);
      if (url) {
        document.execCommand('createLink', false, url);
        
        
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
  
  
  formattingPopup.classList.add('hidden');
  
  
  saveCurrentDocumentContent();
}

function setDirectionForParagraphs() {
  const paragraphs = editor.querySelectorAll('div, p, h1, h2, h3, blockquote');
  
  paragraphs.forEach(p => {
    if (!p.hasAttribute('dir')) {
      p.setAttribute('dir', 'auto');
    }
  });
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

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  
  
  localStorage.setItem('focus_dark_mode', isDarkMode);
  
  
  applyTheme();
  
  
  const themeToggle = document.getElementById('theme-toggle');
  if (isDarkMode) {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
  }
}

function applyTheme() {
  document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  
  
  if (!useCustomBg) {
    
    document.body.style.backgroundImage = '';
  }
  
  
  if (customBackground) {
    const customBgElement = document.getElementById('custom-bg');
    customBgElement.style.backgroundImage = `url(${customBackground})`;
    customBgElement.classList.remove('hidden');
  }
}

function toggleSettings() {
  
  const fontSelect = document.getElementById('font-family-select');
  if (fontSelect.options.length === 0) {
    loadSystemFonts();
  }
  
  
  const themeToggle = document.getElementById('theme-toggle');
  if (isDarkMode) {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
  }
  
  
  updateBackgroundSelection();
  
  
  settingsPopup.classList.toggle('hidden');
}

function loadSystemFonts() {
  const fontSelect = document.getElementById('font-family-select');
  
  
  fontSelect.innerHTML = '';
  
  
  const appFontOption = document.createElement('option');
  appFontOption.value = 'Vazir';
  appFontOption.textContent = 'Vazir (Default)';
  appFontOption.style.fontFamily = 'Vazir';
  
  
  if (fontFamily === 'Vazir') {
    appFontOption.selected = true;
  }
  
  fontSelect.appendChild(appFontOption);
  
  
  const separator = document.createElement('option');
  separator.disabled = true;
  separator.style.borderBottom = '1px solid #ccc';
  separator.textContent = '──────────────';
  fontSelect.appendChild(separator);
  
  
  const defaultFonts = [
    'Arial', 'Brush Script MT', 'Courier New', 'cursive', 'fantasy', 'Garamond', 
    'Georgia', 'Helvetica', 'monospace', 'sans-serif', 'serif', 'system-ui',
    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'
  ];
  
  
  defaultFonts.forEach(font => {
    const option = document.createElement('option');
    option.value = font;
    option.textContent = font;
    option.style.fontFamily = font;
    
    
    if (font === fontFamily) {
      option.selected = true;
    }
    
    fontSelect.appendChild(option);
  });
  
  
  if (window.queryLocalFonts) {
    window.queryLocalFonts().then(fonts => {
      
      const uniqueFonts = new Set();
      
      fonts.forEach(font => {
        
        if (font.fullName.toLowerCase().includes('regular') || 
            font.fullName.toLowerCase().includes('normal')) {
          uniqueFonts.add(font.family);
        }
      });
      
      
      Array.from(uniqueFonts)
        .sort((a, b) => a.localeCompare(b))
        .forEach(font => {
          
          if (!defaultFonts.includes(font) && font !== 'Vazir') {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font;
            option.style.fontFamily = font;
            
            
            if (font === fontFamily) {
              option.selected = true;
            }
            
            fontSelect.appendChild(option);
          }
        });
    }).catch(err => {
      console.error('Error loading system fonts:', err);
    });
  }
}

function applySettings() {
  
  editor.style.fontFamily = fontFamily + ', serif, \'Vazir\''; 
  
  
  document.documentElement.style.setProperty('--base-font-size', fontSize + '%');
  editor.style.fontSize = 'calc(1.2rem * var(--base-font-size) / 100)';
  
  
  
  const baseSize = fontSize / 100;
  document.documentElement.style.setProperty('--h1-font-size', `calc(1.802rem * ${baseSize})`); 
  document.documentElement.style.setProperty('--h2-font-size', `calc(1.602rem * ${baseSize})`); 
  document.documentElement.style.setProperty('--h3-font-size', `calc(1.266rem * ${baseSize})`); 
  document.documentElement.style.setProperty('--div-font-size', `calc(1rem * ${baseSize})`);
  
  
  editor.style.maxWidth = editorWidth + 'px';
  
  
  const headings = editor.querySelectorAll('h1, h2, h3');
  headings.forEach(heading => {
    if (heading.tagName === 'H1') {
      heading.style.fontSize = 'var(--h1-font-size)';
    } else if (heading.tagName === 'H2') {
      heading.style.fontSize = 'var(--h2-font-size)';
    } else if (heading.tagName === 'H3') {
      heading.style.fontSize = 'var(--h3-font-size)';
    }
    
    
    const spans = heading.querySelectorAll('span');
    spans.forEach(span => {
      span.style.fontSize = 'inherit';
    });
  });
  
  
  const blockquotes = editor.querySelectorAll('blockquote');
  blockquotes.forEach(quote => {
    quote.style.fontSize = 'var(--div-font-size)';
    quote.style.lineHeight = '1.5';
    quote.style.paddingLeft = '1em';
    quote.style.borderLeft = '4px solid var(--border-color)';
  });
  
  
  applyBackground();
  updateBackgroundSelection();
}

function applyBackground() {
  if (useCustomBg && customBackground) {
    
    document.body.style.backgroundImage = `url(${customBackground})`;
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
  } else {
    
    document.body.style.backgroundImage = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    
    
    const currentTheme = isDarkMode ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);
  }
}

function updateBackgroundSelection() {
  const defaultBg = document.getElementById('default-bg');
  const customBg = document.getElementById('custom-bg');
  
  if (!defaultBg || !customBg) return;
  
  
  defaultBg.classList.remove('selected');
  customBg.classList.remove('selected');
  
  
  if (useCustomBg && customBackground) {
    customBg.classList.add('selected');
  } else {
    defaultBg.classList.add('selected');
    
    useCustomBg = false;
  }
  
  
  if (customBackground) {
    customBg.classList.remove('hidden');
    customBg.style.backgroundImage = `url(${customBackground})`;
    customBg.style.backgroundSize = 'cover';
    customBg.style.backgroundPosition = 'center center';
  } else {
    customBg.classList.add('hidden');
  }
}

function handleBackgroundUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }
  
  
  const reader = new FileReader();
  reader.onload = function(event) {
    
    const img = new Image();
    img.onload = function() {
      
      const canvas = document.createElement('canvas');
      
      
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      
      canvas.width = width;
      canvas.height = height;
      
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      
      
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      
      try {
        
        localStorage.setItem('focus_custom_background', compressedDataUrl);
        
        
        customBackground = compressedDataUrl;
        
        
        const customBgElement = document.getElementById('custom-bg');
        customBgElement.style.backgroundImage = `url(${customBackground})`;
        customBgElement.classList.remove('hidden');
        
        
        useCustomBg = true;
        localStorage.setItem('focus_use_custom_bg', 'true');
        
        
        updateBackgroundSelection();
        applyBackground();
      } catch (error) {
        
        if (error.name === 'QuotaExceededError') {
          alert('The image is too large to save. Please try a smaller image or clear some browser storage.');
        } else {
          alert('An error occurred: ' + error.message);
        }
        console.error('Error saving background image:', error);
      }
    };
    
    
    img.src = event.target.result;
  };
  
  
  reader.readAsDataURL(file);
  
  
  e.target.value = '';
}

function toggleSound() {
  const soundBtn = document.getElementById('sound-btn');
  const volumePopup = document.getElementById('volume-popup');
  
  
  if (volumePopup.classList.contains('hidden')) {
    volumePopup.classList.remove('hidden');
    
    const btnRect = soundBtn.getBoundingClientRect();
    volumePopup.style.left = (btnRect.right + 115) + 'px';
    volumePopup.style.top = (btnRect.top + 10) + 'px';
  } else {
    volumePopup.classList.add('hidden');
  }
}

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

function createNewDocument() {
  
  const newId = 'doc_' + Date.now();
  
  
  documents[newId] = {
    id: newId,
    title: 'Untitled Document',
    content: '',
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  
  currentDocumentId = newId;
  
  
  saveDocumentsToStorage();
  
  
  loadDocument(newId);
  
  
  editor.focus();
}

function saveCurrentDocumentContent() {
  if (!currentDocumentId) return;
  
  
  const content = editor.innerHTML;
  
  
  let title = 'Untitled Document';
  const firstLine = editor.textContent.trim().split('\n')[0];
  if (firstLine) {
    title = firstLine.substring(0, 20);
  }
  
  
  documents[currentDocumentId].title = title;
  documents[currentDocumentId].content = content;
  documents[currentDocumentId].updated = new Date().toISOString();
  
  
  saveDocumentsToStorage();
}

function saveCurrentDocument() {
  if (!currentDocumentId) return;
  
  
  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved.';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
  }, 1500);
}

function saveDocumentTitle(id, newTitle) {
  if (!id || !documents[id]) return;
  
  
  if (!newTitle.trim()) {
    newTitle = 'Untitled Document';
  }
  
  
  documents[id].title = newTitle;
  documents[id].updated = new Date().toISOString();
  
  
  saveDocumentsToStorage();
}

function saveDocumentsToStorage() {
  localStorage.setItem('focus_documents', JSON.stringify(documents));
  localStorage.setItem('focus_current_document', currentDocumentId);
}

function loadDocument(id) {
  if (!documents[id]) return;
  
  
  currentDocumentId = id;
  
  
  editor.innerHTML = documents[id].content;
  
  
  updateCounter();
  
  
  localStorage.setItem('focus_current_document', currentDocumentId);
}

function toggleDocumentsList() {
  
  updateDocumentsList();
  
  
  listPopup.classList.toggle('hidden');
}

function updateDocumentsList() {
  
  documentsListElement.innerHTML = '';
  
  
  const sortedDocs = Object.values(documents).sort((a, b) => {
    return new Date(b.updated) - new Date(a.updated);
  });
  
  
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
    
    
    let clickTimer = null;
    let preventSingleClick = false;
    
    docTitle.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (preventSingleClick) {
        return;
      }
      
      
      if (docTitle.contentEditable === 'true') {
        return;
      }
      
      
      if (clickTimer === null) {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          if (!preventSingleClick) {
            
            loadDocument(doc.id);
            listPopup.classList.add('hidden');
          }
        }, 300); 
      }
    });
    
    
    docTitle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      
      
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      
      
      preventSingleClick = true;
      
      
      docTitle.contentEditable = true;
      docTitle.focus();
      
      
      const range = document.createRange();
      range.selectNodeContents(docTitle);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    
    
    docTitle.addEventListener('blur', () => {
      saveDocumentTitle(doc.id, docTitle.textContent.trim());
      docTitle.contentEditable = false;
      
      
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
        docTitle.textContent = doc.title; 
        docTitle.contentEditable = false;
        
        
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
    
    
    docItem.addEventListener('click', () => {
      loadDocument(doc.id);
      listPopup.classList.add('hidden');
    });
    
    documentsListElement.appendChild(docItem);
  });
  
  
  if (sortedDocs.length === 0) {
    documentsListElement.innerHTML = '<div class="no-documents">No documents yet</div>';
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function deleteDocument(id) {
  
  delete documents[id];
  
  
  saveDocumentsToStorage();
  
  
  updateDocumentsList();
  
  
  if (id === currentDocumentId) {
    createNewDocument();
  }
}

function downloadCurrentDocument() {
  if (!currentDocumentId) return;
  downloadDocument(currentDocumentId);
}

function downloadDocument(id) {
  if (!documents[id]) return;
  
  const doc = documents[id];
  const markdownContent = convertToMarkdown(doc.content);
  
  
  const firstLine = markdownContent.split('\n')[0].replace(/^#\s+/, '').trim();
  const fileName = firstLine && firstLine.length > 0 ? 
    `${firstLine.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` : 
    `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  
  
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

function downloadAllDocuments() {
  
  if (typeof JSZip === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
      
      createAndDownloadZip();
    };
    document.head.appendChild(script);
  } else {
    
    createAndDownloadZip();
  }
}

function createAndDownloadZip() {
  const zip = new JSZip();
  const docs = Object.values(documents);
  
  
  docs.forEach(doc => {
    
    const content = doc.content;
    
    const markdown = convertToMarkdown(content);
    
    const firstLine = markdown.split('\n')[0].replace(/^#\s+/, '').trim();
    const fileName = firstLine && firstLine.length > 0 ? 
      `${firstLine}.md` : 
      `${doc.title}.md`;
    
    
    zip.file(fileName, markdown);
  });
  
  
  zip.generateAsync({type: 'blob'}).then(blob => {
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focus-writings.zip';
    document.body.appendChild(a);
    a.click();
    
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });
}

function convertToMarkdown(html) {
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  
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

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    
    
    const newId = 'doc_' + Date.now();
    const fileName = file.name.replace(/\.[^/.]+$/, "");
    
    
    let htmlContent = '';
    if (file.name.endsWith('.md')) {
      htmlContent = convertMarkdownToHtml(content);
    } else {
      
      htmlContent = `<p dir="auto">${content.replace(/\n/g, '</p><p dir="auto">')}</p>`;
    }
    
    
    documents[newId] = {
      id: newId,
      title: fileName,
      content: htmlContent,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    
    currentDocumentId = newId;
    saveDocumentsToStorage();
    
    
    loadDocument(newId);
  };
  
  reader.readAsText(file);
  
  
  fileInput.value = '';
}

function convertMarkdownToHtml(markdown) {
  let html = markdown;
  
  
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
  
  
  html = html.replace(/^# (.*$)/gm, '<h1 dir="auto">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 dir="auto">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 dir="auto">$1</h3>');
  
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  
  html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  
  
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  
  html = html.replace(/^> (.*$)/gm, '<blockquote dir="auto">$1</blockquote>');
  
  
  html = html.replace(/^(?!<h|<blockquote|<img)(.*$)/gm, function(match) {
    if (match.trim() === '') return '';
    return '<p dir="auto">' + match + '</p>';
  });
  
  return html;
}

function updateCounter() {
  const text = editor.textContent;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  
  
  const paragraphText = editor.innerText.trim();
  const paragraphCount = paragraphText === '' ? 0 : paragraphText.split(/\n\s*\n+/).length;
  
  counter.textContent = `${wordCount} words, ${paragraphCount} paragraphs`;
}

function handleShortcuts(e) {
  
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveCurrentDocument();
  }
  
  
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    createNewDocument();
  }
}

function initBootstrapTooltips() {
  
  if (typeof bootstrap === 'undefined') {
    console.warn('Bootstrap library not loaded, skipping tooltip initialization');
    return;
  }
  
  try {
    
    const elementsWithTitle = document.querySelectorAll('[title]');
    elementsWithTitle.forEach(el => {
      const title = el.getAttribute('title');
      if (title) {
        el.removeAttribute('title');
        el.setAttribute('data-bs-toggle', 'tooltip');
        el.setAttribute('data-bs-title', title);
      }
    });
    
    
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

function updateFontSizeLabel() {
  const fontSizeLabel = document.getElementById('font-size-value');
  if (fontSize === 120) {
    fontSizeLabel.textContent = '120% (Default)';
  } else {
    fontSizeLabel.textContent = fontSize + '%';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});