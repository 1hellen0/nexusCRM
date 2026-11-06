'use strict';

const {
  Factura,
  EmpresaCliente,
  Contrato,
  DetalleFactura,
  Pago,
  Sequelize
} = require('../models');
const { Op } = Sequelize;

const ALLOWED_FIELDS = [
  'id_empresa',
  'id_contrato',
  'numero_factura',
  'fecha_emision',
  'fecha_vencimiento',
  'subtotal',
  'impuestos',
  'total',
  'estado'
];
const PROTECTED_FIELDS = ['id_factura'];
const ESTADOS_PERMITIDOS = ['Emitida', 'Pagada_Parcial', 'Pagada_Total', 'Anulada', 'Vencida'];

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

function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function validateDecimal(val, fieldName, isRequired = true) {
  if (val === undefined || val === null || val === '') {
    return isRequired ? `El campo ${fieldName} es obligatorio.` : null;
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return `El campo ${fieldName} debe ser un valor numérico o cadena numérica válida.`;
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return `El campo ${fieldName} debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.`;
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return `El campo ${fieldName} excede el límite permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).`;
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return `El campo ${fieldName} no puede ser negativo.`;
  }
  return null;
}

function validateFacturaPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_empresa === undefined || data.id_empresa === null) {
      return 'El campo id_empresa es obligatorio.';
    }
    if (!data.numero_factura || typeof data.numero_factura !== 'string' || data.numero_factura.trim() === '') {
      return 'El campo numero_factura es obligatorio.';
    }
    if (!data.fecha_emision || typeof data.fecha_emision !== 'string' || data.fecha_emision.trim() === '') {
      return 'El campo fecha_emision es obligatorio.';
    }
    if (!data.fecha_vencimiento || typeof data.fecha_vencimiento !== 'string' || data.fecha_vencimiento.trim() === '') {
      return 'El campo fecha_vencimiento es obligatorio.';
    }
    if (data.subtotal === undefined || data.subtotal === null || data.subtotal === '') {
      return 'El campo subtotal es obligatorio.';
    }
    if (data.total === undefined || data.total === null || data.total === '') {
      return 'El campo total es obligatorio.';
    }
  }

  if (data.id_empresa !== undefined) {
    const idEmpresaNum = validateId(data.id_empresa);
    if (!idEmpresaNum) {
      return 'El campo id_empresa debe ser un número entero positivo.';
    }
  }

  if (data.id_contrato !== undefined && data.id_contrato !== null && data.id_contrato !== '') {
    const idContratoNum = validateId(data.id_contrato);
    if (!idContratoNum) {
      return 'El campo id_contrato debe ser un número entero positivo o null.';
    }
  }

  if (data.numero_factura !== undefined) {
    if (typeof data.numero_factura !== 'string' || data.numero_factura.trim() === '') {
      return 'El numero_factura no puede estar vacío.';
    }
    if (data.numero_factura.trim().length > 40) {
      return 'El numero_factura no puede superar los 40 caracteres.';
    }
  }

  if (data.fecha_emision !== undefined) {
    if (!isValidDateFormat(data.fecha_emision.trim())) {
      return 'La fecha_emision debe tener el formato válido YYYY-MM-DD.';
    }
  }

  if (data.fecha_vencimiento !== undefined) {
    if (!isValidDateFormat(data.fecha_vencimiento.trim())) {
      return 'La fecha_vencimiento debe tener el formato válido YYYY-MM-DD.';
    }
  }

  if (data.fecha_emision && data.fecha_vencimiento) {
    const fEmision = data.fecha_emision.trim();
    const fVencimiento = data.fecha_vencimiento.trim();
    if (fVencimiento < fEmision) {
      return 'La fecha de vencimiento (fecha_vencimiento) no puede ser anterior a la fecha de emisión (fecha_emision).';
    }
  }

  if (data.subtotal !== undefined) {
    const errSub = validateDecimal(data.subtotal, 'subtotal', true);
    if (errSub) return errSub;
  }

  if (data.impuestos !== undefined) {
    const errImp = validateDecimal(data.impuestos, 'impuestos', false);
    if (errImp) return errImp;
  }

  if (data.total !== undefined) {
    const errTot = validateDecimal(data.total, 'total', true);
    if (errTot) return errTot;
  }

  if (data.estado !== undefined) {
    if (typeof data.estado !== 'string' || !ESTADOS_PERMITIDOS.includes(data.estado.trim())) {
      return `El campo estado debe ser uno de los siguientes valores permitidos: ${ESTADOS_PERMITIDOS.join(', ')}.`;
    }
  }

  return null;
}

