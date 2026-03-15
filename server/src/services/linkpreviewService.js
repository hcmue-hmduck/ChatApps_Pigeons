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
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(
            `<meta[^>]*${attr}=[\"']${escapedValue}[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>|` +
            `<meta[^>]*content=[\"']([^\"']+)[\"'][^>]*${attr}=[\"']${escapedValue}[\"'][^>]*>`,
            'i'
        );
        const match = html.match(pattern);
        return match?.[1] || match?.[2] || null;
    }

    extractTitleTag(html) {
        if (!html) return null;
        const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return match?.[1]?.trim() || null;
    }

    
}

module.exports = new LinkPreviewService();