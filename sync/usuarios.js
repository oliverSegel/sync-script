import { mysqlConnection } from '../db/mysql.js';
import { postgresConnection } from '../db/pgsql.js';
import bcrypt from 'bcrypt';


//DEPRECATED
async function getUsuariosMysql() {
  try {
    const query = 'SELECT * FROM usuarios WHERE estado = 1';
    const [rows] = await mysqlConnection.query(query);
    console.log('Cantidad de usuarios: ', rows.length);

    return rows;
  } catch (error) {
    throw new Error(`Error obteniendo usuarios de MySQL: ${error.message}`);
  }
}
async function insertUser(userSQL) {
  try {
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


    const password = await encriptarPassword(userSQL.nombre);
    let municipalidad;
    if (userSQL.cod_carga_solicitud != 0 && userSQL.cod_carga_solicitud != 1) {
      municipalidad = await getMunicipalidadesPostgres(userSQL.cod_carga_solicitud);
    } else {
      municipalidad = 185;
    }
    const values = [
      true, // activo siempre true
      '', // apellidos
      userSQL.cedula, // cedula
      userSQL.email, // correo
      userSQL.nombre, // nombre_usuario
      userSQL.nombrecompleto, //  nombres
      userSQL.observacion, // observacion
      password, // password
      1, // rol_id_rol - sin privilegios
      new Date().toDateString(), // fecha_cracion
      municipalidad, // municipalidad_id_municipalidad
      userSQL.id // prueba
    ];

    const result = await postgresConnection.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Error insertando municipalidad en Postgres: ${error.message}`);
  }
}

export async function syncUsuarios() {
  let totalSincronizados = 0;
  let errores = [];

  try {
    // Obtener todas las municipalidades de MySQL
    const usuarios = await getUsuariosMysql();
    console.log(`Se encontraron ${usuarios.length} usuarios para sincronizar`);

    for (const user of usuarios) {
      try {
        const resultado = await insertUser(user);
        totalSincronizados++;
        console.log(`Usuario ${user.nombre} (ID: ${resultado.id}) creada exitosamente`);
      } catch (error) {
        errores.push({
          id: user.id,
          nombre: user.nombre,
          error: error.message
        });
        console.error(`Error sincronizando usuario ${user.nombre} (${user.id}):`, error.message);
      }
    }

    // Resumen final
    console.log('\n=== Resumen de Sincronización ===');
    console.log(`Total de usuarios procesadas: ${usuarios.length}`);
    console.log(`Usuarios sincronizadas exitosamente: ${totalSincronizados}`);
    console.log(`Errores encontrados: ${errores.length}`);

    if (errores.length > 0) {
      console.log('\nDetalle de errores:');
      errores.forEach(({ id, nombre, error }) => {
        console.log(`- Usuario ${nombre} (${id}): ${error}`);
      });
    }
  } catch (error) {
    console.error('Error general durante la sincronización:', error.message);
    throw error;
  }
}

async function encriptarPassword(password) {
  const saltRounds = 10; // Número de rondas para generar el salt
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

async function getMunicipalidadesPostgres(municod) {
  try {
    const query = `SELECT id_municipalidad FROM municipalidades WHERE codigo = $1;`;
    const response = await postgresConnection.query(query, [municod]);
    return response.rows[0].id_municipalidad;
  } catch (error) {
    throw new Error(`Error obteniendo municipalidades de Postgres: ${error.message}`);
  }
}
