"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Organization, OrganizationRole, UserOrganization } from '@/types/database'
import { User } from '@supabase/supabase-js'

interface OrganizationContextType {
  // Current user
  user: User | null
  loading: boolean
  
  // Organizations
  organizations: UserOrganization[]
  currentOrganization: UserOrganization | null
  
  // Current role in org
  userRole: OrganizationRole | null
  
  // Actions
  setCurrentOrganization: (org: UserOrganization) => void
  refreshOrganizations: () => Promise<void>
  createOrganization: (name: string) => Promise<string | null>
  
  // Permission helpers
  canEdit: boolean // owner, admin, manager
  canManageMembers: boolean // owner, admin
  canDelete: boolean // owner, admin
  isOwner: boolean // owner only
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

const ORG_STORAGE_KEY = 'current_organization_id'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [currentOrganization, setCurrentOrganizationState] = useState<UserOrganization | null>(null)
  
  const supabase = createBrowserClient()
  
  // Get user's organizations
  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([])
      setCurrentOrganizationState(null)
      return
    }
    
    try {
      const { data, error } = await supabase.rpc('get_user_organizations', {
        p_user_id: user.id
      })
      
      if (error) {
        // Check if it's because the function or tables don't exist
        if (error.message?.includes('does not exist') || error.code === '42883' || error.code === '42P01') {
          console.warn('Multi-tenant tables not set up yet. Using default organization.')
          // Create a default org for the current user
          const defaultOrg: UserOrganization = {
            organization_id: user.id, // Use user ID as org ID
            organization_name: 'My Organization',
            organization_slug: 'default',
            user_role: 'owner'
          }
          setOrganizations([defaultOrg])
          setCurrentOrganizationState(defaultOrg)
          return
        }
        
        console.error('Error fetching organizations:', error?.message || error)
        // Fallback: query directly
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select(`
            role,
            organization:organizations (
              id,
              name,
              slug
            )
          `)
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null)
        
        if (memberError) {
          // Tables don't exist - use default org
          if (memberError.message?.includes('does not exist') || memberError.code === '42P01') {
            console.warn('Organization tables not set up yet. Using default organization.')
            const defaultOrg: UserOrganization = {
              organization_id: user.id,
              organization_name: 'My Organization',
              organization_slug: 'default',
              user_role: 'owner'
            }
            setOrganizations([defaultOrg])
            setCurrentOrganizationState(defaultOrg)
            return
          }
        }
        
        if (!memberError && memberData) {
          const orgs: UserOrganization[] = memberData
            .filter((m: any) => m.organization)
            .map((m: any) => ({
              organization_id: m.organization.id,
              organization_name: m.organization.name,
              organization_slug: m.organization.slug,
              user_role: m.role as OrganizationRole
            }))
          
          if (orgs.length === 0) {
            // No orgs found - create default
            const defaultOrg: UserOrganization = {
              organization_id: user.id,
              organization_name: 'My Organization',
              organization_slug: 'default',
              user_role: 'owner'
            }
            setOrganizations([defaultOrg])
            setCurrentOrganizationState(defaultOrg)
            return
          }
          
          setOrganizations(orgs)
          
          // Restore or set current org
          const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY)
          const savedOrg = orgs.find(o => o.organization_id === savedOrgId)
          
          if (savedOrg) {
            setCurrentOrganizationState(savedOrg)
          } else if (orgs.length > 0) {
            setCurrentOrganizationState(orgs[0])
            localStorage.setItem(ORG_STORAGE_KEY, orgs[0].organization_id)
          }
        }
        return
      }
      
      const orgs: UserOrganization[] = (data || []).map((d: any) => ({
        organization_id: d.organization_id,
        organization_name: d.organization_name,
        organization_slug: d.organization_slug,
        user_role: d.user_role as OrganizationRole
      }))
      
      // If no orgs from RPC, create default
      if (orgs.length === 0) {
        const defaultOrg: UserOrganization = {
          organization_id: user.id,
          organization_name: 'My Organization',
          organization_slug: 'default',
          user_role: 'owner'
        }
        setOrganizations([defaultOrg])
        setCurrentOrganizationState(defaultOrg)
        return
      }
      
      setOrganizations(orgs)
      
      // Restore or set current org
      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY)
      const savedOrg = orgs.find(o => o.organization_id === savedOrgId)
      
      if (savedOrg) {
        setCurrentOrganizationState(savedOrg)
      } else if (orgs.length > 0) {
        setCurrentOrganizationState(orgs[0])
        localStorage.setItem(ORG_STORAGE_KEY, orgs[0].organization_id)
      }
    } catch (error: any) {
      console.error('Error in refreshOrganizations:', error?.message || error)
      // Fallback to default org on any error
      if (user) {
        const defaultOrg: UserOrganization = {
          organization_id: user.id,
          organization_name: 'My Organization',
          organization_slug: 'default',
          user_role: 'owner'
        }
        setOrganizations([defaultOrg])
        setCurrentOrganizationState(defaultOrg)
      }
    }
  }, [user, supabase])
  
  // Set current organization
  const setCurrentOrganization = useCallback((org: UserOrganization) => {
    setCurrentOrganizationState(org)
    localStorage.setItem(ORG_STORAGE_KEY, org.organization_id)
  }, [])
  
  // Create new organization
  const createOrganization = useCallback(async (name: string): Promise<string | null> => {
    if (!user) return null
    
    try {
      const { data, error } = await supabase.rpc('create_organization', {
        p_name: name,
        p_owner_id: user.id
      })
      
      if (error) {
        console.error('Error creating organization:', error)
        return null
      }
      
      // Refresh organizations list
      await refreshOrganizations()
      
      return data as string
    } catch (error) {
      console.error('Error in createOrganization:', error)
      return null
    }
  }, [user, supabase, refreshOrganizations])
  
  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )
    
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    
    return () => subscription.unsubscribe()
  }, [supabase])
  
  // Load organizations when user changes
  useEffect(() => {
    if (user) {
      refreshOrganizations()
    } else {
      setOrganizations([])
      setCurrentOrganizationState(null)
    }
  }, [user, refreshOrganizations])
  
  // Computed permissions
  const userRole = currentOrganization?.user_role ?? null
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'manager'
  const canManageMembers = userRole === 'owner' || userRole === 'admin'
  const canDelete = userRole === 'owner' || userRole === 'admin'
  const isOwner = userRole === 'owner'
  
  return (
    <OrganizationContext.Provider
      value={{
        user,
        loading,
        organizations,
        currentOrganization,
        userRole,
        setCurrentOrganization,
        refreshOrganizations,
        createOrganization,
        canEdit,
        canManageMembers,
        canDelete,
        isOwner,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

// Helper hook to get organization ID for queries
export function useOrgId() {
  const { currentOrganization } = useOrganization()
  return currentOrganization?.organization_id ?? null
}
