import React, { useState } from 'react';
import {
    Award,
    BadgeCheck,
    Briefcase,
    CheckCircle2,
    FileDown,
    FileCheck,
    GraduationCap,
    Languages,
    Loader2,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import { useAuth } from '../features/auth';
import { useCvAnalysis } from '../features/cv-analysis';
import { useMasterModules } from '../features/recommendation';
import { findMasterById, getMasterDisplayName } from '../shared/utils/masters';

const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const collectProfileHaystack = (profile = {}) =>
    [
        profile.currentRole,
        profile.summary,
        ...(profile.skills || []),
        ...(profile.experience || []).map((item) => item.description),
    ]
        .filter(Boolean)
        .join(' ');

const buildProfessionalHighlights = (profile = {}) => {
    const haystack = normalizeText(collectProfileHaystack(profile));
    const highlights = [];

    if (/(hardware|software|integr)/.test(haystack)) {
        highlights.push('Experiencia en integración hardware/software');
    }

    if (/(crm|automat|digital)/.test(haystack)) {
        highlights.push('Automatización con CRM y herramientas digitales');
    }

    if (/(python|javascript|program|soporte|support)/.test(haystack)) {
        highlights.push('Programación y soporte técnico');
    }

    if (!highlights.length && profile.currentRole) {
        highlights.push(`Experiencia en ${profile.currentRole}`);
    }

    if (highlights.length < 3 && profile.industry) {
        highlights.push(`Conocimiento aplicado en ${profile.industry}`);
    }

    if (highlights.length < 3 && profile.yearsOfExperience) {
        highlights.push(`${profile.yearsOfExperience} años de experiencia profesional`);
    }

    return [...new Set(highlights)].slice(0, 3);
};

const SKILL_MAPPINGS = [
    {
        match: /(hardware|software|integr)/,
        label: 'Integración HW/SW',
        level: 92,
        caption: 'Arquitectura e integración',
        barColor: '#0C5258',
        tone: { backgroundColor: '#DCEBED', color: '#0C5258' },
    },
    {
        match: /crm/,
        label: 'CRM',
        level: 84,
        caption: 'Operación comercial',
        barColor: '#EE5522',
        tone: { backgroundColor: '#FCE6DE', color: '#EE5522' },
    },
    {
        match: /automat/,
        label: 'Automatización',
        level: 88,
        caption: 'Optimización de procesos',
        barColor: '#50A584',
        tone: { backgroundColor: '#E6F3EE', color: '#50A584' },
    },
    {
        match: /javascript|java script|\bjs\b/,
        label: 'JavaScript',
        level: 78,
        caption: 'Stack técnico',
        barColor: '#8E6C00',
        tone: { backgroundColor: '#F3EED9', color: '#8E6C00' },
    },
    {
        match: /python/,
        label: 'Python',
        level: 80,
        caption: 'Análisis y automatización',
        barColor: '#2E5B9A',
        tone: { backgroundColor: '#E3EDF8', color: '#2E5B9A' },
    },
    {
        match: /soporte|support/,
        label: 'Soporte',
        level: 72,
        caption: 'Operación y continuidad',
        barColor: '#2D2926',
        tone: { backgroundColor: '#ECE8E4', color: '#2D2926' },
    },
];

const buildDisplaySkills = (profile = {}) => {
    const haystackItems = [
        ...(profile.skills || []),
        ...(profile.experience || []).flatMap((item) => [item.title, item.description]),
    ];

    const resolved = SKILL_MAPPINGS.filter(({ match }) =>
        haystackItems.some((item) => match.test(normalizeText(item)))
    ).map(({ label, tone, level, caption, barColor }) => ({
        label,
        tone,
        level,
        caption,
        barColor,
    }));

    return resolved.slice(0, 6);
};

const summarizeExperience = (experience = {}) => {
    const haystack = normalizeText([experience.title, experience.description].filter(Boolean).join(' '));
    const tags = [];

    if (/crm/.test(haystack)) tags.push('CRM');
    if (/(hardware|software|integr)/.test(haystack)) tags.push('Integraciones');
    if (/(dashboard|analit|data|datos)/.test(haystack)) tags.push('Dashboards');
    if (/(automat|process|proceso)/.test(haystack)) tags.push('Automatización');
    if (!tags.length && experience.description) tags.push(experience.description.split(/[,.]/)[0].trim());

    return tags.slice(0, 3).join(' + ');
};

const formatLanguage = (language = '') => String(language || '').trim();

const REPORT_NOTE = 'Los sprints recomendados serán matriculados luego de culminar el módulo 8 del máster.';

const formatPdfDate = (date = new Date()) =>
    new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);

