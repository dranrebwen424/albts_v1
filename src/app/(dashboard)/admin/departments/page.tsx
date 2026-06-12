'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { getDepartments, createDepartment } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Building2, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const init = async () => {
      const data = await getDepartments();
      setDepartments(data);
      setLoading(false);
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (creating) return;
    if (!newName.trim() || !newCode.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setCreating(true);
    try {
      await createDepartment(newName, newCode);
      toast.success('Department created');
      setShowCreate(false);
      setNewName('');
      setNewCode('');
      const data = await getDepartments();
      setDepartments(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[30px] font-[650] tracking-[-0.04em]">Departments</h1>
          <p className="text-[13px] leading-[18px] text-text-secondary mt-1">Manage all departments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Department
        </Button>
        <ResponsiveDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          title="Create Department"
          description="Add a new academic department"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Bachelor of Science in Computer Science" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g., BSCS" />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </ResponsiveDialog>
      </div>

      <motion.div variants={staggerContainer()} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, index) => (
          <motion.div {...fadeSlideUp(index)} key={dept.id}>
            <Link href={`/admin/departments/${dept.id}/events`} prefetch={true}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-surface-white rounded-xl shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-gray flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-[17px] leading-6 font-[590] tracking-[-0.02em]">{dept.name}</CardTitle>
                      <p className="text-[11px] leading-[14px] text-text-secondary">{dept.code}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-[13px] leading-[18px] text-text-secondary">
                    <span>View details</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
