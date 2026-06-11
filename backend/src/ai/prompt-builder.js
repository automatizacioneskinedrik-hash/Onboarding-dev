const {
    buildChatJourneyPromptSection,
    resolveChatJourneyContext,
} = require('./chat-journey-context');
const { buildChatScopePromptSection } = require('./chat-domain-policy');

const buildProfileExtractionPrompt = (cvText) => `Eres un experto en analisis de CVs y perfiles profesionales.
Analiza el siguiente CV y extrae la informacion estructurada en formato JSON.

CV:
"""
${cvText}
"""

Responde unicamente con un JSON valido con esta estructura exacta:
{
  "name": "nombre completo del candidato",
  "currentRole": "cargo o rol actual mas reciente",
  "yearsOfExperience": numero estimado de anos de experiencia,
  "industry": "industria o sector principal",
  "skills": ["habilidad1", "habilidad2"],
  "education": [
    {
      "degree": "titulo o grado",
      "field": "campo de estudio",
      "institution": "institucion",
      "year": 2024
    }
  ],
  "experience": [
    {
      "title": "cargo",
      "company": "empresa",
      "duration": "duracion",
      "description": "descripcion breve"
    }
  ],
  "languages": ["idioma1", "idioma2"],
  "certifications": ["certificacion1"],
  "summary": "resumen profesional de 2-3 oraciones"
}`;

const buildRecommendationPrompt = ({
    profile,
    options,
    specializationsList,
}) => `Eres un asesor academico experto de LÄR University, una institucion de educacion ejecutiva de elite.

Tu tarea es analizar la hoja de vida de un candidato y construir una ruta academica personalizada.
La ruta debe tener exactamente 6 sprints y todos deben salir del catalogo oficial de una sola especializacion principal del Master seleccionado.
No uses modulos externos ni inventes cursos.

PERFIL DEL CANDIDATO:
- Nombre: ${profile.name || 'No especificado'}
- Rol actual: ${profile.currentRole || 'No especificado'}
- Industria: ${profile.industry || 'No especificada'}
- Anos de experiencia: ${profile.yearsOfExperience || 'No especificado'}
- Habilidades: ${(profile.skills || []).join(', ') || 'No especificadas'}
- Resumen: ${profile.summary || 'No disponible'}
- Master seleccionado: ${options.masterId || 'Sin seleccionar'}

CATALOGO VALIDO PARA ESTE Master:
${specializationsList}

INSTRUCCIONES:
1. Construye una ruta personalizada de exactamente 6 sprints.
2. Analiza el CV y selecciona una unica especializacion principal entre las opciones disponibles.
3. Todos los sprints de la ruta deben pertenecer a esa especializacion principal.
4. Selecciona los sprints que mejor complementen el perfil actual y cubran vacios relevantes dentro de esa especializacion.
5. No inventes titulos: usa los nombres exactos del catalogo.
6. Proporciona un score de compatibilidad del 0 al 100.
7. Explica el razonamiento en 3-4 oraciones con lenguaje academico y accionable.

Responde unicamente con un JSON valido:
{
  "primarySpecialization": "ESPECIALIZACION PRINCIPAL",
  "primarySpecializationId": "id-de-la-especializacion-principal",
  "secondarySpecializations": ["id-otra-especializacion"],
  "matchScore": 0,
  "reasoning": "Explicacion personalizada",
  "keyStrengths": ["fortaleza1", "fortaleza2"],
  "growthAreas": ["area de crecimiento1", "area de crecimiento2"],
  "planBlocks": [
    {
      "specializationId": "id-especializacion",
      "blockTitle": "titulo exacto del sprint",
      "rationale": "por que este sprint aporta al perfil"
    }
  ]
}

Los IDs validos son: comunicacion, emprendimiento, finanzas, talento, tecnologia, ia-automatizacion, mercado-cliente, operaciones, analitica-datos, arquitectura-analitica-avanzada, ciencia-datos-aplicada`;

