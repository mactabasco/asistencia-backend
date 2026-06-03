// src/controllers/stateController.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createState(req, res) {
  try {
    const { name } = req.body;

    // Validación básica de entrada
    if (!name) {
      return res.status(400).json({ error: 'El nombre del estado es requerido' });
    }

    // Guardar en Supabase a través de Prisma
    const newState = await prisma.state.create({
      data: { name }
    });

    return res.status(201).json(newState);
  } catch (error) {
    console.error('Error al crear estado:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}