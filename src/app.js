// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import pkg from '@prisma/client';

// Configurar variables de entorno
dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json()); // Permite a Express entender JSON en el body de las peticiones

// Enlazar las rutas de la API
app.use('/api', apiRoutes);

// Ruta base de diagnóstico
app.get('/', (req, res) => {
  res.json({ status: 'Servidor operativo', proyecto: 'Sistema Móvil de Asistencia PWA' });
});

// Validación de Prisma (Conexión a la BD)
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
prisma.user.findMany()
  .then(users => console.log("Conexión exitosa. Usuarios en BD:", users.length))
  .catch(err => console.error("Error al conectar con Prisma/BD:", err));

// --- UN SOLO ARRANQUE DEL SERVIDOR (AL FINAL) ---
const PORT = process.env.PORT || 8080; 

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Express corriendo con éxito en el puerto ${PORT}`);
});
