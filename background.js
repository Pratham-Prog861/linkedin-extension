/**
 * LinkedIn Job Post Scanner - Background Service Worker
 * Handles extension lifecycle events and message passing
 */

// ============================================================================
// INSTALLATION & UPDATES
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('🎉 LinkedIn Job Post Scanner installed!');

        // Set default settings
        chrome.storage.sync.set({
            enabled: true,
            detectedCount: 0,
            customKeywords: []
        });

    } else if (details.reason === 'update') {
        console.log('🔄 LinkedIn Job Post Scanner updated to version', chrome.runtime.getManifest().version);
    }

    // Create context menu items
    chrome.contextMenus.create({
        id: 'scan-now',
        title: 'Scan for hiring posts',
        contexts: ['page'],
        documentUrlPatterns: ['https://www.linkedin.com/*']
    });
});

// ============================================================================
// AUTO-SCAN ORCHESTRATION
// ============================================================================

const SEARCH_KEYWORDS = [
    "looking for developer",
    "hiring developer",
    "need a developer",
    "build my website",
    "looking for agency",
    "freelance developer needed",
    "software engineer needed",
    "looking for web developer",
    "need app developer",
    "hiring react developer",
    "website development needed",
    "looking for programmer",
    "need a website built",
    "mobile app developer needed",
    "fullstack developer needed",
    "looking for software agency",
    "web development services needed",
    "need help building app",
    "who can build my website",
    "recommendations for developer"
];


/**
 * AI Service for analyzing posts using Gemini
 */
let DEFAULT_API_KEY = '';
chrome.storage.sync.get(['geminiApiKey'], (result) => {
    DEFAULT_API_KEY = result.geminiApiKey || '';
});

const AiService = {
    async analyzePost(text, apiKey) {
        // Use provided API key, fallback to default if not provided
        const key = apiKey || DEFAULT_API_KEY;
        if (!key) return { isHiring: true, confidence: 0, summary: 'AI analysis disabled (no key)' };

        const prompt = `
        Analyze this LinkedIn post and determine if it is a HIRING OPPORTUNITY where the author is looking to hire someone (freelancer, employee, agency).
        Ignore posts where the author is looking for a job themselves.
        
        Post Text: "${text.substring(0, 1000)}"
        
        Respond ONLY with a valid JSON object in this format:
        {
            "isHiring": boolean,
            "confidence": number (0-1),
            "role": "string (extracted role)",
            "summary": "string (brief summary of opportunity)"
        }
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Gemini 2.5-flash not found, falling back to 1.5-flash');
                    return this.analyzePostFallback(text, key);
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const resultText = data.candidates[0].content.parts[0].text;

            // Clean markdown code blocks if present
            const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error('AI Analysis failed:', error);
            return { isHiring: true, confidence: 0, summary: 'AI analysis failed' }; // Fail open
        }
    },

    async analyzePostFallback(text, apiKey) {
        // Fallback implementation using 1.5-flash
        const prompt = `
        Analyze this LinkedIn post and determine if it is a HIRING OPPORTUNITY where the author is looking to hire someone.
        Post Text: "${text.substring(0, 1000)}"
        Respond ONLY with a valid JSON object: { "isHiring": boolean, "confidence": number, "role": "string", "summary": "string" }
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            const resultText = data.candidates[0].content.parts[0].text;
            const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            return { isHiring: true, confidence: 0, summary: 'Fallback failed' };
        }
    }
};

let scanState = {
    isScanning: false,
    currentKeywordIndex: 0,
    collectedPosts: [],
    scanTabId: null
};

let lastScanTime = 0;
let lastScanIndex = -1;

/**
 * Start the auto-scan process
 */
async function startAutoScan() {
    console.log('🚀 Starting auto-scan...');

    // Reset state
    scanState = {
        isScanning: true,
        currentKeywordIndex: 0,
        collectedPosts: [],
        scanTabId: null
    };

    // Open LinkedIn in a new tab or use existing
    const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
    if (tabs.length > 0) {
        scanState.scanTabId = tabs[0].id;
        chrome.tabs.update(scanState.scanTabId, { active: true });
    } else {
        const tab = await chrome.tabs.create({ url: 'https://www.linkedin.com' });
        scanState.scanTabId = tab.id;
    }

    // Start searching for the first keyword
    scanNextKeyword();
}

/**
 * Navigate to search page for the current keyword
 */
