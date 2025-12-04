const HIRING_KEYWORDS = [
  // Developer/Engineer
  "hiring developer",
  "looking for developer",
  "need a developer",
  "need developer",
  "seeking developer",
  "freelance developer",
  "software engineer needed",
  "hiring software engineer",
  "looking for programmer",
  "need programmer",

  // Website/Web Development
  "build my website",
  "build a website",
  "need a website",
  "website developer",
  "web developer needed",
  "looking for web developer",
  "website development",
  "need website built",
  "looking to build website",
  "website redesign",

  // App Development
  "looking for app developer",
  "need app developer",
  "mobile app developer",
  "app development",
  "build my app",
  "build an app",
  "looking to build app",

  // Agency/Team
  "looking for agency",
  "need an agency",
  "software agency",
  "development agency",
  "web development agency",
  "looking for team",
  "need a team",

  // Project/Services
  "software project",
  "development project",
  "looking for services",
  "development services",
  "custom development",
  "looking for help with",
  "need help building",
  "who can build",
  "anyone build",
  "recommendations for developer",
  "recommend a developer",

  // Specific Tech
  "react developer",
  "nodejs developer",
  "python developer",
  "fullstack developer",
  "full stack developer",
  "frontend developer",
  "backend developer"
];

const processedPosts = new Set();

/**
 * Check if text contains any hiring keywords
 * @param {string} text - Text to search
 * @returns {boolean} - True if any keyword is found
 */
function containsHiringKeywords(text) {
  if (!text) return false;

  const lowerText = text.toLowerCase();
  return HIRING_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract the author's profile URL from a post element
 * @param {Element} postElement - The LinkedIn post DOM element
 * @returns {string|null} - Profile URL or null if not found
 */
function getAuthorProfileUrl(postElement) {
  const authorLink = postElement.querySelector('a[href*="/in/"]');
  if (authorLink) {
    const href = authorLink.getAttribute('href');
    const cleanUrl = href.split('?')[0];
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }

    return `https://www.linkedin.com${cleanUrl}`;
  }
  return null;
}

/**
 * Extract the author's name from a post element
 * @param {Element} postElement - The LinkedIn post DOM element
 * @returns {string|null} - Author name or null if not found
 */
function getAuthorName(postElement) {
  const nameSelectors = [
    '.update-components-actor__name',
    '.feed-shared-actor__name',
    'span[dir="ltr"] span[aria-hidden="true"]'
  ];

  for (const selector of nameSelectors) {
    const nameElement = postElement.querySelector(selector);
    if (nameElement && nameElement.textContent.trim()) {
      return nameElement.textContent.trim();
    }
  }

  return null;
}

/**
 * Get all text content from a post element
 * @param {Element} postElement - The LinkedIn post DOM element
 * @returns {string} - Combined text content
 */
function getPostText(postElement) {
  // Method 1: Try to find the main text container directly
  const textContainers = [
    '.feed-shared-update-v2__description',
    '.feed-shared-text',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-update-v2__commentary',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.update-components-text'
  ];

  for (const selector of textContainers) {
    const container = postElement.querySelector(selector);
    if (container) {
      const text = container.innerText || container.textContent;
      if (text && text.trim().length > 20) {
        console.log('✅ Text extracted using selector:', selector);
        return cleanText(text);
      }
    }
  }

  // Method 2: Recursive text extraction (original method)
  const textNodes = [];
  const uiKeywords = ['like', 'comment', 'repost', 'send', 'share', 'follow', 'connect', 'ago', 'hr', 'min', 'sec', 'day', 'week', 'month', 'reactions', 'comments'];

  function getTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text.length > 3 && !uiKeywords.some(kw => text.toLowerCase() === kw)) {
        textNodes.push(text);
      }
    } else {
      const tagName = node.tagName?.toLowerCase();
      if (tagName === 'button' || tagName === 'script' || tagName === 'style') {
        return;
      }

      for (let child of node.childNodes) {
        getTextNodes(child);
      }
    }
  }

  getTextNodes(postElement);
  let extractedText = textNodes.join(' ').trim();

  if (extractedText && extractedText.length > 20) {
    console.log('✅ Text extracted using recursive method');
    return cleanText(extractedText);
  }

  // Method 3: Fallback - just get all text
  const fallbackText = postElement.innerText || postElement.textContent || '';
  console.log('⚠️ Using fallback text extraction');
  return cleanText(fallbackText);
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\d+\s*(reactions?|comments?|reposts?)/gi, '')
    .replace(/Like|Comment|Repost|Send|Share|Follow|Connect|ago|•/gi, '')
    .replace(/\d+\s*(hr|min|sec|day|week|month)/gi, '')
    .trim();
}

/**
 * Extract the post URL from a post element
 * @param {Element} postElement - The LinkedIn post DOM element
 * @returns {string|null} - Post URL or null if not found
 */
