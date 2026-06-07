import { ExternalLink, Globe } from "lucide-react";

const URL_REGEX = /https?:\/\/[^\s)\]<>"']+/gi;

function extractUrls(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = text.match(URL_REGEX) || [];
  for (let raw of matches) {
    // Trim trailing punctuation commonly attached to URLs in prose
    raw = raw.replace(/[.,;:!?)\]]+$/g, "");
    if (!seen.has(raw)) {
      seen.add(raw);
      out.push(raw);
    }
  }
  return out.slice(0, 8);
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function prettyPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return path || "/";
  } catch {
    return "";
  }
}

export default function SourceCards({ content }: { content: string }) {
  const urls = extractUrls(content);
  if (urls.length === 0) return null;

  return (
    <div className="mt-3 animate-fade-in">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        <span>Sources & References</span>
        <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
          {urls.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {urls.map((url, idx) => {
          const host = prettyHost(url);
          const path = prettyPath(url);
          const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
          return (
            <a
              key={url + idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-lift group flex items-start gap-2.5 rounded-xl border border-border bg-card/60 p-2.5 backdrop-blur transition-colors hover:border-primary/40 hover:bg-card"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                <img
                  src={favicon}
                  alt=""
                  loading="lazy"
                  className="h-5 w-5"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-xs font-semibold text-foreground">{host}</span>
                  <span className="text-[10px] text-muted-foreground">· [{idx + 1}]</span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{path}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
          );
        })}
      </div>
    </div>
  );
}