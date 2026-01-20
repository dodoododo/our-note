import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Shield, Palette, Save, Check, Paintbrush, Camera } from 'lucide-react';
import { themePresets, generateThemeFromColor } from '../components/theme/ThemeGenerator.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

// 1. Define Interfaces to fix "Property does not exist on type never"
interface UserData {
  id: string;
  email: string;
  full_name: string;
  profile_pic_url?: string;
  theme_hue?: number;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

interface Theme {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  accentAlt: string;
  gradient: string;
  gradientAlt: string;
}

export default function Settings() {
  // 2. Add Generics to useState to allow null OR object
  const [user, setUser] = useState<UserData | null>(null);
  const [editedUser, setEditedUser] = useState({
    full_name: '',
  });
  const [selectedThemeHue, setSelectedThemeHue] = useState<number>(250);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient(); // This was missing in your imports

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await mockApiClient.auth.me();
      setUser(userData);
      setEditedUser({
        full_name: userData.full_name || '',
      });
      setSelectedThemeHue(userData.theme_hue || 250);
      setPreviewTheme(generateThemeFromColor(userData.theme_hue || 250));
    } catch (e) {
      mockApiClient.auth.redirectToLogin();
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserData>) => {
      await mockApiClient.auth.updateMe(data);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Best practice
      loadUser();
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async (themeHue: number) => {
      await mockApiClient.auth.updateMe({ theme_hue: themeHue });
    },
    onSuccess: () => {
      toast.success('Theme applied! Refreshing...');
      setTimeout(() => window.location.reload(), 500);
    },
  });

  // 3. Add Types to function arguments
  const handleThemePreview = (hue: number) => {
    setSelectedThemeHue(hue);
    setPreviewTheme(generateThemeFromColor(hue));
  };

  const handleProfilePicUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProfilePic(true);
      const { file_url } = await mockApiClient.integrations.Core.UploadFile({ file });
      await updateUserMutation.mutateAsync({ profile_pic_url: file_url });
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Settings */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {user.profile_pic_url ? (
                <img 
                  src={user.profile_pic_url} 
                  alt={user.full_name}
                  className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <Avatar className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500">
                  <AvatarFallback className="bg-transparent text-white text-2xl font-bold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingProfilePic}
                className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg border-2 border-indigo-100 hover:bg-indigo-50 transition-colors"
              >
                {uploadingProfilePic ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                )}
              </button>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800">{user.full_name || 'User'}</h3>
              <p className="text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">Click camera to change photo</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePicUpload}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Edit Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editedUser.full_name}
                onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                placeholder="Your full name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user.email}
                disabled
                className="rounded-xl bg-slate-50"
              />
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>
            <Button 
              onClick={() => updateUserMutation.mutate(editedUser)}
              disabled={updateUserMutation.isPending}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Notifications
          </CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Email Notifications</p>
              <p className="text-sm text-slate-500">Receive email updates about your groups</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Event Reminders</p>
              <p className="text-sm text-slate-500">Get reminded about upcoming events</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Task Assignments</p>
              <p className="text-sm text-slate-500">Notify when tasks are assigned to you</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Privacy
          </CardTitle>
          <CardDescription>Control your privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Show Profile to Group Members</p>
              <p className="text-sm text-slate-500">Allow group members to see your profile</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Allow Invitations</p>
              <p className="text-sm text-slate-500">Receive group invitations from others</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-indigo-500" />
            Theme
          </CardTitle>
          <CardDescription>Customize your app's color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Preview */}
          {previewTheme && (
            <div className="p-6 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl shadow-lg" style={{ background: previewTheme.gradient }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <Palette className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Preview</p>
                  <p className="font-semibold text-slate-800">Your Custom Theme</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 flex-1 rounded-lg" style={{ background: previewTheme.primary }} />
                <div className="h-10 flex-1 rounded-lg" style={{ background: previewTheme.accent }} />
                <div className="h-10 flex-1 rounded-lg" style={{ background: previewTheme.secondary }} />
                <div className="h-10 flex-1 rounded-lg" style={{ background: previewTheme.accentAlt }} />
              </div>
            </div>
          )}

          {/* Color Palette */}
          <div className="space-y-3">
            <Label>Choose Your Color</Label>
            <div className="relative">
              <div className="grid grid-cols-8 gap-3">
                {themePresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleThemePreview(preset.hue)}
                    className={`group relative w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 ${
                      selectedThemeHue === preset.hue 
                        ? 'ring-4 ring-offset-2 scale-110' 
                        : 'hover:ring-2 hover:ring-offset-2'
                    }`}
                    // 4. Fixed: 'ringColor' is not a valid style prop.
                    style={{ 
                      background: preset.color
                    }}
                    title={preset.name}
                  >
                    {selectedThemeHue === preset.hue && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white drop-shadow-lg" />
                      </div>
                    )}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        {preset.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Apply Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Changes will apply across the entire app
            </p>
            <Button 
              onClick={() => updateThemeMutation.mutate(selectedThemeHue)}
              disabled={updateThemeMutation.isPending || selectedThemeHue === user.theme_hue}
              className="rounded-full"
              style={{ 
                background: previewTheme?.gradient,
                opacity: selectedThemeHue === user.theme_hue ? 0.5 : 1
              }}
            >
              <Palette className="w-4 h-4 mr-2" />
              {updateThemeMutation.isPending ? 'Applying...' : 'Apply Theme'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            About FamFlow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Built with</span>
              <span className="font-medium">❤️ for families & couples</span>
            </div>
            <Separator />
            <p className="text-slate-500 pt-2">
              FamFlow helps families, couples, and friends stay organized together. 
              Manage tasks, notes, events, and calendars all in one beautiful app.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}