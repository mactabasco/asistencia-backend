// src/controllers/authController.js
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_2026';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Buscar usuario e incluir relaciones necesarias para el Frontend
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        state: true,
        workCenter: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Generar JWT de sesión (Expiración larga como buena práctica para personal operativo)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    // Retornar datos esenciales de sesión omitiendo el hash de la contraseña
    return res.json({
      message: 'Autenticación exitosa',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state?.name || null,
        workCenter: user.workCenter?.name || null,
        checkInTime: user.checkInTime,
        checkOutTime: user.checkOutTime
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor durante el inicio de sesión.' });
  }
}


// Código de registro ---------------------

export async function register(req, res) {
  try {
    const { name, email, password, role, stateId, workCenterId } = req.body;

    // 1. Validar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    // 2. Encriptar la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Crear el usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'USER', // Rol por defecto si no viene en el body
        stateId,
        workCenterId
      }
    });

    // 4. Responder con éxito (omitiendo el hash)
    return res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en el servidor durante el registro.' });
  }
}
