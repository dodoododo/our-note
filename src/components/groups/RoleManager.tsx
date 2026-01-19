import { Shield, User, Crown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleManagerProps {
  member: string;
  group: any;
  currentUser: any;
  onRoleChange: (member: string, role: string) => void;
}

export default function RoleManager({ member, group, currentUser, onRoleChange }: RoleManagerProps) {
  const memberRole = group.member_roles?.[member] || 'member';
  const isOwner = member === group.owner;
  const isCurrentUserOwner = currentUser?.email === group.owner;
  const canChangeRole = isCurrentUserOwner && !isOwner && member !== currentUser?.email;

  const getRoleIcon = (role: string) => {
    if (isOwner) return <Crown className="w-3 h-3" />;
    if (role === 'admin') return <Shield className="w-3 h-3" />;
    return <User className="w-3 h-3" />;
  };

  const getRoleColor = (role: string) => {
    if (isOwner) return 'bg-amber-100 text-amber-700';
    if (role === 'admin') return 'bg-indigo-100 text-indigo-700';
    return 'bg-slate-100 text-slate-700';
  };

  if (!canChangeRole) {
    return (
      <Badge className={`rounded-full ${getRoleColor(memberRole)}`}>
        <span className="flex items-center gap-1">
          {getRoleIcon(memberRole)}
          {isOwner ? 'Owner' : memberRole === 'admin' ? 'Admin' : 'Member'}
        </span>
      </Badge>
    );
  }

  return (
    <Select value={memberRole} onValueChange={(value) => onRoleChange(member, value)}>
      <SelectTrigger className="w-32 h-8 rounded-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">
          <span className="flex items-center gap-2">
            <User className="w-3 h-3" />
            Member
          </span>
        </SelectItem>
        <SelectItem value="admin">
          <span className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}