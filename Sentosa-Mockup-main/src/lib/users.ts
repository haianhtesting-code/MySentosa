export interface UserAccount {
  id: string;
  name: string;
  username?: string;
  title?: string;
  email: string;
  phone: string;
  department: string;
  orgUnit: string;
  authSource: 'WOG SSO' | 'Non-SSO';
  role: string;
  status: 'Active' | 'Deactivated';
  lastLogin: string;
  company?: string;
  canActAsApplicant?: boolean;
}

export const DEFAULT_USERS: UserAccount[] = [
  // 1. Core Platform Roles
  { id: '1', name: 'Controller Steve', title: 'Senior Operations Controller', email: 'steve.rogers@sdc.gov.sg', phone: '+65 9111 0001', department: 'IIOC Operations', orgUnit: 'IOH Team Alpha', authSource: 'WOG SSO', role: 'Controller', status: 'Active', lastLogin: '2026-06-13T22:15:00Z' },
  { id: '2', name: 'DM Gan', title: 'Duty Manager (IIOC)', email: 'gan.sh@sdc.gov.sg', phone: '+65 9876 5432', department: 'IIOC Management', orgUnit: 'IOH Duty Managers', authSource: 'WOG SSO', role: 'Duty Manager', status: 'Active', lastLogin: '2026-06-13T23:05:00Z' },
  { id: '3', name: 'DO Shin Feng', title: 'Duty Officer (IIOC)', email: 'shin.feng@sdc.gov.sg', phone: '+65 9123 4567', department: 'IIOC Operations', orgUnit: 'IOH Team Beta', authSource: 'WOG SSO', role: 'Duty Officer', status: 'Active', lastLogin: '2026-06-13T20:44:00Z' },
  { id: '4', name: 'Ranger John', title: 'Senior Security Ranger', email: 'john.doe@ranger.com.sg', phone: '+65 9333 4444', department: 'Security & Ranger Service', orgUnit: 'Siloso Beach Patrol', authSource: 'Non-SSO', role: 'Responder', status: 'Active', lastLogin: '2026-06-13T19:30:00Z' },
  { id: '5', name: 'Admin Root', title: 'Lead Systems Architect', email: 'admin.root@sdc.gov.sg', phone: '+65 9111 0005', department: 'Information Technology', orgUnit: 'System Administrators', authSource: 'Non-SSO', role: 'System Administrator', status: 'Active', lastLogin: '2026-06-13T23:38:00Z' },
  { id: '7', name: 'Analyst Sarah', title: 'Operational Resilience Analyst', email: 'sarah.analyst@sdc.gov.sg', phone: '+65 9111 0007', department: 'Business Continuity', orgUnit: 'Operational Resilience', authSource: 'WOG SSO', role: 'Operational Resilience Analyst', status: 'Active', lastLogin: '2026-06-12T09:00:00Z' },
  { id: '8', name: 'Recipient Tony', title: 'Precinct Representative', email: 'tony.stark@partner.com.sg', phone: '+65 9111 0008', department: 'Sentosa Cove Joint Committee', orgUnit: 'External Stakeholder', authSource: 'WOG SSO', role: 'Broadcast Recipient', status: 'Active', lastLogin: '2026-06-10T11:20:00Z' },
  { id: '9', name: 'Contractor Bob', title: 'Term Contractor Lead', email: 'bob.builder@coporate.com', phone: '+65 9111 0009', department: 'Facilities Maintenance', orgUnit: 'Engie Facility Team', authSource: 'Non-SSO', role: 'Non-SDC Term Contractor', status: 'Active', lastLogin: '2026-06-13T08:15:00Z' },

  // 2. NOP Platform Administration & Stakeholders
  { id: 'nop-admin-1', name: 'Ops Admin Lee', title: 'Senior Executive (NOP Operations & Admin)', email: 'ops.admin@sdc.gov.sg', phone: '+65 9111 0015', department: 'SDC Central Operations', orgUnit: 'NOP Management Branch', authSource: 'WOG SSO', role: 'System Administrator', status: 'Active', lastLogin: '2026-06-13T23:10:00Z' },
  { id: 'nop-lo-1', name: 'Gary Ng', title: 'Senior Facilities Manager (IFM)', email: 'gary.ng@sdc.gov.sg', phone: '+65 9111 0016', department: 'Estate & Precinct Management', orgUnit: 'IFM Facilities Team', authSource: 'WOG SSO', role: 'Liaison Officer', status: 'Active', lastLogin: '2026-06-13T21:40:00Z' },
  { id: 'nop-lo-2', name: 'Jonathan Teo', title: 'Liaison Officer (Sentosa Express)', email: 'jonathan.teo@sdc.gov.sg', phone: '+65 9111 0021', department: 'Sentosa Express Engineering', orgUnit: 'Operations Support', authSource: 'WOG SSO', role: 'Liaison Officer', status: 'Active', lastLogin: '2026-06-13T20:00:00Z' },
  { id: 'nop-lo-3', name: 'Marcus Koh', title: 'Liaison Officer (Attractions & Commercial)', email: 'marcus.koh@sdc.gov.sg', phone: '+65 9111 0022', department: 'Commercial & Attractions', orgUnit: 'Attractions Liaison', authSource: 'WOG SSO', role: 'Liaison Officer', status: 'Active', lastLogin: '2026-06-13T19:30:00Z' },
  { id: 'nop-lo-4', name: 'Eric Tan', title: 'Liaison Officer (Traffic & Gateway)', email: 'eric.tan@sdc.gov.sg', phone: '+65 9111 0023', department: 'Traffic Management & Safety', orgUnit: 'Traffic & Infrastructure', authSource: 'WOG SSO', role: 'Liaison Officer', status: 'Active', lastLogin: '2026-06-13T18:45:00Z' },
  { id: 'nop-lo-5', name: 'Tan Boon Teck', title: 'Liaison Officer (C&S Engineering)', email: 'boonteck.tan@sdc.gov.sg', phone: '+65 9111 0024', department: 'Civil & Structural Engineering', orgUnit: 'Engineering Services', authSource: 'WOG SSO', role: 'Liaison Officer', status: 'Active', lastLogin: '2026-06-13T17:15:00Z' },
  { id: 'nop-app-1', name: 'David Tan', title: 'Project Director (Kim Seng Construction)', email: 'david.tan@kimseng.sg', phone: '+65 9888 1234', department: 'Kim Seng Construction Pte Ltd', company: 'Kim Seng Construction Pte Ltd', orgUnit: 'Civil & Infrastructure Division', authSource: 'Non-SSO', role: 'Applicant (Contractor)', status: 'Active', lastLogin: '2026-06-13T18:20:00Z', canActAsApplicant: true },
  { id: 'nop-sm-1', name: 'Stakeholder Manager Tan', title: 'Senior Manager (Commercial Relations)', email: 'manager.tan@sdc.gov.sg', phone: '+65 9111 0017', department: 'Stakeholder Engagement', company: 'Kim Seng Construction Pte Ltd', orgUnit: 'Commercial Relations', authSource: 'WOG SSO', role: 'Stakeholder Manager', status: 'Active', lastLogin: '2026-06-13T16:05:00Z', canActAsApplicant: true },
  { id: 'nop-bo-1', name: 'NOP Business Owner (Director)', title: 'Director (Island Operations & Asset Management)', email: 'director.nop@sdc.gov.sg', phone: '+65 9111 0018', department: 'SDC Directorate', orgUnit: 'Executive Office', authSource: 'WOG SSO', role: 'NOP Business Owner', status: 'Active', lastLogin: '2026-06-13T11:30:00Z' },
  { id: 'nop-or-1', name: 'OR Team Lead (Audrey)', title: 'Lead (Operational Resilience & OR Team)', email: 'or.lead@sdc.gov.sg', phone: '+65 9111 0019', department: 'Business Continuity & Resilience', orgUnit: 'OR Team', authSource: 'WOG SSO', role: 'SDC Stakeholder / Operational Viewer (incl. OR Team)', status: 'Active', lastLogin: '2026-06-13T14:50:00Z' },

  // 3. Technical Approvers (10 Real-world SDC Domain Reviewers)
  { id: 'ta-wsh', name: 'Wong Siew Leng', title: 'Head (Workplace Safety & Health)', email: 'wong.sl@sdc.gov.sg', phone: '+65 9222 1001', department: 'Workplace Safety & Health', orgUnit: 'WSH Inspectorate', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T22:00:00Z' },
  { id: 'ta-express', name: 'Tan Kian Seng', title: 'General Manager (Sentosa Express)', email: 'tan.ks@sentosaexpress.sg', phone: '+65 9222 1002', department: 'Sentosa Express Engineering', orgUnit: 'Rolling Stock & Traction Group', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T20:15:00Z' },
  { id: 'ta-cableway', name: 'Lim Chee Meng', title: 'Lead Ropeway Safety Engineer', email: 'lim.cm@mountfaber.com.sg', phone: '+65 9222 1003', department: 'Mount Faber Ropeway Safety', orgUnit: 'Cableway Engineering Safety Group', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T19:45:00Z' },
  { id: 'ta-traffic', name: 'Mohd Firdaus', title: 'Senior Manager (Traffic & Road Safety)', email: 'firdaus.m@sdc.gov.sg', phone: '+65 9222 1004', department: 'Traffic Management & Safety', orgUnit: 'Road Safety & Traffic Group', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T17:30:00Z' },
  { id: 'ta-cspe', name: 'Er. Ng Beng Hock', title: 'Principal Civil & Structural PE', email: 'ng.bh@peboard.gov.sg', phone: '+65 9222 1005', department: 'C&S PE Structural Panel', orgUnit: 'Accredited Structural Engineers Panel', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T15:00:00Z' },
  { id: 'ta-geotech', name: 'Er. Dr. Goh Teck Soon', title: 'Geotechnical Specialist PE', email: 'goh.ts@geotech.gov.sg', phone: '+65 9222 1006', department: 'Geotechnical & Utilities', orgUnit: 'Geotechnical Specialist Panel', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T14:15:00Z' },
  { id: 'ta-landscape', name: 'Audrey Seah', title: 'Head (Landscape & Tree Conservation)', email: 'audrey.seah@sdc.gov.sg', phone: '+65 9222 1007', department: 'Landscape & Environmental', orgUnit: 'Landscape & Ecology Management Group', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T13:45:00Z' },
  { id: 'ta-marine', name: 'Capt. David Koh', title: 'Principal Coastal & Marine Specialist', email: 'david.koh@mpa.gov.sg', phone: '+65 9222 1008', department: 'Coastal & Maritime Engineering', orgUnit: 'Marine Operations & Seafront Safety', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T12:00:00Z' },
  { id: 'ta-precinct', name: 'David Lim', title: 'Senior Facilities Manager', email: 'david.lim@sdc.gov.sg', phone: '+65 9222 1009', department: 'Precinct Operations (IFM)', orgUnit: 'Sentosa Cove Facilities Operations', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T11:00:00Z' },
  { id: 'ta-ops', name: 'Daniel Lim', title: 'Director (Island Operations)', email: 'daniel.lim@sdc.gov.sg', phone: '+65 9222 1010', department: 'SDC Central Operations', orgUnit: 'Central Operations Authority Group', authSource: 'WOG SSO', role: 'Technical Approver', status: 'Active', lastLogin: '2026-06-13T10:30:00Z' },

  // Additional Contractor Demo Accounts
  { id: 'nop-app-2', name: 'Lim Wei Ling', title: 'Certified Arborist & Project Lead (GreenScape)', email: 'lim.weiling@greenscape.sg', phone: '+65 9234 5678', department: 'GreenScape Arboriculture Pte Ltd', company: 'GreenScape Arboriculture Pte Ltd', orgUnit: 'Arboriculture Division', authSource: 'Non-SSO', role: 'Applicant (Contractor)', status: 'Active', lastLogin: '2026-06-13T17:20:00Z', canActAsApplicant: true },
  { id: 'nop-app-3', name: 'Ahmad Razif', title: 'Infrastructure Manager (SenTech Utilities)', email: 'ahmad.razif@sentech.com.sg', phone: '+65 9345 6789', department: 'SenTech Utilities Pte Ltd', company: 'SenTech Utilities Pte Ltd', orgUnit: 'High Voltage & Civil Division', authSource: 'Non-SSO', role: 'Applicant (Contractor)', status: 'Active', lastLogin: '2026-06-13T16:20:00Z', canActAsApplicant: true }
];

// In-memory cache to replace localStorage
let usersCache: UserAccount[] | null = null;

export function getUsers(): UserAccount[] {
  if (usersCache) return usersCache;
  return DEFAULT_USERS;
}

export function saveUsers(users: UserAccount[]): void {
  usersCache = users;
}

// ASYNC API METHODS for MongoDB
export async function fetchUsers(): Promise<UserAccount[]> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    usersCache = data;
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error; // Throw instead of fallback to strictly block on error
  }
}

export async function apiSaveUsers(users: UserAccount[]): Promise<void> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
    if (!res.ok) throw new Error('Failed to save users');
    saveUsers(users); // update sync cache
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

