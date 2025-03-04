/*
usa la query para generar permisos primitivos

SELECT
    r.id AS id_rol,
    r.nombre AS rol,
    p.nombre AS permiso,
    om.nombre AS modulo,
    p.id_permiso AS id_permiso
FROM
    role_permission rp
JOIN
    roles r ON rp.id_rol = r.id
JOIN
    permisos p ON rp.id_permiso = p.id_permiso
JOIN
    opciones_modulo om ON p.id_opcion = om.id_opcion
WHERE r.nombre <> 'ADMINISTRADOR'

*/

import XLSX from 'xlsx';
import * as path from 'path';
import { postgresConnection } from '../db/pgsql.js';
export default async function createPermisions() {
  const data = readExcel();
  const combinaciones = agrupar(data);

  for (const combinacion of combinaciones) {
    createRolPermisos(combinacion);
  }
}

export function generarCombinaciones() {
  const data = readExcel();
  const combinaciones = agrupar(data);
  return combinaciones;
}

function agrupar(rolesArray) {
  // 1. Agrupar datos por id_rol
  const rolesMap = {};

  rolesArray.forEach((item) => {
    if (!rolesMap[item.id_rol]) {
      rolesMap[item.id_rol] = {
        rol: item.rol,
        permisos: new Set() // Usamos un Set para evitar duplicados
      };
    }
    rolesMap[item.id_rol].permisos.add(item.id_permiso);
  });

  // Convertir el objeto en un array de roles
  const rolesList = Object.keys(rolesMap).map((id_rol) => ({
    id_rol: Number(id_rol),
    rol: rolesMap[id_rol].rol,
    permisos: Array.from(rolesMap[id_rol].permisos) // Convertir Set a array
  }));

  // 2. Función para generar todas las combinaciones de roles con id progresivo
  let progressiveId = 10; // id inicial
  const combinaciones = [];

  const generarCombinaciones = (inicio, combinacionActual) => {
    if (combinacionActual.length > 0) {
      // Unimos los permisos de la combinación actual, eliminando duplicados
      const permisosUnidos = new Set();
      combinacionActual.forEach((role) => {
        role.permisos.forEach((permiso) => permisosUnidos.add(permiso));
      });

      // Nombre combinado, por ejemplo "SOLICITUDES+IMRESION"
      const nombreRolCombinado = combinacionActual.map((r) => r.rol).join('+');

      // Agregar la combinación con un id progresivo
      combinaciones.push({
        id: progressiveId++,
        roles: combinacionActual.map((r) => r.id_rol),
        rol: nombreRolCombinado,
        permisos: Array.from(permisosUnidos) // Convertir Set a array ordenado
      });
    }
    for (let i = inicio; i < rolesList.length; i++) {
      generarCombinaciones(i + 1, combinacionActual.concat(rolesList[i]));
    }
  };

  generarCombinaciones(0, []);

  // 3. Mostrar las combinaciones resultantes
  return combinaciones;
}

function readExcel() {
  // eslint-disable-next-line no-undef
  const __dirname = process.cwd();
  const filename = path.join(__dirname, 'sync', 'excels', 'permisos.xlsx');
  const workbook = XLSX.readFile(filename);
  const sheet_name_list = workbook.SheetNames;
  const worksheet = workbook.Sheets[sheet_name_list[0]];

  // Convertir a JSON
  return XLSX.utils.sheet_to_json(worksheet);
}

async function createRolPermisos(combinacion) {
  const rolesQuery = `
    INSERT INTO roles (id,nombre,codigo,estado) VALUES ($1,$2,$3,$4) RETURNING id;`;

  const rolValue = [combinacion.id, combinacion.rol, '', true];

  await postgresConnection.query(rolesQuery, rolValue);

  const permisosQuery = `
    INSERT INTO role_permission (id_rol,id_permiso) VALUES ($1,$2);`;

  const permisosValues = combinacion.permisos.map((permiso) => [combinacion.id, permiso]);

  for (const permisoValue of permisosValues) {
    await postgresConnection.query(permisosQuery, permisoValue);
  }
}
