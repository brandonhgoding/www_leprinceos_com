// src/pages/Embeds.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Embeds.module.css';

interface EmbedType {
  id: string;
  name: string;
  description: string;
  icon: string;
  previewDescription: string;
}

interface EmbedConfig {
  width: string;
  height: string;
  theme: 'light' | 'dark' | 'auto';
  showHeader: boolean;
  showPoster: boolean;
  maxItems: number;
}

const EMBED_TYPES: EmbedType[] = [
  {
    id: 'now-playing',
    name: 'Now Playing',
    description: 'Display films currently showing at your cinema with showtimes.',
    icon: '🎬',
    previewDescription: 'Shows current films with poster, title, rating, and today\'s showtimes.',
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    description: 'Showcase upcoming films to build anticipation.',
    icon: '🎞️',
    previewDescription: 'Displays upcoming films with release dates and trailers.',
  },
  {
    id: 'schedule',
    name: 'Weekly Schedule',
    description: 'Full showtime schedule for the week.',
    icon: '📅',
    previewDescription: 'Calendar-style view of all showtimes for the next 7 days.',
  },
  {
    id: 'single-film',
    name: 'Single Film',
    description: 'Feature a specific film with all its showtimes.',
    icon: '🎥',
    previewDescription: 'Detailed view of one film with synopsis, cast, and all showtimes.',
  },
  {
    id: 'concessions',
    name: 'Concessions Menu',
    description: 'Display your concession items and pricing.',
    icon: '🍿',
    previewDescription: 'Browse your food and beverage menu with categories and prices.',
  },
  {
    id: 'ticket-prices',
    name: 'Ticket Prices',
    description: 'Show your ticket types and pricing.',
    icon: '🎟️',
    previewDescription: 'Lists all ticket types with prices and descriptions.',
  },
];

const DEFAULT_CONFIG: EmbedConfig = {
  width: '100%',
  height: '600',
  theme: 'light',
  showHeader: true,
  showPoster: true,
  maxItems: 10,
};

// Base URL for embeds - this would be configured per environment
const EMBED_BASE_URL = 'https://embed.leprinceos.com';

