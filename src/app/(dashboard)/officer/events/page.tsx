'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useEventsStore } from '@/stores/events';
import { getEventsWithFsStatus, createEvent, getAllProfiles, prefetchEventDetail } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Users, Wallet, FolderOpen, Plus} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from 'sonner';
import type { Profile } from '@/types';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function OfficerEventsPage() {
  const events = useEventsStore(s => s.events);
  const setEvents = useEventsStore(s => s.setEvents);
  const setEventDetailCache = useEventsStore(s => s.setEventDetailCache);
  const profile = useAuthStore(s => s.profile) as Profile | null;
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', adviser_id: '', budget: '' });
  const [advisers, setAdvisers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const prefetchedIds = useRef<Set<string>>(new Set());

  // Batch-prefetch all event details when events list loads → instant navigation
  useEffect(() => {
    events.forEach(event => {
      if (prefetchedIds.current.has(event.id)) return;
      prefetchedIds.current.add(event.id);
      prefetchEventDetail(event.id).then(data =>
        setEventDetailCache(event.id, data)
      ).catch(() => {});
    });
  }, [events, setEventDetailCache]);

  // Fetch advisers for create dialog
  useEffect(() => {
    if (!profile) return;
    getAllProfiles().then(allProfiles => {
      setAdvisers(allProfiles.filter((p: any) => p.role === 'adviser' && p.department_id === profile.department_id));
    }).catch(() => {});
  }, [profile]);

  const handleCreate = async () => {
    if (creating) return;
    if (!form.name || !form.adviser_id || !form.budget) {
      toast.error('Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      await createEvent(profile!.department_id, form.name, profile!.user_id, form.adviser_id, Number(form.budget));
      toast.success('Event created');
      setShowCreate(false);
      setForm({ name: '', adviser_id: '', budget: '' });
      const data = await getEventsWithFsStatus(profile!.department_id);
      setEvents(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Prefetch new event details after creation
  useEffect(() => {
    if (events.length > 0) {
      events.forEach(event => {
        if (prefetchedIds.current.has(event.id)) return;
        prefetchedIds.current.add(event.id);
        prefetchEventDetail(event.id).then(data =>
          setEventDetailCache(event.id, data)
        ).catch(() => {});
      });
    }
  }, [events.length]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-description">Manage and track your department events</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary text-white hover:bg-primary-hover rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> New Event
        </Button>
        <ResponsiveDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          title="Create Event"
          description="Set up a new department event"
        >
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
            <Button className="w-full bg-primary text-white hover:bg-primary-hover" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </ResponsiveDialog>
      </div>

      {events.length === 0 ? (
        <Card className="bg-surface-white shadow-soft rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-text-placeholder mb-4" />
            <p className="text-[13px] leading-[18px] text-text-secondary">No events yet. Create your first event!</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event, index) => (
            <motion.div {...fadeSlideUp(index)} key={event.id}>
            <Link href={`/officer/events/${event.id}`} prefetch={true}
              onMouseEnter={() => {
                prefetchEventDetail(event.id).then(data =>
                  setEventDetailCache(event.id, data)
                ).catch(() => {});
              }}>
              <Card className="h-full bg-surface-white shadow-soft rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
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
                    <Wallet className="h-4 w-4 text-text-secondary" />
                    <span className="font-medium text-text-primary">{formatCurrency(event.budget)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
