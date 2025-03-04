import { mysqlConnection } from '../db/mysql.js';
import { postgresConnection } from '../db/pgsql.js';

//DEPRECATED
async function getUsuariosPostgres() {
  try {
    const query = `SELECT * FROM usuario WHERE prueba IS NOT NULL ORDER BY id`;
    const { rows } = await postgresConnection.query(query);
    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo usuarios de Postgres: ${error.message}`);
  }
}

async function getPrivilegiosMysql(user) {
  try {
    const query = `
    SELECT p.id, p.codigo
    FROM usu_privi up
    INNER JOIN privilegios p ON up.codigo = p.codigo
    WHERE up.id_user = ?
  `;
    const [rows] = await mysqlConnection.query(query, [user.prueba]);
    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo privilegios de MySQL: ${error.message}`);
  }
}
async function getRolePairPostgres(mysqlPrivilege) {
  try {
    const query = `
    SELECT id_permiso,nombre FROM permisos WHERE id_modulo_rut_1 = $1`;
    const { rows } = await postgresConnection.query(query, [mysqlPrivilege.id]);

    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo roles de Postgres: ${error.message}`);
  }
}
async function verificarRolExistente(permisosIds) {
  try {
    // Caso especial: búsqueda de rol sin permisos
    if (permisosIds.length === 0) {
      console.log('no tiene permisos');
      return 1;
    }

    // Caso normal: búsqueda de rol con permisos específicos
    const permisosPlaceholders = permisosIds.map((_, index) => `$${index + 1}`).join(',');

    const query = `
      SELECT rp.id_rol
      FROM role_permission rp
      WHERE rp.id_permiso IN (${permisosPlaceholders})
      GROUP BY rp.id_rol
      HAVING COUNT(DISTINCT rp.id_permiso) = ${permisosIds.length}
      AND COUNT(DISTINCT rp.id_permiso) = (
          SELECT COUNT(DISTINCT rp2.id_permiso)
          FROM role_permission rp2
          WHERE rp2.id_rol = rp.id_rol
      )
    `;

    const { rows } = await postgresConnection.query(query, permisosIds);

    if (rows.length > 0) {
      console.log('Rol existente con mismos permisos encontrado:', rows[0].id_rol);
      return rows[0].id_rol;
    } else {
      console.log('No se encontró un rol con los mismos permisos.');
      return null;
    }
  } catch (error) {
    throw new Error(`Error verificando rol existente: ${error.message}`);
  }
}
async function crearRolConPermisos(nombreRol, permisosIds) {
  try {
    // Eliminar duplicados del array de permisos
    const permisosUnicos = [...new Set(permisosIds)];

    await postgresConnection.query('BEGIN');

    const insertRolQuery = `INSERT INTO roles (nombre, estado) VALUES ($1, $2) RETURNING id`;
    const { rows: rolRows } = await postgresConnection.query(insertRolQuery, [nombreRol, true]);
    const nuevoRolId = rolRows[0].id;

    // Solo si hay permisos para insertar
    if (permisosUnicos.length > 0) {
      const insertPermisosQuery = `
        INSERT INTO role_permission (id_rol, id_permiso)
        VALUES ${permisosUnicos.map((_, index) => `($1, $${index + 2})`).join(',')}
      `;

      const permisosValues = [nuevoRolId, ...permisosUnicos];
      await postgresConnection.query(insertPermisosQuery, permisosValues);
    }

    await postgresConnection.query('COMMIT');

    console.log(`Rol "${nombreRol}" creado exitosamente con ID ${nuevoRolId}`);
    return nuevoRolId;
  } catch (error) {
    await postgresConnection.query('ROLLBACK');
    throw new Error(`Error creando rol y asignando permisos: ${error.message}`);
  }
}
async function setUsuarioRolId(role_id, user_id) {
  const query = `UPDATE usuario SET rol_id_rol = $1 WHERE id = $2 RETURNING nombre_usuario, rol_id_rol`;

  try {
    const { rows } = await postgresConnection.query(query, [role_id, user_id]);
    console.log('Usuario actualizado:', rows);
  } catch (error) {
    throw new Error(`Error actualizando usuario: ${error.message}`);
  }
}
export async function createRoles() {
  const usuarios = await getUsuariosPostgres();

  for (const usuario of usuarios) {
    console.log('User id: ', usuario.id);
    const privilegiosMysql = await getPrivilegiosMysql(usuario);
    const permisosSet = new Set();

    for (const privi of privilegiosMysql) {
      const par = await getRolePairPostgres(privi);
      if (par.length > 0) {
        par.forEach((p) => {
          permisosSet.add(p.id_permiso);
        });
      }
    }

    // Convertir el Set back a array
    const permisosUnicos = Array.from(permisosSet);

    let idRol = 0;
    const rolExiste = await verificarRolExistente(permisosUnicos);

    if (rolExiste) {
      console.log('Rol ya existe');
      idRol = rolExiste;
    } else {
      console.log('Rol no existe');
      idRol = await crearRolConPermisos(`rol ${usuario.id}`, permisosUnicos);
    }

    await setUsuarioRolId(idRol, usuario.id);
  }
}
