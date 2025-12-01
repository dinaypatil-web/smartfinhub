import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface BankLogoProps {
  src?: string | null;
  alt: string;
  className?: string;
  bankName?: string;
}

export default function BankLogo({ src, alt, className = 'h-8 w-8', bankName }: BankLogoProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(src || null);

  useEffect(() => {
    // If no src provided but bankName is available, try to fetch from Clearbit
    if (!src && bankName) {
      const cleanName = bankName.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/bank|financial|group|ltd|limited|inc|corporation|corp/gi, '');
      
      const clearbitUrl = `https://logo.clearbit.com/${cleanName}.com`;
      setLogoUrl(clearbitUrl);
    } else if (src) {
      setLogoUrl(src);
    }
  }, [src, bankName]);

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
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onLoad={() => setLoading(false)}
      />
    </>
  );
}