function getPostUrl(postElement) {
  // Method 1: Construct from data-urn (Most reliable)
  const urn = postElement.getAttribute('data-urn') || postElement.getAttribute('data-id');
  if (urn) {
    // Handle various URN types
    if (urn.includes('activity:')) {
      const activityId = urn.split('activity:')[1];
      return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    } else if (urn.includes('share:')) {
      const shareId = urn.split('share:')[1];
      return `https://www.linkedin.com/feed/update/urn:li:share:${shareId}/`;
    } else if (urn.includes('ugcPost:')) {
      const ugcPostId = urn.split('ugcPost:')[1];
      return `https://www.linkedin.com/feed/update/urn:li:ugcPost:${ugcPostId}/`;
    }
  }

  // Method 2: Try to find the timestamp link (usually points to the post)
  const timestampLink = postElement.querySelector('a.app-aware-link[href*="/activity/"], a.app-aware-link[href*="/feed/update/"], a.feed-shared-mini-update-v2__link-to-detail');
  if (timestampLink) {
    const href = timestampLink.getAttribute('href');
    const cleanUrl = href.split('?')[0];
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }
    return `https://www.linkedin.com${cleanUrl}`;
  }

  return null;
}

/**
 * Create and inject a "Message" button into a detected post
 * @param {Element} postElement - The LinkedIn post DOM element
 * @param {string} profileUrl - Author's profile URL
 * @param {string} authorName - Author's name
 */
function injectMessageButton(postElement, profileUrl, authorName) {
  if (postElement.querySelector('.job-scanner-message-btn')) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'job-scanner-button-container';

  const messageButton = document.createElement('button');
  messageButton.className = 'job-scanner-message-btn';
  messageButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <span>Message ${authorName || 'Author'}</span>
  `;

  messageButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const messagingUrl = `${profileUrl}?msgOverlay=true`;
    window.open(messagingUrl, '_blank');
  });

  buttonContainer.appendChild(messageButton);

  const actionsBar = postElement.querySelector('.feed-shared-social-actions') ||
    postElement.querySelector('.social-details-social-activity');

  if (actionsBar) {
    actionsBar.parentNode.insertBefore(buttonContainer, actionsBar.nextSibling);
  } else {
    postElement.appendChild(buttonContainer);
  }
}

/**
 * Highlight a post that contains hiring keywords
 * @param {Element} postElement - The LinkedIn post DOM element
 */
function highlightPost(postElement) {
  postElement.classList.add('job-scanner-highlighted');

  if (!postElement.querySelector('.job-scanner-badge')) {
    const badge = document.createElement('div');
    badge.className = 'job-scanner-badge';
    badge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 16v-4"></path>
        <path d="M12 8h.01"></path>
      </svg>
      <span>Hiring Opportunity</span>
    `;

    const postContainer = postElement.querySelector('.feed-shared-update-v2__description-wrapper') ||
      postElement.querySelector('.feed-shared-text') ||
      postElement;

    postContainer.insertBefore(badge, postContainer.firstChild);
  }
}

/**
 * Process a single LinkedIn post to check for hiring keywords
 * @param {Element} postElement - The LinkedIn post DOM element
 */
async function processPost(postElement) {
  const postId = postElement.getAttribute('data-urn') ||
    postElement.getAttribute('data-id') ||
    postElement.innerHTML.substring(0, 100);

  if (processedPosts.has(postId)) {
    return;
  }

  processedPosts.add(postId);

  const postText = getPostText(postElement);

  if (!postText || postText.length < 20) {
    console.log('⚠️ Post text too short, skipping');
    return;
  }

  console.log('📝 Post text extracted (length: ' + postText.length + '):', postText.substring(0, 150) + (postText.length > 150 ? '...' : ''));

  const hasKeywords = containsHiringKeywords(postText);
  console.log('🔍 Contains hiring keywords:', hasKeywords);

  if (hasKeywords) {
    console.log('🎯 FOUND HIRING POST! Text:', postText.substring(0, 200) + '...');

    const profileUrl = getAuthorProfileUrl(postElement);
    const authorName = getAuthorName(postElement);
    const postUrl = getPostUrl(postElement);

    console.log('👤 Author:', authorName);
    console.log('🔗 Profile URL:', profileUrl);
    console.log('📍 Post URL:', postUrl);

    highlightPost(postElement);

    if (profileUrl) {
      injectMessageButton(postElement, profileUrl, authorName);
    }

    try {
      await chrome.runtime.sendMessage({
        type: 'POST_DETECTED',
        data: {
          id: postId,
          authorName,
          profileUrl,
          postUrl,
          preview: postText.substring(0, 200),
          fullText: postText
        }
      });
      console.log('✅ Post reported to background');
    } catch (error) {
      console.error('❌ Error sending message to background:', error);
    }
  }
}

