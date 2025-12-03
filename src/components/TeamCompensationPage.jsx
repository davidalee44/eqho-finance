import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  UserCircle,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react';

const TEAM_STORAGE_KEY = 'eqho_team_data';

// Known team members mapping from QuickBooks payroll data (October 2025)
// Used for auto-assignment when importing new members
const KNOWN_TEAM_MEMBERS = {
  // Executive / Founders
  'david lee': { department: 'executive', role: 'CEO / Founder', type: 'founder' },
  'andy ball': { department: 'executive', role: 'Chief Revenue Officer', type: 'founder' },
  'andrew ball': { department: 'executive', role: 'Chief Revenue Officer', type: 'founder' },
  
  // Product & Engineering
  'caleb gorden': { department: 'productEngineering', role: 'Lead Engineer / Tech Lead', type: 'contractor' },
  'daniel mcconnell': { department: 'productEngineering', role: 'Senior Full-Stack Engineer', type: 'contractor' },
  'kyle nadauld': { department: 'productEngineering', role: 'Senior Full-Stack Engineer', type: 'contractor' },
  'tyler karren': { department: 'productEngineering', role: 'Full-Stack Engineer', type: 'contractor' },
  'jaxon ball': { department: 'productEngineering', role: 'Backend Engineer', type: 'contractor' },
  'ben harward': { department: 'productEngineering', role: 'Frontend Engineer', type: 'contractor' },
  
  // Sales & Marketing
  'cooper schow': { department: 'salesMarketing', role: 'Sales Director', type: 'contractor' },
  
  // Customer Success
  'bethany meyer': { department: 'customerSuccess', role: 'Customer Success Manager', type: 'contractor' },
  "bethany rene' meyer": { department: 'customerSuccess', role: 'Customer Success Manager', type: 'contractor' },
  'bethany rene meyer': { department: 'customerSuccess', role: 'Customer Success Manager', type: 'contractor' },
  'celine taylor': { department: 'customerSuccess', role: 'Support Specialist', type: 'contractor' },
  'jesse plumb': { department: 'customerSuccess', role: 'Technical Support Engineer', type: 'contractor' },
  
  // Operations
  'cameron lee': { department: 'operations', role: 'Administrative Assistant', type: 'contractor' },
};

/**
 * Find a known team member by name (fuzzy matching)
 * @param {string} name - The name to look up
 * @returns {object|null} - The known member data or null if not found
 */
const findKnownMember = (name) => {
  if (!name) return null;
  
  const normalizedName = name.toLowerCase().trim();
  
  // Direct match
  if (KNOWN_TEAM_MEMBERS[normalizedName]) {
    return KNOWN_TEAM_MEMBERS[normalizedName];
  }
  
  // Try partial matches (first name + last name)
  const nameParts = normalizedName.split(/\s+/);
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    for (const [knownName, data] of Object.entries(KNOWN_TEAM_MEMBERS)) {
      const knownParts = knownName.split(/\s+/);
      const knownFirst = knownParts[0];
      const knownLast = knownParts[knownParts.length - 1];
      
      // Match first and last name
      if (firstName === knownFirst && lastName === knownLast) {
        return data;
      }
      
      // Partial first name match (for nicknames like "Beth" -> "Bethany")
      if (lastName === knownLast && (knownFirst.startsWith(firstName) || firstName.startsWith(knownFirst))) {
        return data;
      }
    }
  }
  
  return null;
};

// Predefined roles by department
const DEPARTMENT_ROLES = {
  executive: [
    'CEO / Founder',
    'CTO',
    'CFO',
    'COO',
    'President',
    'VP Engineering',
    'VP Sales',
    'VP Product',
    'VP Operations',
    'Chief Revenue Officer',
  ],
  productEngineering: [
    'Lead Engineer / Tech Lead',
    'Senior Full-Stack Engineer',
    'Senior Backend Engineer',
    'Senior Frontend Engineer',
    'Full-Stack Engineer',
    'Backend Engineer',
    'Frontend Engineer',
    'Mobile Engineer',
    'DevOps Engineer',
    'QA Engineer',
    'Data Engineer',
    'ML Engineer',
    'Product Manager',
    'UX/UI Designer',
  ],
  salesMarketing: [
    'VP Sales',
    'Sales Director',
    'Account Executive',
    'Sales Development Rep (SDR)',
    'Business Development Manager',
    'Marketing Director',
    'Marketing Manager',
    'Content Marketing Manager',
    'Growth Manager',
    'Demand Gen Manager',
    'Social Media Manager',
  ],
  customerSuccess: [
    'Head of Customer Success',
    'Customer Success Manager',
    'Account Manager',
    'Support Specialist',
    'Technical Support Engineer',
    'Onboarding Specialist',
    'Customer Experience Manager',
  ],
  operations: [
    'COO',
    'Operations Manager',
    'Office Manager',
    'Finance Manager',
    'Controller',
    'HR Manager',
    'Recruiter',
    'Administrative Assistant',
    'Executive Assistant',
    'Coordinator',
  ],
};

