// src/utils/qrService.js
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import stream from 'stream';

/**
 * Genera un buffer de PDF tamaño carta con los datos del centro de trabajo y su código QR.
 */
export async function generateWorkCenterPDF(workCenter) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Generar el código QR de alta resolución en Base64 DataURL
      // El QR contiene únicamente el token único que validará el servidor
      const qrDataURL = await QRCode.toDataURL(workCenter.qrToken, {
        errorCorrectionLevel: 'H', // Máxima tolerancia a daños/suciedad en papel impreso
        margin: 1,
        width: 400,
      });

      // 2. Crear documento PDF (Tamaño Carta / Letter)
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers = [];
      const bufferStream = new stream.Writable();

      bufferStream._write = (chunk, encoding, next) => {
        buffers.push(chunk);
        next();
      };

      doc.pipe(bufferStream);

      // --- DISEÑO INTERFAZ IMPRESA ---
      // Encabezado / Branding Limpieza
      doc.fillColor('#0D1A2E').fontSize(26).text('CONTROL DE ASISTENCIA', { align: 'center', underline: true });
      doc.moveDown(1);

      // Información de la Sede
      doc.fillColor('#333333').fontSize(14).text('Centro de Trabajo:', { stroke: true });
      doc.fillColor('#0D1A2E').fontSize(18).text(`${workCenter.name}`, { stroke: false });
      doc.moveDown(0.5);

      doc.fillColor('#333333').fontSize(12).text('Descripción / Dirección:');
      doc.fillColor('#555555').fontSize(12).text(`${workCenter.description || 'Sin descripción provista.'}`);
      doc.moveDown(1.5);

      // Instrucciones para el Personal
      doc.rect(50, doc.y, 512, 50).fill('#FBF7F2'); // Fondo crema para destacar
      doc.fillColor('#0D1A2E').fontSize(11)
         .text('INSTRUCCIONES: Al llegar o salir de su turno, abra su aplicación móvil institucional, presione "Escanear Código QR" y enfoque esta hoja. Recuerde tener su GPS activo.', 60, doc.y - 42, { width: 492, align: 'center' });
      
      doc.moveDown(2.5);

      // Dibujar Código QR centrado
      doc.image(qrDataURL, 156, doc.y, { width: 300 });

      // Pie de página instructivo
      doc.fontSize(10).fillColor('#888888').text('ID de Sede Digital: ' + workCenter.id, 50, 720, { align: 'center' });

      doc.end();

      bufferStream.on('finish', () => {
        resolve(Buffer.concat(buffers));
      });

    } catch (error) {
      reject(error);
    }
  });
}