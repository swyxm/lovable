# LovaBuddy

A Chrome extension that provides an interactive accessibility layer designed to help children with special needs use the Lovable website builder. The extension appears as a popup overlay on top of the Lovable interface and guides users through expressing creative ideas and refining them into structured prompts.

## Features

- **Multimodal Input**: Accept voice input, text input, or image uploads (like drawings)
- **AI-Powered Interpretation**: Uses AI to interpret vague ideas and engage users in playful back-and-forth to gather context
- **Visual Presets**: Shows visual preset options (color palettes, icons, layout styles) in simple card formats
- **Accessibility First**: Designed with accessibility in mind - large buttons, high contrast, rounded edges, and soft colors
- **Drawing Canvas**: Interactive drawing tool with color palette and brush controls
- **Voice Recognition**: Web Speech API integration for voice input
- **Responsive Overlay**: Draggable overlay that works on any website

## Project Structure

```
src/
├── popup/           # Minimal launcher popup
│   ├── App.tsx      # Main popup component
│   └── index.tsx    # Popup entry point
├── overlay/         # Main application overlay
│   ├── OverlayApp.tsx           # Main overlay component
│   ├── index.tsx               # Overlay entry point
│   └── components/             # Overlay components
│       ├── A11yMenu.tsx       # Accessibility controls
│       └── DrawCanvas.tsx     # Drawing canvas with color picker
├── content/         # Content script for page injection
│   ├── index.ts     # Content script logic
│   └── content.css  # Content script styles
├── background/      # Background service worker
│   └── index.ts     # Background script
└── styles.css       # Global Tailwind CSS
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Development

- **Build**: `npm run build` - Builds the extension for production
- **Dev**: `npm run dev` - Builds in development mode with watch
- **Clean**: `npm run clean` - Removes the dist folder

## Usage

1. Click the LovaBuddy icon in the Chrome toolbar
2. Click "Open overlay on page" to launch the main interface
3. Choose between "Draw" or "Describe" modes:
   - **Draw**: Use the drawing canvas to sketch your idea
   - **Describe**: Type or speak your idea
4. Use the accessibility controls (♿) in the bottom-left for:
   - Large text
   - High contrast
   - Reduce motion

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Colorful** for color picker
- **Webpack** for bundling
- **Chrome Extension Manifest V3**

## Accessibility Features

- **Large Text**: Increases font size for better readability
- **High Contrast**: Applies high contrast theme for better visibility
- **Reduce Motion**: Minimizes animations for users sensitive to motion
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML

## Browser Compatibility

- Chrome (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub Issues page.
