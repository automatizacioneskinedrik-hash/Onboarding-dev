const MASTERS = [
    {
        id: 'mtecmba',
        code: 'TECH-MBA',
        name: 'TECH-MBA',
        description: 'MBA orientado a liderazgo, tecnologia y gestion empresarial.',
        isActive: true,
    },
    {
        id: 'mintear',
        code: 'MINTEAR-MBA',
        name: 'MINTEAR-MBA',
        description: 'MBA enfocado en innovacion, tecnologia emergente e inteligencia artificial.',
        isActive: true,
    },
    {
        id: 'datalar-mba',
        code: 'DATALAR-MBA',
        name: 'DATALAR-MBA',
        description: 'MBA centrado en analitica, datos y toma de decisiones empresariales.',
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
