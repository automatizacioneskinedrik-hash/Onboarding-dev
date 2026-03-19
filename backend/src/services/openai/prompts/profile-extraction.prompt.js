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

module.exports = {
    buildProfileExtractionPrompt,
};
