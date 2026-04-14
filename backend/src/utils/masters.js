const MASTERS = [
    {
        id: 'mtecmba',
        code: 'TECHMBA',
        name: 'TECH MBA',
        description: 'MBA orientado a liderazgo, tecnología y gestion empresarial.',
        isActive: true,
    },
    {
        id: 'mintear',
        code: 'MINTEAR',
        name: 'Inteligencia Artificial',
        description: 'Master enfocado en innovación, tecnología emergente e inteligencia artificial.',
        isActive: true,
    },
    {
        id: 'datalar-mba',
        code: 'MDATASC',
        name: 'Data Science',
        description: 'Máster especializado en ciencia de datos avanzada, modelado predictivo y el desarrollo de algoritmos.',
        isActive: true,
    },
];

const getAllMasters = () => MASTERS;

const getMasterById = (id) => MASTERS.find((master) => master.id === id) || null;

const isValidMasterId = (id) => Boolean(getMasterById(id));

module.exports = {
    MASTERS,
    getAllMasters,
    getMasterById,
    isValidMasterId,
};
