'use strict';

require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;
const authMiddleware = require('./middlewares/authMiddleware');

// Middleware para procesar cuerpos JSON
app.use(express.json());

// Endpoint de verificación de estado y conectividad
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      status: 'OK',
      service: 'NexusCRM API',
      database: 'connected'
    });
  } catch (error) {
    return res.status(503).json({
      status: 'ERROR',
      service: 'NexusCRM API',
      database: 'disconnected'
    });
  }
});

// Rutas de Autenticación (Públicas: /register, /login; Protegida: /me)
app.use('/api/auth', require('./routes/authRoutes'));

// Rutas comerciales protegidas con JWT
app.use('/api/empresas', authMiddleware, require('./routes/empresaClienteRoutes'));
app.use('/api/contactos', authMiddleware, require('./routes/contactoRoutes'));
app.use('/api/oportunidades', authMiddleware, require('./routes/oportunidadComercialRoutes'));
app.use('/api/actividades', authMiddleware, require('./routes/actividadSeguimientoRoutes'));
app.use('/api/sectores', authMiddleware, require('./routes/sectorEmpresarialRoutes'));
app.use('/api/departamentos', authMiddleware, require('./routes/departamentoRoutes'));
app.use('/api/categorias-producto', authMiddleware, require('./routes/categoriaProductoRoutes'));
app.use('/api/direcciones-empresa', authMiddleware, require('./routes/direccionEmpresaRoutes'));
app.use('/api/empleados', authMiddleware, require('./routes/empleadoRoutes'));
app.use('/api/productos-servicios', authMiddleware, require('./routes/productoServicioRoutes'));
app.use('/api/campanas-marketing', authMiddleware, require('./routes/campanaMarketingRoutes'));
app.use('/api/cotizaciones', authMiddleware, require('./routes/cotizacionRoutes'));
app.use('/api/detalles-cotizacion', authMiddleware, require('./routes/detalleCotizacionRoutes'));
app.use('/api/contratos', authMiddleware, require('./routes/contratoRoutes'));
app.use('/api/facturas', authMiddleware, require('./routes/facturaRoutes'));
app.use('/api/detalles-factura', authMiddleware, require('./routes/detalleFacturaRoutes'));
app.use('/api/pagos', authMiddleware, require('./routes/pagoRoutes'));

// Manejador para rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada'
  });
});

// Manejo centralizado de errores de Express
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Error interno del servidor' : err.message
  });
});

let server;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Conexión con MySQL establecida correctamente.');

    server = app.listen(PORT, () => {
      console.log(`Servidor NexusCRM escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`\nSeñal ${signal} recibida. Cerrando servidor y conexiones...`);
  if (server) {
    server.close(async () => {
      try {
        await sequelize.close();
        console.log('Conexión con la base de datos cerrada ordenadamente.');
        process.exit(0);
      } catch (err) {
        console.error('Error al cerrar la conexión con la base de datos:', err.message);
        process.exit(1);
      }
    });
  } else {
    await sequelize.close();
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = { app, startServer };

