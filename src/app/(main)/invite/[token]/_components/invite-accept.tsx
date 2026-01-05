"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, X, Loader2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { OrganizationRole } from "@/types/database"
import { toast } from "sonner"
import Link from "next/link"

interface InviteDetails {
  id: string
  email: string
  role: OrganizationRole
  expires_at: string
  organization_id: string
  organization_name: string
}

interface InviteAcceptProps {
  token: string
}

export function InviteAccept({ token }: InviteAcceptProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchInviteDetails()
    checkUser()
  }, [token])

  async function checkUser() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  async function fetchInviteDetails() {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          email,
          role,
          expires_at,
          organization_id,
          organizations (name)
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .single()

      if (error || !data) {
        setError("This invitation is invalid or has expired.")
        return
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired.")
        return
      }

      setInvite({
        id: data.id,
        email: data.email,
        role: data.role,
        expires_at: data.expires_at,
        organization_id: data.organization_id,
        organization_name: (data.organizations as any)?.name || 'Unknown Organization',
      })
    } catch (err) {
      console.error('Error fetching invite:', err)
      setError("Failed to load invitation details.")
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!invite || !user) return

    // Check if user email matches invitation
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      toast.error("You must be logged in with the email address the invitation was sent to.")
      return
    }

    setAccepting(true)
    try {
      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: invite.role,
          invited_by: null, // Could store this from invitation
          accepted_at: new Date().toISOString(),
        })

      if (memberError) {
        if (memberError.message.includes('duplicate')) {
          toast.error("You are already a member of this organization.")
        } else {
          throw memberError
        }
        return
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      toast.success("You've joined the organization!")
      
      // Store the new org as current
      localStorage.setItem('current_organization_id', invite.organization_id)
      
      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      toast.error(err.message || "Failed to accept invitation")
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invite?.organization_name}</strong>.
              Please sign in or create an account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/auth/v1/login?redirect=/invite/${token}`}>
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/auth/v1/register?redirect=/invite/${token}&email=${encodeURIComponent(invite?.email || '')}`}>
                Create Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join Organization</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invite?.organization_name}</strong> as a <strong className="capitalize">{invite?.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Logged in as: <strong>{user.email}</strong></p>
          {user.email?.toLowerCase() !== invite?.email.toLowerCase() && (
            <p className="text-destructive mt-2">
              This invitation was sent to <strong>{invite?.email}</strong>. 
              Please sign in with that email address.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => router.push('/')}
          >
            Decline
          </Button>
          <Button 
            className="flex-1"
            onClick={handleAccept}
            disabled={accepting || user.email?.toLowerCase() !== invite?.email.toLowerCase()}
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Accept & Join
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
