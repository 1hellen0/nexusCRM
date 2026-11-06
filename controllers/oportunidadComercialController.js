'use strict';

const { OportunidadComercial, EmpresaCliente, Contacto, CampañaMarketing } = require('../models');

const ALLOWED_FIELDS = [
  'id_empresa',
  'id_contacto',
  'id_campana',
  'titulo',
  'descripcion',
  'valor_estimado',
  'etapa',
  'fecha_cierre_estimada'
];

const PROTECTED_FIELDS = ['id_oportunidad', 'fecha_creacion'];

const VALID_ETAPAS = ['Nueva', 'Contactada', 'Propuesta', 'Negociacion', 'Ganada', 'Perdida'];

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

function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function validateOportunidadPayload(data, isUpdate = false) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON válido.';
  }

  const disallowed = checkDisallowedFields(data);
  if (disallowed) return disallowed;

  if (!isUpdate) {
    if (data.id_empresa === undefined || data.id_empresa === null) {
      return 'El campo id_empresa es obligatorio.';
    }
    if (data.id_contacto === undefined || data.id_contacto === null) {
      return 'El campo id_contacto es obligatorio.';
    }
    if (!data.titulo || typeof data.titulo !== 'string' || data.titulo.trim() === '') {
      return 'El campo titulo es obligatorio.';
    }
    if (data.valor_estimado === undefined || data.valor_estimado === null) {
      return 'El campo valor_estimado es obligatorio.';
    }
  }

  if (data.id_empresa !== undefined) {
    const idEmpresaNum = validateId(data.id_empresa);
    if (!idEmpresaNum) {
      return 'El campo id_empresa debe ser un número entero positivo.';
    }
  }

  if (data.id_contacto !== undefined) {
    const idContactoNum = validateId(data.id_contacto);
    if (!idContactoNum) {
      return 'El campo id_contacto debe ser un número entero positivo.';
    }
  }

  if (data.id_campana !== undefined && data.id_campana !== null && data.id_campana !== '') {
    const idCampanaNum = validateId(data.id_campana);
    if (!idCampanaNum) {
      return 'El campo id_campana debe ser un número entero positivo.';
    }
  }

  if (data.titulo !== undefined) {
    if (typeof data.titulo !== 'string' || data.titulo.trim() === '') {
      return 'El título de la oportunidad no puede estar vacío.';
    }
    if (data.titulo.length > 150) {
      return 'El título no puede superar los 150 caracteres.';
    }
  }

  if (data.descripcion !== undefined && data.descripcion !== null) {
    if (typeof data.descripcion !== 'string') {
      return 'La descripción debe ser una cadena de texto.';
    }
  }

  if (data.valor_estimado !== undefined) {
    const num = Number(data.valor_estimado);
    if (isNaN(num) || !isFinite(num)) {
      return 'El valor_estimado debe ser un número válido.';
    }
    if (num < 0) {
      return 'El valor estimado no puede ser negativo.';
    }
    if (num > 9999999999.99) {
      return 'El valor estimado excede el límite permitido para DECIMAL(12,2).';
    }
  }

  if (data.etapa !== undefined) {
    if (!VALID_ETAPAS.includes(data.etapa)) {
      return `La etapa es inválida. Valores permitidos: ${VALID_ETAPAS.join(', ')}.`;
    }
  }

  if (data.fecha_cierre_estimada !== undefined && data.fecha_cierre_estimada !== null && data.fecha_cierre_estimada !== '') {
    if (!isValidDateString(data.fecha_cierre_estimada)) {
      return 'La fecha de cierre estimada debe tener un formato válido YYYY-MM-DD.';
    }
  }

  return null;
}

