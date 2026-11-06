'use strict';

const http = require('http');
const path = require('path');
const projectDir = path.resolve(__dirname, '..');
process.env.PORT = '3099';

const {
  sequelize,
  Usuario,
  EmpresaCliente,
  SectorEmpresarial,
  Factura,
  Pago
} = require(path.join(projectDir, 'models'));

const TEST_PORT = 3099;
let authToken = '';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = { ...options.headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: options.path,
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== INICIANDO TEST COMPLETO DE PAGO CRUD (PROMPT 50) ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  let testSector = null;
  let testEmpresa = null;
  let testFactura = null;
  let testPagoId = null;
  let testPagoId2 = null;
  let testEmail = '';

  try {
    const timestamp = Date.now();
    testEmail = `pago_tester_${timestamp}@nexuscrm.com`;

    // 1. Test 401 Unauthorized sin token
    console.log('1. Probando GET /api/pagos sin token (401 esperado)...');
    const unauthRes = await request({
      path: '/api/pagos',
      method: 'GET'
    });
    assert(unauthRes.statusCode === 401, 'GET /api/pagos sin token retorna 401 Unauthorized');

    // 2. Auth Setup (registro e inicio de sesión)
    console.log('\n2. Registrando e iniciando sesión con usuario de prueba...');
    const regRes = await request({
      path: '/api/auth/register',
      method: 'POST'
    }, {
      nombre: 'Tester Pago',
      correo: testEmail,
      password: 'Password123!'
    });
    assert(regRes.statusCode === 201, 'Usuario test registrado con éxito (201)');

    const loginRes = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, {
      correo: testEmail,
      password: 'Password123!'
    });
    authToken = loginRes.body?.token || loginRes.body?.data?.token;
    assert(loginRes.statusCode === 200 && authToken, 'Login exitoso y obtención de token JWT');

    const authHeaders = {
      'Authorization': `Bearer ${authToken}`
    };

    // 3. Crear Fixtures (Sector, Empresa, Factura)
    console.log('\n3. Creando entidades fixture para Pago...');
    testSector = await SectorEmpresarial.create({
      nombre: `Sector Finanzas ${timestamp}`,
      descripcion: 'Sector de prueba para Pagos'
    });

    testEmpresa = await EmpresaCliente.create({
      nombre: `Empresa Pago Test ${timestamp}`,
      sector: 'Tecnología',
      id_sector: testSector.id_sector,
      correo: `pago_empresa_${timestamp}@example.com`,
      telefono: '5551234567',
      estado: 'Activo'
    });

    testFactura = await Factura.create({
      id_empresa: testEmpresa.id_empresa,
      numero_factura: `FAC-TEST-${timestamp}`,
      fecha_emision: '2026-11-01',
      fecha_vencimiento: '2026-12-01',
      subtotal: 5000.00,
      impuestos: 800.00,
      total: 5800.00,
      estado: 'Emitida'
    });
    assert(testFactura && testFactura.id_factura, 'Factura fixture creada exitosamente');

    // 4. Test Validaciones POST /api/pagos
    console.log('\n4. Probando validaciones de negocio en POST /api/pagos...');

    // 4.1 Factura inexistente -> 404
    const resNoFac = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: 999999,
      numero_operacion: `OP-NOFAC-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      monto: 1000.00,
      metodo_pago: 'Transferencia'
    });
    assert(resNoFac.statusCode === 404, 'POST con id_factura inexistente retorna 404 Not Found');

    // 4.2 Falta monto -> 400
    const resNoMonto = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-NOMON-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      metodo_pago: 'Transferencia'
    });
    assert(resNoMonto.statusCode === 400, 'POST sin monto retorna 400 Bad Request');

    // 4.3 Monto negativo o cero -> 400
    const resMontoZero = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-ZERO-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      monto: 0,
      metodo_pago: 'Transferencia'
    });
    assert(resMontoZero.statusCode === 400, 'POST con monto 0 retorna 400 Bad Request');

    // 4.4 Fecha inválida -> 400
    const resFechaInvalida = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-DATE-${timestamp}`,
      fecha_pago: 'fecha-totalmente-invalida',
      monto: 100.00,
      metodo_pago: 'Transferencia'
    });
    assert(resFechaInvalida.statusCode === 400, 'POST con fecha inválida retorna 400 Bad Request');

    // 4.5 Método de pago inválido -> 400
    const resMetodoInvalido = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-MET-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      monto: 100.00,
      metodo_pago: 'Bitcoin'
    });
    assert(resMetodoInvalido.statusCode === 400, 'POST con metodo_pago inválido (Bitcoin) retorna 400');

    // 4.6 Estado inválido -> 400
    const resEstadoInvalido = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-EST-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      monto: 100.00,
      metodo_pago: 'Transferencia',
      estado: 'Inexistente'
    });
    assert(resEstadoInvalido.statusCode === 400, 'POST con estado inválido retorna 400 Bad Request');

    // 4.7 Campo protegido id_pago -> 400
    const resIdProt = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_pago: 99,
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-PROT-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      monto: 100.00,
      metodo_pago: 'Transferencia'
    });
    assert(resIdProt.statusCode === 400, 'POST con atributo protegido id_pago retorna 400 Bad Request');

    // 4.8 Campo desconocido -> 400
    const resCampoDesc = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: `OP-DESC-${timestamp}`,
      fecha_pago: '2026-11-05T10:00:00Z',
      monto: 100.00,
      metodo_pago: 'Transferencia',
      campo_fantasma: 'infiltrado'
    });
    assert(resCampoDesc.statusCode === 400, 'POST con campo no permitido retorna 400 Bad Request');

    // 5. POST Válido
    console.log('\n5. Registrando Pago válido...');
    const opValida = `OP-VAL-${timestamp}`;
    const resCrear = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: opValida,
      fecha_pago: '2026-11-05T14:30:00Z',
      monto: 2500.50,
      metodo_pago: 'Transferencia',
      estado: 'Confirmado'
    });
    assert(resCrear.statusCode === 201, 'POST /api/pagos válido retorna 201 Created');
    assert(resCrear.body.data && resCrear.body.data.id_pago, 'Respuesta incluye id_pago generado');
    assert(resCrear.body.data.factura && resCrear.body.data.factura.numero_factura === testFactura.numero_factura, 'Respuesta incluye asociación eager loading con Factura');
    testPagoId = resCrear.body.data.id_pago;

    // 6. Verificar preservación financiera de Factura
    console.log('\n6. Verificando que Factura NO fue alterada financieramente...');
    const facAfterPost = await Factura.findByPk(testFactura.id_factura);
    assert(Number(facAfterPost.subtotal) === 5000.00, 'Factura.subtotal permanece intacto tras registrar Pago');
    assert(Number(facAfterPost.impuestos) === 800.00, 'Factura.impuestos permanece intacto tras registrar Pago');
    assert(Number(facAfterPost.total) === 5800.00, 'Factura.total permanece intacto tras registrar Pago');
    assert(facAfterPost.estado === 'Emitida', 'Factura.estado permanece intacto tras registrar Pago');

    // 7. Test Duplicado numero_operacion -> 409
    console.log('\n7. Probando restricción de unicidad para numero_operacion...');
    const resDup = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: opValida,
      fecha_pago: '2026-11-05T15:00:00Z',
      monto: 500.00,
      metodo_pago: 'Tarjeta'
    });
    assert(resDup.statusCode === 409, 'POST con numero_operacion duplicado retorna 409 Conflict');

    // 8. Crear segundo pago para pruebas de lista y unicidad en PUT
    const opValida2 = `OP-VAL2-${timestamp}`;
    const resCrear2 = await request({
      path: '/api/pagos',
      method: 'POST',
      headers: authHeaders
    }, {
      id_factura: testFactura.id_factura,
      numero_operacion: opValida2,
      fecha_pago: '2026-11-05T16:00:00Z',
      monto: 1000.00,
      metodo_pago: 'Tarjeta',
      estado: 'Pendiente'
    });
    assert(resCrear2.statusCode === 201, 'Segundo pago creado exitosamente (201)');
    testPagoId2 = resCrear2.body.data.id_pago;

    // 9. GET /api/pagos (Listar)
    console.log('\n9. Probando GET /api/pagos y filtros...');
    const resListar = await request({
      path: '/api/pagos',
      method: 'GET',
      headers: authHeaders
    });
    assert(resListar.statusCode === 200, 'GET /api/pagos retorna 200 OK');
    assert(Array.isArray(resListar.body.data) && resListar.body.data.length >= 2, 'Lista contiene al menos los 2 pagos creados');

    // 9.1 Filtro por id_factura
    const resFiltroFac = await request({
      path: `/api/pagos?id_factura=${testFactura.id_factura}`,
      method: 'GET',
      headers: authHeaders
    });
    assert(resFiltroFac.statusCode === 200 && resFiltroFac.body.data.length >= 2, 'Filtro por id_factura funciona correctamente');

    // 9.2 Filtro por metodo_pago
    const resFiltroMet = await request({
      path: `/api/pagos?metodo_pago=Transferencia`,
      method: 'GET',
      headers: authHeaders
    });
    assert(resFiltroMet.statusCode === 200 && resFiltroMet.body.data.some(p => p.id_pago === testPagoId), 'Filtro por metodo_pago funciona correctamente');

    // 10. GET /api/pagos/:id
    console.log('\n10. Probando GET /api/pagos/:id...');
    const resGetById = await request({
      path: `/api/pagos/${testPagoId}`,
      method: 'GET',
      headers: authHeaders
    });
    assert(resGetById.statusCode === 200, 'GET /api/pagos/:id retorna 200 OK');
    assert(resGetById.body.data.id_pago === testPagoId, 'Obtiene el pago correcto con ID coincidente');
    assert(resGetById.body.data.factura !== undefined, 'Eager loading de factura incluido en GET /:id');

    // 10.1 GET con ID inexistente
    const resGetNoExiste = await request({
      path: '/api/pagos/999999',
      method: 'GET',
      headers: authHeaders
    });
    assert(resGetNoExiste.statusCode === 404, 'GET con ID inexistente retorna 404 Not Found');

    // 10.2 GET con ID inválido
    const resGetIdInvalido = await request({
      path: '/api/pagos/abc',
      method: 'GET',
      headers: authHeaders
    });
    assert(resGetIdInvalido.statusCode === 400, 'GET con ID alfanumérico retorna 400 Bad Request');

    // 11. PUT /api/pagos/:id
    console.log('\n11. Probando PUT /api/pagos/:id...');
    // 11.1 Actualización válida
    const resPut = await request({
      path: `/api/pagos/${testPagoId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      monto: 3000.75,
      estado: 'Confirmado',
      metodo_pago: 'Cheque'
    });
    assert(resPut.statusCode === 200, 'PUT /api/pagos/:id retorna 200 OK');
    assert(Number(resPut.body.data.monto) === 3000.75, 'Monto actualizado correctamente a 3000.75');
    assert(resPut.body.data.metodo_pago === 'Cheque', 'Metodo de pago actualizado correctamente');

    // 11.2 PUT con numero_operacion duplicado del otro pago -> 409
    const resPutDup = await request({
      path: `/api/pagos/${testPagoId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      numero_operacion: opValida2
    });
    assert(resPutDup.statusCode === 409, 'PUT con numero_operacion duplicado retorna 409 Conflict');

    // 11.3 PUT con atributo protegido -> 400
    const resPutProt = await request({
      path: `/api/pagos/${testPagoId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      id_pago: 999
    });
    assert(resPutProt.statusCode === 400, 'PUT con id_pago protegido retorna 400 Bad Request');

    // 12. Test Integridad Referencial: ON DELETE RESTRICT en Factura
    console.log('\n12. Probando ON DELETE RESTRICT en Factura con pagos asociados...');
    const resDeleteFacConPagos = await request({
      path: `/api/facturas/${testFactura.id_factura}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert(resDeleteFacConPagos.statusCode === 409, 'DELETE /api/facturas/:id con pagos asociados retorna 409 Conflict (ON DELETE RESTRICT)');

    // 13. DELETE /api/pagos/:id
    console.log('\n13. Probando DELETE /api/pagos/:id...');
    // Eliminar primer pago
    const resDel1 = await request({
      path: `/api/pagos/${testPagoId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert(resDel1.statusCode === 200, 'DELETE /api/pagos/:id retorna 200 OK');

    // Verificar que ya no existe
    const resCheckDel1 = await request({
      path: `/api/pagos/${testPagoId}`,
      method: 'GET',
      headers: authHeaders
    });
    assert(resCheckDel1.statusCode === 404, 'Pago eliminado ya no es encontrado (404)');

    // Eliminar segundo pago
    const resDel2 = await request({
      path: `/api/pagos/${testPagoId2}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert(resDel2.statusCode === 200, 'DELETE segundo pago retorna 200 OK');

    // 13.1 DELETE con ID inexistente -> 404
    const resDelNoExiste = await request({
      path: '/api/pagos/999999',
      method: 'DELETE',
      headers: authHeaders
    });
    assert(resDelNoExiste.statusCode === 404, 'DELETE con ID inexistente retorna 404 Not Found');

    // 14. Ahora que los pagos fueron eliminados, Factura puede eliminarse sin conflicto
    console.log('\n14. Verificando eliminación de Factura tras suprimir pagos...');
    const resDeleteFacLimpia = await request({
      path: `/api/facturas/${testFactura.id_factura}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert(resDeleteFacLimpia.statusCode === 200, 'Factura sin pagos puede eliminarse exitosamente (200 OK)');

    // 15. Verificación de regresión: Todas las 18 rutas de NexusCRM responden 200
    console.log('\n15. Comprobando estado de todos los módulos del sistema (18 endpoints)...');
    const modulos = [
      { name: 'Auth /me', path: '/api/auth/me' },
      { name: 'Empresas', path: '/api/empresas' },
      { name: 'Contactos', path: '/api/contactos' },
      { name: 'Oportunidades', path: '/api/oportunidades' },
      { name: 'Actividades', path: '/api/actividades' },
      { name: 'Sectores', path: '/api/sectores' },
      { name: 'Departamentos', path: '/api/departamentos' },
      { name: 'Categorías Producto', path: '/api/categorias-producto' },
      { name: 'Direcciones Empresa', path: '/api/direcciones-empresa' },
      { name: 'Empleados', path: '/api/empleados' },
      { name: 'Productos/Servicios', path: '/api/productos-servicios' },
      { name: 'Campañas Marketing', path: '/api/campanas-marketing' },
      { name: 'Cotizaciones', path: '/api/cotizaciones' },
      { name: 'Detalles Cotización', path: '/api/detalles-cotizacion' },
      { name: 'Contratos', path: '/api/contratos' },
      { name: 'Facturas', path: '/api/facturas' },
      { name: 'Detalles Factura', path: '/api/detalles-factura' },
      { name: 'Pagos', path: '/api/pagos' }
    ];

    for (const mod of modulos) {
      const res = await request({
        path: mod.path,
        method: 'GET',
        headers: authHeaders
      });
      assert(res.statusCode === 200, `Módulo ${mod.name} (${mod.path}) responde 200 OK`);
    }

    // Limpieza final de empresa y sector fixture y usuario
    console.log('\nLimpiando fixtures de prueba...');
    if (testEmpresa) {
      await testEmpresa.destroy();
    }
    if (testSector) {
      await testSector.destroy();
    }
    await Usuario.destroy({ where: { correo: testEmail } });
    console.log('  [CLEANUP] Datos de prueba eliminados correctamente.');

  } catch (err) {
    console.error('ERROR EN TESTS:', err);
    failed++;
  } finally {
    console.log(`\n=== RESUMEN DE PRUEBAS ===`);
    console.log(`Total Pasadas: ${passed}`);
    console.log(`Total Fallidas: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Iniciar servidor importando index y esperar conexión
require(path.join(projectDir, 'index.js'));
setTimeout(runTests, 1500);