const INCLUDES_FACTURA = [
  {
    model: EmpresaCliente,
    as: 'empresa',
    attributes: ['id_empresa', 'id_sector', 'nombre', 'sector', 'correo', 'telefono', 'estado']
  },
  {
    model: Contrato,
    as: 'contrato',
    attributes: [
      'id_contrato',
      'id_empresa',
      'id_cotizacion',
      'numero_contrato',
      'fecha_inicio',
      'fecha_fin',
      'monto_acordado',
      'estado'
    ]
  },
  {
    model: DetalleFactura,
    as: 'detalles',
    attributes: [
      'id_detalle_factura',
      'id_factura',
      'id_producto',
      'cantidad',
      'precio_unitario',
      'subtotal_linea'
    ]
  },
  {
    model: Pago,
    as: 'pagos',
    attributes: [
      'id_pago',
      'id_factura',
      'numero_operacion',
      'fecha_pago',
      'monto',
      'metodo_pago',
      'estado'
    ]
  }
];

const facturaController = {
  async listarFacturas(req, res) {
    try {
      const where = {};

      if (req.query.estado !== undefined && typeof req.query.estado === 'string') {
        const estadoTrim = req.query.estado.trim();
        if (ESTADOS_PERMITIDOS.includes(estadoTrim)) {
          where.estado = estadoTrim;
        }
      }

      if (req.query.id_empresa !== undefined) {
        const idEmp = validateId(req.query.id_empresa);
        if (idEmp) {
          where.id_empresa = idEmp;
        }
      }

      if (req.query.id_contrato !== undefined) {
        const idCtr = validateId(req.query.id_contrato);
        if (idCtr) {
          where.id_contrato = idCtr;
        }
      }

      const facturas = await Factura.findAll({
        where,
        include: INCLUDES_FACTURA,
        order: [['id_factura', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: facturas.length,
        data: facturas
      });
    } catch (err) {
      console.error('Error al listar facturas:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar facturas.'
      });
    }
  },

  async obtenerFactura(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const factura = await Factura.findByPk(id, {
        include: INCLUDES_FACTURA
      });

      if (!factura) {
        return res.status(404).json({
          status: 'error',
          message: `Factura con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: factura
      });
    } catch (err) {
      console.error('Error al obtener factura por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener la factura.'
      });
    }
  },

  async crearFactura(req, res) {
    try {
      const errorValidacion = validateFacturaPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_empresa,
        id_contrato,
        numero_factura,
        fecha_emision,
        fecha_vencimiento,
        subtotal,
        impuestos,
        total,
        estado
      } = req.body;

      // Verificar existencia de EmpresaCliente
      const empresa = await EmpresaCliente.findByPk(id_empresa);
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `La empresa cliente con ID ${id_empresa} no existe.`
        });
      }

      // Si se proporciona id_contrato, verificar existencia
      const idContratoFinal = id_contrato !== undefined && id_contrato !== null && id_contrato !== ''
        ? validateId(id_contrato)
        : null;

      if (idContratoFinal !== null) {
        const contrato = await Contrato.findByPk(idContratoFinal);
        if (!contrato) {
          return res.status(404).json({
            status: 'error',
            message: `El contrato con ID ${idContratoFinal} no existe.`
          });
        }
      }

      // Verificar unicidad de numero_factura
      const numTrim = numero_factura.trim();
      const existente = await Factura.findOne({
        where: { numero_factura: numTrim }
      });
      if (existente) {
        return res.status(409).json({
          status: 'error',
          message: `El número de factura '${numTrim}' ya está registrado.`
        });
      }

      const nuevaFactura = await Factura.create({
        id_empresa,
        id_contrato: idContratoFinal,
        numero_factura: numTrim,
        fecha_emision: fecha_emision.trim(),
        fecha_vencimiento: fecha_vencimiento.trim(),
        subtotal,
        impuestos: impuestos !== undefined && impuestos !== null && impuestos !== '' ? impuestos : 0.00,
        total,
        estado: estado ? estado.trim() : 'Emitida'
      });

      const facturaConAsociaciones = await Factura.findByPk(nuevaFactura.id_factura, {
        include: INCLUDES_FACTURA
      });

      return res.status(201).json({
        status: 'success',
        message: 'Factura creada exitosamente.',
        data: facturaConAsociaciones
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
          message: 'Violación de clave foránea: verifique que la empresa y el contrato existan.'
        });
      }

      console.error('Error al crear factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la factura.'
      });
    }
  },

  async actualizarFactura(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Debe proporcionar al menos un campo para actualizar.'
        });
      }

      const errorValidacion = validateFacturaPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const factura = await Factura.findByPk(id);
      if (!factura) {
        return res.status(404).json({
          status: 'error',
          message: `Factura con ID ${id} no encontrada.`
        });
      }

      const {
        id_empresa,
        id_contrato,
        numero_factura,
        fecha_emision,
        fecha_vencimiento,
        subtotal,
        impuestos,
        total,
        estado
      } = req.body;

      if (id_empresa !== undefined) {
        const empresa = await EmpresaCliente.findByPk(id_empresa);
        if (!empresa) {
          return res.status(404).json({
            status: 'error',
            message: `La empresa cliente con ID ${id_empresa} no existe.`
          });
        }
        factura.id_empresa = id_empresa;
      }

      if (id_contrato !== undefined) {
        if (id_contrato === null || id_contrato === '') {
          factura.id_contrato = null;
        } else {
          const idContratoNum = validateId(id_contrato);
          const contrato = await Contrato.findByPk(idContratoNum);
          if (!contrato) {
            return res.status(404).json({
              status: 'error',
              message: `El contrato con ID ${idContratoNum} no existe.`
            });
          }
          factura.id_contrato = idContratoNum;
        }
      }

      if (numero_factura !== undefined) {
        const numTrim = numero_factura.trim();
        const existente = await Factura.findOne({
          where: {
            numero_factura: numTrim,
            id_factura: { [Op.ne]: id }
          }
        });
        if (existente) {
          return res.status(409).json({
            status: 'error',
            message: `El número de factura '${numTrim}' ya está registrado.`
          });
        }
        factura.numero_factura = numTrim;
      }

      const effectiveFechaEmision = fecha_emision !== undefined ? fecha_emision.trim() : factura.fecha_emision;
      const effectiveFechaVencimiento = fecha_vencimiento !== undefined ? fecha_vencimiento.trim() : factura.fecha_vencimiento;

      if (effectiveFechaEmision && effectiveFechaVencimiento) {
        if (effectiveFechaVencimiento < effectiveFechaEmision) {
          return res.status(400).json({
            status: 'error',
            message: 'La fecha de vencimiento (fecha_vencimiento) no puede ser anterior a la fecha de emisión (fecha_emision).'
          });
        }
      }

      if (fecha_emision !== undefined) {
        factura.fecha_emision = effectiveFechaEmision;
      }

      if (fecha_vencimiento !== undefined) {
        factura.fecha_vencimiento = effectiveFechaVencimiento;
      }

      if (subtotal !== undefined) {
        factura.subtotal = subtotal;
      }

      if (impuestos !== undefined) {
        factura.impuestos = impuestos;
      }

      if (total !== undefined) {
        factura.total = total;
      }

      if (estado !== undefined) {
        factura.estado = estado.trim();
      }

      await factura.save();

      const facturaActualizada = await Factura.findByPk(id, {
        include: INCLUDES_FACTURA
      });

      return res.status(200).json({
        status: 'success',
        message: 'Factura actualizada exitosamente.',
        data: facturaActualizada
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
          message: 'Violación de clave foránea: verifique que la empresa y el contrato existan.'
        });
      }

      console.error('Error al actualizar factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la factura.'
      });
    }
  },

  async eliminarFactura(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const factura = await Factura.findByPk(id);
      if (!factura) {
        return res.status(404).json({
          status: 'error',
          message: `Factura con ID ${id} no encontrada.`
        });
      }

      // Verificación preventiva de dependencias con restricción ON DELETE RESTRICT (Pago)
      const countPagos = await Pago.count({ where: { id_factura: id } });
      if (countPagos > 0) {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: `No se puede eliminar la factura porque tiene ${countPagos} pago(s) registrado(s) asociado(s).`,
          detalles: {
            pagos: countPagos
          }
        });
      }

      // MySQL aplica:
      // - DetalleFactura: ON DELETE CASCADE
      await factura.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Factura eliminada exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar la factura debido a restricciones de clave foránea.'
        });
      }

      console.error('Error al eliminar factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la factura.'
      });
    }
  }
};

module.exports = facturaController;

