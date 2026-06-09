'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getEvents, createEvent, getAllProfiles } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarRange, Users, Wallet, FolderOpen, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Profile } from '@/types';

export default function OfficerEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', adviser_id: '', budget: '' });
  const [advisers, setAdvisers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(prof as any);

      if (prof) {
        const [data, allProfiles] = await Promise.all([
          getEvents(prof.department_id),
          getAllProfiles(),
        ]);
        setEvents(data);
        setAdvisers(allProfiles.filter((p: any) => p.role === 'adviser' && p.department_id === prof.department_id));
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const handleCreate = async () => {
    if (!form.name || !form.adviser_id || !form.budget) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await createEvent(profile!.department_id, form.name, profile!.user_id, form.adviser_id, Number(form.budget));
      toast.success('Event created');
      setShowCreate(false);
      setForm({ name: '', adviser_id: '', budget: '' });
      const data = await getEvents(profile!.department_id);
      setEvents(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Department events
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>Set up a new department event</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Freshmen Orientation" />
              </div>
              <div className="space-y-2">
                <Label>Adviser</Label>
                <Select value={form.adviser_id} onValueChange={v => setForm({...form, adviser_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select adviser" /></SelectTrigger>
                  <SelectContent>
                    {advisers.map((a: any) => (
                      <SelectItem key={a.id} value={a.user_id}>{a.first_name} {a.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Budget</Label>
                <Input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="0.00" />
              </div>
              <Button className="w-full" onClick={handleCreate}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No events yet. Create your first event!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Link key={event.id} href={`/officer/events/${event.id}`}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{event.name}</CardTitle>
                    <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>
                      {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <Users className="h-3.5 w-3.5" />
                    {event.officer?.first_name} {event.officer?.last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-neutral-500" />
                    <span className="font-medium">{formatCurrency(event.budget)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
