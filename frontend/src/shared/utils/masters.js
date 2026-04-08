export const normalizeMasterId = (value) => String(value || '').trim().toLowerCase();

const MASTER_ACCENTS = {
    'mtecmba': {
        color: 'rgb(132, 193, 193)',
        accentClass: 'text-[#84c1c1]',
    },
    'mintear': {
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

const HARDCODED_MASTER_POSTERS = {
    'mtecmba': 'https://storage.googleapis.com/assets_onboarding/MBAS/MBA_Mtec.png',
    'mintear': 'https://storage.googleapis.com/assets_onboarding/MBAS/MBA_Mintear.png',
    'datalar-mba': 'https://storage.googleapis.com/assets_onboarding/MBAS/MBA_Datalar.png',
};

const MASTER_SELECTION_THEMES = {
    'mintear': {
        panelColor: '#59AE8F',
        posterFrom: '#F6DB76',
        posterVia: '#A7C68F',
        posterTo: '#264B3D',
        posterFallbackColor: '#95BC88',
        posterImageUrl: HARDCODED_MASTER_POSTERS['mintear'],
        badge: 'IA e innovacion',
        headline: 'Disena rutas de innovacion con una vision aplicada al negocio.',
        textureColor: 'rgba(255,255,255,0.22)',
    },
    'datalar-mba': {
        panelColor: '#86C5CD',
        posterFrom: '#D9EAA6',
        posterVia: '#9FD5D8',
        posterTo: '#567484',
        posterFallbackColor: '#9FD5D8',
        posterImageUrl: HARDCODED_MASTER_POSTERS['datalar-mba'],
        badge: 'Analitica ejecutiva',
        headline: 'Convierte datos, criterio y estrategia en decisiones de alto impacto.',
        textureColor: 'rgba(255,255,255,0.2)',
    },
    'mtecmba': {
        panelColor: '#F45A22',
        posterFrom: '#B9D9EE',
        posterVia: '#8DB7D9',
        posterTo: '#3B5776',
        posterFallbackColor: '#8DB7D9',
        posterImageUrl: HARDCODED_MASTER_POSTERS['mtecmba'],
        badge: 'Liderazgo tech',
        headline: 'Integra tecnologia, producto y direccion para liderar transformacion.',
        textureColor: 'rgba(255,255,255,0.18)',
    },
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

export const getMasterSelectionTheme = (masterId) =>
    MASTER_SELECTION_THEMES[normalizeMasterId(masterId)] || {
        panelColor: '#F05A28',
        posterFrom: '#F5D0C5',
        posterVia: '#EFA78B',
        posterTo: '#7A3C2D',
        posterFallbackColor: '#EFA78B',
        posterImageUrl: '',
        badge: 'Ruta LÄR',
        headline: 'Explora una experiencia ejecutiva construida para potenciar tu perfil.',
        textureColor: 'rgba(255,255,255,0.2)',
    };

export const findMasterById = (masters = [], masterId) =>
    masters.find((master) => normalizeMasterId(master.id) === normalizeMasterId(masterId)) || null;