const buildFileName = (prefix, name = 'perfil') => {
    const safeName = String(name || 'perfil')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    return `${prefix}-${safeName || 'perfil'}.pdf`;
};

const loadLogoSvg = async () => {
    const response = await fetch('/lar-hub.svg');

    if (!response.ok) {
        throw new Error('No se pudo cargar el logo para el certificado.');
    }

    return response.text();
};

const loadPdfMake = async () => {
    const [{ default: pdfMake }, pdfFonts] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
    ]);

    pdfMake.vfs = pdfFonts.default || pdfFonts;

    return pdfMake;
};

const buildSkillRows = (displaySkills = []) =>
    displaySkills.map((skill) => [
        { text: skill.label, style: 'tableStrong' },
        { text: `${skill.level}%`, alignment: 'right', style: 'tableStrong' },
        { text: skill.caption, color: '#64748B' },
    ]);

const buildRouteRows = (recommendedRoute = []) =>
    recommendedRoute.map((block, index) => [
        { text: `Sprint ${index + 1}`, style: 'tableStrong' },
        { text: block.blockTitle || block.title || 'Sprint sugerido', style: 'tableStrong' },
        { text: block.specializationName || 'Ruta recomendada', color: '#64748B' },
    ]);

const buildModuleRows = (availableModules = []) =>
    availableModules.map((module, index) => [
        { text: `Módulo ${index + 1}`, style: 'tableStrong' },
        { text: module.title || 'Módulo', style: 'tableStrong' },
        { text: module.description || 'Contenido del máster', color: '#64748B' },
    ]);

