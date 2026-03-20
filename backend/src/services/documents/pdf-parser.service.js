/**
 * File Service
 * Handles PDF and CSV file parsing/extraction
 */

const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../observability/logger');

const logger = createLogger({ component: 'service.pdf' });

/**
 * Extract text from a PDF or CSV buffer or file path
 * @param {Buffer|string} input - File buffer or file path
 * @param {string} filename - Optional original filename to help with extension detection
 * @returns {Object} Extracted data
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
            // Normalize CSV content for easier AI extraction
            text = buffer.toString('utf-8')
                .replace(/;/g, ' ')
                .replace(/\t/g, ' ')
                .trim();
            info = { type: 'csv' };
        } else {
            // Assume PDF
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
                // If PDF parsing fails, try reading as raw text as fallback
                text = buffer.toString('utf-8');
                info = { type: 'unknown_raw' };
            }
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No se pudo extraer texto del archivo o el contenido está vacío. Asegúrate de que sea un archivo PDF o CSV válido.');
        }

        // Clean up the extracted text
        const cleanedText = text
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n{3,}/g, '\n\n')     // Max 2 consecutive newlines
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
 * Delete a file from the filesystem
 * @param {string} filePath - Path to the file
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