async function scanPosts() {
  console.log('🔍 ========== Starting scan ==========');
  console.log('📍 URL:', window.location.href);
  console.log('🔑 Loaded keywords:', HIRING_KEYWORDS.length);

  const postSelectors = [
    '.feed-shared-update-v2',
    'div[data-urn*="urn:li:activity"]',
    '.occludable-update',
    'div.feed-shared-update-v2__description-wrapper',
    'article',
    '[data-id^="urn:li:activity"]'
  ];

  let posts = [];
  let usedSelector = '';

  for (const selector of postSelectors) {
    const foundPosts = document.querySelectorAll(selector);
    console.log(`🔎 Trying selector "${selector}": found ${foundPosts.length} elements`);

    if (foundPosts.length > 0) {
      posts = Array.from(foundPosts);
      usedSelector = selector;
      break;
    }
  }

  if (posts.length === 0) {
    console.warn('⚠️ No posts found with any selector. Trying fallback...');

    const allDivs = document.querySelectorAll('div');
    posts = Array.from(allDivs).filter(div => {
      const hasContent = div.querySelector('.feed-shared-text, .feed-shared-inline-show-more-text');
      const hasAuthor = div.querySelector('a[href*="/in/"]');
      return hasContent && hasAuthor;
    });

    console.log(`🔎 Fallback found ${posts.length} potential posts`);
  }

  console.log(`📊 Scanning ${posts.length} posts using selector: "${usedSelector || 'fallback'}"...`);

  if (posts.length === 0) {
    console.error('❌ No posts found! LinkedIn structure may have changed.');
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Page title:', document.title);
    return;
  }

  // Process each post
  let processedCount = 0;
  let detectedCount = 0;
  for (const post of posts) {
    try {
      const result = await processPost(post);
      processedCount++;
    } catch (error) {
      console.error('Error processing post:', error);
    }
  }

  console.log(`✅ Scan complete! Processed ${processedCount} posts`);
  console.log('========================================');
}

function setupMutationObserver() {
  const feedContainer = document.querySelector('.scaffold-layout__list') ||
    document.querySelector('main') ||
    document.body;

  if (!feedContainer) {
    console.warn('⚠️ Could not find feed container');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('.feed-shared-update-v2') ||
              node.querySelector('.feed-shared-update-v2')) {
              shouldScan = true;
              break;
            }
          }
        }
      }

      if (shouldScan) break;
    }

    if (shouldScan) {
      console.log('🔄 New content detected, scanning...');
      scanPosts().catch(err => console.error('Scan error:', err));
    }
  });

  observer.observe(feedContainer, {
    childList: true,
    subtree: true
  });

  console.log('👀 MutationObserver active - monitoring for new posts');
}

function isSearchPage() {
  return window.location.href.includes('/search/results/');
}

async function autoScroll() {
  console.log('📜 Auto-scrolling to load results...');

  for (let i = 0; i < 5; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  window.scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function collectAndReportPosts() {
  console.log('🔍 Collecting search results...');
  scanPosts();

  const posts = [];
  const postElements = document.querySelectorAll('.feed-shared-update-v2, .occludable-update, article');

  postElements.forEach(post => {
    const text = getPostText(post);
    const authorName = getAuthorName(post);
    const profileUrl = getAuthorProfileUrl(post);
    const postUrl = getPostUrl(post);
    const id = post.getAttribute('data-urn') || post.getAttribute('data-id');

    if (containsHiringKeywords(text)) {
      posts.push({
        id,
        authorName,
        profileUrl,
        postUrl,
        preview: text.substring(0, 200),
        fullText: text,
        timestamp: Date.now()
      });
    }
  });

  console.log(`📤 Reporting ${posts.length} posts to background`);

  chrome.runtime.sendMessage({
    type: 'SCAN_BATCH_COMPLETE',
    data: { posts }
  });
}

async function handleSearchPage() {
  console.log('🤖 Active search mode detected');

  await new Promise(resolve => setTimeout(resolve, 3000));

  await autoScroll();

  await collectAndReportPosts();
}

async function init() {
  console.log('🚀 LinkedIn Job Post Scanner initialized');
  console.log('📍 Current URL:', window.location.href);
  console.log('📍 Page title:', document.title);
  console.log('🔑 Total keywords loaded:', HIRING_KEYWORDS.length);

  if (isSearchPage()) {
    await handleSearchPage();
    return;
  }

  setTimeout(async () => {
    console.log('⏰ Starting initial scan after delay...');
    await scanPosts();

    setupMutationObserver();
  }, 2000);

  setInterval(async () => {
    await scanPosts();
  }, 5000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message);

  if (message.type === 'MANUAL_SCAN') {
    console.log('🔄 Manual scan triggered');
    scanPosts().then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error('Manual scan error:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }

  return true;
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
