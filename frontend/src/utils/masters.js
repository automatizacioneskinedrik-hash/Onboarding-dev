export const normalizeMasterId = (value) => String(value || '').trim().toLowerCase();

const MASTER_ACCENTS = {
    mtecmba: {
        color: 'rgb(132, 193, 193)',
        accentClass: 'text-[#84c1c1]',
    },
    mintear: {
        color: 'rgb(255, 107, 53)',
        accentClass: 'text-orange-accent',
    },
    'datalar-mba': {
        color: 'rgb(80, 165, 132)',
        accentClass: 'text-[#50a584]',
    },
};

export const getMasterVisual = (masterId) =>
    MASTER_ACCENTS[normalizeMasterId(masterId)] || {
        color: 'rgb(240, 90, 40)',
        accentClass: 'text-orange-accent',
    };

export const getMasterDisplayName = (master) => {
    if (!master) return '';
    if (typeof master === 'string') return master;
    return master.code || master.name || master.id || '';
};

export const getMasterDescription = (master) => {
    if (!master || typeof master === 'string') return '';
    return master.description || '';
};

export const findMasterById = (masters = [], masterId) =>
    masters.find((master) => normalizeMasterId(master.id) === normalizeMasterId(masterId)) || null;
