# LinkedIn Job Post Scanner

A Chrome extension that automatically scans LinkedIn posts for hiring opportunities and helps you connect with potential clients.

## 🎯 Features

- **Automatic Keyword Detection**: Scans LinkedIn posts for hiring-related keywords like "looking for agency," "developer needed," "hiring developer," etc.
- **Visual Highlighting**: Detected posts are highlighted with a distinctive border and badge for easy recognition
- **Quick Messaging**: Adds a "Message" button to detected posts for instant communication with post authors
- **Real-time Monitoring**: Uses MutationObserver to continuously scan new posts as you scroll
- **Statistics Tracking**: Keep track of how many hiring opportunities you've found
- **Privacy-Focused**: No LinkedIn API usage - only DOM parsing, ensuring your account stays safe

## 📦 Installation

### From Source (Developer Mode)

1. **Clone or Download** this repository to your local machine

2. **Open Chrome Extensions Page**

   - Navigate to `chrome://extensions/`
   - Or click Menu → More Tools → Extensions

3. **Enable Developer Mode**

   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**

   - Click "Load unpacked"
   - Select the `linkedin-extension` folder

5. **Verify Installation**
   - You should see the LinkedIn Job Post Scanner icon in your extensions
   - Pin it to your toolbar for easy access

## 🚀 Usage

1. **Visit LinkedIn**

   - Navigate to [linkedin.com/feed](https://www.linkedin.com/feed/)
   - The extension will automatically start scanning posts

2. **Identify Opportunities**

   - Posts containing hiring keywords will be highlighted with a blue border
   - A "Hiring Opportunity" badge will appear at the top of detected posts

3. **Connect with Clients**

   - Click the "Message" button on any detected post
   - LinkedIn's messaging window will open, targeting the post author

4. **Track Your Progress**
   - Click the extension icon to view statistics
   - See how many hiring posts you've discovered
   - View recent detections with timestamps

## 🔧 How It Works

### Content Script (`content.js`)

- Scans all posts on the LinkedIn feed
- Checks post content against a comprehensive list of hiring keywords
- Highlights matching posts and injects UI elements
- Uses MutationObserver to monitor for new posts during scrolling

### Background Service Worker (`background.js`)

- Manages extension lifecycle and settings
- Tracks statistics (detected posts count)
- Handles message passing between components
- Updates extension badge with detection count

### Popup Interface (`popup.html/js/css`)

- Displays statistics and recent detections
- Provides quick access to LinkedIn
- Allows resetting statistics

## 🎨 Customization

### Adding Custom Keywords

Edit the `HIRING_KEYWORDS` array in `content.js`:

```javascript
const HIRING_KEYWORDS = [
  "looking for agency",
  "developer needed",
  // Add your custom keywords here
  "your custom keyword",
];
```

### Styling

Modify `styles.css` to customize the appearance of:

- Highlighted posts (`.job-scanner-highlighted`)
- Hiring opportunity badge (`.job-scanner-badge`)
- Message button (`.job-scanner-message-btn`)

## 📋 Detected Keywords

The extension currently detects these phrases (case-insensitive):

- looking for agency / looking for an agency
- developer needed / need a developer
- hiring developer / hire developer
- build my site / build my website / build my app
- freelance developer / seeking developer
- web developer needed / app developer needed
- software developer needed / looking for developer
- development agency / software agency / web development agency
- looking for team / need a team
- project help needed
- can anyone build / who can build
- recommendations for developer / recommend a developer

## 🔒 Privacy & Security

- **No API Calls**: The extension only reads the DOM, never makes requests to LinkedIn's private APIs
- **No Data Collection**: Your data stays on your device
- **Local Storage Only**: Statistics are stored locally in Chrome's storage
- **Open Source**: All code is visible and auditable

## 🛠️ Technical Details

- **Manifest Version**: V3 (latest Chrome extension standard)
- **Permissions**:
  - `activeTab`: To interact with LinkedIn pages
  - `storage`: To save statistics locally
  - `host_permissions`: Limited to linkedin.com domain
- **Technologies**: Vanilla JavaScript, CSS3, HTML5
- **Browser Support**: Chrome, Edge, and other Chromium-based browsers

## 📝 File Structure

```
linkedin-extension/
├── manifest.json          # Extension configuration
├── content.js            # Main scanning logic
├── background.js         # Service worker
├── styles.css            # Content script styles
├── popup.html            # Popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## 🐛 Troubleshooting

### Extension Not Working?

1. **Refresh LinkedIn**: Press `Ctrl+R` (or `Cmd+R` on Mac) to reload the page
2. **Check Console**: Open DevTools (F12) and look for any error messages
3. **Verify Permissions**: Ensure the extension has permission to run on linkedin.com
4. **Reload Extension**: Go to `chrome://extensions/` and click the reload icon

### Posts Not Being Detected?

1. **LinkedIn Layout Changes**: LinkedIn frequently updates their layout. The selectors in `content.js` may need updating
2. **Scroll Down**: The extension scans visible posts - scroll to load more content
3. **Check Keywords**: Verify the post contains one of the detected keywords

## 🚧 Future Enhancements

- [ ] Custom keyword management through popup UI
- [ ] Export detected opportunities to CSV
- [ ] Browser notifications for new detections
- [ ] Filter by post age/date
- [ ] Integration with CRM systems
- [ ] Multi-language support

## 📄 License

MIT License - feel free to use and modify as needed.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## ⚠️ Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by LinkedIn. Use responsibly and in accordance with LinkedIn's Terms of Service.

---

**Happy hunting! 🎯** Find those opportunities and grow your business!
