import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecommendationSupportPanel from './RecommendationSupportPanel';

describe('RecommendationSupportPanel', () => {
    const baseProps = {
        analysis: null,
        analysisLoading: false,
        file: null,
        improvementTips: [],
        isDarkMode: true,
        needsMasterSelection: true,
        onChangeMaster: vi.fn(),
        onFileChange: vi.fn(),
        onOpenMasterSelection: vi.fn(),
        onUpload: vi.fn(),
        selectedMaster: { id: 'mtecmba', code: 'Master Tech MBA' },
        selectedMasterVisual: { color: '#F05A28' },
        showMasterSelectionModal: false,
        uploading: false,
    };

    it('shows selection guidance before a master is fully defined', () => {
        render(<RecommendationSupportPanel {...baseProps} />);

        expect(screen.getByText('Selecciona tu master')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Abrir seleccion/i })).toBeInTheDocument();
    });

    it('renders profile summary when analysis exists', () => {
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
                improvementTips={['Prioriza los bloques de estrategia.']}
            />
        );

        expect(screen.getByText(/Resumen del perfil/i)).toBeInTheDocument();
        expect(screen.getByText(/Consultor/i)).toBeInTheDocument();
        expect(screen.getByText(/Prioriza los bloques de estrategia/i)).toBeInTheDocument();
    });
});
