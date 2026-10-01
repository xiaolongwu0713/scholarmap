/**
 * First-touch attribution: where a visitor first came from (UTM tags, else the external
 * referrer's host, else "direct"), kept in localStorage and sent with signup so revenue
 * can be broken down by channel.
 */

export interface Attribution {
  source: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landing_path?: string;
}

const KEY = 'labscout_first_touch';

/** Record the first visit's source; later visits keep the original. */
export function recordFirstTouch(): void {
  try {
    if (localStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : '';
      if (host && host !== window.location.hostname) referrer = host.replace(/^www\./, '');
    } catch {
      // Malformed referrer: treat as none
    }
    const touch: Attribution = {
      source: params.get('utm_source') || referrer || 'direct',
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      referrer,
      landing_path: window.location.pathname,
    };
    localStorage.setItem(KEY, JSON.stringify(touch));
  } catch {
    // Storage blocked (private mode etc.): signup just goes unattributed
  }
}

export function getFirstTouch(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : undefined;
  } catch {
    return undefined;
  }
}
