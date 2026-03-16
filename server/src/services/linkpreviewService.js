class LinkPreviewService {
    extractFirstUrlFromText(content) {
        if (!content || typeof content !== 'string') return null;
        const matches = Array.from(content.matchAll(/((?:https?:\/\/|www\.)[^\s<]+)/gi));
        if (matches.length !== 1) return null;
        const rawUrl = (matches[0][1] || '').replace(/[.,!?;:]+$/, '');
        if (!rawUrl) return null;
        return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    }

    normalizePreviewUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        const trimmed = rawUrl.trim();
        const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

        try {
            const parsed = new URL(withProtocol);
            if (!['http:', 'https:'].includes(parsed.protocol)) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    extractMetaTag(html, attr, value) {
        if (!html) return null;
        // Escape value for regex
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // This regex is more flexible with attribute order and spacing
        // It looks for a <meta> tag that contains both the target attribute/value pair and a content attribute
        const pattern = new RegExp(
            `<meta[^>]+(?:${attr}=[\"']${escapedValue}[\"'][^>]+content=[\"']([^\"']+)[\"']|content=[\"']([^\"']+)[\"'][^>]+${attr}=[\"']${escapedValue}[\"'])`,
            'i'
        );
        
        const match = html.match(pattern);
        const result = match?.[1] || match?.[2] || null;
        
        if (result) {
            // Decode HTML entities (e.g., &#xa0; or &amp;)
            return this.decodeHtmlEntities(result).trim();
        }
        return null;
    }

    decodeHtmlEntities(text) {
        if (!text) return '';
        return text
            .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
            .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }

    extractTitleTag(html) {
        if (!html) return null;
        const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = match?.[1]?.trim() || null;
        return title ? this.decodeHtmlEntities(title) : null;
    }

    
}

module.exports = new LinkPreviewService();