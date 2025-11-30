import { useState } from 'react';
import { getDefaultBankLogo } from '@/utils/banks';
import { Building2 } from 'lucide-react';

interface BankLogoProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function BankLogo({ src, alt, className = 'h-8 w-8' }: BankLogoProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src || error) {
    return (
      <div className={`${className} rounded bg-primary/10 flex items-center justify-center`}>
        <Building2 className="h-5 w-5 text-primary" />
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`${className} rounded bg-muted animate-pulse`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} rounded ${loading ? 'hidden' : ''}`}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onLoad={() => setLoading(false)}
      />
    </>
  );
}
