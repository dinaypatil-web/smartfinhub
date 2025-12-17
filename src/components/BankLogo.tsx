import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface BankLogoProps {
  src?: string | null;
  alt: string;
  className?: string;
  bankName?: string;
}

// Generate multiple logo URL sources to try
const generateLogoUrls = (bankName: string): string[] => {
  const urls: string[] = [];
  
  // Remove extra spaces and convert to lowercase
  const normalized = bankName.toLowerCase().trim().replace(/\s+/g, '');
  
  // Create variations of the bank name
  // 1. Keep "bank" in the name (e.g., "hdfcbank" from "HDFC Bank")
  const withBank = normalized;
  
  // 2. Remove common suffixes but keep "bank" if it's part of the core name
  const cleaned = bankName.toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/\s*(financial|group|ltd|limited|inc|corporation|corp|pvt|private)\s*/gi, '')
    .replace(/\s*bank\s*$/gi, ''); // Only remove "bank" if it's at the end
  
  // 3. Aggressive cleaning (remove all common words)
  const minimal = bankName.toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/bank|financial|group|ltd|limited|inc|corporation|corp|pvt|private/gi, '');
  
  // Try with common domain extensions in priority order
  const domains: string[] = [];
  
  // Priority 1: Try with "bank" kept (most common for banks)
  domains.push(`${withBank}.com`);
  domains.push(`${withBank}.co.in`);
  
  // Priority 2: Try cleaned version
  if (cleaned !== withBank) {
    domains.push(`${cleaned}.com`);
    domains.push(`${cleaned}.co.in`);
  }
  
  // Priority 3: Try minimal + "bank"
  if (minimal !== withBank && minimal !== cleaned) {
    domains.push(`${minimal}bank.com`);
    domains.push(`${minimal}bank.co.in`);
  }
  
  // Priority 4: Try minimal alone
  if (minimal !== withBank && minimal !== cleaned) {
    domains.push(`${minimal}.com`);
    domains.push(`${minimal}.co.in`);
  }
  
  // Use multiple reliable logo APIs
  domains.slice(0, 4).forEach(domain => {
    // Google Favicon API with higher resolution - most reliable
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    
    // DuckDuckGo Icon API - reliable and fast
    urls.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
    
    // Favicon Kit API - good quality
    urls.push(`https://api.faviconkit.com/${domain}/128`);
  });
  
  return urls;
};

export default function BankLogo({ src, alt, className = 'h-8 w-8', bankName }: BankLogoProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(src || null);
  const [urlIndex, setUrlIndex] = useState(0);
  const [logoSources, setLogoSources] = useState<string[]>([]);

  useEffect(() => {
    // Reset state when props change
    setError(false);
    setLoading(true);
    setUrlIndex(0);
    
    // If src is provided, use it directly
    if (src) {
      setLogoUrl(src);
      setLogoSources([]);
    } 
    // If no src but bankName is available, generate logo URLs to try
    else if (bankName) {
      const urls = generateLogoUrls(bankName);
      setLogoSources(urls);
      setLogoUrl(urls[0] || null);
    } 
    // No src and no bankName
    else {
      setLogoUrl(null);
      setLogoSources([]);
    }
  }, [src, bankName]);

  const handleError = () => {
    // Try next URL source if available
    if (logoSources.length > 0 && urlIndex < logoSources.length - 1) {
      const nextIndex = urlIndex + 1;
      setUrlIndex(nextIndex);
      setLogoUrl(logoSources[nextIndex]);
      setError(false);
    } else {
      // No more sources to try
      setError(true);
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  // Show fallback icon only if no logo URL or all sources failed
  if (!logoUrl || error) {
    return (
      <div className={`${className} rounded bg-muted flex items-center justify-center`}>
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className={`${className} rounded bg-muted animate-pulse`} />
      )}
      <img
        src={logoUrl}
        alt={alt}
        className={`${className} rounded object-contain ${loading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}