export default function Embeds() {
  const { currentCinema } = useAuth();
  const [selectedEmbed, setSelectedEmbed] = useState<EmbedType | null>(null);
  const [config, setConfig] = useState<EmbedConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);

  const cinemaSlug = currentCinema?.cinema_slug || 'your-cinema';

  const generateEmbedUrl = (embedId: string): string => {
    const params = new URLSearchParams();
    if (config.theme !== 'light') params.set('theme', config.theme);
    if (!config.showHeader) params.set('header', 'false');
    if (!config.showPoster) params.set('poster', 'false');
    if (config.maxItems !== 10) params.set('limit', String(config.maxItems));

    const queryString = params.toString();
    return `${EMBED_BASE_URL}/${cinemaSlug}/${embedId}${queryString ? `?${queryString}` : ''}`;
  };

  const generateIframeCode = (embedId: string): string => {
    const url = generateEmbedUrl(embedId);
    const height = config.height.includes('%') ? config.height : `${config.height}px`;
    return `<iframe
  src="${url}"
  width="${config.width}"
  height="${height}"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="${EMBED_TYPES.find(e => e.id === embedId)?.name || 'Cinema Embed'}"
  loading="lazy"
></iframe>`;
  };

  const generateScriptCode = (embedId: string): string => {
    return `<div id="leprince-${embedId}" data-cinema="${cinemaSlug}" data-theme="${config.theme}"></div>
<script src="${EMBED_BASE_URL}/widget.js" async></script>`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const selectEmbed = (embed: EmbedType) => {
    setSelectedEmbed(embed);
    setCopied(false);
  };

  const closeConfig = () => {
    setSelectedEmbed(null);
    setConfig(DEFAULT_CONFIG);
    setCopied(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Embeddable Widgets</h1>
          <p className={styles.subtitle}>
            Add cinema information to your website with simple copy-paste embed codes.
          </p>
        </div>
      </div>

      {/* Embed Types Grid */}
      <div className={styles.embedGrid}>
        {EMBED_TYPES.map((embed) => (
          <div
            key={embed.id}
            className={`${styles.embedCard} ${selectedEmbed?.id === embed.id ? styles.embedCardSelected : ''}`}
            onClick={() => selectEmbed(embed)}
          >
            <div className={styles.embedIcon}>{embed.icon}</div>
            <h3 className={styles.embedName}>{embed.name}</h3>
            <p className={styles.embedDescription}>{embed.description}</p>
            <button className={styles.selectButton}>
              {selectedEmbed?.id === embed.id ? 'Selected' : 'Configure'}
            </button>
          </div>
        ))}
      </div>

      {/* Configuration Panel */}
      {selectedEmbed && (
        <div className={styles.configPanel}>
          <div className={styles.configHeader}>
            <div>
              <h2 className={styles.configTitle}>
                <span className={styles.configIcon}>{selectedEmbed.icon}</span>
                {selectedEmbed.name} Embed
              </h2>
              <p className={styles.configSubtitle}>{selectedEmbed.previewDescription}</p>
            </div>
            <button className={styles.closeButton} onClick={closeConfig}>
              &times;
            </button>
          </div>

          <div className={styles.configContent}>
            {/* Configuration Options */}
            <div className={styles.configSection}>
              <h3 className={styles.sectionTitle}>Configuration</h3>

              <div className={styles.configGrid}>
                <div className={styles.configField}>
                  <label>Width</label>
                  <input
                    type="text"
                    value={config.width}
                    onChange={(e) => setConfig({ ...config, width: e.target.value })}
                    className={styles.input}
                    placeholder="100% or 600px"
                  />
                </div>
                <div className={styles.configField}>
                  <label>Height (px)</label>
                  <input
                    type="text"
                    value={config.height}
                    onChange={(e) => setConfig({ ...config, height: e.target.value })}
                    className={styles.input}
                    placeholder="600"
                  />
                </div>
                <div className={styles.configField}>
                  <label>Theme</label>
                  <select
                    value={config.theme}
                    onChange={(e) => setConfig({ ...config, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                    className={styles.select}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (system)</option>
                  </select>
                </div>
                <div className={styles.configField}>
                  <label>Max Items</label>
                  <input
                    type="number"
                    value={config.maxItems}
                    onChange={(e) => setConfig({ ...config, maxItems: parseInt(e.target.value) || 10 })}
                    className={styles.input}
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={config.showHeader}
                    onChange={(e) => setConfig({ ...config, showHeader: e.target.checked })}
                  />
                  Show header with cinema name
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={config.showPoster}
                    onChange={(e) => setConfig({ ...config, showPoster: e.target.checked })}
                  />
                  Show film posters
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className={styles.configSection}>
              <h3 className={styles.sectionTitle}>Preview</h3>
              <div className={styles.previewContainer}>
                <div
                  className={`${styles.previewFrame} ${config.theme === 'dark' ? styles.previewDark : ''}`}
                  style={{ height: `${Math.min(parseInt(config.height) || 400, 400)}px` }}
                >
                  <div className={styles.previewPlaceholder}>
                    <span className={styles.previewIcon}>{selectedEmbed.icon}</span>
                    <p>{selectedEmbed.name}</p>
                    <p className={styles.previewNote}>
                      Preview will be available once embed endpoints are deployed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Embed Codes */}
            <div className={styles.configSection}>
              <h3 className={styles.sectionTitle}>Embed Code</h3>

              <div className={styles.codeSection}>
                <div className={styles.codeHeader}>
                  <h4>Option 1: iFrame (Recommended)</h4>
                  <p className={styles.codeDescription}>
                    Simple and secure. Paste this code where you want the widget to appear.
                  </p>
                </div>
                <div className={styles.codeBlock}>
                  <pre>{generateIframeCode(selectedEmbed.id)}</pre>
                  <button
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(generateIframeCode(selectedEmbed.id))}
                  >
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className={styles.codeSection}>
                <div className={styles.codeHeader}>
                  <h4>Option 2: JavaScript Widget</h4>
                  <p className={styles.codeDescription}>
                    Lightweight script that injects the widget directly into your page.
                  </p>
                </div>
                <div className={styles.codeBlock}>
                  <pre>{generateScriptCode(selectedEmbed.id)}</pre>
                  <button
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(generateScriptCode(selectedEmbed.id))}
                  >
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className={styles.codeSection}>
                <div className={styles.codeHeader}>
                  <h4>Direct Link</h4>
                  <p className={styles.codeDescription}>
                    Open the embed directly or use for custom implementations.
                  </p>
                </div>
                <div className={styles.codeBlock}>
                  <pre>{generateEmbedUrl(selectedEmbed.id)}</pre>
                  <button
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(generateEmbedUrl(selectedEmbed.id))}
                  >
                    {copied ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className={styles.helpSection}>
        <h2 className={styles.helpTitle}>How to Use Embeds</h2>
        <div className={styles.helpGrid}>
          <div className={styles.helpCard}>
            <div className={styles.helpStep}>1</div>
            <h3>Choose an Embed Type</h3>
            <p>Select the type of information you want to display on your website.</p>
          </div>
          <div className={styles.helpCard}>
            <div className={styles.helpStep}>2</div>
            <h3>Configure Options</h3>
            <p>Customize the appearance, size, and content to match your website.</p>
          </div>
          <div className={styles.helpCard}>
            <div className={styles.helpStep}>3</div>
            <h3>Copy the Code</h3>
            <p>Copy the embed code and paste it into your website's HTML.</p>
          </div>
          <div className={styles.helpCard}>
            <div className={styles.helpStep}>4</div>
            <h3>Automatic Updates</h3>
            <p>Your embed will automatically update when you make changes in LeprinceOS.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
