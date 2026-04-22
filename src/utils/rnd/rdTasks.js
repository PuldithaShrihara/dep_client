/** Client-side R&D nested task helpers (mirrors server migration / reconcile behavior for UI). */

export function migrateLegacyRdTasksToNested(tasks) {
    if (!tasks || !tasks.length) return [];
    const groups = [];
    let current = null;

    const pushSubFromRow = (row) => {
        if (!current) return;
        const title = (row.mediaType || '').trim();
        if (!title) return;
        current.subtasks.push({
            title,
            responsible: row.marketingChannel || '',
            assignedEmployee: row.owner || '',
            status: row.status || 'planning',
            remark: [row.mainGoal, row.description].filter(Boolean).join(' — ') || '',
            startDate: row.startDate || '',
            endDate: row.endDate || '',
            isDone: !!(row.done || (row.status || '').toLowerCase() === 'completed')
        });
    };

    for (const row of tasks) {
        const product = (row.product || '').trim();
        if (product) {
            if (current) groups.push(current);
            current = {
                title: product,
                status: row.status || 'planning',
                isManualStatusOverride: false,
                subtasks: []
            };
            pushSubFromRow(row);
        } else if (current) {
            pushSubFromRow(row);
        }
    }
    if (current) groups.push(current);

    return groups.filter((g) => (g.title || '').trim() !== '' || (g.subtasks && g.subtasks.length > 0));
}

export function isSubtaskComplete(s) {
    if (!s) return false;
    if (s.isDone === true) return true;
    const st = (s.status || '').toLowerCase();
    return st === 'completed' || st === 'published';
}

/** Auto-update parent status from subtasks when not manually overridden. */
export function applyAutoParentStatus(main) {
    if (!main || main.isManualStatusOverride) return;
    const subs = (main.subtasks || []).filter((x) => (x.title || '').trim() !== '');
    if (subs.length === 0) return;
    const allDone = subs.every(isSubtaskComplete);
    if (allDone) {
        main.status = 'completed';
    } else if ((main.status || '').toLowerCase() === 'completed') {
        main.status = 'developing';
    }
}

export function isValidMongoId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[a-fA-F0-9]{24}$/.test(id);
}

export function serializeRdMainTasksForApi(mains) {
    return mains.map((m) => ({
        ...(isValidMongoId(m._id) ? { _id: m._id } : {}),
        title: m.title || '',
        status: m.status || 'planning',
        isManualStatusOverride: !!m.isManualStatusOverride,
        subtasks: (m.subtasks || []).map((s) => ({
            ...(isValidMongoId(s._id) ? { _id: s._id } : {}),
            title: s.title || '',
            responsible: s.responsible || '',
            assignedEmployee: s.assignedEmployee || '',
            status: s.status || 'planning',
            remark: s.remark || '',
            startDate: s.startDate || '',
            endDate: s.endDate || '',
            isDone: !!s.isDone
        }))
    }));
}

export function stableMainKey(m, index) {
    if (m._id) return String(m._id);
    return m.clientKey || `idx-${index}`;
}

/** Flatten nested rdMainTasks back to legacy flat rows for editing. */
export function flattenNestedRdTasksToLegacy(mains) {
    if (!mains || !Array.isArray(mains)) return [];
    const rows = [];
    for (const main of mains) {
        if (!main.subtasks || main.subtasks.length === 0) {
            // Main task with no subtasks
            rows.push({
                product: main.title || '',
                mediaType: '',
                marketingChannel: '',
                status: main.status || 'planning',
                mainGoal: '',
                description: '',
                owner: '',
                startDate: '',
                endDate: '',
                done: (main.status || '').toLowerCase() === 'completed'
            });
            continue;
        }

        // Main task with subtasks
        for (let i = 0; i < main.subtasks.length; i++) {
            const s = main.subtasks[i];
            rows.push({
                product: i === 0 ? (main.title || '') : '',
                mediaType: s.title || '',
                marketingChannel: s.responsible || '',
                status: s.status || 'planning',
                mainGoal: s.remark || '',
                description: '', // Re-splitting remark is non-trivial, so we put it in mainGoal
                owner: s.assignedEmployee || '',
                startDate: s.startDate || '',
                endDate: s.endDate || '',
                done: !!s.isDone
            });
        }
    }
    return rows;
}
