/**
 * OpenAI Service
 * Handles all AI interactions: CV analysis, recommendations, chat
 */

const { openai, OPENAI_MODEL } = require('../config/openai');
const {
    SPECIALIZATIONS,
    getSpecializationById,
    getSpecializationIdByModuleId,
    getSpecializationNamesForPrompt,
} = require('../utils/specializations');
const {
    retrieveRelevantCoursesForProfile,
    loadSprintCatalogForSpecialization,
    buildMasterCatalogFallbackRetrieval,
} = require('./course-retrieval.service');

const ensureOpenAIConfigured = () => {
    if (!openai) {
        const error = new Error('OPENAI_API_KEY is not configured.');
        error.statusCode = 503;
        throw error;
    }
};

const FALLBACK_SKILL_KEYWORDS = {
    'analitica-datos': ['data', 'datos', 'sql', 'python', 'power bi', 'tableau', 'analytics', 'analitica'],
    tecnologia: ['software', 'developer', 'ingeniero', 'tecnologia', 'digital', 'arquitectura'],
    'ia-automatizacion': ['ia', 'inteligencia artificial', 'machine learning', 'automatizacion', 'automation', 'ml'],
    finanzas: ['finanzas', 'finance', 'contabilidad', 'tesoreria', 'inversion'],
    talento: ['rrhh', 'recursos humanos', 'people', 'talento', 'reclutamiento', 'liderazgo'],
    emprendimiento: ['startup', 'emprendimiento', 'negocio', 'ventas', 'founder'],
    'mercado-cliente': ['marketing', 'cliente', 'brand', 'growth', 'producto'],
    operaciones: ['operaciones', 'logistica', 'supply chain', 'procesos'],
    comunicacion: ['comunicacion', 'comms', 'relaciones publicas', 'presentaciones'],
};

const resolveSpecializationIdFromMatch = (item) =>
    item?.specializationId || getSpecializationIdByModuleId(item?.moduleId);

const resolveSpecializationCatalog = async ({ masterId, specializationId, fallbackSpecialization }) => {
    const sprintCatalog = masterId
        ? await loadSprintCatalogForSpecialization({ masterId, specializationId })
        : null;

    return {
        specialization: fallbackSpecialization,
        subjects: sprintCatalog?.topics?.length ? sprintCatalog.topics : fallbackSpecialization.subjects,
        sprintTitle: sprintCatalog?.title || fallbackSpecialization.name,
        sprintUrl: fallbackSpecialization.sprintUrl,
        sprintCatalog,
    };
};

