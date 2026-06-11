# Migration map

## Base transversal

- `src/App.jsx` -> `src/app/App.jsx`
- `src/main.jsx` -> entrada directa a `src/app/App.jsx`
- `src/services/api.js` -> `src/shared/lib/http/api-client.js`
- `src/context/*` -> `src/features/auth` y `src/features/theme`

## Dominio Home

- `src/pages/HomePage.jsx` -> composicion del dashboard
- logica de orquestacion -> `src/features/home-dashboard/hooks/useHomeDashboard.js`
- sidebar -> `src/features/home-dashboard/components/HomeSidebar.jsx`
- panel de apoyo -> `src/features/recommendation/components/RecommendationSupportPanel.jsx`
- modal de master -> `src/features/master-selection/components/MasterSelectionModal.jsx`

## Dominio Chat

- `src/components/ChatComponent.jsx` -> `src/features/chat/components/ChatComponent.jsx`
- historial y streaming -> `src/features/chat/hooks/*`
- requests del chat -> `src/features/chat/services/chatService.js`

## Dominio CV y recomendacion

- normalizacion del analisis -> `src/features/cv-analysis/utils/analysis.js`
- fetch/upload de CV -> `src/features/cv-analysis/services/cvAnalysisService.js`
- modulos y recomendaciones -> `src/features/recommendation/*`

## Proximo paso recomendado

Extraer formularios reutilizables de autenticacion a `features/auth/components` y ampliar cobertura de tests por feature.
