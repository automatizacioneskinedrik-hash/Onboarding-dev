const { openai, OPENAI_MODEL } = require('../../config/openai');
const { buildProfileExtractionPrompt } = require('./prompts/profile-extraction.prompt');
const { buildFallbackProfile } = require('./ai-fallbacks.service');

const extractProfileFromCV = async ({ cvText, logger, ensureConfigured }) => {
    if (!openai) {
        logger?.info('Perfil CV con fallback local', {
            textLength: cvText?.length || 0,
        });
        return buildFallbackProfile(cvText);
    }

    ensureConfigured();

    const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: buildProfileExtractionPrompt(cvText) }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
    });

    logger?.info('Perfil CV extraido', {
        model: OPENAI_MODEL,
        textLength: cvText?.length || 0,
    });

    return JSON.parse(response.choices[0].message.content);
};

module.exports = {
    extractProfileFromCV,
};
