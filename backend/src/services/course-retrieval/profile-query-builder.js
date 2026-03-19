const buildProfileRetrievalQuery = (profile = {}) =>
    [
        `Rol actual: ${profile.currentRole || 'No especificado'}`,
        `Industria: ${profile.industry || 'No especificada'}`,
        `Anos de experiencia: ${profile.yearsOfExperience || 'No especificado'}`,
        `Habilidades: ${(profile.skills || []).join(', ') || 'No especificadas'}`,
        `Resumen: ${profile.summary || 'No disponible'}`,
    ]
        .filter(Boolean)
        .join('. ');

module.exports = {
    buildProfileRetrievalQuery,
};
