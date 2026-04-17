import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecommendationSupportPanel from '../../../src/features/recommendation/components/RecommendationSupportPanel';

describe('RecommendationSupportPanel', () => {
    const baseProps = {
        analysis: null,
        analysisLoading: false,
        cvImprovementContent: null,
        file: null,
        improvementTips: [],
        isDarkMode: true,
        needsMasterSelection: true,
        onChangeMaster: vi.fn(),
        onFileChange: vi.fn(),
        onOpenMasterSelection: vi.fn(),
        onUpload: vi.fn(),
        selectedMaster: { id: 'mtecmba', code: 'TECHMBA' },
        selectedMasterVisual: { color: '#F05A28' },
        showMasterSelectionModal: false,
        uploading: false,
    };

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('shows selection guidance before a master is fully defined', () => {
        render(<RecommendationSupportPanel {...baseProps} />);

        expect(screen.getByText('Selecciona tu MBA')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Abrir selección/i })).toBeInTheDocument();
    });

    it('keeps the selected master bar and renders actionable CV guidance when analysis exists', () => {
        render(
            <RecommendationSupportPanel
                {...baseProps}
                needsMasterSelection={false}
                analysis={{
                    extractedProfile: {
                        currentRole: 'Consultor',
                        industry: 'Tecnologia',
                        yearsOfExperience: 6,
                        skills: ['Liderazgo', 'Producto'],
                    },
                }}
                cvImprovementContent={{
                    strengths: ['Base tecnica solida', 'Experiencia en entorno tecnologico'],
                    growthAreas: ['Logros medibles', 'Liderazgo y toma de decisiones'],
                    recommendedChanges: [
                        {
                            title: 'Perfil profesional',
                            suggestion: 'Orienta la redaccion hacia automatizacion y proyeccion de liderazgo.',
                        },
                    ],
                    narrativeTips: ['Prioriza los sprints de estrategia.'],
                }}
            />
        );

        expect(screen.getByText(/MBA seleccionado/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cambiar MBA/i })).toBeInTheDocument();
        expect(screen.getAllByText(/TECH MBA/i).length).toBeGreaterThan(0);
        expect(screen.queryByText(/Tu perfil actual/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Como mejorar tu CV para este Master/i)).toBeInTheDocument();
        expect(screen.getByText(/Fortalezas/i)).toBeInTheDocument();
        expect(screen.getByText(/Lo que debes reforzar/i)).toBeInTheDocument();
        expect(screen.getByText(/Cambios recomendados/i)).toBeInTheDocument();
        expect(screen.getByText(/Base tecnica solida/i)).toBeInTheDocument();
        expect(screen.getByText(/Perfil profesional/i)).toBeInTheDocument();
        expect(screen.getByText(/automatizacion y proyeccion de liderazgo/i)).toBeInTheDocument();
    });
});
