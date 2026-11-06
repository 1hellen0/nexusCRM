'use strict';

const {
  ProductoServicio,
  CategoriaProducto,
  DetalleCotizacion,
  DetalleFactura,
  Sequelize
} = require('../models');
const { Op } = Sequelize;

const ALLOWED_FIELDS = [
  'id_categoria',
  'codigo_sku',
  'nombre',
  'tipo',
  'precio_unitario',
  'moneda',
  'activo'
];
const PROTECTED_FIELDS = ['id_producto'];
const TIPOS_PERMITIDOS = ['Producto', 'Servicio'];

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

function validatePrecioUnitario(val) {
  if (val === undefined || val === null || val === '') {
    return 'El precio unitario es obligatorio.';
  }
  if (typeof val !== 'number' && typeof val !== 'string') {
    return 'El precio unitario debe ser un valor numérico o cadena numérica válida.';
  }
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'El precio unitario debe ser un número decimal válido mayor o igual a 0 con máximo 2 decimales.';
  }
  const parts = str.split('.');
  if (parts[0].length > 10) {
    return 'El precio unitario excede el rango permitido para DECIMAL(12,2) (máximo 10 dígitos enteros).';
  }
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) {
    return 'El precio unitario no puede ser negativo.';
  }
  return null;
}

function validateProductoServicioPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_categoria === undefined || data.id_categoria === null) {
      return 'El campo id_categoria es obligatorio.';
    }
    if (!data.codigo_sku || typeof data.codigo_sku !== 'string' || data.codigo_sku.trim() === '') {
      return 'El campo codigo_sku es obligatorio.';
    }
    if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El campo nombre es obligatorio.';
    }
    if (!data.tipo || typeof data.tipo !== 'string' || data.tipo.trim() === '') {
      return 'El campo tipo es obligatorio.';
    }
    if (data.precio_unitario === undefined || data.precio_unitario === null || data.precio_unitario === '') {
      return 'El campo precio_unitario es obligatorio.';
    }
  }

  if (data.id_categoria !== undefined) {
    const idCatNum = validateId(data.id_categoria);
    if (!idCatNum) {
      return 'El campo id_categoria debe ser un número entero positivo.';
    }
  }

  if (data.codigo_sku !== undefined) {
    if (typeof data.codigo_sku !== 'string' || data.codigo_sku.trim() === '') {
      return 'El codigo_sku no puede estar vacío.';
    }
    if (data.codigo_sku.trim().length > 50) {
      return 'El codigo_sku no puede superar los 50 caracteres.';
    }
  }

  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string' || data.nombre.trim() === '') {
      return 'El nombre no puede estar vacío.';
    }
    if (data.nombre.trim().length > 150) {
      return 'El nombre no puede superar los 150 caracteres.';
    }
  }

  if (data.tipo !== undefined) {
    if (typeof data.tipo !== 'string' || !TIPOS_PERMITIDOS.includes(data.tipo.trim())) {
      return `El campo tipo debe ser uno de los siguientes valores permitidos: ${TIPOS_PERMITIDOS.join(', ')}.`;
    }
  }

  if (data.precio_unitario !== undefined) {
    const errPrecio = validatePrecioUnitario(data.precio_unitario);
    if (errPrecio) return errPrecio;
  }

  if (data.moneda !== undefined) {
    if (typeof data.moneda !== 'string' || !/^[A-Za-z]{3}$/.test(data.moneda.trim())) {
      return 'La moneda debe ser un código alfabético de exactamente 3 caracteres (p. ej. USD, MXN, EUR).';
    }
  }

  if (data.activo !== undefined && typeof data.activo !== 'boolean') {
    return 'El campo activo debe ser un valor booleano (true o false).';
  }

  return null;
}