const buildProfilePdfDefinition = ({
    logoSvg,
    generatedAt,
    extractedProfile,
    selectedMasterName,
    scoreValue,
    scoreLabel,
    profileHighlights,
    displaySkills,
    visibleLanguages,
    recommendedRoute,
    availableModules,
}) => ({
    pageSize: 'A4',
    pageMargins: [42, 40, 42, 40],
    defaultStyle: {
        fontSize: 10,
        color: '#1F2937',
    },
    styles: {
        title: { fontSize: 20, bold: true, color: '#16110F' },
        subtitle: { fontSize: 11, color: '#64748B' },
        sectionTitle: { fontSize: 12, bold: true, color: '#16110F', margin: [0, 0, 0, 8] },
        tableHeader: { bold: true, color: '#16110F' },
        tableStrong: { bold: true, color: '#16110F' },
        note: { fontSize: 10.5, color: '#0C5258', bold: true },
        certTitle: { fontSize: 22, bold: true, color: '#16110F', alignment: 'center' },
        certSubtitle: { fontSize: 11, color: '#64748B', alignment: 'center' },
        certBody: { fontSize: 14, color: '#16110F', alignment: 'center', lineHeight: 1.45 },
        certName: { fontSize: 24, bold: true, color: '#0C5258', alignment: 'center' },
        certMeta: { fontSize: 11, color: '#475569', alignment: 'center' },
    },
    content: [
        {
            columns: [
                logoSvg ? { svg: logoSvg, width: 140 } : { text: 'LÄR UNIVERSITY', style: 'title' },
                { text: 'PERFIL PROFESIONAL Y ONBOARDING', alignment: 'right', style: 'subtitle', margin: [0, 10, 0, 0] },
            ],
            margin: [0, 0, 0, 16],
        },
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 1.2, color: '#E5E7EB' }], margin: [0, 0, 0, 18] },
        { text: 'Resumen del perfil', style: 'title', margin: [0, 0, 0, 4] },
        { text: generatedAt, style: 'subtitle', margin: [0, 0, 0, 14] },
        {
            table: {
                widths: ['50%', '50%'],
                body: [[
                    {
                        stack: [
                            { text: 'Nombre', style: 'tableHeader' },
                            { text: extractedProfile.name || 'Perfil analizado', margin: [0, 4, 0, 0] },
                            { text: 'Rol actual', style: 'tableHeader', margin: [0, 10, 0, 0] },
                            { text: extractedProfile.currentRole || 'Rol no especificado', margin: [0, 4, 0, 0] },
                            { text: 'Máster', style: 'tableHeader', margin: [0, 10, 0, 0] },
                            { text: selectedMasterName, margin: [0, 4, 0, 0] },
                        ],
                        fillColor: '#F8FAFC',
                        margin: [8, 8, 8, 8],
                    },
                    {
                        stack: [
                            { text: 'Score de compatibilidad', style: 'tableHeader' },
                            { text: `${scoreValue}%`, fontSize: 24, bold: true, color: '#F45A22', margin: [0, 4, 0, 0] },
                            { text: scoreLabel, margin: [0, 2, 0, 0] },
                            { text: extractedProfile.industry || 'Industria no especificada', color: '#64748B', margin: [0, 12, 0, 0] },
                        ],
                        fillColor: '#FFF7F2',
                        margin: [8, 8, 8, 8],
                    },
                ]],
            },
            layout: {
                hLineColor: () => '#E5E7EB',
                vLineColor: () => '#E5E7EB',
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0,
            },
            margin: [0, 0, 0, 18],
        },
        { text: 'Fortalezas clave', style: 'sectionTitle' },
        { ul: profileHighlights.length ? profileHighlights : ['Perfil en proceso de consolidación'], margin: [0, 0, 0, 12] },
        { text: 'Habilidades destacadas', style: 'sectionTitle' },
        displaySkills.length
            ? {
                  table: {
                      headerRows: 1,
                      widths: ['30%', '12%', '58%'],
                      body: [
                          [
                              { text: 'Habilidad', style: 'tableHeader' },
                              { text: 'Nivel', style: 'tableHeader', alignment: 'right' },
                              { text: 'Descripción', style: 'tableHeader' },
                          ],
                          ...buildSkillRows(displaySkills),
                      ],
                  },
                  layout: 'lightHorizontalLines',
                  margin: [0, 0, 0, 14],
              }
            : { text: 'No se detectaron habilidades destacadas suficientes para el reporte.', color: '#64748B', margin: [0, 0, 0, 14] },
        { text: 'Experiencia laboral', style: 'sectionTitle' },
        {
            ul: (extractedProfile.experience || []).map((experience) =>
                [experience.title, experience.company, summarizeExperience(experience) || 'Experiencia aplicada']
                    .filter(Boolean)
                    .join(' · ')
            ),
            margin: [0, 0, 0, 12],
        },
        { text: 'Educación', style: 'sectionTitle' },
        {
            ul: (extractedProfile.education || []).map((education) =>
                [education.degree, education.institution || education.field, education.year].filter(Boolean).join(' · ')
            ),
            margin: [0, 0, 0, 12],
        },
        { text: 'Idiomas', style: 'sectionTitle' },
        { text: visibleLanguages.length ? visibleLanguages.join(' · ') : 'Sin idiomas registrados', margin: [0, 0, 0, 14] },
        { text: 'Ruta recomendada', style: 'sectionTitle' },
        recommendedRoute.length
            ? {
                  table: {
                      headerRows: 1,
                      widths: ['16%', '54%', '30%'],
                      body: [
                          [
                              { text: 'Sprint', style: 'tableHeader' },
                              { text: 'Bloque', style: 'tableHeader' },
                              { text: 'Especialización', style: 'tableHeader' },
                          ],
                          ...buildRouteRows(recommendedRoute),
                      ],
                  },
                  layout: 'lightHorizontalLines',
                  margin: [0, 0, 0, 14],
              }
            : { text: 'No hay ruta recomendada disponible.', color: '#64748B', margin: [0, 0, 0, 14] },
        { text: 'Módulos del máster', style: 'sectionTitle' },
        availableModules.length
            ? {
                  table: {
                      headerRows: 1,
                      widths: ['16%', '34%', '50%'],
                      body: [
                          [
                              { text: 'Módulo', style: 'tableHeader' },
                              { text: 'Título', style: 'tableHeader' },
                              { text: 'Descripción', style: 'tableHeader' },
                          ],
                          ...buildModuleRows(availableModules),
                      ],
                  },
                  layout: 'lightHorizontalLines',
                  margin: [0, 0, 0, 14],
              }
            : { text: 'No hay módulos cargados para este máster.', color: '#64748B', margin: [0, 0, 0, 14] },
        {
            table: {
                widths: ['100%'],
                body: [[{ text: REPORT_NOTE, style: 'note', fillColor: '#E6F3EE', margin: [10, 8, 10, 8] }]],
            },
            layout: 'noBorders',
            margin: [0, 4, 0, 0],
        },
    ],
});

