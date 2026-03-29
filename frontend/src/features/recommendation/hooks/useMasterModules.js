import { useEffect, useState } from 'react';
import { fetchMasterModules } from '../services/moduleService';

export const useMasterModules = (masterId) => {
    const [moduleItems, setModuleItems] = useState([]);
    const [moduleListLoading, setModuleListLoading] = useState(false);

    useEffect(() => {
        if (!masterId) {
            setModuleItems([]);
            setModuleListLoading(false);
            return;
        }

        let isMounted = true;

        // Evita actualizar estado si el usuario cambia rapido de master o desmonta el panel
        // antes de que termine la request.
        const loadModules = async () => {
            setModuleListLoading(true);

            try {
                const response = await fetchMasterModules(masterId);

                if (!isMounted) {
                    return;
                }

                if (response.success) {
                    setModuleItems(response.data.modules || []);
                } else {
                    setModuleItems([]);
                }
            } catch (error) {
                if (isMounted) {
                    console.error('Error fetching master modules:', error);
                    setModuleItems([]);
                }
            } finally {
                if (isMounted) {
                    setModuleListLoading(false);
                }
            }
        };

        loadModules();

        return () => {
            isMounted = false;
        };
    }, [masterId]);

    return {
        moduleItems,
        moduleListLoading,
    };
};
