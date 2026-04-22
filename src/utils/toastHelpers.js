import toast from 'react-hot-toast';

export function getAxiosErrorMessage(err, fallback = 'Something went wrong') {
    const fromResponse = err?.response?.data?.message;
    if (fromResponse && typeof fromResponse === 'string') return fromResponse;
    const fromError = err?.message;
    if (fromError && typeof fromError === 'string') return fromError;
    return fallback;
}

export function showToastError(idOrMessage, maybeMessage) {
    // Allow both `showToastError('msg')` and `showToastError(toastId, 'msg')`.
    if (typeof maybeMessage === 'string') {
        toast.error(maybeMessage, { id: idOrMessage });
        return;
    }
    toast.error(idOrMessage);
}

export function showToastSuccess(idOrMessage, maybeMessage) {
    // Allow both `showToastSuccess('msg')` and `showToastSuccess(toastId, 'msg')`.
    if (typeof maybeMessage === 'string') {
        toast.success(maybeMessage, { id: idOrMessage });
        return;
    }
    toast.success(idOrMessage);
}

