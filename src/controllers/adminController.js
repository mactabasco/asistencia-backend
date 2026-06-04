// src/controllers/adminController.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

import PDFDocument from 'pdfkit';
import stream from 'stream';



/**
 * Obtiene los registros de asistencia en tiempo real aplicando segmentación por rol
 */
export async function getDashboardLogs(req, res) {
  try {

    const { id, role, stateId } = req.user;
    const { date, workCenterId } = req.query;

    // Filtros dinámicos base
    let whereClause = {};

    // REGLA DE NEGOCIO: Los Coordinadores sólo ven los registros de su Estado asignado
    if (role === 'COORDINATOR') {
      if (!stateId) {
        return res.status(403).json({ error: 'El coordinador no tiene un Estado asignado.' });
      }
      whereClause.workCenter = { stateId: stateId };
    }

    // Filtros opcionales desde el panel
    if (workCenterId) {
      whereClause.workCenterId = workCenterId;
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      whereClause.timestamp = { gte: startOfDay, lte: endOfDay };
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
        workCenter: { select: { name: true, state: { select: { name: true } } } }
      },
      orderBy: { timestamp: 'desc' }
    });

    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener registros del dashboard.' });
  }
}

/**
 * Genera un reporte consolidado en PDF con formato de lista y áreas de firmas corporativas
 */
export async function exportPDFReport(req, res) {
  try {
    const { role, stateId } = req.user;
    const { date, workCenterId } = req.query;

    let whereClause = {};
    if (role === 'COORDINATOR') {
      whereClause.workCenter = { stateId: stateId };
    }
    if (workCenterId) whereClause.workCenterId = workCenterId;
    if (date) {
      whereClause.timestamp = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`)
      };
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: { user: true, workCenter: true },
      orderBy: { timestamp: 'asc' }
    });

    // Crear PDF de lista estructurada
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const buffers = [];
    const bufferStream = new stream.Writable();
    bufferStream._write = (chunk, encoding, next) => { buffers.push(chunk); next(); };
    doc.pipe(bufferStream);

    // Encabezado
    doc.fillColor('#0D1A2E').fontSize(20).text('LIMPIASUR SA DE CV', { align: 'center' });
    doc.fontSize(12).text('REPORTE INSTITUCIONAL DE ASISTENCIA OPERATIVA', { align: 'center' });
    doc.moveDown(2);

    // Tabla Estructurada (Encabezados)
    const tableTop = 140;
    doc.fontSize(10).fillColor('#0D1A2E');
    doc.text('Empleado', 40, tableTop, { bold: true });
    doc.text('Centro de Trabajo', 180, tableTop);
    doc.text('Fecha/Hora (UTC)', 340, tableTop);
    doc.text('Movimiento', 450, tableTop);
    doc.text('Estatus', 520, tableTop);

    doc.moveTo(40, tableTop + 15).lineTo(570, tableTop + 15).strokeColor('#0D1A2E').strokeWidth(1).stroke();

    let yPosition = tableTop + 25;
    doc.fillColor('#333333');

    logs.forEach(log => {
      // Validar si los datos exceden la página actual
      if (yPosition > 620) {
        doc.addPage();
        yPosition = 50; // Reiniciar arriba en la nueva hoja
      }

      doc.text(log.user.name, 40, yPosition);
      doc.text(log.workCenter.name, 180, yPosition);
      doc.text(log.timestamp.toISOString().replace('T', ' ').substring(0, 19), 340, yPosition);
      doc.text(log.type, 450, yPosition);
      doc.text(log.status, 520, yPosition);
      
      yPosition += 20;
    });

    // REQUERIMIENTO CRÍTICO: Espacio al pie de página para firmas institucionales
    // Forzamos las firmas al final del documento físico
    const footerTop = 680;
    doc.moveTo(60, footerTop).lineTo(240, footerTop).strokeColor('#888888').stroke();
    doc.moveTo(370, footerTop).lineTo(550, footerTop).stroke();

    doc.fontSize(9).fillColor('#555555');
    doc.text('Por la Institución\n(Nombre, Firma y Sello)', 60, footerTop + 10, { width: 180, align: 'center' });
    doc.text('Por la Empresa\nLimpiasur SA de CV', 370, footerTop + 10, { width: 180, align: 'center' });

    doc.end();

    bufferStream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Asistencia.pdf');
      return res.send(Buffer.concat(buffers));
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al compilar el reporte PDF.' });
  }
}

/**
 * Genera un reporte consolidado en formato plano plano plano (CSV)
 */
export async function exportCSVReport(req, res) {
  try {
    const { role, stateId } = req.user;
    const { date, workCenterId } = req.query;

    let whereClause = {};
    if (role === 'COORDINATOR') whereClause.workCenter = { stateId: stateId };
    if (workCenterId) whereClause.workCenterId = workCenterId;
    if (date) {
      whereClause.timestamp = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`)
      };
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: { user: true, workCenter: true }
    });

    // Cabeceras del archivo plano CSV
    let csvContent = '\uFEFF'; // Añadir BOM para compatibilidad directa con Excel en español
    csvContent += 'Empleado,Email,Centro de Trabajo,Fecha Hora UTC,Tipo,Estatus,Latitud Reportada,Longitud Reportada\n';

    logs.forEach(log => {
      csvContent += `"${log.user.name}","${log.user.email}","${log.workCenter.name}","${log.timestamp.toISOString()}","${log.type}","${log.status}",${log.latitudeRep},${log.longitudeRep}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Asistencia.csv');
    return res.send(csvContent);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al compilar el reporte CSV.' });
  }
}