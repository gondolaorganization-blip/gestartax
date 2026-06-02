require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      const allowed = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim());
      callback(allowed.includes(origin) ? null : new Error('CORS'), allowed.includes(origin));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/empresas', require('./routes/empresa.routes'));
app.use('/api/itbms', require('./routes/itbms.routes'));
app.use('/api/empresas/:empresaId/itbms', require('./routes/itbms.routes'));
app.use('/api/isr', require('./routes/isr.routes'));
app.use('/api/empresas/:empresaId/isr', require('./routes/isr.routes'));
app.use('/api/anticipos', require('./routes/anticipo.routes'));
app.use('/api/empresas/:empresaId/anticipos', require('./routes/anticipo.routes'));
app.use('/api/obligaciones', require('./routes/obligacion.routes'));
app.use('/api/pagos', require('./routes/pago.routes'));
app.use('/api/empresas/:empresaId/inmuebles', require('./routes/inmueble.routes'));
app.use('/api/alertas', require('./routes/alerta.routes'));
app.use('/api/calendario', require('./routes/calendario.routes'));
// Alias convenientes para acceso directo por empresa
app.use('/api/empresas/:empresaId/calendario', (req, res, next) => {
  req.params.empresaId = req.params.empresaId;
  next();
}, require('./routes/calendario.routes'));
app.use('/api/empresas/:empresaId/alertas', require('./routes/alerta.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/reportes', require('./routes/reporte.routes'));
app.use('/api/planilla',   require('./routes/planilla.routes'));
app.use('/api/tasa-unica', require('./routes/tasaUnica.routes'));
app.use('/api/dividendos', require('./routes/dividendos.routes'));
app.use('/api/municipal',  require('./routes/municipal.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Gestar Tax', version: '1.0.0' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gestar Tax API corriendo en http://localhost:${PORT}`);
});

module.exports = app;
