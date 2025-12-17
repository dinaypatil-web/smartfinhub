import { useState, useEffect } from 'react';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { quickLinksApi } from '@/db/api';
import type { QuickLink } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Plus, ExternalLink, Pencil, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuickLinkFormData {
  name: string;
  url: string;
  icon: string;
  color: string;
}

const defaultColors = [
  '#1E3A8A', // Deep Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

const commonIcons = ['🔗', '🏦', '💳', '💰', '📱', '🌐', '💵', '📊', '🏪', '🛒'];

function SortableQuickLinkCard({ link, onEdit, onDelete }: { link: QuickLink; onEdit: (link: QuickLink) => void; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <button
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg text-2xl flex-shrink-0"
              style={{ backgroundColor: link.color }}
            >
              {link.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{link.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{link.url}</p>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(link.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(link)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(link.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuickLinks() {
  const { user } = useHybridAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const form = useForm<QuickLinkFormData>({
    defaultValues: {
      name: '',
      url: '',
      icon: '🔗',
      color: '#1E3A8A',
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      setLinks(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load quick links',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over.id);

      const newLinks = arrayMove(links, oldIndex, newIndex);
      setLinks(newLinks);

      try {
        await quickLinksApi.reorderQuickLinks(
          user!.id,
          newLinks.map((link) => link.id)
        );
        toast({
          title: 'Success',
          description: 'Quick links reordered',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to reorder quick links',
          variant: 'destructive',
        });
        loadQuickLinks();
      }
    }
  };

  const onSubmit = async (data: QuickLinkFormData) => {
    if (!user) return;

    try {
      if (editingLink) {
        await quickLinksApi.updateQuickLink(editingLink.id, data);
        toast({
          title: 'Success',
          description: 'Quick link updated successfully',
        });
      } else {
        await quickLinksApi.createQuickLink({
          ...data,
          user_id: user.id,
          display_order: links.length,
        });
        toast({
          title: 'Success',
          description: 'Quick link created successfully',
        });
      }
      
      setDialogOpen(false);
      setEditingLink(null);
      form.reset();
      loadQuickLinks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save quick link',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (link: QuickLink) => {
    setEditingLink(link);
    form.reset({
      name: link.name,
      url: link.url,
      icon: link.icon,
      color: link.color,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quick link?')) return;

    try {
      await quickLinksApi.deleteQuickLink(id);
      toast({
        title: 'Success',
        description: 'Quick link deleted successfully',
      });
      loadQuickLinks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quick link',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingLink(null);
      form.reset();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading quick links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quick Links</h1>
          <p className="text-muted-foreground mt-1">
            Manage quick access links to your banking apps and financial services
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingLink ? 'Edit Quick Link' : 'Add Quick Link'}</DialogTitle>
              <DialogDescription>
                Add a link to your banking app, payment service, or any financial tool.
                You can use app URL schemes (e.g., bankapp://) for deep linking.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Bank App" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="url"
                  rules={{
                    required: 'URL is required',
                    pattern: {
                      value: /^(https?:\/\/|[a-z]+:\/\/)/i,
                      message: 'Please enter a valid URL (e.g., https://example.com or app://open)',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://bank.com or bankapp://open" {...field} />
                      </FormControl>
                      <FormDescription>
                        Use https:// for web links or app:// for app deep links
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input placeholder="🔗" {...field} maxLength={2} />
                          <div className="flex flex-wrap gap-2">
                            {commonIcons.map((icon) => (
                              <Button
                                key={icon}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('icon', icon)}
                                className="text-xl"
                              >
                                {icon}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Choose an emoji or enter your own</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input type="color" {...field} className="w-20 h-10" />
                            <Input {...field} placeholder="#1E3A8A" className="flex-1" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {defaultColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => form.setValue('color', color)}
                                className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Choose a color for the link card</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingLink ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Quick Links Yet</CardTitle>
            <CardDescription>
              Add quick links to your banking apps, payment services, and other financial tools for easy access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Examples of what you can add:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Your bank's mobile app or website</li>
              <li>Payment apps (PayPal, Venmo, etc.)</li>
              <li>Investment platforms</li>
              <li>Credit card portals</li>
              <li>Loan management systems</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={links.map((link) => link.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {links.map((link) => (
                <SortableQuickLinkCard
                  key={link.id}
                  link={link}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
