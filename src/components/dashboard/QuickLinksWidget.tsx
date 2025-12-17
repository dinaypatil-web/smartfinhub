import { useState, useEffect } from 'react';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { quickLinksApi } from '@/db/api';
import type { QuickLink } from '@/types/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuickLinksWidget() {
  const { user } = useHybridAuth();
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadQuickLinks();
    }
  }, [user]);

  const loadQuickLinks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await quickLinksApi.getQuickLinks(user.id);
      setLinks(data.slice(0, 6)); // Show only first 6 links
    } catch (error) {
      console.error('Failed to load quick links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Quick access to your banking apps and financial services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              No quick links added yet
            </p>
            <Link to="/quick-links">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Quick Links
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Quick access to your apps</CardDescription>
        </div>
        <Link to="/quick-links">
          <Button variant="ghost" size="sm">
            Manage
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.url)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors text-center group"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: link.color }}
              >
                {link.icon}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-sm font-medium truncate">{link.name}</p>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
        
        {links.length >= 6 && (
          <div className="mt-4 text-center">
            <Link to="/quick-links">
              <Button variant="outline" size="sm" className="w-full">
                View All Links
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
