// src/controllers/workCenterController.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

import { generateWorkCenterPDF } from '../utils/qrService.js';

export async function createWorkCenter(req, res) {
  try {
    const { stateId, name, description, latitude, longitude, timezone } = req.body;

    // 1. Guardar registro en la base de datos (Autogenera el qrToken automáticamente gracias a Prisma)
    const newWorkCenter = await prisma.workCenter.create({
      data: {
        stateId,
        name,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timezone
      }
    });

    // 2. Generar el PDF dinámico
    const pdfBuffer = await generateWorkCenterPDF(newWorkCenter);

    // 3. Responder enviando el PDF directamente para descarga (Stream de datos)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=QR_${newWorkCenter.name.replace(/\s+/g, '_')}.pdf`);
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar el centro de trabajo o al generar el documento PDF.' });
  }
}