/**
 * GutenbergFetcher - Fetches Alice in Wonderland text from Project Gutenberg
 *
 * Downloads the full text, caches it in localStorage, and parses
 * it into individual chapters.
 */

export interface Chapter {
  number: number;
  title: string;
  content: string;
}

const GUTENBERG_URL = 'https://www.gutenberg.org/cache/epub/11/pg11.txt';
const CACHE_KEY = 'alice-wonderland-text';
const CACHE_VERSION = 'v1';

export class GutenbergFetcher {
  private fullText: string | null = null;
  private chapters: Chapter[] = [];

  /**
   * Fetch the full Alice in Wonderland text
   * Uses localStorage cache to avoid repeated downloads
   */
  async fetchFullText(): Promise<string> {
    // Check cache first
    const cached = this.loadFromCache();
    if (cached) {
      console.log('Loaded Alice in Wonderland from cache');
      this.fullText = cached;
      return cached;
    }

    // Fetch from Gutenberg
    console.log('Fetching Alice in Wonderland from Project Gutenberg...');
    try {
      const response = await fetch(GUTENBERG_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const text = await response.text();
      this.fullText = text;

      // Cache for future use
      this.saveToCache(text);
      console.log('Fetched and cached Alice in Wonderland');

      return text;
    } catch (error) {
      console.error('Failed to fetch from Gutenberg:', error);
      throw error;
    }
  }

  /**
   * Parse the full text into individual chapters
   */
  parseChapters(): Chapter[] {
    if (!this.fullText) {
      throw new Error('Must fetch text first');
    }

    // Find the start of actual content (after Gutenberg header)
    const contentStart = this.fullText.indexOf('CHAPTER I');
    if (contentStart === -1) {
      throw new Error('Could not find chapter start');
    }

    // Find the end of content (before Gutenberg footer)
    const endMarker = '*** END OF THE PROJECT GUTENBERG';
    let contentEnd = this.fullText.indexOf(endMarker);
    if (contentEnd === -1) {
      contentEnd = this.fullText.length;
    }

    const content = this.fullText.slice(contentStart, contentEnd);

    // Split by chapter headers
    // Pattern: "CHAPTER I" or "CHAPTER II" etc, followed by title on next line
    const chapterPattern = /CHAPTER ([IVXLC]+)\.?\s*\r?\n+([^\r\n]+)/g;
    const chapters: Chapter[] = [];
    let match: RegExpExecArray | null;
    const matches: { index: number; number: string; title: string }[] = [];

    while ((match = chapterPattern.exec(content)) !== null) {
      matches.push({
        index: match.index,
        number: match[1],
        title: match[2].trim()
      });
    }

    // Extract content between chapter headers
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
      const chapterContent = content.slice(start, end).trim();

      chapters.push({
        number: this.romanToNumber(matches[i].number),
        title: matches[i].title,
        content: chapterContent
      });
    }

    this.chapters = chapters;
    console.log(`Parsed ${chapters.length} chapters`);

    return chapters;
  }

  /**
   * Get a specific chapter by number (1-indexed)
   */
  getChapter(num: number): Chapter | null {
    return this.chapters.find(c => c.number === num) || null;
  }

  /**
   * Get all parsed chapters
   */
  getAllChapters(): Chapter[] {
    return this.chapters;
  }

  /**
   * Convert Roman numeral to number
   */
  private romanToNumber(roman: string): number {
    const values: Record<string, number> = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100
    };

    let result = 0;
    for (let i = 0; i < roman.length; i++) {
      const current = values[roman[i]] || 0;
      const next = values[roman[i + 1]] || 0;

      if (current < next) {
        result -= current;
      } else {
        result += current;
      }
    }

    return result;
  }

  /**
   * Load cached text from localStorage
   */
  private loadFromCache(): string | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      if (data.version !== CACHE_VERSION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data.text;
    } catch {
      return null;
    }
  }

  /**
   * Save text to localStorage cache
   */
  private saveToCache(text: string): void {
    try {
      const data = {
        version: CACHE_VERSION,
        text: text,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache text:', error);
    }
  }
}

// Export singleton instance
export const gutenbergFetcher = new GutenbergFetcher();
