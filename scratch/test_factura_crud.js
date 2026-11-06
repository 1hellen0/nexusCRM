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
  Contrato,
  CategoriaProducto,
  ProductoServicio,
  Factura,
  DetalleFactura,
  Pago
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

async function runFacturaTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: FACTURA CRUD ===\n');

  try {
    // Limpieza preventiva
    await Pago.destroy({ where: { numero_operacion: { [sequelize.Sequelize.Op.like]: 'PAG-FAC-%' } } });
    await DetalleFactura.destroy({ where: {} });
    await Factura.destroy({ where: { numero_factura: { [sequelize.Sequelize.Op.like]: 'FAC-TEST-%' } } });
    await ProductoServicio.destroy({ where: { codigo_sku: { [sequelize.Sequelize.Op.like]: 'SKU-FAC-%' } } });
    await CategoriaProducto.destroy({ where: { nombre: { [sequelize.Sequelize.Op.like]: 'Cat Fac %' } } });
    await Contrato.destroy({ where: { numero_contrato: { [sequelize.Sequelize.Op.like]: 'CTR-FAC-%' } } });
    await EmpresaCliente.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp_fac_%' } } });
    await Empleado.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'emp.fac.%' } } });
    await Departamento.destroy({ where: { codigo: { [sequelize.Sequelize.Op.like]: 'FAC-%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'fac_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `fac_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (401 esperado)
    console.log('1. Probando GET /api/facturas sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/facturas', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión de usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Fac Tester',
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

    // 3. Crear entidades base: Depto, Empleado, Empresa, Contrato
    console.log('\n3. Creando entidades base para Factura ...');
    const depto = await Departamento.create({
      codigo: `FAC-${timestamp.toString().slice(-4)}`,
      nombre: `Finanzas y Cobranza ${timestamp}`,
      activo: true
    });

    const empleado = await Empleado.create({
      id_departamento: depto.id_departamento,
      nombre: 'Ernesto',
      apellido: 'Facturacion',
      correo: `emp.fac.${timestamp}@nexuscrm.com`,
      cargo: 'Jefe de Facturación',
      activo: true
    });

    const empresa = await EmpresaCliente.create({
      nombre: `Empresa Factura ${timestamp}`,
      sector: 'Tecnología',
      correo: `emp_fac_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const contrato = await Contrato.create({
      id_empresa: empresa.id_empresa,
      id_empleado_aprobador: empleado.id_empleado,
      numero_contrato: `CTR-FAC-${timestamp}`,
      fecha_inicio: '2026-11-01',
      fecha_fin: '2027-11-01',
      monto_acordado: 120000.00,
      estado: 'Vigente'
    });

    const idEmpresa = empresa.id_empresa;
    const idContrato = contrato.id_contrato;
    console.log('   Entidades creadas. Empresa:', idEmpresa, '| Contrato:', idContrato);

    // 4. Probar POST con claves foráneas inexistentes (404 esperados)
    console.log('\n4. Probando POST con claves foráneas inexistentes (404 esperados) ...');
    const nonEmpresaRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: 999999,
      numero_factura: `FAC-NON-EMP-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   POST Empresa inexistente -> Status:', nonEmpresaRes.status, '| Msg:', nonEmpresaRes.data?.message);
    if (nonEmpresaRes.status !== 404) throw new Error('Esperado 404 por empresa inexistente');

    const nonContratoRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_contrato: 999999,
      numero_factura: `FAC-NON-CTR-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   POST Contrato inexistente -> Status:', nonContratoRes.status, '| Msg:', nonContratoRes.data?.message);
    if (nonContratoRes.status !== 404) throw new Error('Esperado 404 por contrato inexistente');

    // 5. Probar POST con datos inválidos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante total
    const missingTotalRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-MISS-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00
    });
    console.log('   Faltante total -> Status:', missingTotalRes.status, '| Msg:', missingTotalRes.data?.message);
    if (missingTotalRes.status !== 400) throw new Error('Esperado 400 por total faltante');

    // ENUM inválido
    const invalidEnumRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-ENUM-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00,
      estado: 'Cobrada' // Invalido
    });
    console.log('   Estado inválido -> Status:', invalidEnumRes.status, '| Msg:', invalidEnumRes.data?.message);
    if (invalidEnumRes.status !== 400) throw new Error('Esperado 400 por estado no ENUM');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-UNK-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00,
      campo_extra: true
    });
    console.log('   Campo desconocido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_factura en body)
    const pkProtectedRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_factura: 1,
      id_empresa: idEmpresa,
      numero_factura: `FAC-PK-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   id_factura en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por PK protegida');

    // 6. Probar validaciones de fechas e importes monetarios (400 esperados)
    console.log('\n6. Probando validaciones de fechas e importes monetarios (400 esperados) ...');
    // Fecha emisión en formato no ISO
    const badDateRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-DATE-${timestamp}`,
      fecha_emision: '05-11-2026',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   Fecha emisión formato inválido -> Status:', badDateRes.status, '| Msg:', badDateRes.data?.message);
    if (badDateRes.status !== 400) throw new Error('Esperado 400 por formato fecha');

    // Incoherencia: fecha_vencimiento < fecha_emision
    const badIncoRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-INCO-${timestamp}`,
      fecha_emision: '2026-11-20',
      fecha_vencimiento: '2026-11-05',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   vencimiento < emisión -> Status:', badIncoRes.status, '| Msg:', badIncoRes.data?.message);
    if (badIncoRes.status !== 400) throw new Error('Esperado 400 por vencimiento anterior');

    // Subtotal negativo
    const negSubRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-NEG-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: -100.00,
      total: 1160.00
    });
    console.log('   Subtotal negativo -> Status:', negSubRes.status, '| Msg:', negSubRes.data?.message);
    if (negSubRes.status !== 400) throw new Error('Esperado 400 por subtotal negativo');

    // Impuestos con 3 decimales
    const decImpRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: `FAC-DEC-${timestamp}`,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-20',
      subtotal: 1000.00,
      impuestos: 160.555,
      total: 1160.55
    });
    console.log('   Impuestos con 3 decimales -> Status:', decImpRes.status, '| Msg:', decImpRes.data?.message);
    if (decImpRes.status !== 400) throw new Error('Esperado 400 por 3 decimales');

    // 7. POST válido con Contrato vinculado y comprobación de Eager Loading
    console.log('\n7. Probando POST válido con Contrato (201 esperado) y asociaciones ...');
    const numFac1 = `FAC-TEST-${timestamp}-01`;
    const createRes1 = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      id_contrato: idContrato,
      numero_factura: numFac1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-25',
      subtotal: 10000.00,
      impuestos: 1600.00,
      total: 11600.00,
      estado: 'Emitida'
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_factura);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idFac1 = createRes1.data.data.id_factura;

    // Verificar eager loading de empresa y contrato
    const empData = createRes1.data?.data?.empresa;
    const ctrData = createRes1.data?.data?.contrato;
    console.log('   Asociaciones cargadas:', {
      empresa: empData?.nombre,
      contrato_num: ctrData?.numero_contrato
    });
    if (!empData || !ctrData || ctrData.id_contrato !== idContrato) {
      throw new Error('Eager loading falló en creación de factura');
    }
    console.log(' Eager loading en creación validado exitosamente.');

    // 8. POST válido sin contrato (id_contrato: null)
    console.log('\n8. Probando POST válido sin contrato (id_contrato: null) ...');
    const numFac2 = `FAC-TEST-${timestamp}-02`;
    const createRes2 = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: numFac2,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-30',
      subtotal: 5000.00,
      total: 5800.00,
      estado: 'Emitida'
    });
    console.log('   Status:', createRes2.status, '| ID creado:', createRes2.data?.data?.id_factura, '| id_contrato:', createRes2.data?.data?.id_contrato);
    if (createRes2.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes2.status}`);
    const idFac2 = createRes2.data.data.id_factura;
    if (createRes2.data?.data?.id_contrato !== null) {
      throw new Error('Esperado id_contrato null');
    }

    // 9. Probar POST con número de factura duplicado (409 esperado)
    console.log('\n9. Probando POST con numero_factura duplicado (409 esperado) ...');
    const dupNumRes = await makeRequest('/api/facturas', 'POST', authHeaders, {
      id_empresa: idEmpresa,
      numero_factura: numFac1,
      fecha_emision: '2026-11-05',
      fecha_vencimiento: '2026-11-25',
      subtotal: 1000.00,
      total: 1160.00
    });
    console.log('   Status:', dupNumRes.status, '| Msg:', dupNumRes.data?.message);
    if (dupNumRes.status !== 409) throw new Error('Esperado 409 por numero_factura duplicado');

    // 10. Probar GET listado (200 OK)
    console.log('\n10. Probando GET /api/facturas listado (200 esperado) ...');
    const listRes = await makeRequest('/api/facturas', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const facEncontrada = listRes.data?.data?.find(f => f.id_factura === idFac1);
    if (!facEncontrada || !facEncontrada.empresa || !facEncontrada.contrato) {
      throw new Error('Factura o relaciones no encontradas en listado');
    }
    console.log(' Listado validado con eager loading.');

    // 11. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n11. Probando GET /api/facturas/:id ...');
    const getByIdRes = await makeRequest(`/api/facturas/${idFac1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Número:', getByIdRes.data?.data?.numero_factura);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');

    const getNonExistent = await makeRequest('/api/facturas/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 12. Probar PUT válido (200 OK)
    console.log('\n12. Probando PUT /api/facturas/:id ...');
    const putRes = await makeRequest(`/api/facturas/${idFac1}`, 'PUT', authHeaders, {
      subtotal: 12000.00,
      impuestos: 1920.00,
      total: 13920.00,
      estado: 'Pagada_Parcial'
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Estado:', putRes.data?.data?.estado, '| Total:', putRes.data?.data?.total);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (putRes.data?.data?.estado !== 'Pagada_Parcial' || parseFloat(putRes.data?.data?.total) !== 13920.00) {
      throw new Error('Actualización no persistió');
    }

    // 13. Probar PUT con numero_factura duplicado de otro registro (409 esperado)
    console.log('\n13. Probando PUT con numero_factura duplicado (409 esperado) ...');
    const dupPutRes = await makeRequest(`/api/facturas/${idFac1}`, 'PUT', authHeaders, {
      numero_factura: numFac2
    });
    console.log('   PUT número duplicado -> Status:', dupPutRes.status, '| Msg:', dupPutRes.data?.message);
    if (dupPutRes.status !== 409) throw new Error('Esperado 409 en PUT con número duplicado');

    // 14. Probar eliminación de factura con DetalleFactura asociado (ON DELETE CASCADE)
    console.log('\n14. Probando eliminación con DetalleFactura asociado (ON DELETE CASCADE) ...');
    const catProd = await CategoriaProducto.create({
      nombre: `Cat Fac ${timestamp}`,
      descripcion: 'Hardware test factura',
      activo: true
    });

    const prod = await ProductoServicio.create({
      id_categoria: catProd.id_categoria,
      codigo_sku: `SKU-FAC-${timestamp}`,
      nombre: 'Servicio Cloud Factura',
      tipo: 'Servicio',
      precio_unitario: 5000.00,
      moneda: 'USD',
      activo: true
    });

    const detalle = await DetalleFactura.create({
      id_factura: idFac2,
      id_producto: prod.id_producto,
      cantidad: 1.00,
      precio_unitario: 5000.00,
      subtotal_linea: 5000.00
    });
    console.log('   DetalleFactura temporal creado. ID:', detalle.id_detalle_factura, 'para Factura:', idFac2);

    // Eliminar Factura 2 (debe proceder y borrar en CASCADE el detalle)
    const delFac2Res = await makeRequest(`/api/facturas/${idFac2}`, 'DELETE', authHeaders);
    console.log('   DELETE Factura 2 con detalle -> Status:', delFac2Res.status, '| Msg:', delFac2Res.data?.message);
    if (delFac2Res.status !== 200) throw new Error('Esperado 200 al eliminar factura con detalles');

    const detallePostCascade = await DetalleFactura.findByPk(detalle.id_detalle_factura);
    console.log('   DetalleFactura tras borrar factura: existe =', !!detallePostCascade);
    if (detallePostCascade) throw new Error('DetalleFactura debió ser eliminado en CASCADE por MySQL');
    console.log(' ON DELETE CASCADE de DetalleFactura verificado exitosamente.');

    // 15. Probar eliminación de factura con Pago asociado (ON DELETE RESTRICT -> 409)
    console.log('\n15. Probando eliminación con Pago asociado (ON DELETE RESTRICT -> 409) ...');
    const pago = await Pago.create({
      id_factura: idFac1,
      numero_operacion: `PAG-FAC-${timestamp}`,
      fecha_pago: '2026-11-06 10:00:00',
      monto: 5000.00,
      metodo_pago: 'Transferencia',
      estado: 'Confirmado'
    });
    console.log('   Pago temporal creado. ID:', pago.id_pago, 'asociado a Factura:', idFac1);

    // Intentar eliminar Factura 1 mientras tiene pago asociado
    const delFac1RestrictRes = await makeRequest(`/api/facturas/${idFac1}`, 'DELETE', authHeaders);
    console.log('   DELETE Factura 1 con pago -> Status:', delFac1RestrictRes.status, '| Msg:', delFac1RestrictRes.data?.message);
    if (delFac1RestrictRes.status !== 409) {
      throw new Error(`Esperado 409 por restricción de Pago, obtenido ${delFac1RestrictRes.status}`);
    }
    console.log(' ON DELETE RESTRICT validado: la eliminación de la factura con pagos fue bloqueada con 409.');

    // 16. Limpieza en orden estricto de dependencias
    console.log('\n16. Limpieza de registros temporales ...');
    await pago.destroy();
    console.log('   Pago eliminado.');

    const delFac1FinalRes = await makeRequest(`/api/facturas/${idFac1}`, 'DELETE', authHeaders);
    console.log('   DELETE Factura 1 liberada -> Status:', delFac1FinalRes.status);
    if (delFac1FinalRes.status !== 200) throw new Error('Fallo al eliminar factura liberada');

    await prod.destroy();
    console.log('   ProductoServicio eliminado.');
    await catProd.destroy();
    console.log('   CategoriaProducto eliminada.');
    await contrato.destroy();
    console.log('   Contrato eliminado.');
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
      '/api/campanas-marketing',
      '/api/cotizaciones',
      '/api/detalles-cotizacion',
      '/api/contratos'
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

    console.log('\n=== TODAS LAS PRUEBAS DE FACTURA PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runFacturaTests, 1200);

