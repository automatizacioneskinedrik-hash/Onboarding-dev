const formatRetrievedCoursesContext = (courses = []) => {
    if (!courses.length) {
        return '';
    }

    return courses
        .map((course, index) => {
            const lines = [
                `Resultado ${index + 1}:`,
                `Tipo: ${course.contentType === 'learning_module' ? 'Modulo' : 'Tema'}`,
                `Categoria: ${course.catalogType === 'master' ? 'Master' : 'Sprint'}`,
                `Titulo: ${course.title}`,
                `Modulo relacionado: ${course.moduleTitle}`,
                `Distancia vectorial: ${course.distance ?? 'n/a'}`,
            ];

            if (course.description) {
                lines.push(`Descripcion: ${course.description}`);
            }

            if (course.difficulty) {
                lines.push(`Dificultad: ${course.difficulty}/4`);
            }

            if (course.estimatedHours) {
                lines.push(`Horas estimadas: ${course.estimatedHours}`);
            }

            if (course.topics.length) {
                lines.push(`Topics del modulo: ${course.topics.join(', ')}`);
            }

            return lines.join('\n');
        })
        .join('\n\n');
};

module.exports = {
    formatRetrievedCoursesContext,
};
