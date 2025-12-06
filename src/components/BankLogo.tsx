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
  
  // Clean the bank name
  const cleanName = bankName.toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/bank|financial|group|ltd|limited|inc|corporation|corp|pvt|private/gi, '');
  
  // Try with common domain extensions
  const domains = [
    `${cleanName}.com`,
    `${cleanName}bank.com`,
    `${cleanName}.co.in`,
    `${cleanName}bank.co.in`,
  ];
  
  // Add Clearbit Logo API (high quality)
  domains.forEach(domain => {
    urls.push(`https://logo.clearbit.com/${domain}`);
  });
  
  // Add Google Favicon API as fallback
  domains.forEach(domain => {
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
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

  // Show fallback icon if no logo URL or all sources failed
  if (!logoUrl || error) {
    return (
      <div className={`${className} rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md`}>
        <Building2 className="h-5 w-5 text-white" />
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`${className} rounded bg-muted animate-pulse`} />
      )}
      <img
        src={logoUrl}
        alt={alt}
        className={`${className} rounded object-cover ${loading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
}