function scanNextKeyword() {
    if (!scanState.isScanning) return;

    if (scanState.currentKeywordIndex >= SEARCH_KEYWORDS.length) {
        finishAutoScan();
        return;
    }

    // Loop protection: Prevent scanning the same keyword too quickly
    const now = Date.now();
    if (scanState.currentKeywordIndex === lastScanIndex && (now - lastScanTime < 5000)) {
        console.warn('⚠️ Loop detected: Attempted to scan same keyword too quickly. Skipping.');
        return;
    }

    lastScanTime = now;
    lastScanIndex = scanState.currentKeywordIndex;

    const keyword = SEARCH_KEYWORDS[scanState.currentKeywordIndex];
    console.log(`🔍 Scanning keyword [${scanState.currentKeywordIndex + 1}/${SEARCH_KEYWORDS.length}]: "${keyword}"`);

    // Construct search URL (sorted by latest)
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}&origin=GLOBAL_SEARCH_HEADER&sortBy="date_posted"`;

    chrome.tabs.update(scanState.scanTabId, { url: searchUrl }, () => {
        console.log('📄 Navigated to search URL. Waiting for content script...');
    });
}

/**
 * Finish the auto-scan process
 */
function finishAutoScan() {
    console.log('✅ Auto-scan complete!');
    scanState.isScanning = false;

    // Notify popup if open
    chrome.runtime.sendMessage({
        type: 'SCAN_COMPLETE',
        data: { count: scanState.collectedPosts.length }
    }).catch(() => { }); // Ignore error if popup is closed
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Received message:', message);

    switch (message.type) {
        case 'START_AUTO_SCAN':
            startAutoScan();
            sendResponse({ success: true });
            break;

        case 'STOP_AUTO_SCAN':
            scanState.isScanning = false;
            sendResponse({ success: true });
            break;

        case 'GET_SCAN_STATUS':
            sendResponse({
                isScanning: scanState.isScanning,
                currentKeyword: SEARCH_KEYWORDS[scanState.currentKeywordIndex],
                progress: `${scanState.currentKeywordIndex}/${SEARCH_KEYWORDS.length}`,
                collectedCount: scanState.collectedPosts.length,
                collectedPosts: scanState.collectedPosts
            });
            break;

        case 'SCAN_BATCH_COMPLETE':
            if (scanState.isScanning) {
                // Add new unique posts
                const newPosts = message.data.posts || [];
                newPosts.forEach(post => {
                    if (!scanState.collectedPosts.some(p => p.id === post.id)) {
                        scanState.collectedPosts.push(post);
                    }
                });

                // Move to next keyword
                scanState.currentKeywordIndex++;

                // Add a small delay before next search to be safe
                setTimeout(scanNextKeyword, 3000);
            }
            break;

        case 'POST_DETECTED':
            handlePostDetected(message.data);
            break;

        case 'GET_STATS':
            getStats().then(sendResponse);
            return true; // Keep channel open for async response

        case 'RESET_STATS':
            resetStats().then(sendResponse);
            return true;

        default:
            console.warn('Unknown message type:', message.type);
    }
});


/**
 * Handle post detection from content script
 * @param {Object} postData - Detected post data
 */
async function handlePostDetected(postData) {
    console.log('📬 Post detected:', postData);

    // Increment detection count
    const { detectedCount = 0 } = await chrome.storage.sync.get(['detectedCount']);
    const newCount = detectedCount + 1;
    await chrome.storage.sync.set({ detectedCount: newCount });

    // Add to recent detections (keep last 50)
    const { recentDetections = [] } = await chrome.storage.local.get(['recentDetections']);
    const updated = [{ ...postData, timestamp: Date.now() }, ...recentDetections].slice(0, 50);
    await chrome.storage.local.set({ recentDetections: updated });

    // Update badge
    chrome.action.setBadgeText({ text: newCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#0a66c2' });

    console.log('✅ Detection recorded. Total count:', newCount);
}

/**
 * Get extension statistics
 * @returns {Promise<Object>} - Stats object
 */
async function getStats() {
    const syncData = await chrome.storage.sync.get(['detectedCount', 'enabled']);
    const localData = await chrome.storage.local.get(['recentDetections']);

    return {
        detectedCount: syncData.detectedCount || 0,
        enabled: syncData.enabled !== false,
        recentDetections: localData.recentDetections || []
    };
}

/**
 * Reset statistics
 */
async function resetStats() {
    await chrome.storage.sync.set({ detectedCount: 0 });
    await chrome.storage.local.set({ recentDetections: [] });
    chrome.action.setBadgeText({ text: '' });

    return { success: true };
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

/**
 * Reset badge when navigating away from LinkedIn
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // If not on LinkedIn, clear badge
        if (!tab.url.includes('linkedin.com')) {
            chrome.action.setBadgeText({ text: '', tabId });
        }
    }
});

// ============================================================================
// CONTEXT MENU
// ============================================================================

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'scan-now') {
        // Send message to content script to re-scan
        chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_SCAN' });
    }
});

console.log('🚀 Background service worker initialized');
