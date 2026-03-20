/**
 * File Upload Middleware (Multer)
 * Handles CV/PDF file uploads
 */

const fs = require('fs');
const multer = require('multer');
const path = require('path');

const { createLogger } = require('../../services/observability/logger');

const logger = createLogger({ component: 'middleware.upload' });

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(uploadDir, req.user ? req.user.id.toString() : 'temp');
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMimetypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
    const allowedExtensions = ['.pdf', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimetypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
        return;
    }

    req.log?.warn('Upload rechazado por formato', {
        fileName: file.originalname,
        mimeType: file.mimetype,
        extension: ext,
    });
    cb(new Error('Formato no valido. Por favor sube un archivo PDF o CSV valido.'), false);
};

const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: maxFileSize,
        files: 1,
    },
});

const uploadMemory = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: maxFileSize,
        files: 1,
    },
});

const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        req.log?.warn('Upload rechazado por multer', {
            errorCode: err.code,
            error: err.message,
        });

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `El archivo es demasiado grande. El tamano maximo es ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
                requestId: req.requestId,
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Solo puedes subir un archivo a la vez.',
                requestId: req.requestId,
            });
        }

        return res.status(400).json({
            success: false,
            message: `Error al subir el archivo: ${err.message}`,
            requestId: req.requestId,
        });
    }

    if (err) {
        req.log?.warn('Upload invalido', {
            error: err.message,
        });

        return res.status(400).json({
            success: false,
            message: err.message,
            requestId: req.requestId,
        });
    }

    next();
};

module.exports = { upload, uploadMemory, handleUploadError, uploadDir };
