// src/pages/Embeds.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { engagementsApi } from '../api';
import styles from './Embeds.module.css';

interface EmbedType {
  id: string;
  name: string;
  description: string;
  icon: string;
  previewDescription: string;
  urlPath: string; // Backend URL path
  requiresEngagement?: boolean;
  /** When true, the widget.js script embed is the primary/recommended option */
  widgetPrimary?: boolean;
}

interface EmbedConfig {
  width: string;
  height: string;
  theme: 'light' | 'dark' | 'auto';
  showHeader: boolean;
  showPoster: boolean;
  maxItems: number;
  engagementId: number | null;
}

const EMBED_TYPES: EmbedType[] = [
  {
    id: 'now-playing',
    name: 'Now Playing',
    description: 'Display films currently showing at your cinema with showtimes.',
    icon: '🎬',
    previewDescription: 'Shows current films with poster, title, rating, and today\'s showtimes.',
    urlPath: 'nowplaying',
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    description: 'Showcase upcoming films to build anticipation.',
    icon: '🎞️',
    previewDescription: 'Displays upcoming films with release dates and trailers.',
    urlPath: 'comingsoon',
  },
  {
    id: 'schedule',
    name: 'Weekly Schedule',
    description: 'Full showtime schedule for the week.',
    icon: '📅',
    previewDescription: 'Calendar-style view of all showtimes for the next 7 days.',
    urlPath: 'showtimes',
  },
  {
    id: 'single-film',
    name: 'Single Film',
    description: 'Feature a specific film with all its showtimes.',
    icon: '🎥',
    previewDescription: 'Detailed view of one film with synopsis, cast, and all showtimes.',
    urlPath: 'film',
    requiresEngagement: true,
  },
  {
    id: 'ticket-prices',
    name: 'Ticket Prices',
    description: 'Show your ticket types and pricing.',
    icon: '🎟️',
    previewDescription: 'Lists all ticket types with prices and descriptions.',
    urlPath: 'tickets',
  },
  {
    id: 'buy-tickets',
    name: 'Buy Tickets',
    description: 'Let customers browse showtimes and purchase tickets directly on your site.',
    icon: '🛒',
    previewDescription: 'Full ticket purchasing flow: browse films, select showtimes, choose tickets, and pay with Square.',
    urlPath: 'buy',
    widgetPrimary: true,
  },
];

const DEFAULT_CONFIG: EmbedConfig = {
  width: '100%',
  height: '600',
  theme: 'light',
  showHeader: true,
  showPoster: true,
  maxItems: 10,
  engagementId: null,
};

// Production embed base URL (for generated code that users copy)
const PRODUCTION_EMBED_URL = 'https://leprinceos.com/embeds';

// Local embed base URL (for preview iframe, proxied via vite)
const LOCAL_EMBED_URL = '/embeds';

