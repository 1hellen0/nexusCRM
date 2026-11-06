'use strict';

const { Pago, Factura, Sequelize } = require('../models');
const { Op } = Sequelize;

const ALLOWED_FIELDS = [
  'id_factura',
  'numero_operacion',
  'fecha_pago',
  'monto',
  'metodo_pago',
  'estado'
];

const PROTECTED_FIELDS = ['id_pago'];

const METODOS_PAGO_VALIDOS = ['Transferencia', 'Tarjeta', 'Cheque', 'Efectivo'];
const ESTADOS_VALIDOS = ['Pendiente', 'Confirmado', 'Rechazado'];

const INCLUDES_PAGO = [
  {
    model: Factura,
    as: 'factura',
    attributes: [
      'id_factura',
      'id_empresa',
      'id_contrato',
      'numero_factura',
      'fecha_emision',
      'fecha_vencimiento',
      'subtotal',
      'impuestos',
      'total',
      'estado'
    ]
  }
];

function validateId(param) {
  if (typeof param !== 'string' && typeof param !== 'number') return null;
  const str = String(param).trim();
  if (!/^[1-9]\d*$/.test(str)) return null;
  const num = parseInt(str, 10);
  return Number.isSafeInteger(num) ? num : null;
}

function checkDisallowedFields(body) {
  const keys = Object.keys(body);
  for (const key of keys) {
    if (PROTECTED_FIELDS.includes(key)) {
      return `No se permite modificar o enviar el atributo protegido '${key}'.`;
    }
    if (!ALLOWED_FIELDS.includes(key)) {
      return `El campo '${key}' no está permitido.`;
    }
  }
  return null;
}

function isValidDateTime(val) {
  if (typeof val !== 'string' || val.trim() === '') return false;
  const parsed = Date.parse(val);
  if (isNaN(parsed)) return false;

  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const testDate = new Date(y, m - 1, d);
    if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
      return false;
    }
  }
  return true;
}

function validateMonto(val) {
  if (val === undefined || val === null || val === '') {
    return 'El campo monto es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El monto debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El monto debe ser un número decimal válido mayor a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return 'El monto excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) {
    return 'El monto debe ser mayor que cero.';
  }
  return null;
}

function validatePagoPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_factura === undefined || data.id_factura === null) {
      return 'El campo id_factura es obligatorio.';
    }
    if (data.numero_operacion === undefined || data.numero_operacion === null || String(data.numero_operacion).trim() === '') {
      return 'El campo numero_operacion es obligatorio.';
    }
    if (data.fecha_pago === undefined || data.fecha_pago === null || String(data.fecha_pago).trim() === '') {
      return 'El campo fecha_pago es obligatorio.';
    }
    if (data.monto === undefined || data.monto === null || data.monto === '') {
      return 'El campo monto es obligatorio.';
    }
    if (data.metodo_pago === undefined || data.metodo_pago === null || String(data.metodo_pago).trim() === '') {
      return 'El campo metodo_pago es obligatorio.';
    }
  }

  if (data.id_factura !== undefined) {
    const idFacNum = validateId(data.id_factura);
    if (!idFacNum) {
      return 'El campo id_factura debe ser un número entero positivo.';
    }
  }

  if (data.numero_operacion !== undefined) {
    if (typeof data.numero_operacion !== 'string') {
      return 'El número de operación debe ser una cadena de texto.';
    }
    const numTrim = data.numero_operacion.trim();
    if (numTrim.length === 0) {
      return 'El número de operación no puede estar vacío.';
    }
    if (numTrim.length > 60) {
      return 'El número de operación no puede exceder 60 caracteres.';
    }
  }

  if (data.fecha_pago !== undefined) {
    if (!isValidDateTime(data.fecha_pago)) {
      return 'La fecha de pago (fecha_pago) debe ser una fecha y hora válida (ej. YYYY-MM-DD o formato ISO).';
    }
  }

  if (data.monto !== undefined) {
    const errMonto = validateMonto(data.monto);
    if (errMonto) return errMonto;
  }

  if (data.metodo_pago !== undefined) {
    if (typeof data.metodo_pago !== 'string') {
      return 'El método de pago debe ser una cadena de texto.';
    }
    const metTrim = data.metodo_pago.trim();
    if (!METODOS_PAGO_VALIDOS.includes(metTrim)) {
      return `El método de pago debe ser uno de los siguientes valores: ${METODOS_PAGO_VALIDOS.join(', ')}.`;
    }
  }

  if (data.estado !== undefined) {
    if (typeof data.estado !== 'string') {
      return 'El estado debe ser una cadena de texto.';
    }
    const estTrim = data.estado.trim();
    if (!ESTADOS_VALIDOS.includes(estTrim)) {
      return `El estado debe ser uno de los siguientes valores: ${ESTADOS_VALIDOS.join(', ')}.`;
    }
  }

  return null;
}

