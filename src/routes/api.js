// src/routes/api.js
import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { registerAttendance } from '../controllers/attendanceController.js';
import { createWorkCenter } from '../controllers/workCenterController.js';
import { createState } from '../controllers/stateController.js'; // <-- 1. IMPORTACIÓN
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.js';
import { getDashboardLogs, exportPDFReport, exportCSVReport } from '../controllers/adminController.js';

const router = Router();


// Rutas Públicas
router.post('/auth/register', register);
router.post('/auth/login', login);

// Rutas Protegidas de Empleados (PWA)
router.post('/attendance/register', authenticateJWT, authorizeRoles('EMPLOYEE', 'SUPERADMIN'), registerAttendance);


// Rutas Exclusivas de SuperAdmin (Panel Web)
router.post('/work-centers', authenticateJWT, authorizeRoles('SUPERADMIN'), createWorkCenter);
router.post('/states', authenticateJWT, authorizeRoles('SUPERADMIN'), createState); // <-- 2. RUTA PROTEGIDA

// Rutas de Administración y Monitoreo (Solo accesibles por SuperAdmin y Coordinadores)
router.get('/admin/dashboard', authenticateJWT, authorizeRoles('SUPERADMIN', 'COORDINATOR'), getDashboardLogs);
router.get('/admin/reports/pdf', authenticateJWT, authorizeRoles('SUPERADMIN', 'COORDINATOR'), exportPDFReport);
router.get('/admin/reports/csv', authenticateJWT, authorizeRoles('SUPERADMIN', 'COORDINATOR'), exportCSVReport);

export default router;