const resolvePrioritySprintTitle = (recommendation = {}) => {
    const firstBlock =
        recommendation?.sprint?.blocks?.[0] ||
        recommendation?.planBlocks?.[0] ||
        recommendation?.recommendedCourses?.[0] ||
        null;

    return firstBlock?.blockTitle || firstBlock?.title || recommendation?.subjects?.[0] || null;
};

const buildChatMessages = (
    messages,
    userProfile = null,
    recommendation = null,
    retrieval = null,
    chatJourneyContext = null
) => {
    const resolvedJourneyContext = chatJourneyContext || resolveChatJourneyContext({
        userProfile,
        recommendation,
    });
    const systemPrompt = `Eres un asesor academico experto y amigable de LÄR University, una institucion de educacion ejecutiva de elite.
Tu nombre es "LÄR Advisor" y tu mision es ayudar a los profesionales a encontrar la especializacion perfecta para potenciar su carrera.

${buildChatJourneyPromptSection(resolvedJourneyContext)}

${buildChatScopePromptSection()}

${userProfile ? `PERFIL DEL USUARIO:
- Nombre: ${userProfile.name || 'el usuario'}
- Rol: ${userProfile.currentRole || 'profesional'}
- Industria: ${userProfile.industry || 'no especificada'}
- Habilidades: ${(userProfile.skills || []).slice(0, 5).join(', ')}
` : ''}

${recommendation ? `RECOMENDACION ACTUAL:
- Sprint prioritario: ${resolvePrioritySprintTitle(recommendation) || 'No definido'}
- Especializacion contenedora: ${recommendation.specialization?.name || recommendation.primarySpecialization}
- Score de compatibilidad: ${recommendation.matchScore}%
- Ruta de 6 sprints: ${(recommendation.subjects || []).join(', ')}
` : ''}

${retrieval?.matches?.length ? `CONTEXTO RECUPERADO DEL CATALOGO:
${retrieval.contextText}
` : ''}

INSTRUCCIONES:
- Responde siempre en espanol.
- Se motivador, profesional y cercano.
- Recuerda que el usuario tiene un maximo de ${resolvedJourneyContext.maxUserInteractions || 20} interacciones para definir su ruta de sprints. Actualmente le quedan ${resolvedJourneyContext.remainingInteractions ?? 0} interacciones. Si quedan 3 o menos, comunicalo con claridad y sugiere priorizar preguntas clave.
- ${resolvedJourneyContext.shouldSendWelcome ? 'Esta es la primera interaccion real del usuario: tu respuesta debe comenzar con una bienvenida calida a LÄR University y una explicacion breve del flujo antes de continuar.' : 'Si el usuario vuelve a pedir orientacion general, puedes retomar la explicacion breve del flujo cuando aporte valor.'}
- Usa Markdown simple y limpio cuando ayude a la lectura, por ejemplo parrafos, listas y negritas puntuales.
- No uses tablas, HTML ni formatos complejos.
- Explica de forma breve como funciona la plataforma cuando el usuario aun no haya subido su CV o pregunte por el proceso.
- Si el usuario pregunta por la ruta, explica por que se eligieron esos 6 sprints y como se complementan.
- Si el usuario quiere explorar otras opciones, muestrate abierto y explica las alternativas.
- Cuando cites sprints o especializaciones, usa los titulos exactos del catalogo del Master.
- Si el contexto recuperado no alcanza para responder algo con certeza, dilo explicitamente y no inventes contenido.
- Manten respuestas concisas pero informativas, maximo 3-4 parrafos.
- Siempre invita al usuario a dar el siguiente paso.`;

    return [
        { role: 'system', content: systemPrompt },
        ...messages.map((message) => ({
            role: message.role,
            content: message.content,
        })),
    ];
};

const createPromptBuilder = () => ({
    buildProfileExtractionPrompt,
    buildRecommendationPrompt,
    buildChatMessages,
});

module.exports = {
    buildProfileExtractionPrompt,
    buildRecommendationPrompt,
    buildChatMessages,
    createPromptBuilder,
};
