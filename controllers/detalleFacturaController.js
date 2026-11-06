'use strict';

const {
  DetalleFactura,
  Factura,
  ProductoServicio,
  Sequelize
} = require('../models');

const ALLOWED_FIELDS = [
  'id_factura',
  'id_producto',
  'cantidad',
  'precio_unitario',
  'subtotal_linea'
];
const PROTECTED_FIELDS = ['id_detalle_factura'];

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

function validateCantidad(val) {
  if (val === undefined || val === null || val === '') {
    return 'El campo cantidad es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El campo cantidad debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El campo cantidad debe ser un número decimal válido mayor a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 8) {
    return 'El campo cantidad excede el límite permitido para DECIMAL(10,2) (máximo 8 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) {
    return 'El campo cantidad debe ser mayor a 0.';
  }
  return null;
}

function validateDecimal(val, fieldName) {
  if (val === undefined || val === null || val === '') {
    return `El campo ${fieldName} es obligatorio.`;
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

function validateDetalleFacturaPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_factura === undefined || data.id_factura === null) {
      return 'El campo id_factura es obligatorio.';
    }
    if (data.id_producto === undefined || data.id_producto === null) {
      return 'El campo id_producto es obligatorio.';
    }
    if (data.cantidad === undefined || data.cantidad === null || data.cantidad === '') {
      return 'El campo cantidad es obligatorio.';
    }
    if (data.precio_unitario === undefined || data.precio_unitario === null || data.precio_unitario === '') {
      return 'El campo precio_unitario es obligatorio.';
    }
    if (data.subtotal_linea === undefined || data.subtotal_linea === null || data.subtotal_linea === '') {
      return 'El campo subtotal_linea es obligatorio.';
    }
  }

  if (data.id_factura !== undefined) {
    const idFacNum = validateId(data.id_factura);
    if (!idFacNum) {
      return 'El campo id_factura debe ser un número entero positivo.';
    }
  }

  if (data.id_producto !== undefined) {
    const idProdNum = validateId(data.id_producto);
    if (!idProdNum) {
      return 'El campo id_producto debe ser un número entero positivo.';
    }
  }

  if (data.cantidad !== undefined) {
    const errCant = validateCantidad(data.cantidad);
    if (errCant) return errCant;
  }

  if (data.precio_unitario !== undefined) {
    const errPrecio = validateDecimal(data.precio_unitario, 'precio_unitario');
    if (errPrecio) return errPrecio;
  }

  if (data.subtotal_linea !== undefined) {
    const errSub = validateDecimal(data.subtotal_linea, 'subtotal_linea');
    if (errSub) return errSub;
  }

  return null;
}

const INCLUDES_DETALLE_FACTURA = [
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
  },
  {
    model: ProductoServicio,
    as: 'producto',
    attributes: [
      'id_producto',
      'id_categoria',
      'codigo_sku',
      'nombre',
      'tipo',
      'precio_unitario',
      'moneda',
      'activo'
    ]
  }
];

