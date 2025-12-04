const detectedCountEl = document.getElementById('detectedCount');
const statusTextEl = document.getElementById('statusText');
const detectionsListEl = document.getElementById('detectionsList');
const resetBtn = document.getElementById('resetBtn');
const openLinkedInBtn = document.getElementById('openLinkedInBtn');

const startAutoScanBtn = document.getElementById('startAutoScan');
const stopAutoScanBtn = document.getElementById('stopAutoScan');
const scanProgressEl = document.getElementById('scanProgress');
const progressBarEl = document.getElementById('progressBar');
const currentKeywordEl = document.getElementById('currentKeyword');

async function init() {
    console.log('🚀 Popup initialized');

    await loadStats();

    await updateScanStatus();

    setupEventListeners();
}

async function loadStats() {
    try {
        const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

        console.log('📊 Stats loaded:', stats);

        if (detectedCountEl) {
            detectedCountEl.textContent = stats.detectedCount || 0;
        }

        const statusDot = document.querySelector('.status-dot');
        if (statusTextEl && stats.enabled) {
            statusTextEl.textContent = 'Active';
            if (statusDot) statusDot.classList.add('active');
        } else if (statusTextEl) {
            statusTextEl.textContent = 'Inactive';
            if (statusDot) statusDot.classList.remove('active');
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function updateScanStatus() {
    try {
        const status = await chrome.runtime.sendMessage({ type: 'GET_SCAN_STATUS' });

        if (status.isScanning) {
            if (startAutoScanBtn) startAutoScanBtn.classList.add('hidden');
            if (stopAutoScanBtn) stopAutoScanBtn.classList.remove('hidden');
            if (scanProgressEl) scanProgressEl.classList.remove('hidden');

            if (currentKeywordEl) currentKeywordEl.textContent = status.currentKeyword;
            if (progressBarEl && status.progress) {
                const [current, total] = status.progress.split('/');
                const percentage = (parseInt(current) / parseInt(total)) * 100;
                progressBarEl.style.width = `${percentage}%`;
            }

            if (statusTextEl) statusTextEl.textContent = 'Scanning...';
            const statusDot = document.querySelector('.status-dot');
            if (statusDot) statusDot.style.animation = 'pulse 1s infinite';
        } else {
            if (startAutoScanBtn) startAutoScanBtn.classList.remove('hidden');
            if (stopAutoScanBtn) stopAutoScanBtn.classList.add('hidden');
            if (scanProgressEl) scanProgressEl.classList.add('hidden');
            if (statusTextEl) statusTextEl.textContent = 'Active';
            const statusDot = document.querySelector('.status-dot');
            if (statusDot) statusDot.style.animation = 'pulse 2s infinite';
        }

        if (status.collectedPosts && status.collectedPosts.length > 0) {
            displayDetections(status.collectedPosts);
            if (detectedCountEl) detectedCountEl.textContent = status.collectedCount;
        } else {
            const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
            displayDetections(stats.recentDetections || []);
        }

    } catch (error) {
        console.error('Error updating scan status:', error);
    }
}

/**
 * Display detections in the UI
 * @param {Array} detections - Array of detection objects
 */
function displayDetections(detections) {
    if (!detections || detections.length === 0) {
        detectionsListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <p>No hiring posts detected yet</p>
                <p class="sub-text">Start Auto-Search to find leads</p>
            </div>
        `;
        return;
    }

    const itemsHTML = detections.slice(0, 50).map(detection => {
        const timeAgo = getTimeAgo(detection.timestamp);
        const authorName = detection.authorName || 'Unknown Author';
        const preview = detection.preview || 'No preview available';
        const profileUrl = detection.profileUrl || '#';
        const postUrl = detection.postUrl || '#';

        return `
            <div class="detection-item">
                <div class="detection-header">
                    <span class="detection-author">${escapeHtml(authorName)}</span>
                    <span class="detection-time">${timeAgo}</span>
                </div>
                <div class="detection-preview">${escapeHtml(preview)}</div>
                <div class="detection-actions">
                    <a href="${profileUrl}" target="_blank" class="view-btn view-profile-btn">View Profile</a>
                    <a href="${postUrl}" target="_blank" class="view-btn view-post-btn">View Post</a>
                </div>
            </div>
        `;
    }).join('');

    detectionsListEl.innerHTML = itemsHTML;
}

function setupEventListeners() {
    // Settings Elements
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const apiKeyInput = document.getElementById('api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const apiStatus = document.getElementById('api-status');
    const aiEnabledCheckbox = document.getElementById('ai-enabled');

    // Load saved settings
    chrome.storage.sync.get(['geminiApiKey', 'aiEnabled'], (result) => {
        if (result.geminiApiKey) {
            if (apiKeyInput) apiKeyInput.value = result.geminiApiKey;
            if (apiStatus) {
                apiStatus.textContent = 'API Key saved';
                apiStatus.className = 'status-msg success';
            }
        } else {
            // Set default API key
            const defaultKey = 'AIzaSyBpCXbOB5UzuqpgPlVkj0f-Cj3DNoM5oh0';
            if (apiKeyInput) apiKeyInput.value = defaultKey;
            chrome.storage.sync.set({ geminiApiKey: defaultKey }, () => {
                if (apiStatus) {
                    apiStatus.textContent = 'Using default API Key';
                    apiStatus.className = 'status-msg success';
                }
            });
        }
        if (aiEnabledCheckbox) aiEnabledCheckbox.checked = result.aiEnabled !== false;
    });

    // Toggle Settings Panel
    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });
    }

    // Save API Key
    if (saveApiKeyBtn && apiKeyInput && apiStatus) {
        saveApiKeyBtn.addEventListener('click', () => {
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                apiStatus.textContent = 'Please enter a valid API Key';
                apiStatus.className = 'status-msg error';
                return;
            }

            chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
                apiStatus.textContent = 'API Key saved successfully!';
                apiStatus.className = 'status-msg success';
                setTimeout(() => {
                    apiStatus.textContent = 'API Key saved';
                }, 2000);
            });
        });
    }

    // Toggle AI Enabled
    if (aiEnabledCheckbox) {
        aiEnabledCheckbox.addEventListener('change', (e) => {
            chrome.storage.sync.set({ aiEnabled: e.target.checked });
        });
    }

    if (startAutoScanBtn) {
        startAutoScanBtn.addEventListener('click', async () => {
            try {
                await chrome.runtime.sendMessage({ type: 'START_AUTO_SCAN' });
                await updateScanStatus();
            } catch (error) {
                console.error('Error starting scan:', error);
            }
        });
    }

    if (stopAutoScanBtn) {
        stopAutoScanBtn.addEventListener('click', async () => {
            try {
                await chrome.runtime.sendMessage({ type: 'STOP_AUTO_SCAN' });
                await updateScanStatus();
            } catch (error) {
                console.error('Error stopping scan:', error);
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all statistics?')) {
                try {
                    await chrome.runtime.sendMessage({ type: 'RESET_STATS' });
                    await loadStats();
                    await updateScanStatus();
                } catch (error) {
                    console.error('Error resetting stats:', error);
                }
            }
        });
    }

    const manualScanBtn = document.getElementById('manualScanBtn');
    if (manualScanBtn) {
        manualScanBtn.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.url && tab.url.includes('linkedin.com')) {
                    await chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_SCAN' });
                    manualScanBtn.textContent = '✓ Scanning...';
                    setTimeout(() => {
                        manualScanBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            Scan Current Page
                        `;
                    }, 2000);
                    await loadStats();
                } else {
                    alert('Please navigate to LinkedIn first');
                }
            } catch (error) {
                console.error('Error triggering manual scan:', error);
            }
        });
    }

    if (openLinkedInBtn) {
        openLinkedInBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
        });
    }
}

/**
 * Calculate time ago from timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Human-readable time ago string
 */
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

setInterval(() => {
    updateScanStatus();
}, 2000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
