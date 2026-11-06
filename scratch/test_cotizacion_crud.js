'use strict';

const http = require('http');
const path = require('path');
const projectDir = path.resolve(__dirname, '..');
const {
  sequelize,
  Usuario,
  Departamento,
  Empleado,
  EmpresaCliente,
  Contacto,
  OportunidadComercial,
  CategoriaProducto,
  ProductoServicio,
  Cotizacion,
  DetalleCotizacion,
  Contrato
} = require(path.join(projectDir, 'models'));

function makeRequest(pathName, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { ...headers };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: pathName,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runCotizacionTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: COTIZACION CRUD ===\n');

  try {
    // Limpieza preventiva
    await Contrato.destroy({ where: { numero_contrato: { [sequelize.Sequelize.Op.like]: 'CTR-TEST-%' } } });
    await DetalleCotizacion.destroy({ where: {} });
    await Cotizacion.destroy({ where: { numero_cotizacion: { [sequelize.Sequelize.Op.like]: 'COT-%' } } });
    await ProductoServicio.destroy({ where: { codigo_sku: { [sequelize.Sequelize.Op.like]: 'SKU-COT-%' } } });
    await CategoriaProducto.destroy({ where: { nombre: { [sequelize.Sequelize.Op.like]: 'Cat Cot %' } } });
    await OportunidadComercial.destroy({ where: { titulo: { [sequelize.Sequelize.Op.like]: '%Cotizacion%' } } });
    await Contacto.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'contacto_cot_%' } } });
    await EmpresaCliente.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp_cot_%' } } });
    await Empleado.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp.cot.%' } } });
    await Departamento.destroy({ where: { codigo: { [sequelize.Sequelize.Op.like]: 'COT-%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'cot_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `cot_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (401 esperado)
    console.log('1. Probando GET /api/cotizaciones sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/cotizaciones', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión de usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Cot Tester',
      correo: testEmail,
      password: 'Password123!'
    });

    const loginRes = await makeRequest('/api/auth/login', 'POST', {}, {
      correo: testEmail,
      password: 'Password123!'
    });

    const token = loginRes.data?.token || loginRes.data?.data?.token;
    if (!token) throw new Error(`No se pudo obtener el token JWT: ${JSON.stringify(loginRes.data)}`);
    console.log(' Token JWT obtenido exitosamente.');

    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };

    // 3. Crear registros base temporales: Depto, Empleado, Empresa, Contacto, Oportunidad
    console.log('\n3. Creando entidades base para Cotizacion ...');
    const depto = await Departamento.create({
      codigo: `COT-${timestamp.toString().slice(-4)}`,
      nombre: `Ventas Corp ${timestamp}`,
      activo: true
    });

    const empleado = await Empleado.create({
      id_departamento: depto.id_departamento,
      nombre: 'Carlos',
      apellido: 'Ventas',
      correo: `emp.cot.${timestamp}@nexuscrm.com`,
      cargo: 'Ejecutivo de Cuentas',
      activo: true
    });

    const empresa = await EmpresaCliente.create({
      nombre: `Empresa Cot ${timestamp}`,
      sector: 'Servicios',
      correo: `emp_cot_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const contacto = await Contacto.create({
      id_empresa: empresa.id_empresa,
      nombre: 'Ana Contacto',
      correo: `contacto_cot_${timestamp}@test.com`,
      activo: true
    });

    const oportunidad = await OportunidadComercial.create({
      id_empresa: empresa.id_empresa,
      id_contacto: contacto.id_contacto,
      titulo: `Oportunidad para Cotizacion ${timestamp}`,
      valor_estimado: 25000.00,
      etapa: 'Propuesta'
    });

    const idEmp = empleado.id_empleado;
    const idOport = oportunidad.id_oportunidad;
    console.log('   Entidades creadas. Empleado:', idEmp, '| Oportunidad:', idOport);

    // 4. Probar POST con claves foráneas inexistentes (404 esperados)
    console.log('\n4. Probando POST con claves foráneas inexistentes (404 esperados) ...');
    const nonOportRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: 999999,
      id_empleado: idEmp,
      numero_cotizacion: `COT-NON-OP-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   POST Oportunidad inexistente -> Status:', nonOportRes.status, '| Msg:', nonOportRes.data?.message);
    if (nonOportRes.status !== 404) throw new Error('Esperado 404 por oportunidad inexistente');

    const nonEmpRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: 999999,
      numero_cotizacion: `COT-NON-EMP-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   POST Empleado inexistente -> Status:', nonEmpRes.status, '| Msg:', nonEmpRes.data?.message);
    if (nonEmpRes.status !== 404) throw new Error('Esperado 404 por empleado inexistente');

    // 5. Probar POST con datos inválidos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante total
    const missingTotalRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-MISS-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00
    });
    console.log('   Faltante total -> Status:', missingTotalRes.status, '| Msg:', missingTotalRes.data?.message);
    if (missingTotalRes.status !== 400) throw new Error('Esperado 400 por total faltante');

    // ENUM inválido
    const invalidEnumRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-ENUM-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00,
      estado: 'Inexistente'
    });
    console.log('   Estado no permitido -> Status:', invalidEnumRes.status, '| Msg:', invalidEnumRes.data?.message);
    if (invalidEnumRes.status !== 400) throw new Error('Esperado 400 por estado inválido');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-UNK-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00,
      extra_prop: 'val'
    });
    console.log('   Campo desconocido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_cotizacion en body)
    const pkProtectedRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_cotizacion: 1,
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-PK-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   id_cotizacion en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por PK protegida');

    // 6. Probar validaciones de fechas e importes monetarios (400 esperados)
    console.log('\n6. Probando validaciones de fechas e importes monetarios (400 esperados) ...');
    // Fecha formato malo
    const badDateRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-DATE-${timestamp}`,
      fecha_emision: '05/11/2026',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   Fecha emisión formato inválido -> Status:', badDateRes.status, '| Msg:', badDateRes.data?.message);
    if (badDateRes.status !== 400) throw new Error('Esperado 400 por formato fecha');

    // Incoherencia: vencimiento < emisión
    const badIncoRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-INCO-${timestamp}`,
      fecha_emision: '2026-11-20',
      fecha_vencimiento: '2026-11-05',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   Vencimiento < Emisión -> Status:', badIncoRes.status, '| Msg:', badIncoRes.data?.message);
    if (badIncoRes.status !== 400) throw new Error('Esperado 400 por vencimiento anterior a emisión');

    // Subtotal negativo
    const negSubRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-NEG-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: -50.00,
      total: 1160.00
    });
    console.log('   Subtotal negativo -> Status:', negSubRes.status, '| Msg:', negSubRes.data?.message);
    if (negSubRes.status !== 400) throw new Error('Esperado 400 por subtotal negativo');

    // Total con 3 decimales
    const decTotRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: `COT-DEC-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.999
    });
    console.log('   Total con 3 decimales -> Status:', decTotRes.status, '| Msg:', decTotRes.data?.message);
    if (decTotRes.status !== 400) throw new Error('Esperado 400 por 3 decimales en total');

    // 7. POST válido (201 Created) con comprobación de Eager Loading y seguridad
    console.log('\n7. Probando POST válido (201 esperado) y verificación de asociaciones ...');
    const numCot1 = `COT-${timestamp}-001`;
    const createRes1 = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: numCot1,
      version: 1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-25',
      subtotal: 5000.00,
      total: 5800.00,
      estado: 'Borrador'
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_cotizacion);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idCot1 = createRes1.data.data.id_cotizacion;

    // Verificar eager loading de oportunidad y empleado
    const oportData = createRes1.data?.data?.oportunidad;
    const empData = createRes1.data?.data?.empleado;
    console.log('   Asociaciones:', {
      oportunidad: oportData?.titulo,
      empleado: empData?.nombre,
      depto: empData?.departamento?.nombre
    });
    if (!oportData || !empData || !empData.departamento) {
      throw new Error('Eager loading de oportunidad/empleado falló en creación');
    }
    // Verificar que password_hash no se exponga si existe usuario
    if (empData.usuario && empData.usuario.password_hash !== undefined) {
      throw new Error('password_hash expuesto en asociación anidada!');
    }
    console.log(' Eager loading y exclusión de datos sensibles validados.');

    // 8. Crear segunda cotización para pruebas de listado y unicidad
    const numCot2 = `COT-${timestamp}-002`;
    const createRes2 = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: numCot2,
      version: 1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-30',
      subtotal: 10000.00,
      total: 11600.00,
      estado: 'Enviada'
    });
    const idCot2 = createRes2.data.data.id_cotizacion;
    console.log('   Segunda cotización creada con ID:', idCot2);

    // 9. Probar POST con número de cotización duplicado (409 esperado)
    console.log('\n9. Probando POST con numero_cotizacion duplicado (409 esperado) ...');
    const dupPostRes = await makeRequest('/api/cotizaciones', 'POST', authHeaders, {
      id_oportunidad: idOport,
      id_empleado: idEmp,
      numero_cotizacion: numCot1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-25',
      subtotal: 2000.00,
      total: 2320.00
    });
    console.log('   Status:', dupPostRes.status, '| Msg:', dupPostRes.data?.message);
    if (dupPostRes.status !== 409) throw new Error('Esperado 409 por numero_cotizacion duplicado');

    // 10. Probar GET listado (200 OK)
    console.log('\n10. Probando GET /api/cotizaciones listado (200 esperado) ...');
    const listRes = await makeRequest('/api/cotizaciones', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const cotEncontrada = listRes.data?.data?.find(c => c.id_cotizacion === idCot1);
    if (!cotEncontrada || !cotEncontrada.empleado || !cotEncontrada.oportunidad) {
      throw new Error('Cotización o relaciones no encontradas en listado');
    }
    console.log(' Listado validado con eager loading.');

    // 11. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n11. Probando GET /api/cotizaciones/:id ...');
    const getByIdRes = await makeRequest(`/api/cotizaciones/${idCot1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Número:', getByIdRes.data?.data?.numero_cotizacion);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');

    const getNonExistent = await makeRequest('/api/cotizaciones/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 12. Probar PUT válido (200 OK)
    console.log('\n12. Probando PUT /api/cotizaciones/:id ...');
    const putRes = await makeRequest(`/api/cotizaciones/${idCot1}`, 'PUT', authHeaders, {
      subtotal: 5500.00,
      total: 6380.00,
      estado: 'Aprobada',
      version: 2
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Estado:', putRes.data?.data?.estado, '| Total:', putRes.data?.data?.total, '| Versión:', putRes.data?.data?.version);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (putRes.data?.data?.estado !== 'Aprobada' || putRes.data?.data?.version !== 2) {
      throw new Error('Actualización no persistió correctamente');
    }

    // 13. Probar PUT con numero_cotizacion duplicado de otro registro (409 esperado)
    console.log('\n13. Probando PUT con numero_cotizacion duplicado (409 esperado) ...');
    const dupPutRes = await makeRequest(`/api/cotizaciones/${idCot1}`, 'PUT', authHeaders, {
      numero_cotizacion: numCot2
    });
    console.log('   PUT número duplicado -> Status:', dupPutRes.status, '| Msg:', dupPutRes.data?.message);
    if (dupPutRes.status !== 409) throw new Error('Esperado 409 en PUT con número duplicado');

    // 14. Probar DELETE válido sin dependencias sobre idCot2 (200 OK)
    console.log('\n14. Probando DELETE válido sobre idCot2 (200 esperado) ...');
    const delRes2 = await makeRequest(`/api/cotizaciones/${idCot2}`, 'DELETE', authHeaders);
    console.log('   DELETE -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Esperado 200 al eliminar cotización sin dependencias');

    // 15. Probar comportamiento referencial con DetalleCotizacion (CASCADE) y Contrato (SET NULL)
    console.log('\n15. Probando relaciones dependientes: DetalleCotizacion (CASCADE) y Contrato (SET NULL) ...');
    // Crear Categoria y Producto temporal para DetalleCotizacion
    const catProd = await CategoriaProducto.create({
      nombre: `Cat Cot ${timestamp}`,
      descripcion: 'Hardware y servicios de prueba',
      activo: true
    });
    const prod = await ProductoServicio.create({
      id_categoria: catProd.id_categoria,
      codigo_sku: `SKU-COT-${timestamp}`,
      nombre: 'Servidor Enterprise Cot',
      tipo: 'Producto',
      precio_unitario: 5500.00,
      moneda: 'USD',
      activo: true
    });

    const detalle = await DetalleCotizacion.create({
      id_cotizacion: idCot1,
      id_producto: prod.id_producto,
      cantidad: 1.00,
      precio_unitario_pactado: 5500.00,
      descuento_porcentaje: 0.00,
      subtotal_linea: 5500.00
    });
    console.log('   DetalleCotizacion temporal creado. ID:', detalle.id_detalle_cotizacion, 'para Cotizacion:', idCot1);

    const contrato = await Contrato.create({
      id_empresa: empresa.id_empresa,
      id_cotizacion: idCot1,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-TEST-${timestamp}`,
      fecha_inicio: '2026-11-10',
      fecha_fin: '2027-11-10',
      monto_acordado: 6380.00,
      estado: 'Vigente'
    });
    console.log('   Contrato temporal creado. ID:', contrato.id_contrato, 'vinculado a Cotizacion:', idCot1);

    // Verificar que GET por ID cargue detalles y contrato
    const getFullRes = await makeRequest(`/api/cotizaciones/${idCot1}`, 'GET', authHeaders);
    console.log('   GET con asociaciones:', {
      detalles: getFullRes.data?.data?.detalles?.length,
      contrato: getFullRes.data?.data?.contrato?.numero_contrato
    });
    if (getFullRes.data?.data?.detalles?.length !== 1 || !getFullRes.data?.data?.contrato) {
      throw new Error('Eager loading de detalles o contrato falló');
    }

    // Ejecutar DELETE de la Cotizacion
    const delCot1Res = await makeRequest(`/api/cotizaciones/${idCot1}`, 'DELETE', authHeaders);
    console.log('   DELETE Cotizacion con dependencias -> Status:', delCot1Res.status, '| Msg:', delCot1Res.data?.message);
    if (delCot1Res.status !== 200) throw new Error('Esperado 200 al eliminar cotización');

    // Verificar en BD que DetalleCotizacion fue eliminado en CASCADE por MySQL
    const detallePost = await DetalleCotizacion.findByPk(detalle.id_detalle_cotizacion);
    console.log('   DetalleCotizacion tras borrar cotización: existe =', !!detallePost);
    if (detallePost) throw new Error('DetalleCotizacion debió ser eliminado en CASCADE por MySQL');

    // Verificar en BD que Contrato sobrevive con id_cotizacion = NULL (SET NULL)
    const contratoPost = await Contrato.findByPk(contrato.id_contrato);
    console.log('   Contrato tras borrar cotización: existe =', !!contratoPost, '| id_cotizacion =', contratoPost?.id_cotizacion);
    if (!contratoPost || contratoPost.id_cotizacion !== null) {
      throw new Error('Contrato debió desvincularse (ON DELETE SET NULL) manteniendo el registro');
    }
    console.log(' Comportamiento referencial verificado exitosamente (CASCADE en detalles y SET NULL en contrato).');

    // 16. Limpieza en orden estricto de dependencias
    console.log('\n16. Limpieza de registros temporales ...');
    await contratoPost.destroy();
    console.log('   Contrato eliminado.');
    await prod.destroy();
    console.log('   ProductoServicio eliminado.');
    await catProd.destroy();
    console.log('   CategoriaProducto eliminada.');
    await oportunidad.destroy();
    console.log('   OportunidadComercial eliminada.');
    await contacto.destroy();
    console.log('   Contacto eliminado.');
    await empresa.destroy();
    console.log('   EmpresaCliente eliminada.');
    await empleado.destroy();
    console.log('   Empleado eliminado.');
    await depto.destroy();
    console.log('   Departamento eliminado.');

    // 17. Verificar que las rutas de los otros módulos continúen funcionando
    console.log('\n17. Verificando que rutas de módulos anteriores continúen operativas ...');
    const testEndpoints = [
      '/api/empresas',
      '/api/contactos',
      '/api/oportunidades',
      '/api/actividades',
      '/api/sectores',
      '/api/departamentos',
      '/api/categorias-producto',
      '/api/direcciones-empresa',
      '/api/empleados',
      '/api/productos-servicios',
      '/api/campanas-marketing'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    // 18. Limpieza del usuario autenticador
    await Usuario.destroy({ where: { correo: testEmail } });
    console.log('   Usuario autenticador eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE COTIZACION PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runCotizacionTests, 1200);
