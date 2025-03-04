import XLSX from 'xlsx';
import * as path from 'path';
import { generarCombinaciones } from './createPermisions.js';
import { postgresConnection } from '../db/pgsql.js';
import bcrypt from 'bcrypt';
export default async function createUsers() {
  const data = readExcel();
  const users = mapearUsers(data);

  for (const user of users) {
    await createUser(user);
  }
}

function readExcel() {
  // eslint-disable-next-line no-undef
  const __dirname = process.cwd();
  const filename = path.join(__dirname, 'sync', 'excels', 'capiata.xlsx');
  const workbook = XLSX.readFile(filename);
  const sheet_name_list = workbook.SheetNames;
  const worksheet = workbook.Sheets[sheet_name_list[0]];

  // Convertir a JSON
  return XLSX.utils.sheet_to_json(worksheet);
}

function mapearUsers(usuarios) {
  const permisosMap = {
    SOLICITUD: 10,
    CONSULTA: 24,
    IMPRESION: 18
  };

  const resultado = usuarios.map(({ USUARIO, NOMBRE, SOLICITUD, CONSULTA, IMPRESION }) => {
    const roles = [];
    if (SOLICITUD === 'X') roles.push(permisosMap.SOLICITUD);
    if (CONSULTA === 'X') roles.push(permisosMap.CONSULTA);
    if (IMPRESION === 'X') roles.push(permisosMap.IMPRESION);

    return {
      usuario: USUARIO,
      nombre: NOMBRE,
      roles
    };
  });

  const roles = generarCombinaciones();

  const matchRoles = (userRoles) => {
    return (
      roles.find((r) => r.roles.length === userRoles.length && r.roles.every((role) => userRoles.includes(role))) ||
      null
    );
  };

  const usuariosConRoles = resultado.map((user) => {
    const matchedRole = matchRoles(user.roles);
    return {
      ...user,
      id_rol: matchedRole ? matchedRole.id : null,
      rol: matchedRole ? matchedRole.rol : 'SIN ASIGNAR'
    };
  });

  return usuariosConRoles;
}

async function createUser(usuario) {
  const query = `
  INSERT INTO usuario (
      activo,
      apellidos,
      cedula,
      correo,
      nombre_usuario,
      nombres,
      observacion,
      password,
      rol_id_rol,
      fecha_creacion,
      municipalidades_id_municipalidad,
      prueba
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  RETURNING id;
`;
  const password = await encriptarPassword(usuario.usuario);

  const values = [
    true, // activo siempre true
    '', // apellidos
    '', // cedula
    '', // correo
    usuario.usuario, // nombre_usuario
    usuario.nombre, //  nombres
    '', // observacion
    password, // password
    usuario.id_rol, // rol_id_rol - sin privilegios
    new Date().toDateString(), // fecha_cracion
    26, // municipalidad_id_municipalidad CAPIATA
    null // prueba
  ];

  await postgresConnection.query(query, values);
}
async function encriptarPassword(password) {
  const saltRounds = 10; // Número de rondas para generar el salt
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}
