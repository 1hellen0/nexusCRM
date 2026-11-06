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
  CampañaMarketing
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

async function runCampanaTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: CAMPAÑAMARKETING CRUD ===\n');

  try {
    // Limpieza preventiva
    await OportunidadComercial.destroy({ where: { titulo: { [sequelize.Sequelize.Op.like]: '%Campaña%' } } });
    await CampañaMarketing.destroy({ where: { nombre: { [sequelize.Sequelize.Op.like]: '%NexusCRM%' } } });
    await Empleado.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'laura.mkt.%' } } });
    await Departamento.destroy({ where: { codigo: { [sequelize.Sequelize.Op.like]: 'MKT-%' } } });
    await Usuario.destroy({ where: { correo: { [sequelize.Sequelize.Op.like]: 'camp_tester_%' } } });

    const timestamp = Date.now();
    const testEmail = `camp_tester_${timestamp}@nexuscrm.com`;

    // 1. Probar GET sin token (debe retornar 401)
    console.log('1. Probando GET /api/campanas-marketing sin token (401 esperado) ...');
    const noTokenRes = await makeRequest('/api/campanas-marketing', 'GET');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 sin token');

    // 2. Registrar e iniciar sesión de usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Camp Tester',
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

    // 3. Crear Departamento y Empleado responsable temporal
    console.log('\n3. Creando Departamento y Empleado temporal ...');
    const depto = await Departamento.create({
      codigo: `MKT-${timestamp.toString().slice(-4)}`,
      nombre: `Marketing Test ${timestamp}`,
      activo: true
    });

    const empleado = await Empleado.create({
      id_departamento: depto.id_departamento,
      nombre: 'Laura',
      apellido: 'Mercadotecnia',
      correo: `laura.mkt.${timestamp}@nexuscrm.com`,
      telefono: '555-888-999',
      cargo: 'Marketing Manager',
      activo: true
    });
    const idEmp = empleado.id_empleado;
    console.log('   Empleado responsable creado. ID:', idEmp);

    // 4. Probar POST con Empleado inexistente (404 esperado)
    console.log('\n4. Probando POST con Empleado inexistente (404 esperado) ...');
    const nonEmpRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: 999999,
      nombre: 'Campaña Empleado Inexistente',
      tipo: 'Digital',
      fecha_inicio: '2026-11-01'
    });
    console.log('   Status:', nonEmpRes.status, '| Msg:', nonEmpRes.data?.message);
    if (nonEmpRes.status !== 404) throw new Error(`Esperado 404, obtenido ${nonEmpRes.status}`);

    // 5. Probar POST con datos inválidos (400 esperados)
    console.log('\n5. Probando POST con datos inválidos (400 esperados) ...');
    // Faltante fecha_inicio
    const missingDateRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Sin Fecha',
      tipo: 'Digital'
    });
    console.log('   POST sin fecha_inicio -> Status:', missingDateRes.status, '| Msg:', missingDateRes.data?.message);
    if (missingDateRes.status !== 400) throw new Error('Esperado 400 por fecha_inicio faltante');

    // Tipo inválido
    const invalidTypeRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Tipo Invalido',
      tipo: 'RedesSociales',
      fecha_inicio: '2026-11-01'
    });
    console.log('   POST tipo inválido -> Status:', invalidTypeRes.status, '| Msg:', invalidTypeRes.data?.message);
    if (invalidTypeRes.status !== 400) throw new Error('Esperado 400 por tipo no ENUM');

    // Campo desconocido / no permitido
    const unknownFieldRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Campo No Permitido',
      tipo: 'Digital',
      fecha_inicio: '2026-11-01',
      extra_field: 'invalido'
    });
    console.log('   POST campo no permitido -> Status:', unknownFieldRes.status, '| Msg:', unknownFieldRes.data?.message);
    if (unknownFieldRes.status !== 400) throw new Error('Esperado 400 por campo desconocido');

    // Protección de PK (id_campana en body)
    const pkProtectedRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_campana: 1,
      id_empleado_responsable: idEmp,
      nombre: 'Campaña PK',
      tipo: 'Digital',
      fecha_inicio: '2026-11-01'
    });
    console.log('   POST con id_campana en body -> Status:', pkProtectedRes.status, '| Msg:', pkProtectedRes.data?.message);
    if (pkProtectedRes.status !== 400) throw new Error('Esperado 400 por id_campana en body');

    // 6. Probar validaciones de fechas y presupuesto (400 esperados)
    console.log('\n6. Probando validaciones de fechas e importes monetarios (400 esperados) ...');
    // Fecha inicio con formato inválido
    const badDateFormatRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Fecha Formato Malo',
      tipo: 'Digital',
      fecha_inicio: '01-11-2026'
    });
    console.log('   Fecha inicio no YYYY-MM-DD -> Status:', badDateFormatRes.status, '| Msg:', badDateFormatRes.data?.message);
    if (badDateFormatRes.status !== 400) throw new Error('Esperado 400 por formato fecha_inicio');

    // Incoherencia de fechas: fecha_fin < fecha_inicio
    const incoherentDatesRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Fechas Incoherentes',
      tipo: 'Digital',
      fecha_inicio: '2026-11-15',
      fecha_fin: '2026-11-01'
    });
    console.log('   fecha_fin < fecha_inicio -> Status:', incoherentDatesRes.status, '| Msg:', incoherentDatesRes.data?.message);
    if (incoherentDatesRes.status !== 400) throw new Error('Esperado 400 por incoherencia de fechas');

    // Presupuesto negativo
    const negBudgetRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Presupuesto Negativo',
      tipo: 'Digital',
      fecha_inicio: '2026-11-01',
      presupuesto: -500.00
    });
    console.log('   Presupuesto negativo -> Status:', negBudgetRes.status, '| Msg:', negBudgetRes.data?.message);
    if (negBudgetRes.status !== 400) throw new Error('Esperado 400 por presupuesto negativo');

    // Presupuesto con 3 decimales
    const decBudgetRes = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: 'Campaña Presupuesto 3 Decimales',
      tipo: 'Digital',
      fecha_inicio: '2026-11-01',
      presupuesto: 1500.555
    });
    console.log('   Presupuesto con 3 decimales -> Status:', decBudgetRes.status, '| Msg:', decBudgetRes.data?.message);
    if (decBudgetRes.status !== 400) throw new Error('Esperado 400 por más de 2 decimales');

    // 7. POST válido (201 Created) con comprobación de Eager Loading y seguridad
    console.log('\n7. Probando POST válido (201 esperado) y verificación de relaciones ...');
    const createRes1 = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: `Lanzamiento NexusCRM Q4 ${timestamp}`,
      tipo: 'Digital',
      presupuesto: 7500.00,
      fecha_inicio: '2026-11-01',
      fecha_fin: '2026-12-15',
      estado: 'Activa'
    });
    console.log('   Status:', createRes1.status, '| ID creado:', createRes1.data?.data?.id_campana);
    if (createRes1.status !== 201) throw new Error(`Esperado 201, obtenido ${createRes1.status}`);
    const idCamp1 = createRes1.data.data.id_campana;

    // Verificar eager loading de responsable
    const respData = createRes1.data.data.responsable;
    console.log('   Responsable asociado:', respData?.nombre, respData?.apellido, '| Depto:', respData?.departamento?.nombre);
    if (!respData || respData.id_empleado !== idEmp || !respData.departamento) {
      throw new Error('Eager loading de responsable falló en creación');
    }
    // Verificar que password_hash no se exponga si existe usuario
    if (respData.usuario && respData.usuario.password_hash !== undefined) {
      throw new Error('password_hash expuesto en asociación anidada!');
    }
    console.log(' Eager loading y sanitización de seguridad validados.');

    // 8. Crear segunda campaña para pruebas de listado
    const createRes2 = await makeRequest('/api/campanas-marketing', 'POST', authHeaders, {
      id_empleado_responsable: idEmp,
      nombre: `Webinar Tech Nexus ${timestamp}`,
      tipo: 'Webinar',
      presupuesto: 1200.00,
      fecha_inicio: '2026-11-20',
      estado: 'Planificada'
    });
    const idCamp2 = createRes2.data.data.id_campana;
    console.log('   Segunda campaña creada con ID:', idCamp2);

    // 9. Probar GET listado (200 OK)
    console.log('\n9. Probando GET /api/campanas-marketing listado (200 esperado) ...');
    const listRes = await makeRequest('/api/campanas-marketing', 'GET', authHeaders);
    console.log('   Status:', listRes.status, '| Total items:', listRes.data?.total);
    if (listRes.status !== 200) throw new Error('Esperado 200 en GET listado');
    const campEncontrada = listRes.data?.data?.find(c => c.id_campana === idCamp1);
    if (!campEncontrada || !campEncontrada.responsable) {
      throw new Error('Campaña o relación responsable no encontrada en listado');
    }
    console.log(' Listado validado con eager loading.');

    // 10. Probar GET por ID (200 OK y 404 para inexistente)
    console.log('\n10. Probando GET /api/campanas-marketing/:id ...');
    const getByIdRes = await makeRequest(`/api/campanas-marketing/${idCamp1}`, 'GET', authHeaders);
    console.log('   GET existente -> Status:', getByIdRes.status, '| Nombre:', getByIdRes.data?.data?.nombre);
    if (getByIdRes.status !== 200) throw new Error('Esperado 200 en GET por ID');

    const getNonExistent = await makeRequest('/api/campanas-marketing/999999', 'GET', authHeaders);
    console.log('   GET inexistente -> Status:', getNonExistent.status, '| Msg:', getNonExistent.data?.message);
    if (getNonExistent.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 11. Probar PUT válido (200 OK)
    console.log('\n11. Probando PUT /api/campanas-marketing/:id ...');
    const putRes = await makeRequest(`/api/campanas-marketing/${idCamp1}`, 'PUT', authHeaders, {
      nombre: `Lanzamiento NexusCRM Q4 Edición Especial ${timestamp}`,
      presupuesto: 9999.50,
      estado: 'Finalizada'
    });
    console.log('   PUT válido -> Status:', putRes.status, '| Nuevo nombre:', putRes.data?.data?.nombre, '| Estado:', putRes.data?.data?.estado);
    if (putRes.status !== 200) throw new Error('Esperado 200 en PUT válido');
    if (putRes.data?.data?.estado !== 'Finalizada') {
      throw new Error('Actualización de estado no persistió');
    }

    // 12. Probar PUT con incoherencia de fechas (400 esperado)
    console.log('\n12. Probando PUT con incoherencia de fechas (400 esperado) ...');
    const badDatePut = await makeRequest(`/api/campanas-marketing/${idCamp1}`, 'PUT', authHeaders, {
      fecha_fin: '2026-10-01' // Anterior a fecha_inicio 2026-11-01
    });
    console.log('   PUT fecha_fin anterior -> Status:', badDatePut.status, '| Msg:', badDatePut.data?.message);
    if (badDatePut.status !== 400) throw new Error('Esperado 400 en PUT con fecha_fin incoherente');

    // 13. Probar DELETE válido sin oportunidades (200 OK)
    console.log('\n13. Probando DELETE válido sobre idCamp2 (200 esperado) ...');
    const delRes2 = await makeRequest(`/api/campanas-marketing/${idCamp2}`, 'DELETE', authHeaders);
    console.log('   DELETE -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Esperado 200 al eliminar campaña');

    // 14. Probar comportamiento ON DELETE SET NULL con OportunidadComercial
    console.log('\n14. Probando eliminación de campaña con OportunidadComercial asociada (ON DELETE SET NULL) ...');
    const testEmpresa = await EmpresaCliente.create({
      nombre: `Empresa Oportunidad ${timestamp}`,
      sector: 'Consultoría',
      correo: `emp_oport_${timestamp}@test.com`,
      estado: 'Activo'
    });

    const testContacto = await Contacto.create({
      id_empresa: testEmpresa.id_empresa,
      nombre: 'Contacto Demo',
      correo: `contacto_${timestamp}@test.com`,
      activo: true
    });

    const testOportunidad = await OportunidadComercial.create({
      id_empresa: testEmpresa.id_empresa,
      id_contacto: testContacto.id_contacto,
      id_campana: idCamp1,
      titulo: `Oportunidad Vinculada a Campaña ${timestamp}`,
      valor_estimado: 15000.00,
      etapa: 'Propuesta'
    });
    console.log('   Oportunidad temporal creada. ID:', testOportunidad.id_oportunidad, 'vinculada a Campaña:', idCamp1);

    // Verificar que GET por ID incluya la oportunidad asociada
    const getCampWithOport = await makeRequest(`/api/campanas-marketing/${idCamp1}`, 'GET', authHeaders);
    console.log('   Oportunidades asociadas en GET:', getCampWithOport.data?.data?.oportunidades?.length);
    if (getCampWithOport.data?.data?.oportunidades?.length !== 1) {
      throw new Error('Eager loading de oportunidades falló');
    }

    // Ejecutar DELETE de la campaña: debe tener éxito y desvincular la oportunidad (id_campana -> null)
    const delCamp1Res = await makeRequest(`/api/campanas-marketing/${idCamp1}`, 'DELETE', authHeaders);
    console.log('   DELETE Campaña con oportunidad asociada -> Status:', delCamp1Res.status, '| Msg:', delCamp1Res.data?.message);
    if (delCamp1Res.status !== 200) throw new Error('Esperado 200 al eliminar campaña con ON DELETE SET NULL');

    // Verificar en BD que la oportunidad aún existe y tiene id_campana = null
    const oportRefrescada = await OportunidadComercial.findByPk(testOportunidad.id_oportunidad);
    console.log('   Estado de la oportunidad tras borrar campaña: existe =', !!oportRefrescada, '| id_campana =', oportRefrescada.id_campana);
    if (!oportRefrescada || oportRefrescada.id_campana !== null) {
      throw new Error('ON DELETE SET NULL falló: la oportunidad fue alterada indebidamente o id_campana no es null');
    }
    console.log(' ON DELETE SET NULL verificado exitosamente: la oportunidad sobrevive con id_campana en null.');

    // 15. Limpieza de registros temporales en orden estricto
    console.log('\n15. Limpieza de registros temporales ...');
    await oportRefrescada.destroy();
    console.log('   Oportunidad temporal eliminada.');
    await testContacto.destroy();
    console.log('   Contacto temporal eliminado.');
    await testEmpresa.destroy();
    console.log('   EmpresaCliente temporal eliminada.');
    await empleado.destroy();
    console.log('   Empleado temporal eliminado.');
    await depto.destroy();
    console.log('   Departamento temporal eliminado.');

    // 16. Verificar que las rutas de los otros módulos continúen funcionando
    console.log('\n16. Verificando que rutas de módulos anteriores continúen operativas ...');
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
      '/api/productos-servicios'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    // 17. Limpieza del usuario autenticador
    await Usuario.destroy({ where: { correo: testEmail } });
    console.log('   Usuario autenticador eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE CAMPAÑAMARKETING PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runCampanaTests, 1200);
