import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Camera, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

function getInitials(user) {
  if (user?.display_name) {
    const parts = user.display_name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user?.email) return user.email.slice(0, 2).toUpperCase();
  return 'U';
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name ?? '');
  }, [user?.display_name]);

  if (!user) return null;

  const lastLoginLabel = user.last_login_at
    ? format(new Date(user.last_login_at), 'PPpp')
    : '—';

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (profileError) throw profileError;

      await refreshUser();
      toast({ title: 'Profile picture updated' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      toast({ title: 'Display name saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated' });
    } catch (err) {
      toast({ title: 'Password change failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Profile Picture</CardTitle>
          <CardDescription>Upload a photo for your account</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar_url ?? undefined} alt={displayName || user.email} />
              <AvatarFallback className="text-xl font-semibold bg-muted">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              {uploadingAvatar ? 'Uploading...' : 'Change photo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
            <p className="text-sm font-medium mt-1">{user.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Role</Label>
            <p className="text-sm font-medium mt-1 capitalize">{user.role}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Last Login</Label>
            <p className="text-sm font-medium mt-1">{lastLoginLabel}</p>
          </div>
          <form onSubmit={handleSaveName} className="space-y-2 pt-2">
            <Label htmlFor="displayName">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
              <Button type="submit" disabled={savingName}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
