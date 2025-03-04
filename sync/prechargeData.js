import { postgresConnection } from '../db/pgsql.js';

async function cleanPostgres() {
  const query = `truncate table lotes_carnets,usuario,escuelas_conduccion,municipalidades,roles,role_permission restart identity cascade;`;
  try {
    await postgresConnection.query(query);
    console.log('Tabla limpia para iniciar en postgres');
  } catch (error) {
    console.error('Error en truncate datos en postgres:', error.message);
  }
}

async function prepareUsers() {
  const users = [
    [false, null, 0, null, 'sistema', 'sistema', null, null, null, null, null, null],
    [
      true,
      null,
      '5460696',
      'oliver.amarilla@segel.com.py',
      'oliver.amarilla',
      'Oliver Amarilla',
      null,
      '$2y$10$pvY4L4AvnZeN.0jqjY/touubvt/fEIFQn4TUzmVA4n.IWl/sulQWG',
      null,
      new Date(),
      null,
      null
    ]
  ];

  //siempre tiene id = 1
  const queryUsuarios = `INSERT INTO usuario (activo, apellidos,cedula,correo,nombre_usuario,nombres,observacion,password,rol_id_rol,fecha_creacion,municipalidades_id_municipalidad,prueba) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
  for (const user of users) {
    try {
      await postgresConnection.query(queryUsuarios, user);
      console.log('Usuarios primitivos insertados en postgres');
    } catch (error) {
      console.error('Error en insertar datos en postgres:', error.message);
    }
  }
}

async function prepareRoles() {
  const roles = [
    ['SIN PRIVILEGIOS', 'SP', true],
    ['ADMINISTRADOR', 'ADM', true]
  ];

  //siempre tiene id = 1
  const queryRoles = `INSERT INTO roles (nombre,codigo,estado) VALUES ($1, $2, $3);`;

  for (const rol of roles) {
    try {
      await postgresConnection.query(queryRoles, rol);
      console.log('Roles primitivos insertados en postgres');
    } catch (error) {
      console.error('Error en insertar datos en postgres:', error.message);
    }
  }
}

async function prepareRolePrivileges() {
  const permisos = [
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [2, 5],
    [2, 6],
    [2, 7],
    [2, 8],
    [2, 10],
    [2, 11],
    [2, 12],
    [2, 13],
    [2, 14],
    [2, 15],
    [2, 16],
    [2, 17],
    [2, 18],
    [2, 19],
    [2, 20],
    [2, 21],
    [2, 22],
    [2, 23],
    [2, 24],
    [2, 26],
    [2, 27],
    [2, 28],
    [2, 29],
    [2, 30],
    [2, 31],
    [2, 32],
    [2, 33],
    [2, 34],
    [2, 35],
    [2, 36],
    [2, 37],
    [2, 38],
    [2, 39],
    [2, 40],
    [2, 41],
    [2, 42],
    [2, 43],
    [2, 44],
    [2, 45],
    [2, 46],
    [2, 47],
    [2, 48],
    [2, 49],
    [2, 50],
    [2, 51],
    [2, 52],
    [2, 53],
    [2, 54],
    [2, 55],
    [2, 56]
  ];

  const queryPermisos = `INSERT INTO role_permission (id_rol,id_permiso) VALUES ($1, $2);`;

  for (const permiso of permisos) {
    try {
      await postgresConnection.query(queryPermisos, permiso);
      console.log('Permisos primitivos insertados en postgres');
    } catch (error) {
      console.error('Error en insertar datos en postgres:', error.message);
    }
  }
}

export async function prechargeData() {
  await cleanPostgres();
  await prepareUsers();
  await prepareRoles();
  await prepareRolePrivileges();

  await postgresConnection.query('UPDATE usuario SET rol_id_rol = 2 WHERE id = 2;');
}
