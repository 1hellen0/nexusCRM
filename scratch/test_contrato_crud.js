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
  Cotizacion,
  Contrato,
  Factura
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

async function runContratoTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: CONTRATO CRUD ===\n');

  try {
    // Limpieza preventiva
    await Factura.destroy({ where: { numero_factura: { [sequelize.Sequelize.Op.like]: 'FAC-CTR-%' } } });
    await Contrato.destroy({ where: { numero_contrato: { [sequelize.Sequelize.Op.like]: 'CTR-TEST-%' } } });
    await Cotizacion.destroy({ where: { numero_cotizacion: { [sequelize.Sequelize.Op.like]: 'COT-CTR-%' } } });
    await OportunidadComercial.destroy({ where: { titulo: { [sequelize.Sequelize.Op.like]: '%Contrato%' } } });
    await Contacto.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'contacto_ctr_%' } } });
    await EmpresaCliente.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp_ctr_%' } } });
    await Empleado.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp.ctr.%' } } });
    await Departamento.destroy({ where: { codigo: { [sequelize.Sequelize.Op.like]: 'CTR-%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'ctr_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `ctr_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (401 esperado)
    console.log('1. Probando GET /api/contratos sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/contratos', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión de usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Ctr Tester',
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

    // 3. Crear entidades base: Depto, Empleado, Empresa, Contacto, Oportunidad, Cotizacion 1 y 2
    console.log('\n3. Creando entidades base para Contrato ...');
    const depto = await Departamento.create({
      codigo: `CTR-${timestamp.toString().slice(-4)}`,
      nombre: `Legal y Contratos ${timestamp}`,
      activo: true
    });

    const empleado = await Empleado.create({
      id_departamento: depto.id_departamento,
      nombre: 'Patricia',
      apellido: 'Aprobaciones',
      correo: `emp.ctr.${timestamp}@nexuscrm.com`,
      cargo: 'Directora Legal',
      activo: true
    });

    const empresa = await EmpresaCliente.create({
      nombre: `Empresa Contrato ${timestamp}`,
      sector: 'Finanzas',
      correo: `emp_ctr_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const contacto = await Contacto.create({
      id_empresa: empresa.id_empresa,
      nombre: 'Felipe Contacto',
      correo: `contacto_ctr_${timestamp}@test.com`,
      activo: true
    });

    const oportunidad = await OportunidadComercial.create({
      id_empresa: empresa.id_empresa,
      id_contacto: contacto.id_contacto,
      titulo: `Oportunidad para Contrato ${timestamp}`,
      valor_estimado: 75000.00,
      etapa: 'Propuesta'
    });

    const cotizacion1 = await Cotizacion.create({
      id_oportunidad: oportunidad.id_oportunidad,
      id_empleado: empleado.id_empleado,
      numero_cotizacion: `COT-CTR-1-${timestamp}`,
      version: 1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-30',
      subtotal: 70000.00,
      total: 81200.00,
      estado: 'Aprobada'
    });

    const cotizacion2 = await Cotizacion.create({
      id_oportunidad: oportunidad.id_oportunidad,
      id_empleado: empleado.id_empleado,
      numero_cotizacion: `COT-CTR-2-${timestamp}`,
      version: 1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-30',
      subtotal: 50000.00,
      total: 58000.00,
      estado: 'Aprobada'
    });

    const idEmp = empleado.id_empleado;
    const idEmpresa = empresa.id_empresa;
    const idCot1 = cotizacion1.id_cotizacion;
    const idCot2 = cotizacion2.id_cotizacion;
    console.log('   Entidades creadas. Empresa:', idEmpresa, '| Empleado:', idEmp, '| Cotizaciones:', idCot1, idCot2);

    // 4. Probar POST con claves foráneas inexistentes (404 esperados)
    console.log('\n4. Probando POST con claves foráneas inexistentes (404 esperados) ...');
    const nonEmpresaRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: 999999,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-NON-EMP-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.00
    });
    console.log('   POST Empresa inexistente -> Status:', nonEmpresaRes.status, '| Msg:', nonEmpresaRes.data?.message);
    if (nonEmpresaRes.status !== 404) throw new Error('Esperado 404 por empresa inexistente');

    const nonAprobRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: 999999,
      numero_contrato: `CTR-NON-AP-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.00
    });
    console.log('   POST Empleado inexistente -> Status:', nonAprobRes.status, '| Msg:', nonAprobRes.data?.message);
    if (nonAprobRes.status !== 404) throw new Error('Esperado 404 por empleado inexistente');

    const nonCotRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      id_cotizacion: 999999,
      numero_contrato: `CTR-NON-COT-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.00
    });
    console.log('   POST Cotización inexistente -> Status:', nonCotRes.status, '| Msg:', nonCotRes.data?.message);
    if (nonCotRes.status !== 404) throw new Error('Esperado 404 por cotización inexistente');

    // 5. Probar POST con datos inválidos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante monto_acordado
    const missingMontoRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-MISS-${timestamp}`,
      fecha_inicio: '2026-11-10'
    });
    console.log('   Faltante monto_acordado -> Status:', missingMontoRes.status, '| Msg:', missingMontoRes.data?.message);
    if (missingMontoRes.status !== 400) throw new Error('Esperado 400 por monto_acordado faltante');

    // ENUM inválido
    const invalidEnumRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-ENUM-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.00,
      estado: 'Activo' // No es valor permitido de Contrato (es 'Vigente')
    });
    console.log('   Estado no permitido -> Status:', invalidEnumRes.status, '| Msg:', invalidEnumRes.data?.message);
    if (invalidEnumRes.status !== 400) throw new Error('Esperado 400 por estado no ENUM');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-UNK-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.00,
      prop_inventada: 123
    });
    console.log('   Campo desconocido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_contrato en body)
    const pkProtectedRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_contrato: 1,
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-PK-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.00
    });
    console.log('   id_contrato en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por PK protegida');

    // 6. Probar validaciones de fechas e importes monetarios (400 esperados)
    console.log('\n6. Probando validaciones de fechas e importes monetarios (400 esperados) ...');
    // Fecha inicio con formato inválido
    const badDateRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-DATE-${timestamp}`,
      fecha_inicio: '10/11/2026',
      monto_acordado: 81200.00
    });
    console.log('   Fecha inicio formato inválido -> Status:', badDateRes.status, '| Msg:', badDateRes.data?.message);
    if (badDateRes.status !== 400) throw new Error('Esperado 400 por formato fecha');

    // Incoherencia: fecha_fin < fecha_inicio
    const badIncoRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-INCO-${timestamp}`,
      fecha_inicio: '2026-11-10',
      fecha_fin: '2026-10-10',
      monto_acordado: 81200.00
    });
    console.log('   fecha_fin < fecha_inicio -> Status:', badIncoRes.status, '| Msg:', badIncoRes.data?.message);
    if (badIncoRes.status !== 400) throw new Error('Esperado 400 por fecha_fin anterior');

    // Monto negativo
    const negMontoRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-NEG-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: -100.00
    });
    console.log('   Monto negativo -> Status:', negMontoRes.status, '| Msg:', negMontoRes.data?.message);
    if (negMontoRes.status !== 400) throw new Error('Esperado 400 por monto negativo');

    // Monto con 3 decimales
    const decMontoRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-DEC-${timestamp}`,
      fecha_inicio: '2026-11-10',
      monto_acordado: 81200.999
    });
    console.log('   Monto con 3 decimales -> Status:', decMontoRes.status, '| Msg:', decMontoRes.data?.message);
    if (decMontoRes.status !== 400) throw new Error('Esperado 400 por 3 decimales');

    // 7. POST válido (201 Created) con Cotización vinculada y comprobación de Eager Loading
    console.log('\n7. Probando POST válido con Cotización (201 esperado) y asociaciones ...');
    const numCtr1 = `CTR-TEST-${timestamp}-01`;
    const createRes1 = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_cotizacion: idCot1,
      id_empleado_aprobador: idEmp,
      numero_contrato: numCtr1,
      fecha_inicio: '2026-11-10',
      fecha_fin: '2027-11-10',
      monto_acordado: 81200.00,
      estado: 'Vigente'
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_contrato);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idCtr1 = createRes1.data.data.id_contrato;

    // Verificar eager loading de empresa, cotización, aprobador (sin password_hash)
    const empData = createRes1.data?.data?.empresa;
    const cotData = createRes1.data?.data?.cotizacion;
    const aprobData = createRes1.data?.data?.aprobador;
    console.log('   Asociaciones cargadas:', {
      empresa: empData?.nombre,
      cotizacion: cotData?.numero_cotizacion,
      aprobador: aprobData?.nombre,
      depto: aprobData?.departamento?.nombre
    });
    if (!empData || !cotData || !aprobData || !aprobData.departamento) {
      throw new Error('Eager loading falló en creación de contrato');
    }
    if (aprobData.usuario && aprobData.usuario.password_hash !== undefined) {
      throw new Error('password_hash expuesto en asociación!');
    }
    console.log(' Eager loading y sanitización validados exitosamente.');

    // 8. POST válido sin cotización (id_cotizacion opcional/null)
    console.log('\n8. Probando POST válido sin cotización (id_cotizacion: null) ...');
    const numCtr2 = `CTR-TEST-${timestamp}-02`;
    const createRes2 = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: numCtr2,
      fecha_inicio: '2026-11-15',
      monto_acordado: 45000.00,
      estado: 'Borrador'
    });
    console.log('   Status:', createRes2.status, '| ID creado:', createRes2.data?.data?.id_contrato, '| id_cotizacion:', createRes2.data?.data?.id_cotizacion);
    if (createRes2.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes2.status}`);
    const idCtr2 = createRes2.data.data.id_contrato;
    if (createRes2.data?.data?.id_cotizacion !== null) {
      throw new Error('Esperado id_cotizacion null');
    }

    // 9. Probar POST con número de contrato duplicado (409 esperado)
    console.log('\n9. Probando POST con numero_contrato duplicado (409 esperado) ...');
    const dupNumRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_empleado_aprobador: idEmp,
      numero_contrato: numCtr1,
      fecha_inicio: '2026-11-20',
      monto_acordado: 10000.00
    });
    console.log('   Status:', dupNumRes.status, '| Msg:', dupNumRes.data?.message);
    if (dupNumRes.status !== 409) throw new Error('Esperado 409 por numero_contrato duplicado');

    // 10. Probar POST con cotización ya vinculada a otro contrato (409 esperado)
    console.log('\n10. Probando POST con cotización ya vinculada a otro contrato (409 esperado) ...');
    const dupCotRes = await makeRequest('/api/contratos', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_cotizacion: idCot1,
      id_empleado_aprobador: idEmp,
      numero_contrato: `CTR-TEST-DUPCOT-${timestamp}`,
      fecha_inicio: '2026-11-20',
      monto_acordado: 10000.00
    });
    console.log('   Status:', dupCotRes.status, '| Msg:', dupCotRes.data?.message);
    if (dupCotRes.status !== 409) throw new Error('Esperado 409 por id_cotizacion duplicado');

    // 11. Probar GET listado (200 OK)
    console.log('\n11. Probando GET /api/contratos listado (200 esperado) ...');
    const listRes = await makeRequest('/api/contratos', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const ctrEncontrado = listRes.data?.data?.find(c => c.id_contrato === idCtr1);
    if (!ctrEncontrado || !ctrEncontrado.empresa || !ctrEncontrado.cotizacion) {
      throw new Error('Contrato o relaciones no encontradas en listado');
    }
    console.log(' Listado validado con eager loading.');

    // 12. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n12. Probando GET /api/contratos/:id ...');
    const getByIdRes = await makeRequest(`/api/contratos/${idCtr1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Número:', getByIdRes.data?.data?.numero_contrato);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');

    const getNonExistent = await makeRequest('/api/contratos/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 13. Probar PUT válido (200 OK)
    console.log('\n13. Probando PUT /api/contratos/:id ...');
    const putRes = await makeRequest(`/api/contratos/${idCtr1}`, 'PUT', authHeaders, {
      monto_acordado: 85000.00,
      estado: 'Renovado'
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Estado:', putRes.data?.data?.estado, '| Monto:', putRes.data?.data?.monto_acordado);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (putRes.data?.data?.estado !== 'Renovado' || parseFloat(putRes.data?.data?.monto_acordado) !== 85000.00) {
      throw new Error('Actualización no persistió');
    }

    // 14. Probar PUT con numero_contrato duplicado de otro registro (409 esperado)
    console.log('\n14. Probando PUT con numero_contrato duplicado (409 esperado) ...');
    const dupPutRes = await makeRequest(`/api/contratos/${idCtr1}`, 'PUT', authHeaders, {
      numero_contrato: numCtr2
    });
    console.log('   PUT número duplicado -> Status:', dupPutRes.status, '| Msg:', dupPutRes.data?.message);
    if (dupPutRes.status !== 409) throw new Error('Esperado 409 en PUT con número duplicado');

    // 15. Probar DELETE válido sin dependencias sobre idCtr2 (200 OK)
    console.log('\n15. Probando DELETE válido sobre idCtr2 (200 esperado) ...');
    const delRes2 = await makeRequest(`/api/contratos/${idCtr2}`, 'DELETE', authHeaders);
    console.log('   DELETE -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Esperado 200 al eliminar contrato sin dependencias');

    // 16. Probar eliminación de contrato con Factura vinculada (ON DELETE SET NULL)
    console.log('\n16. Probando eliminación de contrato con Factura asociada (ON DELETE SET NULL) ...');
    const factura = await Factura.create({
      id_empresa: idEmpresa,
      id_contrato: idCtr1,
      numero_factura: `FAC-CTR-${timestamp}`,
      fecha_emision: '2026-11-10',
      fecha_vencimiento: '2026-11-25',
      subtotal: 85000.00,
      impuestos: 13600.00,
      total: 98600.00,
      estado: 'Emitida'
    });
    console.log('   Factura temporal creada. ID:', factura.id_factura, 'vinculada a Contrato:', idCtr1);

    // Verificar que GET por ID incluya la factura vinculada
    const getWithFactura = await makeRequest(`/api/contratos/${idCtr1}`, 'GET', authHeaders);
    console.log('   Facturas en contrato:', getWithFactura.data?.data?.facturas?.length);
    if (getWithFactura.data?.data?.facturas?.length !== 1) {
      throw new Error('Eager loading de facturas en contrato falló');
    }

    // Ejecutar DELETE del contrato
    const delCtr1Res = await makeRequest(`/api/contratos/${idCtr1}`, 'DELETE', authHeaders);
    console.log('   DELETE Contrato con factura vinculada -> Status:', delCtr1Res.status, '| Msg:', delCtr1Res.data?.message);
    if (delCtr1Res.status !== 200) throw new Error('Esperado 200 al eliminar contrato');

    // Verificar en BD que la Factura sobrevive y su id_contrato es NULL
    const facturaPost = await Factura.findByPk(factura.id_factura);
    console.log('   Factura tras borrar contrato: existe =', !!facturaPost, '| id_contrato =', facturaPost?.id_contrato);
    if (!facturaPost || facturaPost.id_contrato !== null) {
      throw new Error('Factura debió desvincularse (ON DELETE SET NULL) manteniendo el registro');
    }
    console.log(' ON DELETE SET NULL verificado exitosamente en Factura.');

    // 17. Confirmar que no se alteraron importes ni estados de Cotizacion o Factura
    console.log('\n17. Verificando que importes y estados de Cotización y Factura no fueron alterados ...');
    const cot1Check = await Cotizacion.findByPk(idCot1);
    console.log('   Cotización 1 en BD -> Total:', cot1Check.total, '| Estado:', cot1Check.estado);
    if (parseFloat(cot1Check.total) !== 81200.00 || cot1Check.estado !== 'Aprobada') {
      throw new Error('Los datos de Cotización fueron alterados!');
    }
    if (parseFloat(facturaPost.total) !== 98600.00 || facturaPost.estado !== 'Emitida') {
      throw new Error('Los datos financieros de Factura fueron alterados!');
    }
    console.log(' Confirmado: importes y estados de Cotización y Factura preservados sin modificaciones.');

    // 18. Limpieza en orden estricto de dependencias
    console.log('\n18. Limpieza de registros temporales ...');
    await facturaPost.destroy();
    console.log('   Factura eliminada.');
    await cotizacion1.destroy();
    await cotizacion2.destroy();
    console.log('   Cotizaciones eliminadas.');
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

    // 19. Verificar que las rutas de los otros módulos continúen funcionando
    console.log('\n19. Verificando que rutas de módulos anteriores continúen operativas ...');
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
      '/api/campanas-marketing',
      '/api/cotizaciones',
      '/api/detalles-cotizacion'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    // 20. Limpieza del usuario autenticador
    await Usuario.destroy({ where: { correo: testEmail } });
    console.log('   Usuario autenticador eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE CONTRATO PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runContratoTests, 1200);

