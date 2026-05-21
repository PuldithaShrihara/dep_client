export function isAdmin(role) {
    return role === 'Admin';
}

export function isDepartmentHead(role) {
    return role === 'DepartmentHead' || role === 'Manager' || role === 'DeptHead';
}

export function isNormalUser(role) {
    return role === 'User';
}

/** True if this user may change plan data (backend enforces the same rules). */
export function canEditPlans(user) {
    if (!user || user.status === 'Inactive') return false;
    if (isNormalUser(user.role)) return false;
    return true; // Admin and DeptHead can edit plans in the departments they can see
}

export function canEditDepartment(user, targetDepartmentName) {
    if (!user || user.status === 'Inactive') return false;
    if (isNormalUser(user.role)) return false;
    
    // Strict department boundary for ALL roles, including Admin
    if (user.department) {
        return user.department === targetDepartmentName;
    }
    
    // If no department is set (Global), they can edit anything
    return true;
}

export function canViewDepartment(user, targetDepartmentName) {
    if (!user || user.status === 'Inactive') return false;
    
    // Strict department boundary for ALL roles, including Admin
    if (user.department) {
        return user.department === targetDepartmentName;
    }
    
    // If no department is set (Global), they can view anything
    return true;
}

export function canViewAdminArea(user) {
    if (!user || user.status === 'Inactive') return false;
    
    // If restricted to a non-Admin department, they cannot view Admin area
    if (user.department && user.department !== 'Admin') {
        return false;
    }
    
    if (isAdmin(user.role)) return true;
    if (isDepartmentHead(user.role)) return true;
    
    return false;
}

export function roleDisplayLabel(role) {
    if (isDepartmentHead(role)) return 'Department Head';
    return role || '—';
}
