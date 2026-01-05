"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, Mail, Copy, Check, Trash2, Crown, Shield, UserCircle, Eye, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { useOrganization } from "@/contexts/organization-context"
import { supabase } from "@/lib/supabase"
import { OrganizationRole } from "@/types/database"
import { toast } from "sonner"

interface Member {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: OrganizationRole
  accepted_at: string | null
}

interface Invitation {
  id: string
  email: string
  role: OrganizationRole
  created_at: string
  expires_at: string
  token: string
}

const roleIcons: Record<OrganizationRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  manager: UserCircle,
  viewer: Eye,
}

const roleColors: Record<OrganizationRole, string> = {
  owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
}

export function OrganizationSettings() {
  const router = useRouter()
  const { currentOrganization, loading: orgLoading, isOwner, canManageMembers, user } = useOrganization()
  const orgId = currentOrganization?.organization_id

  const [orgName, setOrgName] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("viewer")
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (orgId) {
      setOrgName(currentOrganization?.organization_name || "")
      fetchMembers()
      fetchInvitations()
    }
  }, [orgId])

  async function fetchMembers() {
    if (!orgId) return
    
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, accepted_at')
        .eq('organization_id', orgId)

      if (error) {
        // Table might not exist yet
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('organization_members table not yet created - run the migration')
          setMembers([])
          return
        }
        throw error
      }

      // For now, just show user_id since we can't access auth.admin from browser
      // In a real app, you'd have a profiles table or use a server action
      const memberDetails: Member[] = (data || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        email: member.user_id, // Will show user ID for now
        full_name: null,
        role: member.role,
        accepted_at: member.accepted_at,
      }))

      setMembers(memberDetails)
    } catch (error: any) {
      console.error('Error fetching members:', error?.message || error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchInvitations() {
    if (!orgId) return
    
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, email, role, created_at, expires_at, token')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (error) {
        // Table might not exist yet
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('invitations table not yet created - run the migration')
          setInvitations([])
          return
        }
        throw error
      }
      setInvitations(data || [])
    } catch (error: any) {
      console.error('Error fetching invitations:', error?.message || error)
    }
  }

  async function handleSaveOrgName() {
    if (!orgId || !orgName.trim()) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', orgId)

      if (error) throw error
      toast.success("Organization name updated")
    } catch (error: any) {
      console.error('Error updating org name:', error)
      toast.error(error.message || "Failed to update organization name")
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite() {
    if (!orgId || !inviteEmail.trim()) return
    
    setInviting(true)
    try {
      // Create invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

      const { error } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          email: inviteEmail.toLowerCase().trim(),
          role: inviteRole,
          token,
          expires_at: expiresAt.toISOString(),
          invited_by: user?.id,
        })

      if (error) throw error

      toast.success("Invitation created")
      setInviteEmail("")
      setInviteOpen(false)
      fetchInvitations()
    } catch (error: any) {
      console.error('Error creating invitation:', error)
      toast.error(error.message || "Failed to create invitation")
    } finally {
      setInviting(false)
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error
      toast.success("Invitation cancelled")
      fetchInvitations()
    } catch (error: any) {
      console.error('Error cancelling invitation:', error)
      toast.error(error.message || "Failed to cancel invitation")
    }
  }

  async function handleRemoveMember(memberId: string, memberUserId: string) {
    if (memberUserId === user?.id) {
      toast.error("You cannot remove yourself")
      return
    }
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      toast.success("Member removed")
      fetchMembers()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || "Failed to remove member")
    }
  }

  async function handleUpdateRole(memberId: string, newRole: OrganizationRole) {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      toast.success("Role updated")
      fetchMembers()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(error.message || "Failed to update role")
    }
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success("Invite link copied to clipboard")
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (orgLoading || !orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">Manage your organization and team members</p>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Details
          </CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <div className="flex gap-2">
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isOwner}
              />
              {isOwner && (
                <Button onClick={handleSaveOrgName} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage who has access to this organization
              </CardDescription>
            </div>
            {canManageMembers && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrganizationRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer - Can view data</SelectItem>
                          <SelectItem value="manager">Manager - Can edit data</SelectItem>
                          <SelectItem value="admin">Admin - Can manage members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                      {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Members */}
              <div className="space-y-2">
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role]
                  const isCurrentUser = member.user_id === user?.id
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.full_name || member.email}
                            {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManageMembers && !isCurrentUser && member.role !== 'owner' ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleUpdateRole(member.id, v as OrganizationRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={roleColors[member.role]} variant="secondary">
                            {member.role}
                          </Badge>
                        )}
                        {canManageMembers && !isCurrentUser && member.role !== 'owner' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.full_name || member.email} from this organization?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id, member.user_id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pending Invitations</h4>
                    <div className="space-y-2">
                      {invitations.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-dashed"
                        >
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{invite.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Expires {new Date(invite.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{invite.role}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyInviteLink(invite.token)}
                            >
                              {copiedToken === invite.token ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleCancelInvitation(invite.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
