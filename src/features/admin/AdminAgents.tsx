import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  createAgent,
  listAllAgents,
  setAgentActive,
} from '@/lib/supabase/queries/agents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import type { Agent, AgentRole } from '@/lib/supabase/types';

export function AdminAgents() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AgentRole>('agent');
  const [adding, setAdding] = useState(false);

  async function reload() {
    try {
      setAgents(await listAllAgents());
    } catch (e) {
      toast({ title: 'Load failed', description: (e as Error).message, variant: 'error' });
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function add() {
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Name and email required', variant: 'error' });
      return;
    }
    setAdding(true);
    try {
      await createAgent({ full_name: name.trim(), email: email.trim(), role });
      toast({ title: `Added ${name}`, variant: 'success' });
      setName('');
      setEmail('');
      setRole('agent');
      reload();
    } catch (e) {
      toast({ title: 'Add failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(a: Agent) {
    try {
      await setAgentActive(a.id, !a.active);
      toast({ title: `${a.full_name} ${a.active ? 'deactivated' : 'reactivated'}`, variant: 'success' });
      reload();
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'error' });
    }
  }

  if (!agents) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-3xl tracking-tight2 mb-1">Agents</h2>
        <p className="text-muted-foreground text-sm">Agents appear in the picker in the top nav. Deactivated agents stay on historical quotes.</p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-medium mb-3">Add agent</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ashley" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ashley@seka.example" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as AgentRole)}
            >
              <option value="agent">agent</option>
              <option value="owner">owner</option>
              <option value="dispatch">dispatch</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={add} disabled={adding}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.full_name}</TableCell>
              <TableCell className="text-muted-foreground">{a.email}</TableCell>
              <TableCell>
                <Badge variant={a.role === 'owner' ? 'accent' : 'muted'}>{a.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={a.active ? 'success' : 'muted'}>{a.active ? 'active' : 'inactive'}</Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => toggleActive(a)}>
                  {a.active ? 'Deactivate' : 'Reactivate'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