const buildCertificatePdfDefinition = ({ logoSvg, generatedAt, extractedProfile, selectedMasterName }) => ({
    pageSize: 'A4',
    pageMargins: [46, 44, 46, 44],
    defaultStyle: {
        color: '#16110F',
        fontSize: 11,
    },
    styles: {
        certTitle: { fontSize: 24, bold: true, color: '#16110F', alignment: 'center' },
        certSubtitle: { fontSize: 11, color: '#64748B', alignment: 'center' },
        certBody: { fontSize: 14, color: '#16110F', alignment: 'center', lineHeight: 1.45 },
        certName: { fontSize: 26, bold: true, color: '#0C5258', alignment: 'center' },
        certMeta: { fontSize: 11, color: '#475569', alignment: 'center' },
    },
    content: [
        {
            canvas: [
                { type: 'rect', x: 0, y: 0, w: 515, h: 715, lineWidth: 1.4, lineColor: '#0C5258' },
                { type: 'rect', x: 12, y: 12, w: 491, h: 691, lineWidth: 0.7, lineColor: '#F45A22' },
            ],
            absolutePosition: { x: 46, y: 44 },
        },
        {
            stack: [
                { svg: logoSvg, width: 140, alignment: 'center', margin: [0, 18, 0, 10] },
                { text: 'CERTIFICADO DE ONBOARDING', style: 'certTitle', margin: [0, 6, 0, 4] },
                { text: 'LÄR University', style: 'certSubtitle', margin: [0, 0, 0, 24] },
                {
                    table: {
                        widths: ['100%'],
                        body: [[{ text: 'CONSTANCIA OFICIAL', alignment: 'center', color: '#0C5258', bold: true, margin: [0, 6, 0, 6] }]],
                    },
                    layout: {
                        hLineColor: () => '#D9E7E4',
                        vLineColor: () => '#D9E7E4',
                        paddingLeft: () => 0,
                        paddingRight: () => 0,
                        paddingTop: () => 0,
                        paddingBottom: () => 0,
                    },
                    margin: [0, 0, 0, 28],
                },
                {
                    text: [
                        'Se hace constar que ',
                        { text: extractedProfile.name || 'el participante', bold: true },
                        ' ha culminado el proceso de onboarding de LÄR University con una presentación profesional de su perfil y ruta formativa.',
                    ],
                    style: 'certBody',
                    margin: [20, 0, 20, 18],
                },
                { text: selectedMasterName, style: 'certName', margin: [0, 0, 0, 10] },
                { text: REPORT_NOTE, style: 'certMeta', margin: [0, 0, 0, 18] },
                {
                    columns: [
                        {
                            stack: [
                                { text: 'Fecha de emisión', style: 'certMeta' },
                                { text: generatedAt, style: 'certSubtitle', margin: [0, 4, 0, 0] },
                            ],
                            width: '50%',
                        },
                        {
                            stack: [
                                { text: 'LÄR University', style: 'certMeta' },
                                { text: 'Onboarding completado', style: 'certSubtitle', margin: [0, 4, 0, 0] },
                            ],
                            width: '50%',
                            alignment: 'right',
                        },
                    ],
                    margin: [0, 38, 0, 0],
                },
            ],
            margin: [40, 58, 40, 48],
        },
    ],
});

