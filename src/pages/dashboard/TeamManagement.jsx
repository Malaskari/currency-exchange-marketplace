import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, X, Check, AlertCircle, Eye, Edit, DollarSign, Users, Shield, UserPlus, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full access to all accounts and settings', color: '#0f172a' },
  { value: 'sub_admin', label: 'Sub Admin', desc: 'Manage own accounts and operators', color: '#2563eb' },
  { value: 'operator', label: 'Operator', desc: 'Use system based on assigned accounts', color: '#64748b' },
];

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Overview and stats' },
  { id: 'requests', label: 'Requests', icon: '📋', desc: 'View and manage requests' },
  { id: 'sales', label: 'Sales', icon: '💰', desc: 'Sales transactions' },
  { id: 'accounts', label: 'Accounts', icon: '🏦', desc: 'Manage accounts' },
  { id: 'transactions', label: 'Transactions', icon: '💳', desc: 'Transaction history' },
  { id: 'card-purchases', label: 'Card Purchases', icon: '💳', desc: 'Card purchase requests' },
  { id: 'usdt-sales', label: 'USDT Sales', icon: '₿', desc: 'USDT sales management' },
  { id: 'reports', label: 'Reports', icon: '📈', desc: 'View reports and analytics' },
  { id: 'team', label: 'Team', icon: '👥', desc: 'Team management' },
  { id: 'settings', label: 'Settings', icon: '⚙️', desc: 'System settings' },
];

const RoleBadge = ({ role }) => {
  const roleData = ROLES.find(r => r.value === role) || ROLES[2];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 600,
      background: `${roleData.color}15`,
      color: roleData.color,
      border: `1px solid ${roleData.color}30`
    }}>
      {role === 'super_admin' && <Shield size={12} />}
      {role === 'sub_admin' && <Shield size={12} />}
      {role === 'operator' && <Users size={12} />}
      {roleData.label}
    </span>
  );
};

const fetchUsers = async () => {
  console.log('DEBUG: Fetching users from database...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('DEBUG: Error fetching users:', error);
    throw error;
  }
  console.log('DEBUG: Users fetched successfully:', data);
  return data;
};

const fetchAllAccounts = async () => {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, account_name, currency, account_type')
    .order('account_name');
  if (error) throw error;
  return data;
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
};