// Department configuration with colors
const DEPARTMENT_CONFIG = [
  { key: 'unassigned', label: 'Unassigned', color: 'amber', icon: AlertCircle, description: 'Members awaiting role assignment' },
  { key: 'executive', label: 'Executive', color: 'purple', icon: Building2, description: 'Leadership team' },
  { key: 'productEngineering', label: 'Product & Engineering', color: 'emerald', icon: Users, description: 'Product and tech team' },
  { key: 'salesMarketing', label: 'Sales & Marketing', color: 'blue', icon: Users, description: 'Revenue and growth team' },
  { key: 'customerSuccess', label: 'Customer Success', color: 'orange', icon: Users, description: 'Customer-facing team' },
  { key: 'operations', label: 'Operations', color: 'slate', icon: Users, description: 'Back-office operations' },
];

// Color classes for each department
const COLOR_CLASSES = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-900 dark:text-amber-100', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: 'text-amber-600 dark:text-amber-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-900 dark:text-purple-100', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: 'text-purple-600 dark:text-purple-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-900 dark:text-emerald-100', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: 'text-emerald-600 dark:text-emerald-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-100', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: 'text-blue-600 dark:text-blue-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-900 dark:text-orange-100', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: 'text-orange-600 dark:text-orange-400' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-900/50', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-900 dark:text-slate-100', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200', icon: 'text-slate-600 dark:text-slate-400' },
};

// Empty team structure
const EMPTY_TEAM = {
  unassigned: [],
  executive: [],
  productEngineering: [],
  salesMarketing: [],
  customerSuccess: [],
  operations: [],
};

/**
 * Team & Compensation Page
 * 
 * Features:
 * - Unassigned section at top for newly imported members
 * - Easy assignment workflow from Unassigned to departments
 * - Import from CSV/Excel with members defaulting to Unassigned
 * - Inline editing of team member details
 * - Compensation summary by department
 */
