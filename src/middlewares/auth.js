// src/middlewares/auth.js
import jwt from 'jsonwebtoken';

// Verifica si el token es válido y extrae el usuario
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_2026');
    req.user = decoded; // Contiene id, email y role
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

// Permite restringir accesos según el rol de la matriz de permisos
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes. No tienes autorización para realizar esta acción.' 
      });
    }
    next();
  };
}