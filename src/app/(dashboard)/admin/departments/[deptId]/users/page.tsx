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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const params = useParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ first_name: '', middle_name: '', last_name: '', email: '', role: 'officer' });

  useEffect(() => {
    const init = async () => {
      const data = await getDepartmentUsers(params.deptId as string);
      setUsers(data);
      setLoading(false);
    };
    init();
  }, [params.deptId]);

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Please fill required fields');
      return;
    }
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
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Create a new user account. Default password: Mabini2026</DialogDescription>
            </DialogHeader>
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
              <Button className="w-full" onClick={handleCreate}>Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-sm text-neutral-500 flex flex-col items-center gap-2">
            <Users className="h-8 w-8 text-neutral-300" />
            No users in this department
          </CardContent>
        </Card>
      ) : users.map((u: any) => (
        <Card key={u.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-medium">
                {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{u.first_name} {u.middle_name ? u.middle_name + ' ' : ''}{u.last_name}</p>
                <p className="text-xs text-neutral-500">{u.email || 'No email'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{u.role}</Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(u.user_id, `${u.first_name} ${u.last_name}`)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