const PerfilPage = () => {
    const { user, masters } = useAuth();
    const { analysis, analysisLoading: loading } = useCvAnalysis({
        enabled: true,
        masters,
        selectedMaster: null,
    });
    const [exportingProfilePdf, setExportingProfilePdf] = useState(false);
    const [exportingCertificatePdf, setExportingCertificatePdf] = useState(false);
    const resolvedMasterId = analysis?.masterId || user?.selectedMasterId || null;
    const selectedMaster = findMasterById(masters, resolvedMasterId);
    const { moduleItems: availableModules } = useMasterModules(selectedMaster?.id || resolvedMasterId);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                <Loader2 className="animate-spin text-orange-accent" size={40} />
                <p className="text-dark-muted">Cargando tu perfil profesional...</p>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="space-y-6 py-20 text-center">
                <div className="inline-flex rounded-full bg-dark-card p-6">
                    <FileCheck className="text-dark-muted" size={48} />
                </div>
                <div>
                    <h2 className="mb-2 text-2xl font-bold">Aún no hay perfil analizado</h2>
                    <p className="mx-auto max-w-md text-dark-muted">
                        Sube tu currículum en la página de inicio para generar tu perfil profesional con IA.
                    </p>
                </div>
            </div>
        );
    }

    const { extractedProfile = {}, recommendation = {} } = analysis;
    const routeBlocks = recommendation.sprint?.blocks || recommendation.planBlocks || [];
    const subjects = recommendation.subjects || [];
    const recommendedRoute = (routeBlocks.length
        ? routeBlocks
        : subjects.map((subject, index) => ({
              id: `subject-${index + 1}`,
              blockTitle: subject,
              specializationName: recommendation.primarySpecialization || '',
          }))
    ).slice(0, 6);
    const profileHighlights = buildProfessionalHighlights(extractedProfile);
    const displaySkills = buildDisplaySkills(extractedProfile);
    const visibleLanguages = (extractedProfile.languages || []).map(formatLanguage).filter(Boolean);
    const masterDisplayName = getMasterDisplayName(selectedMaster || resolvedMasterId) || 'Máster seleccionado';
    const scoreValue = Number(recommendation.matchScore || 0);
    const scoreLabel =
        scoreValue >= 85 ? 'Alta compatibilidad' : scoreValue >= 70 ? 'Buen encaje' : 'Potencial de crecimiento';
    const scoreStyle = { '--score': `${Math.max(0, Math.min(scoreValue, 100))}%` };
    const visibleProfileTags = [
        masterDisplayName,
        extractedProfile.industry,
        extractedProfile.yearsOfExperience ? `${extractedProfile.yearsOfExperience} años de experiencia` : null,
    ]
        .filter(Boolean)
        .slice(0, 3);

    const handleDownloadProfilePdf = async () => {
        setExportingProfilePdf(true);

        try {
            const [pdfMake, logoSvg] = await Promise.all([loadPdfMake(), loadLogoSvg()]);
            const generatedAt = formatPdfDate();
            const documentDefinition = buildProfilePdfDefinition({
                logoSvg,
                generatedAt,
                extractedProfile,
                selectedMasterName: masterDisplayName,
                scoreValue,
                scoreLabel,
                profileHighlights,
                displaySkills,
                visibleLanguages,
                recommendedRoute,
                availableModules,
            });

            pdfMake.createPdf(documentDefinition).download(buildFileName('perfil', extractedProfile.name || 'perfil'));
        } catch (error) {
            console.error('Error generating profile PDF:', error);
        } finally {
            setExportingProfilePdf(false);
        }
    };

    const handleDownloadCertificatePdf = async () => {
        setExportingCertificatePdf(true);

        try {
            const [pdfMake, logoSvg] = await Promise.all([loadPdfMake(), loadLogoSvg()]);
            const generatedAt = formatPdfDate();
            const documentDefinition = buildCertificatePdfDefinition({
                logoSvg,
                generatedAt,
                extractedProfile,
                selectedMasterName: masterDisplayName,
            });

            pdfMake
                .createPdf(documentDefinition)
                .download(buildFileName('certificado-onboarding', extractedProfile.name || 'perfil'));
        } catch (error) {
            console.error('Error generating certificate PDF:', error);
        } finally {
            setExportingCertificatePdf(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700">
            <header className="space-y-4">
                <div>
                    <p className="profile-section-kicker">PERFIL PROFESIONAL</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Mi perfil profesional</h1>
                    <p className="mt-2 max-w-3xl text-sm text-dark-muted">
                        Información extraída de tu último CV analizado y alineada con el máster seleccionado.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleDownloadProfilePdf}
                            disabled={exportingProfilePdf}
                            className="inline-flex items-center gap-2 rounded-full border border-[#F45A22]/25 bg-[#F45A22] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(240,90,40,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E34F19] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {exportingProfilePdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                            Descargar perfil en PDF
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadCertificatePdf}
                            disabled={exportingCertificatePdf}
                            className="inline-flex items-center gap-2 rounded-full border border-[#0C5258]/20 bg-white px-5 py-3 text-sm font-semibold text-[#0C5258] shadow-[0_16px_28px_rgba(12,82,88,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0C5258]/35 hover:bg-[#F4FAFA] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {exportingCertificatePdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                            Descargar certificado
                        </button>
                    </div>
                </div>

                <section className="profile-hero-shell">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="profile-hero-avatar">{extractedProfile.name?.charAt(0) || 'L'}</div>

                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                                    Perfil analizado
                                </p>
                                <h2 className="mt-2 truncate text-2xl font-bold text-white md:text-3xl">
                                    {extractedProfile.name || 'Perfil analizado'}
                                </h2>
                                <p className="mt-1 truncate text-base font-medium text-white/80">
                                    {extractedProfile.currentRole || 'Rol no especificado'}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {visibleProfileTags.map((tag) => (
                                        <span key={tag} className="profile-hero-chip">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {scoreValue > 0 ? (
                                <div className="profile-score-card">
                                    <div className="profile-score-ring" style={scoreStyle}>
                                        <div className="profile-score-ring-inner">
                                            <strong>{scoreValue}%</strong>
                                            <span>Score</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                                            Compatibilidad
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-white">{scoreLabel}</p>
                                        <p className="text-sm text-white/70">Encaje estimado con la ruta recomendada.</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <div className="profile-premium-card p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="profile-section-kicker">FORTALEZAS CLAVE</p>
                                <h3 className="mt-2 text-xl font-bold text-[#16110F]">Tu perfil destaca en</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Puntos del CV que hoy generan mejor percepción de valor.
                                </p>
                            </div>

                            <div className="rounded-full bg-[#F45A22]/10 p-2 text-[#F45A22]">
                                <Sparkles size={18} />
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {profileHighlights.map((highlight) => (
                                <div key={highlight} className="profile-highlight-item">
                                    <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-[#0C5258]" />
                                    <p className="text-sm leading-6 text-[#2F2A27]">{highlight}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="profile-premium-card p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="profile-section-kicker">SKILL SIGNALS</p>
                                <h3 className="mt-2 text-xl font-bold text-[#16110F]">Habilidades destacadas</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Lectura visual de las capacidades más visibles en tu perfil actual.
                                </p>
                            </div>

                            <div className="rounded-full bg-[#50A584]/10 p-2 text-[#50A584]">
                                <Award size={18} />
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            {displaySkills.map((skill) => (
                                <div key={skill.label} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-[#16110F]">{skill.label}</p>
                                        <span className="text-sm font-semibold text-slate-500">{skill.level}%</span>
                                    </div>

                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        {skill.caption}
                                    </p>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${skill.level}%`, backgroundColor: skill.barColor }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(extractedProfile.skills || []).length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {extractedProfile.skills.slice(0, 6).map((skill) => (
                                    <span key={skill} className="profile-neutral-chip">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {(extractedProfile.experience || []).length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                                <Briefcase className="text-orange-accent" size={20} />
                                Experiencia laboral
                            </h3>
                            <div className="space-y-5">
                                {extractedProfile.experience.map((experience, index) => (
                                    <div
                                        key={`${experience.company}-${index}`}
                                        className="relative border-l-2 pb-5 pl-5 last:pb-0"
                                        style={{ borderLeftColor: '#EE5522' }}
                                    >
                                        <div
                                            className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2"
                                            style={{ borderColor: '#EE5522', backgroundColor: '#2D2926' }}
                                        />
                                        <h4 className="text-base font-bold">{experience.title}</h4>
                                        <p className="text-sm text-dark-muted">{experience.company}</p>
                                        <p className="mt-1 text-sm font-medium text-dark-text">
                                            {summarizeExperience(experience)
                                                ? `→ ${summarizeExperience(experience)}`
                                                : '→ Experiencia aplicada'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.education || []).length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                                <GraduationCap className="text-orange-accent" size={18} />
                                Educación
                            </h3>
                            <div className="space-y-3">
                                {extractedProfile.education.map((education, index) => (
                                    <div key={`${education.institution}-${index}`} className="rounded-2xl border border-dark-border bg-dark-bg/50 px-4 py-4">
                                        <p className="font-bold">{education.degree}</p>
                                        <p className="text-sm text-dark-muted">{education.institution || education.field}</p>
                                        {education.year ? <p className="mt-1 text-sm text-orange-accent">{education.year}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleLanguages.length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                                <Languages className="text-orange-accent" size={18} />
                                Idiomas
                            </h3>
                            <div className="rounded-2xl border border-dark-border bg-dark-bg/50 px-4 py-4">
                                <p className="text-sm font-medium text-dark-text">{visibleLanguages.join(' | ')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6 lg:col-span-2">
                    {recommendedRoute.length > 0 && (
                        <div className="profile-premium-card p-6">
                            <div className="flex flex-col gap-3">
                                <div>
                                    <p className="profile-section-kicker">ROADMAP SUGERIDO</p>
                                    <h3 className="mt-2 flex items-center gap-2 text-xl font-bold text-[#16110F]">
                                        <TrendingUp className="text-[#F45A22]" size={20} />
                                        Ruta recomendada
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Secuencia visual para recorrer tu recomendación de forma clara.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                {recommendedRoute.map((block, index) => (
                                    <div key={block.id || block.blockTitle} className="profile-roadmap-item">
                                        <div className="profile-roadmap-step">{index + 1}</div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-base font-semibold text-[#16110F]">
                                                    {block.blockTitle || block.title}
                                                </p>

                                                {block.specializationName ? (
                                                    <span className="profile-module-chip">{block.specializationName}</span>
                                                ) : null}
                                            </div>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Sprint {index + 1} de tu hoja de ruta recomendada.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {availableModules.length > 0 && (
                        <div className="profile-premium-card p-6">
                            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <p className="profile-section-kicker">CATÁLOGO BASE</p>
                                    <h3 className="mt-2 flex items-center gap-2 text-xl font-bold text-[#16110F]">
                                        <Briefcase className="text-[#F45A22]" size={20} />
                                        Módulos existentes del Máster
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Contenido actualmente disponible en {masterDisplayName}.
                                    </p>
                                </div>

                                <span className="profile-neutral-chip">{availableModules.length} módulos</span>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {availableModules.map((module, index) => (
                                    <article key={module.id} className="rounded-[22px] border border-slate-200 bg-[#FCFAF8] p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                    Módulo {index + 1}
                                                </p>
                                                <h4 className="mt-2 text-base font-bold text-[#16110F]">{module.title}</h4>
                                            </div>

                                            <span className="profile-module-chip whitespace-nowrap shrink-0">
                                                {module.topicsCount ?? module.topics?.length ?? 0} temas
                                            </span>
                                        </div>

                                        {module.description ? (
                                            <p className="mt-4 text-sm leading-6 text-slate-500">
                                                {module.description}
                                            </p>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="profile-premium-card overflow-hidden p-0">
                        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                            <div className="p-6 md:p-8">
                                <p className="profile-section-kicker">CERTIFICADO OFICIAL</p>
                                <h3 className="mt-2 text-2xl font-bold text-[#16110F]">
                                    Constancia de onboarding de LÄR University
                                </h3>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                                    Este certificado resume la culminación del proceso de onboarding y acompaña el perfil con
                                    una presentación formal, lista para descargar y compartir.
                                </p>

                                <div className="mt-6 rounded-[26px] border border-[#0C5258]/10 bg-[#F8FCFB] p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0C5258]/10 text-[#0C5258]">
                                            <BadgeCheck size={22} />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0C5258]/70">
                                                Acreditación
                                            </p>
                                            <h4 className="mt-2 text-lg font-bold text-[#16110F]">
                                                El proceso de onboarding ha sido completado
                                            </h4>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">{REPORT_NOTE}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDownloadCertificatePdf}
                                        disabled={exportingCertificatePdf}
                                        className="inline-flex items-center gap-2 rounded-full bg-[#0C5258] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(12,82,88,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0A454A] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {exportingCertificatePdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                                        Descargar constancia PDF
                                    </button>
                                </div>
                            </div>

                            <div className="relative overflow-hidden border-t border-[#E9ECEB] bg-[radial-gradient(circle_at_top,_rgba(12,82,88,0.14),_transparent_42%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFA_100%)] p-6 md:p-8 lg:border-l lg:border-t-0">
                                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#F45A22]/10 blur-3xl" />
                                <div className="relative flex h-full flex-col justify-between rounded-[28px] border border-dashed border-[#0C5258]/15 bg-white/80 p-5 shadow-[0_20px_40px_rgba(17,24,39,0.06)] backdrop-blur">
                                    <div>
                                        <div className="flex items-center justify-center">
                                            <img src="/lar-hub.svg" alt="LÄR University" className="h-10 w-auto object-contain" />
                                        </div>

                                        <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0C5258]/70">
                                            Certificado de onboarding
                                        </p>
                                        <h4 className="mt-3 text-center text-2xl font-bold tracking-tight text-[#16110F]">
                                            {extractedProfile.name || 'Perfil analizado'}
                                        </h4>
                                        <p className="mt-2 text-center text-sm font-medium text-slate-500">
                                            {masterDisplayName}
                                        </p>

                                        <div className="mt-5 rounded-[22px] bg-[#F4FAFA] px-4 py-4 text-center">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0C5258]/60">
                                                Constancia
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                                Se certifica la realización del proceso de onboarding de LÄR University con
                                                una presentación profesional del perfil y de la ruta recomendada.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                Emitido
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[#16110F]">{formatPdfDate()}</p>
                                        </div>

                                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                Estado
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[#0C5258]">Onboarding completado</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerfilPage;