const pagoController = {
  async listarPagos(req, res) {
    try {
      const where = {};

      if (req.query.id_factura !== undefined) {
        const idFac = validateId(req.query.id_factura);
        if (!idFac) {
          return res.status(400).json({
            status: 'error',
            message: 'El filtro id_factura debe ser un número entero positivo válido.'
          });
        }
        where.id_factura = idFac;
      }

      if (req.query.metodo_pago !== undefined && typeof req.query.metodo_pago === 'string') {
        const metTrim = req.query.metodo_pago.trim();
        if (METODOS_PAGO_VALIDOS.includes(metTrim)) {
          where.metodo_pago = metTrim;
        }
      }

      if (req.query.estado !== undefined && typeof req.query.estado === 'string') {
        const estTrim = req.query.estado.trim();
        if (ESTADOS_VALIDOS.includes(estTrim)) {
          where.estado = estTrim;
        }
      }

      const pagos = await Pago.findAll({
        where,
        include: INCLUDES_PAGO,
        order: [['id_pago', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        data: pagos
      });
    } catch (err) {
      console.error('Error al listar pagos:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al listar los pagos.'
      });
    }
  },

  async obtenerPago(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const pago = await Pago.findByPk(id, {
        include: INCLUDES_PAGO
      });

      if (!pago) {
        return res.status(404).json({
          status: 'error',
          message: `Pago con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: pago
      });
    } catch (err) {
      console.error('Error al obtener pago:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener el pago.'
      });
    }
  },

  async crearPago(req, res) {
    try {
      const validationError = validatePagoPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const {
        id_factura,
        numero_operacion,
        fecha_pago,
        monto,
        metodo_pago,
        estado
      } = req.body;

      const idFacNum = validateId(id_factura);
      const factura = await Factura.findByPk(idFacNum);
      if (!factura) {
        return res.status(404).json({
          status: 'error',
          message: `Factura con ID ${idFacNum} no encontrada.`
        });
      }

      const numOperacionTrim = numero_operacion.trim();
      const existente = await Pago.findOne({
        where: { numero_operacion: numOperacionTrim }
      });
      if (existente) {
        return res.status(409).json({
          status: 'error',
          message: `El número de operación '${numOperacionTrim}' ya está registrado.`
        });
      }

      const nuevoPago = await Pago.create({
        id_factura: idFacNum,
        numero_operacion: numOperacionTrim,
        fecha_pago: fecha_pago.trim ? fecha_pago.trim() : fecha_pago,
        monto,
        metodo_pago: metodo_pago.trim(),
        estado: estado !== undefined ? estado.trim() : 'Confirmado'
      });

      const pagoCreado = await Pago.findByPk(nuevoPago.id_pago, {
        include: INCLUDES_PAGO
      });

      return res.status(201).json({
        status: 'success',
        message: 'Pago registrado exitosamente.',
        data: pagoCreado
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        const campo = err.errors && err.errors[0] ? err.errors[0].path : 'campo único';
        return res.status(409).json({
          status: 'error',
          message: `Violación de restricción de unicidad en '${campo}'.`
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: la factura especificada no existe.'
        });
      }

      console.error('Error al crear pago:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear el pago.'
      });
    }
  },

  async actualizarPago(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const validationError = validatePagoPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No se enviaron datos para actualizar.'
        });
      }

      const pago = await Pago.findByPk(id);
      if (!pago) {
        return res.status(404).json({
          status: 'error',
          message: `Pago con ID ${id} no encontrado.`
        });
      }

      const {
        id_factura,
        numero_operacion,
        fecha_pago,
        monto,
        metodo_pago,
        estado
      } = req.body;

      if (id_factura !== undefined) {
        const idFacNum = validateId(id_factura);
        const factura = await Factura.findByPk(idFacNum);
        if (!factura) {
          return res.status(404).json({
            status: 'error',
            message: `Factura con ID ${idFacNum} no encontrada.`
          });
        }
        pago.id_factura = idFacNum;
      }

      if (numero_operacion !== undefined) {
        const numOperacionTrim = numero_operacion.trim();
        const existente = await Pago.findOne({
          where: {
            numero_operacion: numOperacionTrim,
            id_pago: { [Op.ne]: id }
          }
        });
        if (existente) {
          return res.status(409).json({
            status: 'error',
            message: `El número de operación '${numOperacionTrim}' ya está registrado.`
          });
        }
        pago.numero_operacion = numOperacionTrim;
      }

      if (fecha_pago !== undefined) {
        pago.fecha_pago = fecha_pago.trim ? fecha_pago.trim() : fecha_pago;
      }

      if (monto !== undefined) {
        pago.monto = monto;
      }

      if (metodo_pago !== undefined) {
        pago.metodo_pago = metodo_pago.trim();
      }

      if (estado !== undefined) {
        pago.estado = estado.trim();
      }

      await pago.save();

      const pagoActualizado = await Pago.findByPk(id, {
        include: INCLUDES_PAGO
      });

      return res.status(200).json({
        status: 'success',
        message: 'Pago actualizado exitosamente.',
        data: pagoActualizado
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        const campo = err.errors && err.errors[0] ? err.errors[0].path : 'campo único';
        return res.status(409).json({
          status: 'error',
          message: `Violación de restricción de unicidad en '${campo}'.`
        });
      }
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: la factura especificada no existe.'
        });
      }

      console.error('Error al actualizar pago:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el pago.'
      });
    }
  },

  async eliminarPago(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const pago = await Pago.findByPk(id);
      if (!pago) {
        return res.status(404).json({
          status: 'error',
          message: `Pago con ID ${id} no encontrado.`
        });
      }

      await pago.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Pago eliminado exitosamente.'
      });
    } catch (err) {
      console.error('Error al eliminar pago:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el pago.'
      });
    }
  }
};

module.exports = pagoController;

