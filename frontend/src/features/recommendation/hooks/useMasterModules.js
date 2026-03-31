import { useEffect, useState } from 'react';
import { fetchMasterModules } from '../services/moduleService';
import { normalizeMasterId } from '../../../shared/utils/masters';

const TECH_MBA_ID = 'mtecmba';

const normalizeTopicTitle = (topic) => String(topic || '').trim();

const getUniqueTopics = (topics = []) => {
    const seen = new Set();

    return topics
        .map(normalizeTopicTitle)
        .filter((topic) => {
            if (!topic || seen.has(topic)) {
                return false;
            }

            seen.add(topic);
            return true;
        });
};

const normalizeMasterModulesForDisplay = ({ masterId, modules = [] }) => {
    if (normalizeMasterId(masterId) !== TECH_MBA_ID) {
        return modules;
    }

    return modules.map((module) => {
        if (!Array.isArray(module.topics)) {
            return module;
        }

        const uniqueTopics = getUniqueTopics(module.topics);

        return {
            ...module,
            topics: uniqueTopics,
            topicsCount: uniqueTopics.length,
        };
    });
};

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
                    const receivedModules = response.data.modules || [];
                    const normalizedModules = normalizeMasterModulesForDisplay({
                        masterId,
                        modules: receivedModules,
                    });

                    setModuleItems(normalizedModules);
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
