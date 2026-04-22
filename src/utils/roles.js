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
    if (isAdmin(user.role)) return true;
    if (isNormalUser(user.role)) return false;
    if (isDepartmentHead(user.role)) {
        // If department is null/empty, it means "All Departments" (Global) access.
        if (!user.department) return true;
        return true; 
    }
    return false;
}

export function canEditDepartment(user, targetDepartmentName) {
    if (!user || user.status === 'Inactive') return false;
    if (isAdmin(user.role)) return true;
    if (isNormalUser(user.role)) return false;
    if (isDepartmentHead(user.role)) {
        // If department is null/empty, it means "All Departments" (Global) access.
        if (!user.department) return true;
        return user.department === targetDepartmentName;
    }
    return false;
}

export function canViewAdminArea(user) {
    if (!user || user.status === 'Inactive') return false;
    // admin role has access
    if (isAdmin(user.role)) return true;
    // Manager/DeptHead only has access if they belong to the 'Admin' department
    if (isDepartmentHead(user.role)) {
        return user.department === 'Admin';
    }
    return false;
}

export function roleDisplayLabel(role) {
    if (isDepartmentHead(role)) return 'Department Head';
    return role || '—';
}