const oportunidadComercialController = {
  async crearOportunidad(req, res) {
    try {
      const validationError = validateOportunidadPayload(req.body, false);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const idEmpresa = validateId(req.body.id_empresa);
      const idContacto = validateId(req.body.id_contacto);

      // 1. Verificar existencia de la empresa
      const empresa = await EmpresaCliente.findByPk(idEmpresa);
      if (!empresa) {
        return res.status(404).json({
          status: 'error',
          message: `La empresa con ID ${idEmpresa} no existe.`
        });
      }

      // 2. Verificar existencia del contacto
      const contacto = await Contacto.findByPk(idContacto);
      if (!contacto) {
        return res.status(404).json({
          status: 'error',
          message: `El contacto con ID ${idContacto} no existe.`
        });
      }

      // 3. Verificar que el contacto pertenezca a la empresa indicada
      if (contacto.id_empresa !== idEmpresa) {
        return res.status(400).json({
          status: 'error',
          message: `El contacto con ID ${idContacto} no pertenece a la empresa con ID ${idEmpresa}.`
        });
      }

      let idCampana = null;
      if (req.body.id_campana !== undefined && req.body.id_campana !== null && req.body.id_campana !== '') {
        idCampana = validateId(req.body.id_campana);
        const campana = await CampañaMarketing.findByPk(idCampana);
        if (!campana) {
          return res.status(404).json({
            status: 'error',
            message: `La campaña de marketing con ID ${idCampana} no existe.`
          });
        }
      }

      const payload = {
        id_empresa: idEmpresa,
        id_contacto: idContacto,
        id_campana: idCampana,
        titulo: req.body.titulo.trim(),
        descripcion: req.body.descripcion ? req.body.descripcion.trim() : null,
        valor_estimado: parseFloat(req.body.valor_estimado),
        etapa: req.body.etapa || 'Nueva',
        fecha_cierre_estimada: req.body.fecha_cierre_estimada || null
      };

      const nuevaOportunidad = await OportunidadComercial.create(payload);

      return res.status(201).json({
        status: 'success',
        data: nuevaOportunidad
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          status: 'error',
          message: 'Error de integridad referencial: la relación entre empresa y contacto no es válida.'
        });
      }
      if (err.name === 'SequelizeDatabaseError' && err.original && err.original.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
        return res.status(400).json({
          status: 'error',
          message: 'El valor estimado no puede ser negativo.'
        });
      }
      console.error('Error al crear oportunidad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al crear la oportunidad comercial.'
      });
    }
  },

  async listarOportunidades(req, res) {
    try {
      const oportunidades = await OportunidadComercial.findAll({
        order: [['id_oportunidad', 'ASC']],
        include: [
          {
            model: EmpresaCliente,
            as: 'empresa',
            attributes: ['id_empresa', 'nombre', 'sector', 'estado']
          },
          {
            model: Contacto,
            as: 'contacto',
            attributes: ['id_contacto', 'id_empresa', 'nombre', 'cargo', 'correo', 'telefono']
          },
          {
            model: CampañaMarketing,
            as: 'campana',
            attributes: ['id_campana', 'nombre', 'tipo', 'estado']
          }
        ]
      });

      return res.status(200).json({
        status: 'success',
        total: oportunidades.length,
        data: oportunidades
      });
    } catch (err) {
      console.error('Error al listar oportunidades:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al consultar oportunidades.'
      });
    }
  },

  async obtenerOportunidad(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const oportunidad = await OportunidadComercial.findByPk(id, {
        include: [
          {
            model: EmpresaCliente,
            as: 'empresa',
            attributes: ['id_empresa', 'nombre', 'sector', 'correo', 'telefono', 'estado']
          },
          {
            model: Contacto,
            as: 'contacto',
            attributes: ['id_contacto', 'id_empresa', 'nombre', 'cargo', 'correo', 'telefono']
          },
          {
            model: CampañaMarketing,
            as: 'campana',
            attributes: ['id_campana', 'nombre', 'tipo', 'estado']
          }
        ]
      });

      if (!oportunidad) {
        return res.status(404).json({
          status: 'error',
          message: `Oportunidad comercial con ID ${id} no encontrada.`
        });
      }

      return res.status(200).json({
        status: 'success',
        data: oportunidad
      });
    } catch (err) {
      console.error('Error al obtener oportunidad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al obtener la oportunidad.'
      });
    }
  },

  async actualizarOportunidad(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Debe proporcionar al menos un campo válido para actualizar.'
        });
      }

      const validationError = validateOportunidadPayload(req.body, true);
      if (validationError) {
        return res.status(400).json({
          status: 'error',
          message: validationError
        });
      }

      const oportunidad = await OportunidadComercial.findByPk(id);
      if (!oportunidad) {
        return res.status(404).json({
          status: 'error',
          message: `Oportunidad comercial con ID ${id} no encontrada.`
        });
      }

      const targetEmpresaId = req.body.id_empresa !== undefined ? validateId(req.body.id_empresa) : oportunidad.id_empresa;
      const targetContactoId = req.body.id_contacto !== undefined ? validateId(req.body.id_contacto) : oportunidad.id_contacto;

      // Si se modifica la empresa o el contacto, validar la relación resultante
      if (req.body.id_empresa !== undefined || req.body.id_contacto !== undefined) {
        const empresa = await EmpresaCliente.findByPk(targetEmpresaId);
        if (!empresa) {
          return res.status(404).json({
            status: 'error',
            message: `La empresa con ID ${targetEmpresaId} no existe.`
          });
        }

        const contacto = await Contacto.findByPk(targetContactoId);
        if (!contacto) {
          return res.status(404).json({
            status: 'error',
            message: `El contacto con ID ${targetContactoId} no existe.`
          });
        }

        if (contacto.id_empresa !== targetEmpresaId) {
          return res.status(400).json({
            status: 'error',
            message: `El contacto con ID ${targetContactoId} no pertenece a la empresa con ID ${targetEmpresaId}.`
          });
        }
      }

      const updateData = {};
      if (req.body.id_empresa !== undefined) updateData.id_empresa = targetEmpresaId;
      if (req.body.id_contacto !== undefined) updateData.id_contacto = targetContactoId;
      if (req.body.id_campana !== undefined) {
        if (req.body.id_campana === null || req.body.id_campana === '') {
          updateData.id_campana = null;
        } else {
          const idCampana = validateId(req.body.id_campana);
          const campana = await CampañaMarketing.findByPk(idCampana);
          if (!campana) {
            return res.status(404).json({
              status: 'error',
              message: `La campaña de marketing con ID ${idCampana} no existe.`
            });
          }
          updateData.id_campana = idCampana;
        }
      }
      if (req.body.titulo !== undefined) updateData.titulo = req.body.titulo.trim();
      if (req.body.descripcion !== undefined) updateData.descripcion = req.body.descripcion ? req.body.descripcion.trim() : null;
      if (req.body.valor_estimado !== undefined) updateData.valor_estimado = parseFloat(req.body.valor_estimado);
      if (req.body.etapa !== undefined) updateData.etapa = req.body.etapa;
      if (req.body.fecha_cierre_estimada !== undefined) {
        updateData.fecha_cierre_estimada = req.body.fecha_cierre_estimada ? req.body.fecha_cierre_estimada : null;
      }

      await oportunidad.update(updateData);

      const oportunidadActualizada = await OportunidadComercial.findByPk(id, {
        include: [
          { model: EmpresaCliente, as: 'empresa' },
          { model: Contacto, as: 'contacto' },
          { model: CampañaMarketing, as: 'campana' }
        ]
      });

      return res.status(200).json({
        status: 'success',
        data: oportunidadActualizada
      });
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
          status: 'error',
          message: err.errors.map(e => e.message).join(', ')
        });
      }
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          status: 'error',
          message: 'Error de integridad referencial: la relación entre empresa y contacto no es válida.'
        });
      }
      if (err.name === 'SequelizeDatabaseError' && err.original && err.original.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
        return res.status(400).json({
          status: 'error',
          message: 'El valor estimado no puede ser negativo.'
        });
      }
      console.error('Error al actualizar oportunidad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al actualizar la oportunidad.'
      });
    }
  },

  async eliminarOportunidad(req, res) {
    try {
      const id = validateId(req.params.id);
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'El identificador debe ser un número entero positivo.'
        });
      }

      const oportunidad = await OportunidadComercial.findByPk(id);
      if (!oportunidad) {
        return res.status(404).json({
          status: 'error',
          message: `Oportunidad comercial con ID ${id} no encontrada.`
        });
      }

      await oportunidad.destroy();

      return res.status(200).json({
        status: 'success',
        message: 'Oportunidad comercial eliminada exitosamente.'
      });
    } catch (err) {
      if (
        err.name === 'SequelizeForeignKeyConstraintError' ||
        (err.original && (err.original.code === 'ER_ROW_IS_REFERENCED_2' || err.original.errno === 1451))
      ) {
        return res.status(409).json({
          status: 'error',
          message: 'No se puede eliminar la oportunidad comercial porque tiene actividades de seguimiento asociadas.'
        });
      }

      console.error('Error al eliminar oportunidad:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor al eliminar la oportunidad.'
      });
    }
  }
};

module.exports = oportunidadComercialController;