export const TeamCompensationPage = () => {
  const { effectiveIsAdmin } = useAuth();

  // Load saved team data
  const loadSavedTeam = () => {
    try {
      const saved = localStorage.getItem(TEAM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          unassigned: parsed.unassigned || [],
          executive: parsed.executive || [],
          productEngineering: parsed.productEngineering || [],
          salesMarketing: parsed.salesMarketing || [],
          customerSuccess: parsed.customerSuccess || [],
          operations: parsed.operations || [],
        };
      }
    } catch (error) {
      console.error('Error loading saved team:', error);
    }
    return EMPTY_TEAM;
  };

  const [team, setTeam] = useState(loadSavedTeam);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    department: 'unassigned',
    role: '',
    type: 'contractor',
    monthlyPayout: '',
    email: '',
  });

  // Save to localStorage whenever team changes
  useEffect(() => {
    try {
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    } catch (error) {
      console.error('Error saving team:', error);
    }
  }, [team]);

  // Calculate totals
  const calculateDepartmentTotal = (members) => {
    return members.reduce((sum, member) => sum + (member.monthlyPayout || 0), 0);
  };

  const calculateGrandTotal = () => {
    return Object.values(team).reduce((sum, members) => sum + calculateDepartmentTotal(members), 0);
  };

  const totalMembers = Object.values(team).flat().length;
  const unassignedCount = team.unassigned?.length || 0;

  // Update team member
  const updateTeamMember = (department, index, field, value) => {
    setTeam(prev => ({
      ...prev,
      [department]: prev[department].map((member, i) =>
        i === index ? { ...member, [field]: field === 'monthlyPayout' ? parseFloat(value) || 0 : value } : member
      ),
    }));
  };

  // Remove team member
  const removeTeamMember = (department, index) => {
    setTeam(prev => ({
      ...prev,
      [department]: prev[department].filter((_, i) => i !== index),
    }));
  };

  // Move member to a different department
  const moveMember = (fromDept, index, toDept) => {
    const member = team[fromDept][index];
    if (!member) return;

    setTeam(prev => ({
      ...prev,
      [fromDept]: prev[fromDept].filter((_, i) => i !== index),
      [toDept]: [...prev[toDept], { ...member, role: '' }], // Clear role when moving
    }));
  };

  // Add new team member
  const handleAddMember = () => {
    if (!newMember.name) return;

    const member = {
      name: newMember.name,
      role: newMember.role || '',
      type: newMember.type,
      monthlyPayout: parseFloat(newMember.monthlyPayout) || 0,
      email: newMember.email || '',
    };

    setTeam(prev => ({
      ...prev,
      [newMember.department]: [...prev[newMember.department], member],
    }));

    // Reset form
    setNewMember({
      name: '',
      department: 'unassigned',
      role: '',
      type: 'contractor',
      monthlyPayout: '',
      email: '',
    });
    setShowAddForm(false);
  };

  // Auto-assign unassigned members based on known team data
  const handleAutoAssign = () => {
    const unassigned = team.unassigned || [];
    if (unassigned.length === 0) return;

    let assigned = 0;
    let remaining = 0;
    const newTeam = { ...team, unassigned: [] };

    unassigned.forEach(member => {
      const known = findKnownMember(member.name);
      
      if (known) {
        // Found a match - assign to the correct department
        const assignedMember = {
          ...member,
          role: known.role,
          type: known.type,
        };
        newTeam[known.department] = [...(newTeam[known.department] || []), assignedMember];
        assigned++;
      } else {
        // No match - keep in unassigned
        newTeam.unassigned.push(member);
        remaining++;
      }
    });

    setTeam(newTeam);
    
    if (assigned > 0) {
      alert(`✅ Auto-assigned ${assigned} team member(s)!${remaining > 0 ? `\n⚠️ ${remaining} member(s) could not be matched and remain unassigned.` : ''}`);
    } else {
      alert('⚠️ No members could be auto-assigned. They may be new team members not in the known list.');
    }
  };

  // Handle CSV/Excel upload with auto-assign option
  const handleFileUpload = (event, autoAssign = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        let imported = 0;
        let autoAssigned = 0;
        const newTeam = { ...team };

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].includes('\t') 
            ? lines[i].split('\t') 
            : lines[i].split(',');
          
          if (parts.length >= 1) {
            const name = parts[0]?.trim().replace(/^"|"$/g, '');
            const amountStr = parts[1]?.trim().replace(/[$,"\s]/g, '') || '0';
            const amount = parseFloat(amountStr);
            const email = parts[2]?.trim().replace(/^"|"$/g, '') || '';
            
            if (name && name.toLowerCase() !== 'name') {
              const known = autoAssign ? findKnownMember(name) : null;
              
              if (known) {
                // Auto-assign to known department and role
                const newMember = {
                  name,
                  role: known.role,
                  type: known.type,
                  monthlyPayout: isNaN(amount) ? 0 : amount,
                  email,
                };
                newTeam[known.department] = [...(newTeam[known.department] || []), newMember];
                autoAssigned++;
              } else {
                // Add to unassigned
                const newMember = {
                  name,
                  role: '',
                  type: 'contractor',
                  monthlyPayout: isNaN(amount) ? 0 : amount,
                  email,
                };
                newTeam.unassigned = [...(newTeam.unassigned || []), newMember];
              }
              imported++;
            }
          }
        }

        if (imported > 0) {
          setTeam(newTeam);
          
          if (autoAssign && autoAssigned > 0) {
            const remaining = imported - autoAssigned;
            alert(`✅ Imported ${imported} team member(s)!\n🎯 Auto-assigned ${autoAssigned} to their departments.${remaining > 0 ? `\n⚠️ ${remaining} unrecognized member(s) added to Unassigned.` : ''}`);
          } else {
            alert(`✅ Imported ${imported} team member(s) to Unassigned. Assign them to departments and roles.`);
          }
        } else {
          alert('⚠️ No valid data found. Ensure your file has Name in the first column.');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('❌ Error reading file. Please ensure it\'s a valid CSV/Excel export.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  // Export to CSV
  const handleExport = () => {
    const rows = ['Name,Department,Role,Type,Monthly Payout,Email'];
    
    DEPARTMENT_CONFIG.forEach(({ key, label }) => {
      (team[key] || []).forEach(member => {
        rows.push(`"${member.name}","${label}","${member.role || ''}","${member.type}",${member.monthlyPayout || 0},"${member.email || ''}"`);
      });
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-compensation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear all data
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all team data? This cannot be undone.')) {
      setTeam(EMPTY_TEAM);
    }
  };

  // Render member row
  const renderMemberRow = (member, index, department, isUnassigned = false) => {
    const colors = COLOR_CLASSES[DEPARTMENT_CONFIG.find(d => d.key === department)?.color || 'slate'];
    
    return (
      <TableRow key={`${department}-${index}`} className="group">
        <TableCell className="font-medium">
          <Input
            value={member.name}
            onChange={(e) => updateTeamMember(department, index, 'name', e.target.value)}
            placeholder="Name"
            className="h-8 text-sm border-transparent hover:border-input focus:border-input"
          />
        </TableCell>
        <TableCell>
          {isUnassigned ? (
            <Select
              value=""
              onValueChange={(value) => moveMember(department, index, value)}
            >
              <SelectTrigger className="h-8 text-sm w-[180px] border-amber-300 bg-amber-50 dark:bg-amber-950/50">
                <SelectValue placeholder="Assign to dept..." />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_CONFIG.filter(d => d.key !== 'unassigned').map(dept => (
                  <SelectItem key={dept.key} value={dept.key}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={member.role || ''}
              onValueChange={(value) => updateTeamMember(department, index, 'role', value)}
            >
              <SelectTrigger className="h-8 text-sm w-[180px]">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_ROLES[department]?.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>
        <TableCell>
          <Select
            value={member.type}
            onValueChange={(value) => updateTeamMember(department, index, 'type', value)}
          >
            <SelectTrigger className="h-8 text-sm w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="founder">Founder</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <CurrencyInput
            value={member.monthlyPayout}
            onChange={(value) => updateTeamMember(department, index, 'monthlyPayout', value)}
            className="h-8 text-sm w-[120px]"
            placeholder="0"
          />
        </TableCell>
        <TableCell>
          <Input
            value={member.email || ''}
            onChange={(e) => updateTeamMember(department, index, 'email', e.target.value)}
            placeholder="email@example.com"
            className="h-8 text-sm border-transparent hover:border-input focus:border-input w-[180px]"
          />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isUnassigned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveMember(department, index, 'unassigned')}
                className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                title="Move to Unassigned"
              >
                <ArrowRight className="h-3 w-3 rotate-180" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTeamMember(department, index)}
              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Render department section
  const renderDepartmentSection = (config) => {
    const { key, label, color, icon: Icon, description } = config;
    const members = team[key] || [];
    const deptTotal = calculateDepartmentTotal(members);
    const colors = COLOR_CLASSES[color];
    const isUnassigned = key === 'unassigned';

    if (members.length === 0 && !isUnassigned) return null;

    return (
      <Card key={key} className={`${colors.border} border-2 ${isUnassigned && members.length > 0 ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
        <CardHeader className={`${colors.bg} pb-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.badge}`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </div>
              <div>
                <CardTitle className={`text-base ${colors.text}`}>{label}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge className={colors.badge}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Badge>
              {deptTotal > 0 && (
                <p className={`text-sm font-mono font-semibold mt-1 ${colors.text}`}>
                  ${deptTotal.toLocaleString()}/mo
                </p>
              )}
            </div>
          </div>
          {isUnassigned && members.length > 0 && (
            <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/50 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Assign team members manually or use Auto-Assign for known members
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600"
                  onClick={handleAutoAssign}
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-Assign All
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs w-[180px]">Name</TableHead>
                  <TableHead className="text-xs w-[180px]">{isUnassigned ? 'Assign To' : 'Role'}</TableHead>
                  <TableHead className="text-xs w-[120px]">Type</TableHead>
                  <TableHead className="text-xs w-[120px]">Monthly Pay</TableHead>
                  <TableHead className="text-xs w-[180px]">Email</TableHead>
                  <TableHead className="text-xs w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member, index) => renderMemberRow(member, index, key, isUnassigned))}
              </TableBody>
            </Table>
          ) : isUnassigned ? (
            <div className="p-8 text-center text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No unassigned members</p>
              <p className="text-xs mt-1">Import team members or add them manually</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team & Compensation</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage team members, roles, and compensation across departments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
            </Badge>
            {unassignedCount > 0 && (
              <Badge variant="destructive" className="text-sm animate-pulse">
                {unassignedCount} unassigned
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {/* Import Button */}
                <label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('file-upload').click();
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />

                {/* Import with Auto-Assign Button */}
                <label htmlFor="file-upload-auto">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('file-upload-auto').click();
                    }}
                  >
                    <Wand2 className="h-4 w-4" />
                    Import + Auto-Assign
                  </Button>
                </label>
                <input
                  id="file-upload-auto"
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="hidden"
                />

                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExport}
                  disabled={totalMembers === 0}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>

                {/* Add Member Button */}
                <Button
                  variant={showAddForm ? 'secondary' : 'default'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <UserPlus className="h-4 w-4" />
                  {showAddForm ? 'Cancel' : 'Add Member'}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Monthly Payroll</p>
                  <p className="text-lg font-bold font-mono">${calculateGrandTotal().toLocaleString()}</p>
                </div>
                
                {effectiveIsAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Add Member Form */}
            {showAddForm && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={newMember.name}
                      onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Department</Label>
                    <Select
                      value={newMember.department}
                      onValueChange={(value) => setNewMember(prev => ({ ...prev, department: value, role: '' }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_CONFIG.map(dept => (
                          <SelectItem key={dept.key} value={dept.key}>{dept.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value }))}
                      disabled={newMember.department === 'unassigned'}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={newMember.department === 'unassigned' ? 'Assign dept first' : 'Select role...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_ROLES[newMember.department]?.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={newMember.type}
                      onValueChange={(value) => setNewMember(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="founder">Founder</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Pay</Label>
                    <CurrencyInput
                      value={newMember.monthlyPayout}
                      onChange={(value) => setNewMember(prev => ({ ...prev, monthlyPayout: value }))}
                      className="h-9"
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">&nbsp;</Label>
                    <Button
                      onClick={handleAddMember}
                      disabled={!newMember.name}
                      className="w-full h-9"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Help */}
        <Accordion type="single" collapsible>
          <AccordionItem value="import-help" className="border rounded-lg px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Import Instructions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="text-sm space-y-3">
                <p className="text-muted-foreground">
                  Import team members from a CSV or Excel file. Use <strong>Import + Auto-Assign</strong> to automatically assign known team members to their departments.
                </p>
                
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                  <p className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2 mb-2">
                    <Wand2 className="h-4 w-4" />
                    Auto-Assign Feature
                  </p>
                  <p className="text-xs text-purple-800 dark:text-purple-300">
                    Auto-assign recognizes existing team members from QuickBooks payroll data and automatically assigns them to the correct department and role. Unrecognized names go to Unassigned.
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-md font-mono text-xs">
                  <p className="font-semibold mb-1">Expected CSV Format:</p>
                  Name, Amount, Email<br/>
                  David Lee, 2340, dave@eqho.ai<br/>
                  Caleb Gorden, 4167, caleb@eqho.ai
                </div>
                
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                  <li>First row is treated as headers (skipped)</li>
                  <li>Name column is required</li>
                  <li>Amount and Email columns are optional</li>
                  <li>Supports CSV, TSV, and Excel exports from QuickBooks</li>
                  <li><strong>Auto-Assign</strong> matches names against known team roster</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Unassigned Section - Always visible at top */}
        {renderDepartmentSection(DEPARTMENT_CONFIG[0])}

        {/* Separator if there are unassigned members */}
        {unassignedCount > 0 && (
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">Assigned Departments</span>
            <Separator className="flex-1" />
          </div>
        )}

        {/* Department Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DEPARTMENT_CONFIG.slice(1).map(config => renderDepartmentSection(config))}
        </div>

        {/* Summary Card */}
        <Card className="border-2 border-primary/30">
          <CardHeader className="bg-primary/5 pb-3">
            <CardTitle className="text-base">Compensation Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {DEPARTMENT_CONFIG.filter(d => d.key !== 'unassigned').map(({ key, label, color }) => {
                const members = team[key] || [];
                const deptTotal = calculateDepartmentTotal(members);
                const employeeCount = members.filter(m => m.type === 'employee').length;
                const contractorCount = members.filter(m => m.type === 'contractor').length;
                const colors = COLOR_CLASSES[color];
                
                return (
                  <div key={key} className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                    <p className={`text-xs font-medium ${colors.text} mb-1 truncate`}>{label}</p>
                    <p className={`text-lg font-bold font-mono ${colors.text}`}>
                      ${(deptTotal / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {employeeCount}E / {contractorCount}C
                    </p>
                  </div>
                );
              })}
              <div className="p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
                <p className="text-xs font-medium text-primary mb-1">Total</p>
                <p className="text-xl font-bold font-mono text-primary">
                  ${(calculateGrandTotal() / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalMembers} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamCompensationPage;