export default function Embeds() {
  const { currentCinema } = useAuth();
  const [selectedEmbed, setSelectedEmbed] = useState<EmbedType | null>(null);
  const [config, setConfig] = useState<EmbedConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);

  const cinemaSlug = currentCinema?.cinema_slug || 'your-cinema';

  // Fetch engagements for single-film embed selector
  const { data: engagements = [] } = useQuery({
    queryKey: ['engagements', 'active'],
    queryFn: () => engagementsApi.list({ status: 'CONFIRMED' }),
    enabled: selectedEmbed?.requiresEngagement ?? false,
  });

  // Generate embed URL with configurable base (local for preview, production for code)
  const generateEmbedUrl = (embed: EmbedType, baseUrl: string = LOCAL_EMBED_URL): string => {
    const params = new URLSearchParams();
    if (config.theme !== 'light') params.set('theme', config.theme);
    if (!config.showHeader) params.set('header', 'false');
    if (!config.showPoster) params.set('poster', 'false');
    if (config.maxItems !== 10) params.set('limit', String(config.maxItems));

    let path = `${baseUrl}/${cinemaSlug}/${embed.urlPath}`;

    // Handle single-film which requires an engagement ID
    if (embed.requiresEngagement && config.engagementId) {
      path = `${path}/${config.engagementId}`;
    }

    const queryString = params.toString();
    return `${path}/${queryString ? `?${queryString}` : ''}`;
  };

  // Generate URL for preview (uses local proxy)
  const getPreviewUrl = (embed: EmbedType): string => {
    return generateEmbedUrl(embed, LOCAL_EMBED_URL);
  };

  // Generate URL for embed code (uses production URL)
  const getProductionUrl = (embed: EmbedType): string => {
    return generateEmbedUrl(embed, PRODUCTION_EMBED_URL);
  };

  const generateIframeCode = (embed: EmbedType): string => {
    const url = getProductionUrl(embed);
    const height = config.height.includes('%') ? config.height : `${config.height}px`;
    return `<iframe
  src="${url}"
  width="${config.width}"
  height="${height}"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="${embed.name}"
  loading="lazy"
></iframe>`;
  };

  const generateScriptCode = (embed: EmbedType): string => {
    return `<div id="leprince-${embed.id}" data-cinema="${cinemaSlug}" data-theme="${config.theme}"></div>
<script src="${PRODUCTION_EMBED_URL}/widget.js" async></script>`;
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
                  <label htmlFor="embed-width">Width</label>
                  <input
                    id="embed-width"
                    type="text"
                    value={config.width}
                    onChange={(e) => setConfig({ ...config, width: e.target.value })}
                    className={styles.input}
                    placeholder="100% or 600px"
                  />
                </div>
                <div className={styles.configField}>
                  <label htmlFor="embed-height">Height (px)</label>
                  <input
                    id="embed-height"
                    type="text"
                    value={config.height}
                    onChange={(e) => setConfig({ ...config, height: e.target.value })}
                    className={styles.input}
                    placeholder="600"
                  />
                </div>
                <div className={styles.configField}>
                  <label htmlFor="embed-theme">Theme</label>
                  <select
                    id="embed-theme"
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
                  <label htmlFor="embed-max-items">Max Items</label>
                  <input
                    id="embed-max-items"
                    type="number"
                    value={config.maxItems}
                    onChange={(e) => setConfig({ ...config, maxItems: parseInt(e.target.value) || 10 })}
                    className={styles.input}
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              {/* Engagement selector for single-film embed */}
              {selectedEmbed.requiresEngagement && (
                <div className={styles.configField} style={{ marginBottom: 'var(--space-md)' }}>
                  <label htmlFor="embed-film">Select Film</label>
                  <select
                    id="embed-film"
                    value={config.engagementId || ''}
                    onChange={(e) =>
                      setConfig({ ...config, engagementId: e.target.value ? parseInt(e.target.value) : null })
                    }
                    className={styles.select}
                  >
                    <option value="">-- Select a film --</option>
                    {engagements.map((engagement) => (
                      <option key={engagement.id} value={engagement.id}>
                        {engagement.film_title}
                      </option>
                    ))}
                  </select>
                  {!config.engagementId && (
                    <p className={styles.fieldNote}>
                      Please select a film to generate the embed code.
                    </p>
                  )}
                </div>
              )}

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
                {selectedEmbed.requiresEngagement && !config.engagementId ? (
                  <div
                    className={`${styles.previewFrame} ${config.theme === 'dark' ? styles.previewDark : ''}`}
                    style={{ height: `${Math.min(parseInt(config.height) || 400, 400)}px` }}
                  >
                    <div className={styles.previewPlaceholder}>
                      <span className={styles.previewIcon}>{selectedEmbed.icon}</span>
                      <p>{selectedEmbed.name}</p>
                      <p className={styles.previewNote}>Select a film above to preview</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={getPreviewUrl(selectedEmbed)}
                    style={{
                      width: '100%',
                      height: `${Math.min(parseInt(config.height) || 400, 400)}px`,
                      border: 'none',
                      borderRadius: '8px',
                    }}
                    title={`${selectedEmbed.name} Preview`}
                  />
                )}
              </div>
            </div>

            {/* Embed Codes */}
            <div className={styles.configSection}>
              <h3 className={styles.sectionTitle}>Embed Code</h3>

              {selectedEmbed.widgetPrimary ? (
                <>
                  <div className={styles.codeSection}>
                    <div className={styles.codeHeader}>
                      <h4>Option 1: JavaScript Widget (Recommended)</h4>
                      <p className={styles.codeDescription}>
                        Embeds the full ticket purchasing experience directly into your page with
                        isolated styles.
                      </p>
                    </div>
                    <div className={styles.codeBlock}>
                      <pre>{generateScriptCode(selectedEmbed)}</pre>
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(generateScriptCode(selectedEmbed))}
                      >
                        {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.codeSection}>
                    <div className={styles.codeHeader}>
                      <h4>Option 2: iFrame</h4>
                      <p className={styles.codeDescription}>
                        Simple iframe embed. Works everywhere but cannot adapt to your page
                        styles.
                      </p>
                    </div>
                    <div className={styles.codeBlock}>
                      <pre>{generateIframeCode(selectedEmbed)}</pre>
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(generateIframeCode(selectedEmbed))}
                      >
                        {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.codeSection}>
                    <div className={styles.codeHeader}>
                      <h4>Option 1: iFrame (Recommended)</h4>
                      <p className={styles.codeDescription}>
                        Simple and secure. Paste this code where you want the widget to appear.
                      </p>
                    </div>
                    <div className={styles.codeBlock}>
                      <pre>{generateIframeCode(selectedEmbed)}</pre>
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(generateIframeCode(selectedEmbed))}
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
                      <pre>{generateScriptCode(selectedEmbed)}</pre>
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(generateScriptCode(selectedEmbed))}
                      >
                        {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.codeSection}>
                <div className={styles.codeHeader}>
                  <h4>Direct Link</h4>
                  <p className={styles.codeDescription}>
                    Open the embed directly or use for custom implementations.
                  </p>
                </div>
                <div className={styles.codeBlock}>
                  <pre>{getProductionUrl(selectedEmbed)}</pre>
                  <button
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(getProductionUrl(selectedEmbed))}
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
