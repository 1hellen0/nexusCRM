const http = require('http');
const path = require('path');
const projectDir = 'c:/Users/FORWARD/Downloads/NexusCRM';
const {
  Usuario,
  Departamento,
  Empleado,
  CampañaMarketing,
  sequelize
} = require(path.join(projectDir, 'models'));

function makeRequest(pathName, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: pathName,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runEmpleadoTests() {
  console.log('=== PRUEBAS HTTP EN VIVO: EMPLEADO CRUD ===\n');

  try {
    // 0. Limpieza previa
    await Usuario.destroy({ where: { correo: 'emp_tester@nexuscrm.com' } });
    await Usuario.destroy({ where: { correo: 'user_vinculado@nexuscrm.com' } });

    // 1. Verificación de rechazo sin token (401)
    console.log('1. Probando GET /api/empleados sin token (401) ...');
    const noTokenRes = await makeRequest('/api/empleados');
    console.log('   Status:', noTokenRes.status, '| Payload:', noTokenRes.data);
    if (noTokenRes.status !== 401) throw new Error('Esperado 401 en /api/empleados');

    // 2. Autenticar usuario de prueba
    console.log('\n2. Registrando e iniciando sesión de usuario de prueba ...');
    await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Tester Empleados',
      correo: 'emp_tester@nexuscrm.com',
      password: 'EmpPassword123!'
    });

    const loginRes = await makeRequest('/api/auth/login', 'POST', {}, {
      correo: 'emp_tester@nexuscrm.com',
      password: 'EmpPassword123!'
    });
    const token = loginRes.data?.token;
    if (!token) throw new Error('No se obtuvo token');
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(' Token JWT obtenido exitosamente.');

    // 3. Crear Departamento y Usuario temporal para pruebas de relaciones
    console.log('\n3. Creando Departamento y Usuario temporal ...');
    const depto = await Departamento.create({
      codigo: 'DEP-EMP-' + Date.now().toString().slice(-4),
      nombre: 'Depto Recursos Humanos ' + Date.now(),
      activo: true
    });
    console.log('   Departamento creado. ID:', depto.id_departamento);

    // Registrar un segundo usuario para vincular al empleado
    const userVincRes = await makeRequest('/api/auth/register', 'POST', {}, {
      nombre: 'Usuario Vinculado',
      correo: 'user_vinculado@nexuscrm.com',
      password: 'UserVinculado123!'
    });
    const idUsuarioVinculado = userVincRes.data.data.id_usuario;
    console.log('   Usuario para vincular creado. ID:', idUsuarioVinculado);

    // 4. Crear empleado válido con id_usuario vinculado (POST /api/empleados) -> 201
    console.log('\n4. Probando POST /api/empleados (Creación válida con usuario y departamento) ...');
    const emailEmp1 = 'mariana.lopez.' + Date.now() + '@nexuscrm.com';
    const createRes1 = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      id_usuario: idUsuarioVinculado,
      nombre: 'Mariana',
      apellido: 'López',
      correo: emailEmp1,
      telefono: '555-8877',
      cargo: 'Especialista en Atracción de Talento',
      activo: true
    });
    console.log('   POST /api/empleados (1) -> Status:', createRes1.status, '| ID:', createRes1.data?.data?.id_empleado);
    if (createRes1.status !== 201) throw new Error('Fallo al crear empleado 1');
    const idEmp1 = createRes1.data.data.id_empleado;

    // Verificar que no exponga password_hash
    console.log('   Verificando exclusión de datos sensibles (password_hash):');
    console.log('   Usuario vinculado retornado:', createRes1.data.data.usuario);
    if (createRes1.data.data.usuario?.password_hash !== undefined) {
      throw new Error('FALLO DE SEGURIDAD: password_hash fue expuesto en la respuesta JSON');
    }
    console.log('   Seguridad validada: password_hash no presente.');

    // Crear segundo empleado sin id_usuario (null)
    const emailEmp2 = 'roberto.sanchez.' + Date.now() + '@nexuscrm.com';
    const createRes2 = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      nombre: 'Roberto',
      apellido: 'Sánchez',
      correo: emailEmp2,
      cargo: 'Analista de Compensaciones'
    });
    console.log('   POST /api/empleados (2 sin id_usuario) -> Status:', createRes2.status, '| ID:', createRes2.data?.data?.id_empleado);
    if (createRes2.status !== 201) throw new Error('Fallo al crear empleado 2');
    const idEmp2 = createRes2.data.data.id_empleado;

    // 5. Rechazo con departamento inexistente (404 Not Found)
    console.log('\n5. Probando rechazo con departamento inexistente (404) ...');
    const deptoInvalido = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: 9999999,
      nombre: 'Pedro',
      apellido: 'Pérez',
      correo: 'pedro.' + Date.now() + '@test.com',
      cargo: 'Consultor'
    });
    console.log('   POST /api/empleados (depto inexistente) -> Status:', deptoInvalido.status, '| Msg:', deptoInvalido.data?.message);
    if (deptoInvalido.status !== 404) throw new Error('Esperado 404 en departamento inexistente');

    // 6. Rechazo con usuario inexistente (404 Not Found)
    console.log('\n6. Probando rechazo con usuario inexistente (404) ...');
    const userInvalido = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      id_usuario: 9999999,
      nombre: 'Pedro',
      apellido: 'Pérez',
      correo: 'pedro2.' + Date.now() + '@test.com',
      cargo: 'Consultor'
    });
    console.log('   POST /api/empleados (usuario inexistente) -> Status:', userInvalido.status, '| Msg:', userInvalido.data?.message);
    if (userInvalido.status !== 404) throw new Error('Esperado 404 en usuario inexistente');

    // 7. Rechazo por unicidad de id_usuario (409 Conflict)
    console.log('\n7. Probando rechazo de usuario ya vinculado (409 Conflict) ...');
    const dupUserRes = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      id_usuario: idUsuarioVinculado, // Ya vinculado a idEmp1
      nombre: 'Elena',
      apellido: 'Gómez',
      correo: 'elena.' + Date.now() + '@test.com',
      cargo: 'Reclutadora'
    });
    console.log('   POST /api/empleados (usuario duplicado) -> Status:', dupUserRes.status, '| Msg:', dupUserRes.data?.message);
    if (dupUserRes.status !== 409) throw new Error('Esperado 409 en usuario duplicado');

    // 8. Rechazo por correo duplicado (409 Conflict)
    console.log('\n8. Probando rechazo de correo duplicado (409 Conflict) ...');
    const dupCorreoRes = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      nombre: 'Mariana Clon',
      apellido: 'López',
      correo: emailEmp1, // Correo ya registrado
      cargo: 'Auxiliar'
    });
    console.log('   POST /api/empleados (correo duplicado) -> Status:', dupCorreoRes.status, '| Msg:', dupCorreoRes.data?.message);
    if (dupCorreoRes.status !== 409) throw new Error('Esperado 409 en correo duplicado');

    // 9. Rechazo de datos inválidos (400 Bad Request)
    console.log('\n9. Probando rechazo de datos inválidos (400 Bad Request) ...');
    const invalidEmail = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      nombre: 'Test',
      apellido: 'Test',
      correo: 'correo-no-valido',
      cargo: 'Cargo'
    });
    console.log('   POST /api/empleados (correo inválido) -> Status:', invalidEmail.status, '| Msg:', invalidEmail.data?.message);
    if (invalidEmail.status !== 400) throw new Error('Esperado 400 en correo inválido');

    const invalidUnknown = await makeRequest('/api/empleados', 'POST', authHeaders, {
      id_departamento: depto.id_departamento,
      nombre: 'Test',
      apellido: 'Test',
      correo: 'valido.' + Date.now() + '@test.com',
      cargo: 'Cargo',
      sueldoSecreto: 99999
    });
    console.log('   POST /api/empleados (campo desconocido) -> Status:', invalidUnknown.status, '| Msg:', invalidUnknown.data?.message);
    if (invalidUnknown.status !== 400) throw new Error('Esperado 400 en campo desconocido');

    // 10. Listar empleados (GET /api/empleados) -> 200
    console.log('\n10. Probando GET /api/empleados (Listado con eager loading) ...');
    const listRes = await makeRequest('/api/empleados', 'GET', authHeaders);
    console.log('   GET /api/empleados -> Status:', listRes.status, '| Total:', listRes.data?.total);
    console.log('   Departamento incluido:', !!listRes.data?.data?.[0]?.departamento);
    if (listRes.status !== 200 || !Array.isArray(listRes.data?.data)) throw new Error('Fallo en listado');

    // 11. Obtener empleado por ID (GET /api/empleados/:id) -> 200
    console.log('\n11. Probando GET /api/empleados/:id (Detalle) ...');
    const getRes = await makeRequest(`/api/empleados/${idEmp1}`, 'GET', authHeaders);
    console.log('   GET /api/empleados/:id -> Status:', getRes.status, '| Nombre:', getRes.data?.data?.nombre);
    console.log('   Departamento asociado:', getRes.data?.data?.departamento?.nombre);
    console.log('   Usuario asociado:', getRes.data?.data?.usuario?.correo);
    if (getRes.status !== 200 || getRes.data?.data?.id_empleado !== idEmp1) throw new Error('Fallo en GET /:id');

    // 12. ID inexistente (404 Not Found)
    console.log('\n12. Probando ID inexistente (404 Not Found) ...');
    const notFoundRes = await makeRequest('/api/empleados/9999999', 'GET', authHeaders);
    console.log('   GET /api/empleados/9999999 -> Status:', notFoundRes.status, '| Msg:', notFoundRes.data?.message);
    if (notFoundRes.status !== 404) throw new Error('Esperado 404 en ID inexistente');

    // 13. Actualizar empleado (PUT /api/empleados/:id) -> 200
    console.log('\n13. Probando PUT /api/empleados/:id (Actualización válida) ...');
    const updateRes = await makeRequest(`/api/empleados/${idEmp1}`, 'PUT', authHeaders, {
      cargo: 'Directora de Gestión Humana',
      telefono: '555-1199',
      id_usuario: null // Desvincular usuario
    });
    console.log('   PUT /api/empleados/:id -> Status:', updateRes.status, '| Cargo:', updateRes.data?.data?.cargo, '| Usuario:', updateRes.data?.data?.usuario);
    if (updateRes.status !== 200 || updateRes.data?.data?.usuario !== null) throw new Error('Fallo en PUT');

    // 14. Eliminar empleado sin dependencias (DELETE) -> 200
    console.log('\n14. Probando DELETE /api/empleados/:id (sin dependencias) -> 200 ...');
    const delRes2 = await makeRequest(`/api/empleados/${idEmp2}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/empleados/:id (empleado 2) -> Status:', delRes2.status, '| Msg:', delRes2.data?.message);
    if (delRes2.status !== 200) throw new Error('Fallo al eliminar empleado 2');

    // 15. Prueba de dependencia y regla ON DELETE RESTRICT (CampañaMarketing dependiente)
    console.log('\n15. Probando ON DELETE RESTRICT con CampañaMarketing dependiente ...');
    const testCampana = await CampañaMarketing.create({
      id_empleado_responsable: idEmp1,
      nombre: 'Campaña Dependencia Empleado ' + Date.now(),
      tipo: 'Digital',
      presupuesto: 2000.00,
      fecha_inicio: '2026-11-01',
      estado: 'Activa'
    });
    console.log('   Campaña temporal creada. ID:', testCampana.id_campana, 'vinculada a Empleado:', idEmp1);

    const delRestrictRes = await makeRequest(`/api/empleados/${idEmp1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/empleados/:id (con campaña activa) -> Status:', delRestrictRes.status, '| Msg:', delRestrictRes.data?.message);
    if (delRestrictRes.status !== 409) {
      throw new Error(`Esperado 409 por ON DELETE RESTRICT, pero se obtuvo ${delRestrictRes.status}`);
    }
    console.log(' ON DELETE RESTRICT validado exitosamente: la eliminación fue bloqueada con 409.');

    // 16. Limpieza de datos de prueba de Empleado
    console.log('\n16. Limpieza de registros temporales ...');
    await testCampana.destroy();
    console.log('   Campaña temporal eliminada.');

    const delFinalRes = await makeRequest(`/api/empleados/${idEmp1}`, 'DELETE', authHeaders);
    console.log('   DELETE /api/empleados/:id (tras remover campaña) -> Status:', delFinalRes.status);
    if (delFinalRes.status !== 200) throw new Error('Fallo al eliminar empleado liberado');

    await depto.destroy();
    console.log('   Departamento temporal eliminado.');

    await Usuario.destroy({ where: { correo: 'user_vinculado@nexuscrm.com' } });
    console.log('   Usuario vinculado temporal eliminado.');

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
      '/api/direcciones-empresa'
    ];
    for (const ep of testEndpoints) {
      const res = await makeRequest(ep, 'GET', authHeaders);
      if (res.status !== 200) throw new Error(`Fallo en endpoint previo: ${ep} respondió ${res.status}`);
      console.log(`   GET ${ep} -> Status: 200 OK`);
    }

    // 18. Limpieza final de usuario autenticado
    await Usuario.destroy({ where: { correo: 'emp_tester@nexuscrm.com' } });
    console.log('   Usuario autenticador eliminado.');
    console.log(' Base de datos limpia: 0 registros residuales.');

    console.log('\n=== TODAS LAS PRUEBAS DE EMPLEADO PASARON CON ÉXITO ===');
  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    process.exit(0);
  }
}

process.env.PORT = '3099';
require(path.join(projectDir, 'index.js'));
setTimeout(runEmpleadoTests, 1200);
