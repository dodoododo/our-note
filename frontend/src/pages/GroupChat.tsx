import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ChatWindow from '../components/chat/ChatWindow.tsx';

export default function GroupChat() {
  const [user, setUser] = useState<any>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData = await mockApiClient.auth.me();
      setUser(userData);
    } catch (e) {
      mockApiClient.auth.redirectToLogin();
    }
  };

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => mockApiClient.entities.Group.filter({ id: groupId }).then(r => r[0]),
    enabled: !!groupId,
  });

  if (isLoading || !group || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={`${createPageUrl('GroupDetail')}?id=${groupId}`}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{group.name}</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {group.members?.length || 1} members
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <ChatWindow group={group} user={user} />
      </Card>
    </div>
  );
}