export const useAddUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const id = 'USR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const { error } = await supabase.from('users').insert({ ...data, id });
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const { error } = await supabase.from('users').update(changes).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUserPermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, permissions, pagePermissions }) => {
      // First delete existing account perms
      await supabase.from('user_accounts').delete().eq('user_id', userId);
      
      // Then insert new account perms
      if (permissions.length > 0) {
        const toInsert = permissions.map(p => ({
          user_id: userId,
          account_id: p.account_id,
          can_view: p.can_view,
          can_edit: p.can_edit,
          can_add: p.can_add,
          can_cashout: p.can_cashout,
        }));
        const { error } = await supabase.from('user_accounts').insert(toInsert);
        if (error) throw error;
      }

      // Handle page permissions
      // Delete existing page perms
      await supabase.from('user_pages').delete().eq('user_id', userId);

      // Insert new page perms
      if (pagePermissions && pagePermissions.length > 0) {
        const toInsert = pagePermissions.map(p => ({
          user_id: userId,
          page_id: p.page_id,
          can_access: p.can_access,
        }));
        const { error } = await supabase.from('user_pages').insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

const TeamManagement = () => {
  const { data: users = [], isLoading } = useUsers();
  const { data: allAccounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: fetchAllAccounts });
  
  const addUser = useAddUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const updatePermissions = useUpdateUserPermissions();

  const [modal, setModal] = useState(false);
  const [permModal, setPermModal] = useState(null); // user to edit permissions for
  const [editUserModal, setEditUserModal] = useState(null); // user to edit
  const [form, setForm] = useState({ email: '', name: '', role: 'operator', parent_user_id: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', parent_user_id: '', new_password: '' });
  const [permForm, setPermForm] = useState([]);
  const [pagePermForm, setPagePermForm] = useState([]);
  const [activeTab, setActiveTab] = useState('accounts')
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table or grid

const { user: currentUser } = useApp();
  
  // Support both 'super_admin' (new) and 'admin' (legacy team table)
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // Debug: let's see what's happening
  console.log('DEBUG: currentUser =', currentUser);
  console.log('DEBUG: users from query =', users);
  console.log('DEBUG: isSuperAdmin =', isSuperAdmin);

  // Super admins see all users, sub-admins see only their direct reports
  const accessibleUsers = useMemo(() => {
    console.log('DEBUG: accessibleUsers calculating...');
    if (!currentUser) {
      console.log('DEBUG: No current user, returning empty');
      return [];
    }
    // Super admin sees everything
    if (isSuperAdmin) {
      console.log('DEBUG: User is super admin, returning all users:', users);
      return users;
    }
    // Sub admin sees only users they directly created
    return users.filter(u => u.parent_user_id === currentUser.id);
  }, [users, currentUser, isSuperAdmin]);

  const subAdmins = useMemo(() => accessibleUsers.filter(u => u.role === 'sub_admin'), [accessibleUsers]);
  const operators = useMemo(() => accessibleUsers.filter(u => u.role === 'operator'), [accessibleUsers]);

  const filteredUsers = useMemo(() => {
    let result = accessibleUsers;
    if (filterRole !== 'all') {
      result = result.filter(u => u.role === filterRole);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [accessibleUsers, filterRole, searchQuery]);

  const openAdd = () => {
    setForm({ email: '', name: '', role: 'operator', parent_user_id: '', password: '' });
    setError('');
    setModal(true);
  };

  const handleAdd = async () => {
    if (!form.email || !form.name) {
      setError('Name and email are required');
      return;
    }
    
    // Super admins MUST have a password. Others optional.
    if (form.role === 'super_admin' && !form.password) {
      setError('Password is required for Super Admin');
      return;
    }
    
    const payload = { 
      email: form.email, 
      name: form.name, 
      role: form.role, 
    };

    // Set parent based on current user role
    if (isSuperAdmin) {
      // Super admin creates sub_admins with no parent, operators with themselves as parent
      payload.parent_user_id = form.role === 'operator' ? currentUser.id : null;
    } else {
      // Sub-admin can only create operators with themselves as parent
      payload.parent_user_id = currentUser.id;
    }

    if (form.password) {
      payload.password_hash = form.password;
    }
    
    try {
      await addUser.mutateAsync(payload);
      setModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const openPerms = async (user) => {
    setPermModal(user);
    setActiveTab('accounts')
    
    // Load existing account perms
    const { data: accountData } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', user.id);
    
    // Map to all accounts
    const mapped = allAccounts.map(acc => {
      const existing = accountData?.find(d => d.account_id === acc.id);
      return {
        account_id: acc.id,
        account_name: acc.account_name,
        currency: acc.currency,
        can_view: existing?.can_view ?? false,
        can_edit: existing?.can_edit ?? false,
        can_add: existing?.can_add ?? false,
        can_cashout: existing?.can_cashout ?? false,
      };
    });
    setPermForm(mapped);

    // Load existing page perms
    const { data: pageData } = await supabase
      .from('user_pages')
      .select('*')
      .eq('user_id', user.id);
    
    // Map to all pages
    const pageMapped = AVAILABLE_PAGES.map(page => {
      const existing = pageData?.find(d => d.page_id === page.id);
      return {
        page_id: page.id,
        label: page.label,
        icon: page.icon,
        can_access: existing?.can_access ?? false,
      };
    });
    setPagePermForm(pageMapped);
  };

  const savePerms = async () => {
    const activePerms = permForm.filter(p => p.can_view || p.can_edit || p.can_add || p.can_cashout);
    const activePagePerms = pagePermForm.filter(p => p.can_access);
    
    console.log('Saving permissions for user:', permModal.id, 'type:', typeof permModal.id);
    console.log('Active account permissions:', activePerms);
    console.log('Active page permissions:', activePagePerms);
    
    try {
      await updatePermissions.mutateAsync({ 
        userId: permModal.id, 
        permissions: activePerms,
        pagePermissions: activePagePerms
      });
      console.log('Permissions saved successfully!');
      setPermModal(null);
    } catch (err) {
      console.error('Error saving permissions:', err);
      alert('Error saving permissions: ' + err.message);
    }
  };

  const togglePerm = (accId, field) => {
    setPermForm(prev => prev.map(p => 
      p.account_id === accId ? { ...p, [field]: !p[field] } : p
    ));
  };

  const togglePagePerm = (pageId) => {
    setPagePermForm(prev => prev.map(p => 
      p.page_id === pageId ? { ...p, can_access: !p.can_access } : p
    ));
  };

  const openEditUser = (user) => {
    setEditUserModal(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'operator',
      parent_user_id: user.parent_user_id || '',
      new_password: ''
    });
    setError('');
  };

  const handleEditUser = async () => {
    if (!editForm.name || !editForm.email) {
      setError('Name and email are required');
      return;
    }

    try {
      const updates = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        parent_user_id: editForm.parent_user_id || null
      };

      if (editForm.new_password) {
        updates.password_hash = editForm.new_password;
      }

      await updateUser.mutateAsync({ id: editUserModal.id, changes: updates });
      setEditUserModal(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      await deleteUser.mutate(userId);
    }
  };

  return (
    <div className="team-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div className="page-title">Team Management</div>
          <div className="page-sub">Manage your team members and their account permissions</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, padding: '0 14px', height: 44 }}>
            <Users size={16} style={{ color: 'var(--text-muted)' }} />
            <select 
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer' }}
            >
              <option value="all">All Roles</option>
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              {isSuperAdmin && <option value="sub_admin">Sub Admin</option>}
              <option value="operator">Operator</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <button 
              onClick={() => setViewMode('table')}
              style={{ 
                padding: '0 14px', 
                height: 44, 
                border: 'none', 
                background: viewMode === 'table' ? '#f1f5f9' : '#fff', 
                color: viewMode === 'table' ? '#0f172a' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ 
                padding: '0 14px', 
                height: 44, 
                border: 'none', 
                background: viewMode === 'grid' ? '#f1f5f9' : '#fff', 
                color: viewMode === 'grid' ? '#0f172a' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
          </div>
          
          <button className="btn btn-primary" style={{ height: 44, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }} onClick={openAdd}>
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: 99 }}>2 new</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{filteredUsers.length}</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Total Members</div>
        </div>
        
        <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{filteredUsers.filter(u => u.role === 'sub_admin').length}</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Sub Admins</div>
        </div>
        
        <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{filteredUsers.filter(u => u.role === 'operator').length}</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Operators</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading team data...
        </div>
) : (
        <div className="table-wrap" style={{ borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid var(--border)' }}>
          <div style={{ padding: 24, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>All Team Members</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {filteredUsers.length} members {filterRole !== 'all' ? `(filtered by ${filterRole})` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, width: 160 }}
              />
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {viewMode === 'table' && (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Reports To</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const parent = users.find(x => x.id === u.parent_user_id);
                    return (
                      <motion.tr key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <td>
                          <div className="contact-cell">
                            <div className="table-avatar" style={{ background: u.role === 'super_admin' ? '#0f172a' : u.role === 'sub_admin' ? '#2563eb' : '#64748b', color: '#fff' }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="contact-name" style={{ fontWeight: 700 }}>{u.name}</div>
                              <div className="contact-meta" style={{ fontSize: 12 }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><RoleBadge role={u.role} /></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
                          {parent?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No manager</span>}
                        </td>
                        <td>
                          <div className="table-actions" style={{ gap: 8 }}>
                            {/* Edit button - show for all accessible users */}
                            <button className="btn btn-outline btn-sm" style={{ height: 32, padding: '0 12px', fontSize: 12, borderRadius: 8 }} onClick={() => openEditUser(u)}>
                              <Edit size={12} /> Edit
                            </button>
                            
                            {/* Permissions button - show for non-super-admin users */}
                            {u.role !== 'super_admin' && (
                              <>
                                <button className="btn btn-outline btn-sm" style={{ height: 32, padding: '0 12px', fontSize: 12, borderRadius: 8 }} onClick={() => openPerms(u)}>
                                  <Edit size={12} /> Permissions
                                </button>
                                {u.role === 'operator' && (
                                  <button className="btn-icon" style={{ width: 32, height: 32, borderRadius: 8, color: '#dc2626' }} onClick={() => handleDeleteUser(u.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        No team members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'grid' && (
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredUsers.map((u, idx) => {
                const parent = users.find(x => x.id === u.parent_user_id);
                return (
                  <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: u.role === 'super_admin' ? '#0f172a' : u.role === 'sub_admin' ? '#2563eb' : '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <RoleBadge role={u.role} />
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{parent?.name || 'No manager'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1, height: 36 }} onClick={() => openEditUser(u)}>
                        <Edit size={14} /> Edit
                      </button>
                      {u.role !== 'super_admin' && (
                        <button className="btn btn-outline btn-sm" style={{ flex: 1, height: 36 }} onClick={() => openPerms(u)}>
                          <Edit size={14} /> Perms
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 23, 42, 0.4)' }}
            onClick={() => setModal(false)}
          >
            <motion.div 
              className="modal-card" 
              style={{ 
                maxWidth: 440, 
                padding: 0, 
                borderRadius: 24,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }} 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 28, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>Add New Member</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Create a new team member account</div>
                </div>
                <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => setModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {error && (
                  <div style={{ 
                    padding: 14, 
                    background: '#fef2f2', 
                    color: '#dc2626', 
                    borderRadius: 12, 
                    fontSize: 13, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid #fee2e2'
                  }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                
                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>Full Name</label>
                  <input 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    placeholder="e.g. John Doe" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>Email Address</label>
                  <input 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    placeholder="e.g. john@company.com" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>Role</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {ROLES.filter(r => {
                      if (isSuperAdmin) return true;
                      // Sub-admin can only create operators
                      return r.value === 'operator';
                    }).map(r => (
                      <button
                        key={r.value}
                        onClick={() => setForm({...form, role: r.value})}
                        style={{
                          flex: 1,
                          minWidth: 100,
                          padding: '12px 16px',
                          borderRadius: 12,
                          border: form.role === r.value ? `2px solid ${r.color}` : '1.5px solid var(--border)',
                          background: form.role === r.value ? `${r.color}10` : '#f8fafc',
                          color: form.role === r.value ? r.color : 'var(--text-secondary)',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    {ROLES.find(r => r.value === form.role)?.desc}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>
                    Password {form.role === 'super_admin' && <span style={{color: 'var(--red-600)'}}>*</span>}
                  </label>
                  <input 
                    type="password" 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    placeholder="Enter password" 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                  />
                </div>

                {form.role === 'operator' && (
                  <div className="field">
                    <label className="field-label" style={{ fontWeight: 600 }}>Reports To</label>
                    <select 
                      className="input" 
                      style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                      value={form.parent_user_id} 
                      onChange={e => setForm({...form, parent_user_id: e.target.value})}
                    >
                      <option value="">Select Manager...</option>
                      {subAdmins.map(sa => <option key={sa.id} value={sa.id}>{sa.name}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, height: 48, borderRadius: 12 }} 
                    onClick={() => setModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, height: 48, borderRadius: 12 }} 
                    onClick={handleAdd}
                  >
                    Create Member
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permissions Modal */}
      <AnimatePresence>
        {permModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 23, 42, 0.4)' }}
            onClick={() => setPermModal(null)}
          >
            <motion.div 
              className="modal-card" 
              style={{ 
                maxWidth: 700, 
                maxHeight: '85vh', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 24,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }} 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 28, borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, #f8fafc, #fff)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 14, 
                      background: `linear-gradient(135deg, ${permModal.role === 'super_admin' ? '#0f172a' : permModal.role === 'sub_admin' ? '#2563eb' : '#64748b'} 0%, ${permModal.role === 'super_admin' ? '#334155' : permModal.role === 'sub_admin' ? '#1d4ed8' : '#94a3b8'} 100%)`,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 800
                    }}>
                      {permModal.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>Manage Permissions</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Set access rights for {permModal.name}</div>
                    </div>
                  </div>
                  <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => setPermModal(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: '#f1f5f9', borderRadius: 12, width: 'fit-content' }}>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: activeTab === 'accounts' ? '#fff' : 'transparent',
                      color: activeTab === 'accounts' ? '#0f172a' : '#64748b',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: activeTab === 'accounts' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    💰 Accounts
                  </button>
                  <button
                    onClick={() => setActiveTab('pages')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: activeTab === 'pages' ? '#fff' : 'transparent',
                      color: activeTab === 'pages' ? '#0f172a' : '#64748b',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: activeTab === 'pages' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    📄 Pages
                  </button>
                </div>

                {/* Accounts Tab */}
                {activeTab === 'accounts' && (
                  <table className="data-table" style={{ fontSize: 13, borderRadius: 12, overflow: 'hidden' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: 16, fontWeight: 700, background: '#f8fafc', color: '#64748b' }}>Account</th>
                        <th style={{ padding: 16, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#64748b' }}>View</th>
                        <th style={{ padding: 16, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#64748b' }}>Edit</th>
                        <th style={{ padding: 16, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#64748b' }}>Add</th>
                        <th style={{ padding: 16, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#64748b' }}>Cashout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permForm.map((p, idx) => (
                        <motion.tr 
                          key={p.account_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{p.account_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '2px 8px', 
                                background: p.currency === 'USD' ? '#dbeafe' : '#dcfce7', 
                                color: p.currency === 'USD' ? '#2563eb' : '#16a34a',
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 10
                              }}>
                                {p.currency}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: 14, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={p.can_view} 
                              onChange={() => togglePerm(p.account_id, 'can_view')} 
                              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#2563eb', borderRadius: 6 }} 
                            />
                          </td>
                          <td style={{ padding: 14, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={p.can_edit} 
                              onChange={() => togglePerm(p.account_id, 'can_edit')} 
                              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#2563eb', borderRadius: 6 }} 
                            />
                          </td>
                          <td style={{ padding: 14, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={p.can_add} 
                              onChange={() => togglePerm(p.account_id, 'can_add')} 
                              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#2563eb', borderRadius: 6 }} 
                            />
                          </td>
                          <td style={{ padding: 14, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={p.can_cashout} 
                              onChange={() => togglePerm(p.account_id, 'can_cashout')} 
                              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#2563eb', borderRadius: 6 }} 
                            />
                          </td>
                        </motion.tr>
                      ))}
                      {permForm.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                            No accounts found. Create accounts first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Pages Tab */}
                {activeTab === 'pages' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {pagePermForm.map((page, idx) => (
                      <motion.div
                        key={page.page_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => togglePagePerm(page.page_id)}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: page.can_access ? '2px solid #2563eb' : '1.5px solid var(--border)',
                          background: page.can_access ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: page.can_access ? '#2563eb' : '#f1f5f9',
                          color: page.can_access ? '#fff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {page.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{page.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{page.label}</div>
                        </div>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: page.can_access ? '2px solid #2563eb' : '2px solid var(--border)',
                          background: page.can_access ? '#2563eb' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {page.can_access && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc' }}>
                <button className="btn btn-outline" style={{ height: 44, borderRadius: 12 }} onClick={() => setPermModal(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ height: 44, borderRadius: 12, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }} onClick={savePerms} disabled={updatePermissions.isPending}>
                  {updatePermissions.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editUserModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 23, 42, 0.4)' }}
            onClick={() => setEditUserModal(null)}
          >
            <motion.div 
              className="modal-card" 
              style={{ 
                maxWidth: 440, 
                padding: 0, 
                borderRadius: 24,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }} 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 28, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>Edit Member</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Update member details and password</div>
                </div>
                <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={() => setEditUserModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {error && (
                  <div style={{ 
                    padding: 14, 
                    background: '#fef2f2', 
                    color: '#dc2626', 
                    borderRadius: 12, 
                    fontSize: 13, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid #fee2e2'
                  }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                
                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>Full Name</label>
                  <input 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    placeholder="e.g. John Doe" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>Email Address</label>
                  <input 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    placeholder="e.g. john@company.com" 
                    value={editForm.email} 
                    onChange={e => setEditForm({...editForm, email: e.target.value})} 
                  />
                </div>

                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>Role</label>
                  <select 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    value={editForm.role} 
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                  >
                    <option value="sub_admin">Sub Admin</option>
                    <option value="operator">Operator</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {editForm.role === 'operator' && (
                  <div className="field">
                    <label className="field-label" style={{ fontWeight: 600 }}>Reports To</label>
                    <select 
                      className="input" 
                      style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                      value={editForm.parent_user_id} 
                      onChange={e => setEditForm({...editForm, parent_user_id: e.target.value})}
                    >
                      <option value="">Select Manager...</option>
                      {users.filter(u => u.role === 'sub_admin' || u.role === 'super_admin').map(sa => (
                        <option key={sa.id} value={sa.id}>{sa.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label className="field-label" style={{ fontWeight: 600 }}>
                    New Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input 
                    type="password" 
                    className="input" 
                    style={{ height: 48, borderRadius: 12, background: '#f8fafc' }}
                    placeholder="Leave blank to keep current password" 
                    value={editForm.new_password} 
                    onChange={e => setEditForm({...editForm, new_password: e.target.value})} 
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, height: 48, borderRadius: 12 }} 
                    onClick={() => setEditUserModal(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, height: 48, borderRadius: 12 }} 
                    onClick={handleEditUser}
                    disabled={updateUser.isPending}
                  >
                    {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamManagement;
