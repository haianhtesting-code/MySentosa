'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole =
  | 'System Administrator'
  | 'NOP Operations Admin'
  | 'Current Ops Administrator'
  | 'Duty Manager'
  | 'Duty Officer'
  | 'Controller'
  | 'Responder (Ranger)'
  | 'Stakeholder'
  | 'SDC Stakeholder / Operational Viewer (incl. OR Team)'
  | 'Stakeholder Manager'
  | 'NOP Business Owner'
  | 'Applicant (Contractor)'
  | 'Liaison Officer'
  | 'Technical Approver';

interface RoleContextType {
  role: UserRole;
  username: string;
  approverDept: string;
  setRole: (role: UserRole) => void;
  setUsername: (username: string) => void;
  setApproverDept: (dept: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('Controller');
  const [username, setUsernameState] = useState<string>('Controller Steve');
  const [approverDept, setApproverDeptState] = useState<string>('wsh');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      let savedRole = localStorage.getItem('sentosa_cms_role') as UserRole;
      if ((savedRole as string) === 'Current Ops Administrator') savedRole = 'NOP Operations Admin';
      if ((savedRole as string) === 'Stakeholder') savedRole = 'SDC Stakeholder / Operational Viewer (incl. OR Team)';
      const savedUsername = localStorage.getItem('sentosa_cms_username');
      const savedDept = localStorage.getItem('sentosa_cms_approver_dept');
      if (savedRole) {
        setRoleState(savedRole);
      }
      if (savedUsername) {
        setUsernameState(savedUsername);
      }
      if (savedDept) {
        setApproverDeptState(savedDept);
      }
    } catch {
      // ignore in environments without localStorage
    }
  }, []);

  const setApproverDept = (newDept: string) => {
    setApproverDeptState(newDept);
    try {
      localStorage.setItem('sentosa_cms_approver_dept', newDept);
    } catch {}
  };

  const setRole = (inputRole: UserRole) => {
    let newRole = inputRole;
    if ((newRole as string) === 'Current Ops Administrator') newRole = 'NOP Operations Admin';
    if ((newRole as string) === 'Stakeholder') newRole = 'SDC Stakeholder / Operational Viewer (incl. OR Team)';
    setRoleState(newRole);
    try {
      localStorage.setItem('sentosa_cms_role', newRole);
    } catch {}

    if (newRole === 'Technical Approver') {
      setApproverDept('wsh');
    } else if (newRole === 'Liaison Officer') {
      setApproverDept('lo-ifm');
    } else {
      setApproverDept('all');
    }
    
    // Set default usernames based on role for testing convenience
    let newUsername = 'User';
    switch (newRole) {
      case 'Controller':
        newUsername = 'Controller Steve';
        break;
      case 'Duty Manager':
        newUsername = 'DM Gan';
        break;
      case 'Duty Officer':
        newUsername = 'DO Shin Feng';
        break;
      case 'Responder (Ranger)':
        newUsername = 'Ranger John';
        break;
      case 'NOP Operations Admin':
      case 'Current Ops Administrator':
        newUsername = 'Ops Admin Lee';
        break;
      case 'System Administrator':
        newUsername = 'Admin Root';
        break;
      case 'SDC Stakeholder / Operational Viewer (incl. OR Team)':
      case 'Stakeholder':
        newUsername = 'OR Team Lead (Audrey)';
        break;
      case 'Stakeholder Manager':
        newUsername = 'Stakeholder Manager Tan';
        break;
      case 'NOP Business Owner':
        newUsername = 'NOP Business Owner (Director)';
        break;
      case 'Applicant (Contractor)':
        newUsername = 'David Tan';
        break;
      case 'Liaison Officer':
        newUsername = 'Gary Ng';
        break;
      case 'Technical Approver':
        newUsername = 'Wong Siew Leng';
        break;
    }
    setUsername(newUsername);
  };

  const setUsername = (newUsername: string) => {
    setUsernameState(newUsername);
    try {
      localStorage.setItem('sentosa_cms_username', newUsername);
    } catch {}
  };

  return (
    <RoleContext.Provider value={{ role, username, approverDept, setRole, setUsername, setApproverDept }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
