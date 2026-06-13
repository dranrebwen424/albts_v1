'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { getDepartmentUsers, deleteUser } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { UserPlus, Users, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function UsersPage() {
  const params = useParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ first_name: '', middle_name: '', last_name: '', email: '', role: 'officer' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const data = await getDepartmentUsers(params.deptId as string);
      setUsers(data);
      setLoading(false);
    };
    init();
  }, [params.deptId]);

  const handleCreate = async () => {
    if (creating) return;
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Please fill required fields');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, department_id: params.deptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.emailSent) {
        toast.success('User created. Welcome email sent.');
      } else {
        toast.warning('User created but welcome email failed to send. Check EmailJS config.');
      }
      setShowCreate(false);
      setForm({ first_name: '', middle_name: '', last_name: '', email: '', role: 'officer' });
      const u = await getDepartmentUsers(params.deptId as string);
      setUsers(u);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await deleteUser(userId);
      toast.success('User deleted');
      const u = await getDepartmentUsers(params.deptId as string);
      setUsers(u);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <motion.div variants={staggerContainer()} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }} className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] leading-[18px] text-text-secondary">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Add User
        </Button>
        <ResponsiveDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          title="Create User"
          description="Create a new user account. Default password: Mabini2026"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First Name</Label>
                <Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Middle (opt)</Label>
                <Input value={form.middle_name} onChange={e => setForm({...form, middle_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gmail Account</Label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="@gmail.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  <SelectItem value="adviser">Adviser</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </ResponsiveDialog>
      </div>

      {users.length === 0 ? (
        <Card className="bg-surface-white rounded-xl shadow-sm">
          <CardContent className="text-center py-8 text-[13px] leading-[18px] text-text-secondary flex flex-col items-center gap-2">
            <Users className="h-8 w-8 text-text-placeholder" />
            No users in this department
          </CardContent>
        </Card>
      ) : users.map((u: any, index) => (
        <motion.div {...fadeSlideUp(index)} key={u.id}>
          <Link href={`/admin/departments/${params.deptId}/users/${u.user_id}`} prefetch={true}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-surface-white rounded-xl shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-surface-gray flex items-center justify-center text-[13px] leading-[18px] font-medium">
                    {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[15px] leading-[22px] font-medium">{u.first_name} {u.middle_name ? u.middle_name + ' ' : ''}{u.last_name}</p>
                    <p className="text-[11px] leading-[14px] text-text-secondary">{u.email || 'No email'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Badge variant={u.status === 'deactivated' ? 'destructive' : 'secondary'}>{u.role} {u.status === 'deactivated' ? '(Deactivated)' : ''}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error hover:bg-red-50" onClick={() => handleDelete(u.user_id, `${u.first_name} ${u.last_name}`)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-text-placeholder" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
