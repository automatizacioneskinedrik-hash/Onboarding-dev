const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../observability/logger');

const logger = createLogger({ component: 'service.pdf' });

/**
 * Extrae texto normalizado desde un PDF o un CSV aceptando buffer o path.
 * Se usa antes del perfilado con IA, asi que prioriza legibilidad del texto por
 * encima de preservar el formato original del documento.
 */
const extractTextFromFile = async (input, filename = '') => {
    try {
        let buffer;
        let isCSV = filename.toLowerCase().endsWith('.csv');

        if (typeof input === 'string') {
            if (!fs.existsSync(input)) {
                throw new Error(`File not found: ${input}`);
            }
            buffer = fs.readFileSync(input);
            if (!isCSV) isCSV = input.toLowerCase().endsWith('.csv');
        } else if (Buffer.isBuffer(input)) {
            buffer = input;
        } else {
            throw new Error('Invalid input: must be a file path or Buffer');
        }

        let text = '';
        let info = {};
        let pages = 1;

        if (isCSV) {
            // Los CSV llegan con separadores variados; los aplanamos para que la IA reciba
            // texto continuo y mas facil de resumir.
            text = buffer.toString('utf-8')
                .replace(/;/g, ' ')
                .replace(/\t/g, ' ')
                .trim();
            info = { type: 'csv' };
        } else {
            try {
                const data = await pdfParse(buffer);
                text = data.text;
                pages = data.numpages;
                info = data.info;
            } catch (pdfErr) {
                logger.warn('PDF con fallback a texto plano', {
                    filename,
                    error: pdfErr.message,
                });
                // Algunos archivos etiquetados como PDF son texto plano o llegan corruptos;
                // este fallback intenta rescatar contenido util antes de fallar.
                text = buffer.toString('utf-8');
                info = { type: 'unknown_raw' };
            }
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No se pudo extraer texto del archivo o el contenido esta vacio. Asegurate de que sea un archivo PDF o CSV valido.');
        }

        // Compactamos el texto para no desperdiciar tokens en ruido de formato.
        const cleanedText = text
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return {
            text: cleanedText,
            pages,
            info,
        };
    } catch (error) {
        logger.error('Error extrayendo texto de archivo', {
            filename,
            error: error.message,
        });
        throw new Error(error.message);
    }
};

/**
 * Intenta borrar archivos temporales sin convertir la limpieza en un error fatal.
 */
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        logger.warn('No se pudo borrar archivo', {
            filePath: path.relative(process.cwd(), filePath),
            error: error.message,
        });
    }
};

module.exports = {
    extractTextFromFile,
    deleteFile,
};