const detalleFacturaController = {
  async listarDetalles(req, res) {
    try {
      const where = {};

      if (req.query.id_factura !== undefined) {
        const idFac = validateId(req.query.id_factura);
        if (idFac) {
          where.id_factura = idFac;
        }
      }

      if (req.query.id_producto !== undefined) {
        const idProd = validateId(req.query.id_producto);
        if (idProd) {
          where.id_producto = idProd;
        }
      }

      const detalles = await DetalleFactura.findAll({
        where,
        include: INCLUDES_DETALLE_FACTURA,
        order: [['id_detalle_factura', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: detalles.length,
        data: detalles
      });
    } catch (err) {
      console.error('Error al listar detalles de factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar detalles de factura.'
      });
    }
  },

  async obtenerDetalle(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const detalle = await DetalleFactura.findByPk(id, {
        include: INCLUDES_DETALLE_FACTURA
      });

      if (!detalle) {
        return res.status(404).json({
          status: 'error',
          message: `Detalle de factura con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: detalle
      });
    } catch (err) {
      console.error('Error al obtener detalle de factura por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener el detalle de factura.'
      });
    }
  },

  async crearDetalle(req, res) {
    try {
      const errorValidacion = validateDetalleFacturaPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_factura,
        id_producto,
        cantidad,
        precio_unitario,
        subtotal_linea
      } = req.body;

      // Verificar existencia de Factura
      const factura = await Factura.findByPk(id_factura);
      if (!factura) {
        return res.status(404).json({
          status: 'error',
          message: `La factura con ID ${id_factura} no existe.`
        });
      }

      // Verificar existencia de ProductoServicio
      const producto = await ProductoServicio.findByPk(id_producto);
      if (!producto) {
        return res.status(404).json({
          status: 'error',
          message: `El producto o servicio con ID ${id_producto} no existe.`
        });
      }

      const nuevoDetalle = await DetalleFactura.create({
        id_factura,
        id_producto,
        cantidad,
        precio_unitario,
        subtotal_linea
      });

      const detalleConAsociaciones = await DetalleFactura.findByPk(nuevoDetalle.id_detalle_factura, {
        include: INCLUDES_DETALLE_FACTURA
      });

      return res.status(201).json({
        status: 'success',
        message: 'Detalle de factura creado exitosamente.',
        data: detalleConAsociaciones
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: verifique que la factura y el producto existan.'
        });
      }

      console.error('Error al crear detalle de factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear detalle de factura.'
      });
    }
  },

  async actualizarDetalle(req, res) {
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

      const errorValidacion = validateDetalleFacturaPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const detalle = await DetalleFactura.findByPk(id);
      if (!detalle) {
        return res.status(404).json({
          status: 'error',
          message: `Detalle de factura con ID ${id} no encontrado.`
        });
      }

      const {
        id_factura,
        id_producto,
        cantidad,
        precio_unitario,
        subtotal_linea
      } = req.body;

      if (id_factura !== undefined) {
        const factura = await Factura.findByPk(id_factura);
        if (!factura) {
          return res.status(404).json({
            status: 'error',
            message: `La factura con ID ${id_factura} no existe.`
          });
        }
        detalle.id_factura = id_factura;
      }

      if (id_producto !== undefined) {
        const producto = await ProductoServicio.findByPk(id_producto);
        if (!producto) {
          return res.status(404).json({
            status: 'error',
            message: `El producto o servicio con ID ${id_producto} no existe.`
          });
        }
        detalle.id_producto = id_producto;
      }

      if (cantidad !== undefined) {
        detalle.cantidad = cantidad;
      }

      if (precio_unitario !== undefined) {
        detalle.precio_unitario = precio_unitario;
      }

      if (subtotal_linea !== undefined) {
        detalle.subtotal_linea = subtotal_linea;
      }

      await detalle.save();

      const detalleActualizado = await DetalleFactura.findByPk(id, {
        include: INCLUDES_DETALLE_FACTURA
      });

      return res.status(200).json({
        status: 'success',
        message: 'Detalle de factura actualizado exitosamente.',
        data: detalleActualizado
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join('. ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(404).json({
          status: 'error',
          message: 'Violación de clave foránea: verifique que la factura y el producto existan.'
        });
      }

      console.error('Error al actualizar detalle de factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar detalle de factura.'
      });
    }
  },

  async eliminarDetalle(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const detalle = await DetalleFactura.findByPk(id);
      if (!detalle) {
        return res.status(404).json({
          status: 'error',
          message: `Detalle de factura con ID ${id} no encontrado.`
        });
      }

      await detalle.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Detalle de factura eliminado exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar el detalle de factura debido a restricciones de clave foránea.'
        });
      }

      console.error('Error al eliminar detalle de factura:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar detalle de factura.'
      });
    }
  }
};

module.exports = detalleFacturaController;

