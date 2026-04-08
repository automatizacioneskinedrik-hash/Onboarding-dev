const formatRetrievedCoursesContext = (courses = []) => {
    if (!courses.length) {
        return '';
    }

    return courses
        .map((course, index) => {
            const lines = [
                `Resultado ${index + 1}:`,
                `Tipo: ${course.contentType === 'learning_module' ? 'Modulo' : 'Tema'}`,
                `Categoría: ${course.catalogType === 'master' ? 'Master' : 'Sprint'}`,
                `Título: ${course.title}`,
                `Módulo relacionado: ${course.moduleTitle}`,
                `Distancia estimada: ${course.distance ?? 'n/a'}`,
            ];

            if (course.description) {
                lines.push(`Descripción: ${course.description}`);
            }

            if (course.difficulty) {
                lines.push(`Dificultad: ${course.difficulty}/4`);
            }

            if (course.estimatedHours) {
                lines.push(`Horas estimadas: ${course.estimatedHours}`);
            }

            if (course.topics.length) {
                lines.push(`Topics del módulo: ${course.topics.join(', ')}`);
            }

            return lines.join('\n');
        })
        .join('\n\n');
};

module.exports = {
    formatRetrievedCoursesContext,
};
