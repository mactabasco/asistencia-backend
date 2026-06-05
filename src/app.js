// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

// Configurar variables de entorno
dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});

// Middlewares globales
app.use(cors());
app.use(express.json()); // Permite a Express entender JSON en el body de las peticiones

// Enlazar las rutas de la API
app.use('/api', apiRoutes);

// Ruta base de diagnóstico
app.get('/', (req, res) => {
  res.json({ status: 'Servidor operativo', proyecto: 'Sistema Móvil de Asistencia PWA' });
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo con éxito en http://localhost:${PORT}`);
});


// Añade esto al final de src/app.js para validar la comunicación viva
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();
prisma.user.findMany().then(users => console.log("Conexión exitosa. Usuarios en BD:", users.length));