const pickFallbackSpecialization = (profile = {}) => {
    const haystack = [
        profile.currentRole,
        profile.industry,
        profile.summary,
        ...(profile.skills || []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    let bestId = 'analitica-datos';
    let bestScore = -1;

    Object.entries(FALLBACK_SKILL_KEYWORDS).forEach(([id, words]) => {
        const score = words.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestId = id;
        }
    });

    return Object.values(SPECIALIZATIONS).find((item) => item.id === bestId) || Object.values(SPECIALIZATIONS)[0];
};

const buildFallbackProfile = (cvText = '') => {
    const lines = cvText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
    const firstLine = lines[0] || '';
    const guessedName = firstLine.length > 2 && firstLine.length < 80 ? firstLine : 'Candidato';
    const yearsMatch = cvText.match(/(\d{1,2})\s*(anos|years|a\w+os)/i);

    const skills = ['Comunicacion', 'Trabajo en equipo', 'Resolucion de problemas'];
    const skillHints = ['sql', 'python', 'excel', 'power bi', 'marketing', 'finanzas', 'liderazgo'];
    const lower = cvText.toLowerCase();
    skillHints.forEach((hint) => {
        if (lower.includes(hint)) {
            skills.push(hint.toUpperCase());
        }
    });

    return {
        name: guessedName,
        currentRole: 'Profesional',
        yearsOfExperience: yearsMatch ? parseInt(yearsMatch[1], 10) : 3,
        industry: 'No especificada',
        skills: Array.from(new Set(skills)).slice(0, 8),
        education: [],
        experience: [],
        languages: [],
        certifications: [],
        summary: 'Perfil profesional generado en modo de respaldo por indisponibilidad temporal de IA.',
    };
};

const buildRetrievedCatalogContext = (retrieval) => {
    if (!retrieval?.matches?.length) {
        return 'No hubo resultados recuperados del catalogo.';
    }

    return retrieval.matches
        .slice(0, 5)
        .map((match, index) => {
            const lines = [
                `Resultado ${index + 1}`,
                `Tipo: ${match.contentType}`,
                `Titulo: ${match.title}`,
                `Modulo: ${match.moduleTitle}`,
                `Distancia: ${match.distance ?? 'n/a'}`,
            ];

            if (match.description) {
                lines.push(`Descripcion: ${match.description}`);
            }

            if (match.topics?.length) {
                lines.push(`Topics: ${match.topics.join(', ')}`);
            }

            return lines.join('\n');
        })
        .join('\n\n');
};

const buildRecommendationFromRetrievalFallback = (profile, retrieval) => {
    const preferredModule = retrieval?.moduleRanking?.[0];
    const preferredSpecializationId =
        resolveSpecializationIdFromMatch(preferredModule) || pickFallbackSpecialization(profile).id;
    const specialization = getSpecializationById(preferredSpecializationId) || pickFallbackSpecialization(profile);
    const secondarySpecializations = (retrieval?.moduleRanking || [])
        .slice(1, 3)
        .map((item) => resolveSpecializationIdFromMatch(item))
        .filter(Boolean)
        .filter((id, index, array) => id !== preferredSpecializationId && array.indexOf(id) === index);

    const recommendedCourses = (retrieval?.matches || []).slice(0, 3).map((match) => ({
        id: match.id,
        title: match.title,
        contentType: match.contentType,
        moduleId: match.moduleId,
        specializationId: match.specializationId || null,
        moduleTitle: match.moduleTitle,
        distance: match.distance,
    }));

    return {
        primarySpecialization: specialization.name,
        primarySpecializationId: specialization.id,
        secondarySpecializations,
        matchScore: preferredModule ? 88 : 78,
        reasoning: preferredModule
            ? `Se recomienda ${specialization.name} porque tu perfil se alinea con el modulo ${preferredModule.moduleTitle} y con los temas recuperados del catalogo que mejor potencian tu trayectoria actual.`
            : `Se recomienda ${specialization.name} con base en las senales detectadas en tu perfil.`,
        keyStrengths: (profile.skills || []).slice(0, 3),
        growthAreas: ['Profundizacion tecnica', 'Aplicacion estrategica'],
        specialization,
        subjects: specialization.subjects,
        sprintUrl: specialization.sprintUrl,
        recommendedCourses,
    };
};

const extractProfileFromCV = async (cvText) => {
    if (!openai) {
        return buildFallbackProfile(cvText);
    }
    ensureOpenAIConfigured();

    const prompt = `Eres un experto en analisis de CVs y perfiles profesionales.
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

    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
};

const generateRecommendation = async (profile, sourceType = 'pdf', options = {}) => {
    if (!openai) {
        const specialization = pickFallbackSpecialization(profile);
        let fallbackRetrieval = null;

        if (options.masterId) {
            try {
                fallbackRetrieval = await buildMasterCatalogFallbackRetrieval(profile, {
                    masterId: options.masterId,
                    topK: 3,
                });
            } catch (fallbackError) {
                console.warn('Master catalog fallback skipped:', fallbackError.message);
            }
        }

        const specializationCatalog = await resolveSpecializationCatalog({
            masterId: options.masterId,
            specializationId: specialization.id,
            fallbackSpecialization: specialization,
        });
        return {
            primarySpecialization: specialization.name,
            primarySpecializationId: specialization.id,
            secondarySpecializations: [],
            matchScore: 78,
            reasoning: `Se recomienda ${specialization.name} con base en las senales detectadas en tu perfil. Esta recomendacion fue generada en modo de respaldo.`,
            keyStrengths: (profile.skills || []).slice(0, 3),
            growthAreas: ['Profundizacion tecnica', 'Liderazgo estrategico'],
            specialization: specializationCatalog.specialization,
            subjects: specializationCatalog.subjects,
            sprintUrl: specializationCatalog.sprintUrl,
            recommendedCourses: (fallbackRetrieval?.matches || []).slice(0, 3).map((match) => ({
                id: match.id,
                title: match.title,
                contentType: match.contentType,
                moduleId: match.moduleId,
                specializationId: match.specializationId || null,
                moduleTitle: match.moduleTitle,
                distance: match.distance,
            })),
        };
    }
    ensureOpenAIConfigured();

    let retrieval = null;
    try {
        const masterFilters = options.masterId
            ? {
                masterIds: [options.masterId],
                catalogTypes: ['sprint'],
            }
            : { catalogTypes: ['sprint'] };

        retrieval = await retrieveRelevantCoursesForProfile(profile, {
            topK: 6,
            filters: masterFilters,
        });
    } catch (retrievalError) {
        console.warn('Profile vector retrieval skipped:', retrievalError.message);
    }

    if ((!retrieval || !retrieval.matches?.length) && options.masterId) {
        try {
            retrieval = await buildMasterCatalogFallbackRetrieval(profile, {
                masterId: options.masterId,
                topK: 6,
            });
        } catch (fallbackError) {
            console.warn('Master catalog fallback skipped:', fallbackError.message);
        }
    }

    const retrievalFallback = buildRecommendationFromRetrievalFallback(profile, retrieval);
    const preferredSpecializationId = retrievalFallback.primarySpecializationId;
    const retrievedCatalogContext = buildRetrievedCatalogContext(retrieval);

    const specializationsList = getSpecializationNamesForPrompt();

    const prompt = `Eres un asesor academico experto de LAR University, una institucion de educacion ejecutiva de elite.

Tu tarea es analizar la hoja de vida de un candidato y recomendar el sprint de especializacion mas adecuado de nuestro catalogo.
Debes usar como senal principal los resultados recuperados desde el catalogo vectorial cuando existan.

PERFIL DEL CANDIDATO:
- Nombre: ${profile.name || 'No especificado'}
- Rol actual: ${profile.currentRole || 'No especificado'}
- Industria: ${profile.industry || 'No especificada'}
- Anos de experiencia: ${profile.yearsOfExperience || 'No especificado'}
- Habilidades: ${(profile.skills || []).join(', ') || 'No especificadas'}
- Resumen: ${profile.summary || 'No disponible'}
- Master seleccionado: ${options.masterId || 'Sin seleccionar'}

CONTEXTO RECUPERADO DESDE EL CATALOGO VECTORIAL:
${retrievedCatalogContext}

MODULO MAS CONSISTENTE SEGUN VECTOR SEARCH:
- module_id: ${retrieval?.moduleRanking?.[0]?.moduleId || 'n/a'}
- modulo: ${retrieval?.moduleRanking?.[0]?.moduleTitle || 'n/a'}
- specialization_id_recuperado: ${resolveSpecializationIdFromMatch(retrieval?.moduleRanking?.[0]) || 'n/a'}
- specialization_id_preferido: ${preferredSpecializationId}

SPRINTS DISPONIBLES EN LAR UNIVERSITY:
${specializationsList}

INSTRUCCIONES:
1. Analiza el perfil y determina que sprint complementa mejor su trayectoria.
2. La recomendacion debe potenciar su perfil actual.
3. Si hay contexto recuperado del catalogo, priorizalo por encima de una respuesta generica.
4. Si hay un modulo claramente dominante, usa el specialization_id_preferido como referencia principal.
5. Proporciona un score de compatibilidad del 0 al 100.
6. Explica el razonamiento en 3-4 oraciones y menciona siempre el nombre del sprint.
7. No inventes materias ni sprints fuera del catalogo.

Responde unicamente con un JSON valido:
{
  "primarySpecialization": "NOMBRE_DEL_SPRINT",
  "primarySpecializationId": "id-del-sprint",
  "secondarySpecializations": ["OTRO_SPRINT"],
  "matchScore": 0,
  "reasoning": "Explicacion personalizada",
  "keyStrengths": ["fortaleza1", "fortaleza2"],
  "growthAreas": ["area de crecimiento1", "area de crecimiento2"]
}

Los IDs validos son: comunicacion, emprendimiento, finanzas, talento, tecnologia, ia-automatizacion, mercado-cliente, operaciones, analitica-datos`;

    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(response.choices[0].message.content);
        const resolvedPrimarySpecializationId =
            getSpecializationById(result.primarySpecializationId)?.id ||
            resolveSpecializationIdFromMatch(retrieval?.moduleRanking?.[0]) ||
            retrievalFallback.primarySpecializationId;
        const specialization = getSpecializationById(resolvedPrimarySpecializationId) || retrievalFallback.specialization;
        const specializationCatalog = await resolveSpecializationCatalog({
            masterId: options.masterId,
            specializationId: resolvedPrimarySpecializationId,
            fallbackSpecialization: specialization,
        });

        return {
            ...result,
            primarySpecializationId: resolvedPrimarySpecializationId,
            primarySpecialization: specializationCatalog.specialization.name,
            specialization: specializationCatalog.specialization,
            subjects: specializationCatalog.subjects,
            sprintUrl: specializationCatalog.sprintUrl,
            recommendedCourses: retrievalFallback.recommendedCourses,
        };
    } catch (error) {
        console.warn('Grounded recommendation fallback activated:', error.message);
        const specializationCatalog = await resolveSpecializationCatalog({
            masterId: options.masterId,
            specializationId: retrievalFallback.primarySpecializationId,
            fallbackSpecialization: retrievalFallback.specialization,
        });

        return {
            ...retrievalFallback,
            primarySpecialization: specializationCatalog.specialization.name,
            specialization: specializationCatalog.specialization,
            subjects: specializationCatalog.subjects,
            sprintUrl: specializationCatalog.sprintUrl,
        };
    }
};

const buildChatResponseFallback = (messages, recommendation = null, retrieval = null) => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const topCourse = retrieval?.matches?.[0];

    if (topCourse) {
        return `Con base en tu pregunta, el resultado mas relevante es ${topCourse.title}, dentro del modulo ${topCourse.moduleTitle}. Si quieres, te explico por que encaja contigo y que aprenderias alli.`;
    }

    if (!recommendation) {
        return `Recibido. Ya tengo tu mensaje: "${lastUserMessage}". Para darte una ruta personalizada, adjunta tu hoja de vida en PDF y continuare con el analisis.`;
    }

    return `Gracias por tu mensaje. Con base en tu perfil, tu mejor enfoque actual es ${recommendation.primarySpecialization || recommendation.specialization?.name}. Si quieres, te explico el sprint 1 o como aprovechar esta ruta en tu trabajo actual.`;
};

const buildChatMessages = (messages, userProfile = null, recommendation = null, retrieval = null) => {
    const systemPrompt = `Eres un asesor academico experto y amigable de LAR University, una institucion de educacion ejecutiva de elite.
Tu nombre es "LAR Advisor" y tu mision es ayudar a los profesionales a encontrar la especializacion perfecta para potenciar su carrera.

${userProfile ? `PERFIL DEL USUARIO:
- Nombre: ${userProfile.name || 'el usuario'}
- Rol: ${userProfile.currentRole || 'profesional'}
- Industria: ${userProfile.industry || 'no especificada'}
- Habilidades: ${(userProfile.skills || []).slice(0, 5).join(', ')}
` : ''}

${recommendation ? `RECOMENDACION ACTUAL:
- Especializacion recomendada: ${recommendation.specialization?.name || recommendation.primarySpecialization}
- Score de compatibilidad: ${recommendation.matchScore}%
- Materias: ${(recommendation.subjects || []).join(', ')}
` : ''}

${retrieval?.matches?.length ? `CONTEXTO RECUPERADO DEL CATALOGO:
${retrieval.contextText}
` : ''}

INSTRUCCIONES:
- Responde siempre en espanol.
- Se motivador, profesional y cercano.
- Si el usuario pregunta sobre la especializacion recomendada, explica los beneficios.
- Si el usuario quiere explorar otras opciones, muestrate abierto y explica las alternativas.
- Si hay contexto recuperado del catalogo, usalo como fuente principal para recomendar modulos o temas.
- Cuando cites resultados del catalogo, usa los titulos exactos.
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

const generateChatResponse = async (messages, userProfile = null, recommendation = null, retrieval = null) => {
    if (!openai) {
        return buildChatResponseFallback(messages, recommendation, retrieval);
    }
    ensureOpenAIConfigured();

    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: buildChatMessages(messages, userProfile, recommendation, retrieval),
        temperature: 0.7,
        max_tokens: 800,
    });

    return response.choices[0].message.content;
};