const productoServicioController = {
  async listarProductosServicios(req, res) {
    try {
      const where = {};

      if (req.query.activo !== undefined) {
        where.activo = req.query.activo === 'true' || req.query.activo === '1';
      }

      if (req.query.tipo !== undefined && typeof req.query.tipo === 'string') {
        const tipoTrim = req.query.tipo.trim();
        if (TIPOS_PERMITIDOS.includes(tipoTrim)) {
          where.tipo = tipoTrim;
        }
      }

      if (req.query.id_categoria !== undefined) {
        const idCat = validateId(req.query.id_categoria);
        if (idCat) {
          where.id_categoria = idCat;
        }
      }

      if (req.query.moneda !== undefined && typeof req.query.moneda === 'string') {
        where.moneda = req.query.moneda.trim().toUpperCase();
      }

      const items = await ProductoServicio.findAll({
        where,
        include: [
          {
            model: CategoriaProducto,
            as: 'categoria',
            attributes: ['id_categoria', 'nombre', 'descripcion', 'activo']
          }
        ],
        order: [['id_producto', 'ASC']]
      });

      return res.status(200).json({
        status: 'success',
        total: items.length,
        data: items
      });
    } catch (err) {
      console.error('Error al listar productos y servicios:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar productos y servicios.'
      });
    }
  },

  async obtenerProductoServicio(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const item = await ProductoServicio.findByPk(id, {
        include: [
          {
            model: CategoriaProducto,
            as: 'categoria',
            attributes: ['id_categoria', 'nombre', 'descripcion', 'activo']
          }
        ]
      });

      if (!item) {
        return res.status(404).json({
          status: 'error',
          message: `Producto o servicio con ID ${id} no encontrado.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: item
      });
    } catch (err) {
      console.error('Error al obtener producto o servicio por ID:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener el producto o servicio.'
      });
    }
  },

  async crearProductoServicio(req, res) {
    try {
      const errorValidacion = validateProductoServicioPayload(req.body, false);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const {
        id_categoria,
        codigo_sku,
        nombre,
        tipo,
        precio_unitario,
        moneda,
        activo
      } = req.body;

      // Verificar existencia de la CategoriaProducto
      const categoria = await CategoriaProducto.findByPk(id_categoria);
      if (!categoria) {
        return res.status(404).json({
          status: 'error',
          message: `La categoría de producto con ID ${id_categoria} no existe.`
        });
      }

      // Verificar unicidad de codigo_sku
      const skuTrim = codigo_sku.trim();
      const skuExistente = await ProductoServicio.findOne({
        where: { codigo_sku: skuTrim }
      });
      if (skuExistente) {
        return res.status(409).json({
          status: 'error',
          message: `El código SKU '${skuTrim}' ya está registrado para otro producto o servicio.`
        });
      }

      const nuevoItem = await ProductoServicio.create({
        id_categoria,
        codigo_sku: skuTrim,
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        precio_unitario,
        moneda: moneda ? moneda.trim().toUpperCase() : 'USD',
        activo: activo !== undefined ? activo : true
      });

      const itemConAsociacion = await ProductoServicio.findByPk(nuevoItem.id_producto, {
        include: [
          {
            model: CategoriaProducto,
            as: 'categoria',
            attributes: ['id_categoria', 'nombre', 'descripcion', 'activo']
          }
        ]
      });

      return res.status(201).json({
        status: 'success',
        message: 'Producto o servicio creado exitosamente.',
        data: itemConAsociacion
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El código SKU ya está registrado.'
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
          message: 'Violación de clave foránea: la categoría especificada no existe.'
        });
      }

      console.error('Error al crear producto o servicio:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear producto o servicio.'
      });
    }
  },

  async actualizarProductoServicio(req, res) {
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

      const errorValidacion = validateProductoServicioPayload(req.body, true);
      if (errorValidacion) {
        return res.status(400).json({
          status: 'error',
          message: errorValidacion
        });
      }

      const item = await ProductoServicio.findByPk(id);
      if (!item) {
        return res.status(404).json({
          status: 'error',
          message: `Producto o servicio con ID ${id} no encontrado.`
        });
      }

      const {
        id_categoria,
        codigo_sku,
        nombre,
        tipo,
        precio_unitario,
        moneda,
        activo
      } = req.body;

      // Si se actualiza id_categoria, verificar que exista
      if (id_categoria !== undefined) {
        const categoria = await CategoriaProducto.findByPk(id_categoria);
        if (!categoria) {
          return res.status(404).json({
            status: 'error',
            message: `La categoría de producto con ID ${id_categoria} no existe.`
          });
        }
        item.id_categoria = id_categoria;
      }

      // Si se actualiza codigo_sku, verificar que sea único respecto a otros registros
      if (codigo_sku !== undefined) {
        const skuTrim = codigo_sku.trim();
        const skuExistente = await ProductoServicio.findOne({
          where: {
            codigo_sku: skuTrim,
            id_producto: { [Op.ne]: id }
          }
        });
        if (skuExistente) {
          return res.status(409).json({
            status: 'error',
            message: `El código SKU '${skuTrim}' ya está registrado para otro producto o servicio.`
          });
        }
        item.codigo_sku = skuTrim;
      }

      if (nombre !== undefined) {
        item.nombre = nombre.trim();
      }

      if (tipo !== undefined) {
        item.tipo = tipo.trim();
      }

      if (precio_unitario !== undefined) {
        item.precio_unitario = precio_unitario;
      }

      if (moneda !== undefined) {
        item.moneda = moneda.trim().toUpperCase();
      }

      if (activo !== undefined) {
        item.activo = activo;
      }

      await item.save();

      const itemActualizado = await ProductoServicio.findByPk(id, {
        include: [
          {
            model: CategoriaProducto,
            as: 'categoria',
            attributes: ['id_categoria', 'nombre', 'descripcion', 'activo']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        message: 'Producto o servicio actualizado exitosamente.',
        data: itemActualizado
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'El código SKU ya está registrado para otro producto o servicio.'
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
          message: 'Violación de clave foránea: la categoría especificada no existe.'
        });
      }

      console.error('Error al actualizar producto o servicio:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar el producto o servicio.'
      });
    }
  },

  async eliminarProductoServicio(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El parámetro ID debe ser un número entero positivo válido.'
        });
      }

      const item = await ProductoServicio.findByPk(id);
      if (!item) {
        return res.status(404).json({
          status: 'error',
          message: `Producto o servicio con ID ${id} no encontrado.`
        });
      }

      // Verificación preventiva de dependencias con restricción ON DELETE RESTRICT
      let countDetallesCotizacion = 0;
      if (DetalleCotizacion) {
        countDetallesCotizacion = await DetalleCotizacion.count({
          where: { id_producto: id }
        });
      }

      let countDetallesFactura = 0;
      if (DetalleFactura) {
        countDetallesFactura = await DetalleFactura.count({
          where: { id_producto: id }
        });
      }

      if (countDetallesCotizacion > 0 || countDetallesFactura > 0) {
        const motivos = [];
        if (countDetallesCotizacion > 0) {
          motivos.push(`${countDetallesCotizacion} detalle(s) de cotización`);
        }
        if (countDetallesFactura > 0) {
          motivos.push(`${countDetallesFactura} detalle(s) de factura`);
        }
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: `No se puede eliminar el producto o servicio porque tiene registros dependientes asociados (${motivos.join(', ')}).`,
          detalles: {
            detallesCotizacion: countDetallesCotizacion,
            detallesFactura: countDetallesFactura
          }
        });
      }

      await item.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Producto o servicio eliminado exitosamente.'
      });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          status: 'error',
          error: 'Conflicto de integridad referencial',
          message: 'No se puede eliminar el producto o servicio porque está referenciado por otros registros.'
        });
      }

      console.error('Error al eliminar producto o servicio:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar el producto o servicio.'
      });
    }
  }
};

module.exports = productoServicioController;

