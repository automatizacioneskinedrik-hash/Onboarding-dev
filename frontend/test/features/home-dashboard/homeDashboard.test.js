import { describe, expect, it } from 'vitest';
import {
    buildChatPayload,
    buildSidebarTooltip,
    resolveActiveAnalysis,
    resolveActiveMaster,
    resolveAnalysisForChat,
} from '../../../src/features/home-dashboard/utils/homeDashboard';

describe('home dashboard helpers', () => {
    it('builds chat payloads without empty fields', () => {
        expect(
            buildChatPayload({
                title: 'Consulta MBA',
                masterId: 'mtecmba',
            })
        ).toEqual({
            title: 'Consulta MBA',
            masterId: 'mtecmba',
        });
    });

    it('resolves the active master from the chat context when a chat is open', () => {
        // Con un chat abierto, su contexto debe mandar sobre la seleccion global del perfil.
        const masters = [{ id: 'mtecmba', code: 'TECHMBA' }];
        const selectedMaster = { id: 'fallback', code: 'GENERAL' };

        expect(
            resolveActiveMaster({
                chatId: 'chat-1',
                masters,
                activeChatContext: { masterId: 'mtecmba' },
                selectedMaster,
            })
        ).toEqual(masters[0]);
    });

    it('normalizes the active analysis from the chat context', () => {
        // El dashboard consume analisis del chat y del perfil con el mismo contrato interno.
        const masters = [{ id: 'mtecmba', code: 'TECHMBA' }];

        const activeAnalysis = resolveActiveAnalysis({
            chatId: 'chat-1',
            activeChatContext: {
                analysis: {
                    id: 'analysis-1',
                    masterId: 'mtecmba',
                    profile: { currentRole: 'Consultor' },
                },
            },
            analysis: null,
            masters,
        });

        expect(activeAnalysis.master.code).toBe('TECH MBA');
        expect(activeAnalysis.extractedProfile.currentRole).toBe('Consultor');
    });

    it('returns the current analysis id when there is no active chat yet', () => {
        // Antes de crear un chat, la UI debe seguir pudiendo anclar el primer mensaje al
        // analisis global mas reciente.
        expect(
            resolveAnalysisForChat({
                chatId: null,
                activeChatContext: null,
                analysis: { id: 'analysis-99' },
            })
        ).toBe('analysis-99');
    });

    it('builds sidebar tooltip coordinates from the trigger element', () => {
        const element = {
            getBoundingClientRect: () => ({
                right: 48,
                top: 24,
                height: 20,
            }),
        };

        expect(buildSidebarTooltip(element, 'Perfil')).toEqual({
            text: 'Perfil',
            left: 60,
            top: 34,
        });
    });
});
