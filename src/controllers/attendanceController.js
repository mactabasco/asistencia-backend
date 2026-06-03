// src/controllers/attendanceController.js
import { PrismaClient } from '@prisma/client';
import { getDistanceInMeters } from '../utils/haversine.js';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export async function registerAttendance(req, res) {
  try {
    const { qrToken, latitude, longitude, type, celular } = req.body;
    const userId = req.user.id; // Obtenido del Middleware JWT

    // 1. Buscar al empleado y su configuración horaria
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return res.status(444).json({ error: 'Usuario no encontrado' });

    // 2. Buscar el Centro de Trabajo mediante el Token del QR escaneado
    const workCenter = await prisma.workCenter.findUnique({
      where: { qrToken },
    });

    if (!workCenter) {
      return res.status(400).json({ error: 'Código QR inválido o no registrado' });
    }

    // 3. LOGICA ANTIFRAUDE: Validación de Distancia (Máximo 50 metros)
    const distance = getDistanceInMeters(latitude, longitude, workCenter.latitude, workCenter.longitude);
    
    if (distance > 50) {
      // Se registra la incidencia inmediatamente como FALLIDO_GPS para auditorías
      await prisma.attendanceLog.create({
        data: {
          userId,
          workCenterId: workCenter.id,
          type,
          status: 'FALLIDO_GPS',
          latitudeRep: latitude,
          longitudeRep: longitude,
          celular,
          notes: `Intento de registro a ${Math.round(distance)} metros de la sede.`,
        },
      });
      return res.status(403).json({ 
        error: 'Ubicación denegada. Te encuentras fuera del rango permitido de la sede.',
        status: 'FALLIDO_GPS' 
      });
    }

    // 4. LÓGICA DE TIEMPOS: Conversión a la Zona Horaria Local de la oficina
    const serverUtcTime = DateTime.utc(); 
    const localOfficeTime = serverUtcTime.setZone(workCenter.timezone);
    const localTimeStr = localOfficeTime.toFormat('HH:mm:ss'); // "HH:MM:SS" local

    let finalStatus = 'ASISTENCIA';

    if (type === 'IN') {
      const [expectedH, expectedM] = user.checkInTime.split(':').map(Number);
      
      // Creamos objetos DateTime del mismo día para comparar lapsos de tiempo de manera exacta
      const expectedTime = localOfficeTime.set({ hour: expectedH, minute: expectedM, second: 0 });
      
      const diffInMinutes = localOfficeTime.diff(expectedTime, 'minutes').minutes;

      if (diffInMinutes <= 15) {
        // Tolerancia de 15 minutos antes o después de la hora exacta
        finalStatus = 'ASISTENCIA';
      } else if (diffInMinutes > 15 && diffInMinutes <= 30) {
        // Entre el minuto 16 y el 30
        finalStatus = 'RETARDO';
      } else {
        // Pasados los 30 minutos de la hora de entrada
        finalStatus = 'FALTA';
      }
    } else {
      // Para las salidas (OUT), puedes implementar lógicas similares o marcar asistencia directa
      finalStatus = 'ASISTENCIA';
    }

    // 5. Guardar registro exitoso en UTC
    const log = await prisma.attendanceLog.create({
      data: {
        userId,
        workCenterId: workCenter.id,
        type,
        status: finalStatus,
        latitudeRep: latitude,
        longitudeRep: longitude,
        celular,
      },
    });

    return res.status(201).json({
      message: 'Registro de asistencia procesado con éxito',
      data: {
        status: log.status,
        localTime: localTimeStr,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar asistencia' });
  }
}