const streamChatResponse = async function* (messages, userProfile = null, recommendation = null, retrieval = null) {
    if (!openai) {
        yield buildChatResponseFallback(messages, recommendation, retrieval);
        return;
    }

    ensureOpenAIConfigured();

    const stream = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: buildChatMessages(messages, userProfile, recommendation, retrieval),
        temperature: 0.7,
        max_tokens: 800,
        stream: true,
    });

    for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) {
            yield token;
        }
    }
};

const analyzeLinkedInProfile = async (linkedinUrl) => {
    ensureOpenAIConfigured();

    const prompt = `Eres un experto en analisis de perfiles profesionales de LinkedIn.

El usuario ha proporcionado su URL de LinkedIn: ${linkedinUrl}

Como no podemos acceder directamente al perfil, genera un mensaje amigable explicando que:
1. Por politicas de privacidad, no podemos acceder directamente a LinkedIn.
2. Pidele que copie y pegue su resumen de LinkedIn o descripcion de su perfil.
3. O que suba su CV en PDF como alternativa.

Responde en espanol de forma amigable y profesional.`;

    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
    });

    return {
        requiresManualInput: true,
        message: response.choices[0].message.content,
    };
};

module.exports = {
    extractProfileFromCV,
    generateRecommendation,
    generateChatResponse,
    streamChatResponse,
    analyzeLinkedInProfile,
};
