const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const cors = require('cors');
const { poolPromise } = require('./dbConfig');

const app = express();
const port = 3000;

// Configura CORS
app.use(cors({
  origin: '*', // Añade aquí los orígenes permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  
  // Reemplaza con el origen de tu frontend si es diferente
}));

app.use(express.json());
// Configuración del middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint para obtener compañías
app.get('/api/companias', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT conjunto FROM erpadmin.conjunto ORDER BY conjunto');
    res.json(result.recordset); // Devuelve las compañías ordenadas
  } catch (err) {
    console.error('Error al obtener compañías:', err);
    res.status(500).send('Error al obtener las compañías');
  }
});

// Endpoint para obtener proveedores
app.get('/api/proveedores', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT proveedor, nombre FROM base.proveedor ORDER BY proveedor');
    res.json(result.recordset); // Devuelve los proveedores ordenados
  } catch (err) {
    console.error('Error al obtener proveedores:', err);
    res.status(500).send('Error al obtener los proveedores');
  }
});

// Endpoint para obtener Clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT cliente, nombre FROM base.cliente ORDER BY cliente');
    res.json(result.recordset); // Devuelve los proveedores ordenados
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).send('Error al obtener los clientes');
  }
});


// Endpoint para validar NIT, funciona tanto para proveedores como clientes
app.post('/api/validarNIT', async (req, res) => {
  const { compania, contribuyente, tipo } = req.body;

  // Validar si la compañía, contribuyente o tipo se han proporcionado
  if (!compania || !contribuyente || !tipo) {
    return res.status(400).json({ error: 'Compañía, contribuyente o tipo no proporcionados' });
  }

  try {
    const pool = await poolPromise;

    // Determinar la tabla correcta (proveedor o cliente) según el tipo
    let table = '';
    if (tipo === 'proveedor') {
      table = `${compania}.nit`;  // Proveedor usa la tabla nit
    } else if (tipo === 'cliente') {
      table = `${compania}.cliente`;  // Cliente usa la tabla cliente
    } else {
      return res.status(400).json({ error: 'Tipo no válido, debe ser "proveedor" o "cliente"' });
    }

    // Construir la consulta dependiendo del tipo
    const query = `
      SELECT NIT
      FROM ${table}
      WHERE NIT = @contribuyente
    `;

    const result = await pool.request()
      .input('contribuyente', sql.VarChar, contribuyente)  // Asegúrate del tipo de datos correcto
      .query(query);

    if (result.recordset.length > 0) {
      // NIT ya existe
      res.json({ exists: true });
    } else {
      // NIT no existe
      res.json({ exists: false });
    }

  } catch (err) {
    console.error('Error al validar el NIT:', err);

    // Enviar detalles específicos de error en caso de problemas con SQL
    if (err.originalError && err.originalError.info && err.originalError.info.message) {
      return res.status(500).json({ error: `Error de SQL: ${err.originalError.info.message}` });
    }

    res.status(500).send('Error al validar el NIT');
  }
});

// Endpoint para insertar un nuevo NIT
app.post('/api/insertarNIT', async (req, res) => {
  const { compania, contribuyente, tipo } = req.body;

  // Validaciones adicionales para evitar errores
  if (!compania || !contribuyente || !tipo) {
    return res.status(400).json({ error: 'Compañía, contribuyente o tipo no proporcionados' });
  }

  try {
    const pool = await poolPromise;

    // Definir la tabla correcta según el tipo
    let table = '';
    if (tipo === 'proveedor') {
      table = `${compania}.nit`;  // Proveedor usa la tabla nit
    } else if (tipo === 'cliente') {
      table = `${compania}.cliente`;  // Cliente usa la tabla cliente
    } else {
      return res.status(400).json({ error: 'Tipo no válido, debe ser "proveedor" o "cliente"' });
    }

    // Primero validamos si el NIT ya existe
    const checkQuery = `
      SELECT NIT
      FROM ${table}
      WHERE NIT = @contribuyente
    `;
    const checkResult = await pool.request()
      .input('contribuyente', sql.VarChar, contribuyente)  // Asegúrate del tipo de datos correcto
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      // El NIT ya existe, no hacemos el insert
      return res.status(400).json({ error: 'El NIT ya existe.' });
    } else {
      // Insertamos el nuevo NIT desde la tabla base
      const insertQuery = `
        INSERT INTO ${table} (NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO)
        SELECT NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO
        FROM BASE.nit
        WHERE NIT = @contribuyente
      `;
      await pool.request()
        .input('contribuyente', sql.VarChar, contribuyente)  // Asegúrate del tipo de datos correcto
        .query(insertQuery);

      res.status(200).send('NIT insertado correctamente.');
    }

  } catch (err) {
    console.error('Error al insertar NIT:', err);

    // Enviar detalles específicos de error en caso de problemas con SQL
    if (err.originalError && err.originalError.info && err.originalError.info.message) {
      return res.status(500).json({ error: `Error de SQL: ${err.originalError.info.message}` });
    }

    res.status(500).send('Error al insertar NIT.');
  }
});



// Validar Proveedor
app.post('/api/validarProveedor', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;
    
    const query = `
      SELECT contribuyente, proveedor
      FROM ${compania}.proveedor
      WHERE proveedor = @proveedor
    `;

    const result = await pool.request()
      .input('proveedor', proveedor)
      .query(query);

    if (result.recordset.length > 0) {
      // Proveedor existe en la compañía seleccionada
      res.json({ exists: true, contribuyente: result.recordset[0].contribuyente });
    } else {
      // Proveedor no existe
      res.json({ exists: false });
    }

  } catch (err) {
    console.error('Error al validar el proveedor:', err);
    res.status(500).send('Error al validar el proveedor');
  }
});

// Inserta Proveedor Entidad
app.post('/api/insertarProveedorEntidad', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;

    const insertQuery = `
      INSERT INTO ${compania}.PROVEEDOR_ENTIDAD (proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS)
      SELECT proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS
      FROM BASE.PROVEEDOR_ENTIDAD
      WHERE proveedor = @proveedor
    `;

    await pool.request()
      .input('proveedor', proveedor)
      .query(insertQuery);

    res.status(200).send('Entidad del proveedor insertada correctamente.');
  } catch (err) {
    console.error('Error al insertar entidad del proveedor:', err);
    res.status(500).send('Error al insertar entidad del proveedor.');
  }
});

// Inserta Proveedor
app.post('/api/insertarProveedor', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;

    // Insertamos el proveedor
    const insertQuery = `
      INSERT INTO ${compania}.proveedor
      (PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame)
      SELECT PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame
      FROM BASE.PROVEEDOR
      WHERE PROVEEDOR = @proveedor
    `;

    await pool.request()
      .input('proveedor', proveedor)
      .query(insertQuery);

    res.status(200).send('Proveedor insertado correctamente.');
  } catch (err) {
    console.error('Error al insertar proveedor:', err);
    res.status(500).send('Error al insertar proveedor.');
  }
});

// REPLICAR PROVEEDOR
app.post('/api/replicarProveedor', async (req, res) => {
  const { compania, proveedor } = req.body;

  try {
    const pool = await poolPromise;

    // Primero, obtenemos el contribuyente asociado al proveedor desde la base principal
    const contribuyenteQuery = `
      SELECT contribuyente
      FROM BASE.proveedor
      WHERE proveedor = @proveedor
    `;
    const contribuyenteResult = await pool.request()
      .input('proveedor', proveedor)
      .query(contribuyenteQuery);

    if (contribuyenteResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado en la base principal.' });
    }

    const contribuyente = contribuyenteResult.recordset[0].contribuyente;

    // Verificamos si el NIT (contribuyente) existe en la tabla de la compañía seleccionada
    const nitQuery = `
      SELECT NIT
      FROM ${compania}.nit
      WHERE NIT = @contribuyente
    `;
    const nitResult = await pool.request()
      .input('contribuyente', contribuyente)
      .query(nitQuery);

    // Si el NIT no existe, lo insertamos desde la tabla base
    if (nitResult.recordset.length === 0) {
      const insertNitQuery = `
        INSERT INTO ${compania}.nit (NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO)
        SELECT NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO
        FROM BASE.nit
        WHERE NIT = @contribuyente
      `;
      await pool.request()
        .input('contribuyente', contribuyente)
        .query(insertNitQuery);
    }

    // Ahora que el NIT está asegurado, insertamos el proveedor en la tabla de la compañía
    const insertProveedorQuery = `
      INSERT INTO ${compania}.proveedor (PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame)
      SELECT PROVEEDOR, NOMBRE, ALIAS, CONTACTO, CARGO, DIRECCION, E_MAIL, FECHA_INGRESO, FECHA_ULT_MOV, TELEFONO1, TELEFONO2, FAX, ORDEN_MINIMA, DESCUENTO, TASA_INTERES_MORA, LOCAL, CONGELADO, CONTRIBUYENTE, CONDICION_PAGO, MONEDA, PAIS, CATEGORIA_PROVEED, MULTIMONEDA, SALDO, SALDO_LOCAL, SALDO_DOLAR, NOTAS, ACTIVO, AUTORETENEDOR, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, FECHA_HORA_CREACION, IMPUESTO1_INCLUIDO, ACEPTA_DOC_ELECTRONICO, INTERNACIONES, usa_plame
      FROM BASE.proveedor
      WHERE PROVEEDOR = @proveedor
    `;
    await pool.request()
      .input('proveedor', proveedor)
      .query(insertProveedorQuery);

    // Ahora insertamos las entidades financieras del proveedor si existen
    const insertEntidadQuery = `
      INSERT INTO ${compania}.PROVEEDOR_ENTIDAD (proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS)
      SELECT proveedor, entidad_financiera, CUENTA_BANCO, MONEDA, NOTAS
      FROM BASE.PROVEEDOR_ENTIDAD
      WHERE proveedor = @proveedor
    `;
    await pool.request()
      .input('proveedor', proveedor)
      .query(insertEntidadQuery);

    res.status(200).send('Proveedor replicado correctamente.');
  } catch (err) {
    console.error('Error durante la replicación del proveedor:', err);
    res.status(500).send('Error durante la replicación del proveedor.');
  }
});


// Endpoint para validar un cliente

app.post('/api/validarCliente', async (req, res) => {
  const { compania, cliente } = req.body;

  try {
    const pool = await poolPromise;
    
    const query = `
      SELECT contribuyente, CLIENTE
      FROM ${compania}.cliente
      WHERE cliente = @cliente
    `;

    const result = await pool.request()
      .input('cliente', cliente)
      .query(query);

    if (result.recordset.length > 0) {
      // Cliente existe en la compañía seleccionada
      res.json({ exists: true, contribuyente: result.recordset[0].contribuyente });
    } else {
      // Cliente no existe
      res.json({ exists: false });
    }

  } catch (err) {
    console.error('Error al validar el cliente:', err);
    res.status(500).send('Error al validar el cliente');
  }
});


// Endpoint para insertar un cliente
app.post('/api/insertarCliente', async (req, res) => {
  const { compania, cliente } = req.body;

  if (!compania || !cliente) {
    return res.status(400).json({ error: 'Compañía o cliente no proporcionados' });
  }

  try {
    const pool = await poolPromise;
    const checkQuery = `
      SELECT cliente
      FROM ${compania}.cliente
      WHERE cliente = @cliente
    `;
    const checkResult = await pool.request()
      .input('cliente', sql.VarChar, cliente)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'El cliente ya existe.' });
    } else {
      const insertQuery = `
        INSERT INTO ${compania}.cliente
        (cliente, nombre, alias, contacto, cargo, direccion, dir_emb_default, telefono1, telefono2, fax, contribuyente, fecha_ingreso, MULTIMONEDA, moneda, saldo, saldo_local,
        saldo_dolar, saldo_credito, saldo_nocargos, limite_credito, exceder_limite, tasa_interes, tasa_interes_mora, fecha_ult_mora, fecha_ult_mov, condicion_pago, nivel_precio, descuento, moneda_nivel,
        ACEPTA_BACKORDER, PAIS, ZONA, RUTA, VENDEDOR, COBRADOR, ACEPTA_FRACCIONES, ACTIVO, EXENTO_IMPUESTOS, EXENCION_IMP1, EXENCION_IMP2, COBRO_JUDICIAL, CATEGORIA_CLIENTE, CLASE_ABC, DIAS_ABASTECIMIEN,
        USA_TARJETA, E_MAIL, REQUIERE_OC, ES_CORPORACION, REGISTRARDOCSACORP, USAR_DIREMB_CORP, APLICAC_ABIERTAS, VERIF_LIMCRED_CORP, USAR_DESC_CORP, DOC_A_GENERAR, TIENE_CONVENIO, NOTAS,
        DIAS_PROMED_ATRASO, ASOCOBLIGCONTFACT, USAR_PRECIOS_CORP, USAR_EXENCIMP_CORP, AJUSTE_FECHA_COBRO, CLASE_DOCUMENTO, LOCAL, TIPO_CONTRIBUYENTE, ACEPTA_DOC_ELECTRONICO, CONFIRMA_DOC_ELECTRONICO,
        ACEPTA_DOC_EDI, NOTIFICAR_ERROR_EDI, MOROSO, MODIF_NOMB_EN_FAC, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, DETALLAR_KITS)
        SELECT cliente, nombre, alias, contacto, cargo, direccion, dir_emb_default, telefono1, telefono2, fax, contribuyente, fecha_ingreso, MULTIMONEDA, moneda, saldo, saldo_local,
        saldo_dolar, saldo_credito, saldo_nocargos, limite_credito, exceder_limite, tasa_interes, tasa_interes_mora, fecha_ult_mora, fecha_ult_mov, condicion_pago, nivel_precio, descuento, moneda_nivel,
        ACEPTA_BACKORDER, PAIS, ZONA, RUTA, VENDEDOR, COBRADOR, ACEPTA_FRACCIONES, ACTIVO, EXENTO_IMPUESTOS, EXENCION_IMP1, EXENCION_IMP2, COBRO_JUDICIAL, CATEGORIA_CLIENTE, CLASE_ABC, DIAS_ABASTECIMIEN,
        USA_TARJETA, E_MAIL, REQUIERE_OC, ES_CORPORACION, REGISTRARDOCSACORP, USAR_DIREMB_CORP, APLICAC_ABIERTAS, VERIF_LIMCRED_CORP, USAR_DESC_CORP, DOC_A_GENERAR, TIENE_CONVENIO, NOTAS,
        DIAS_PROMED_ATRASO, ASOCOBLIGCONTFACT, USAR_PRECIOS_CORP, USAR_EXENCIMP_CORP, AJUSTE_FECHA_COBRO, CLASE_DOCUMENTO, LOCAL, TIPO_CONTRIBUYENTE, ACEPTA_DOC_ELECTRONICO, CONFIRMA_DOC_ELECTRONICO,
        ACEPTA_DOC_EDI, NOTIFICAR_ERROR_EDI, MOROSO, MODIF_NOMB_EN_FAC, SALDO_TRANS, SALDO_TRANS_LOCAL, SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, DETALLAR_KITS
        FROM BASE.CLIENTE
        WHERE CLIENTE = @cliente
      `;
      await pool.request()
        .input('cliente', sql.VarChar, cliente)
        .query(insertQuery);

      res.status(200).send('Cliente insertado correctamente.');
    }
  } catch (err) {
    console.error('Error al insertar el cliente:', err);
    res.status(500).send('Error al insertar el cliente.');
  }
});


// Endpoint para replicar cliente

app.post('/api/replicarCliente', async (req, res) => {
  const { compania, cliente } = req.body;

  try {
    const pool = await poolPromise;

    // Paso 1: Obtener el contribuyente asociado al cliente desde la base principal
    const contribuyenteQuery = `
      SELECT contribuyente
      FROM BASE.cliente
      WHERE cliente = @cliente
    `;
    console.log('Ejecutando query para obtener contribuyente...');
    const contribuyenteResult = await pool.request()
      .input('cliente', sql.VarChar, cliente)
      .query(contribuyenteQuery);

    if (contribuyenteResult.recordset.length === 0) {
      console.log('Cliente no encontrado en la base principal.');
      return res.status(404).json({ message: 'Cliente no encontrado en la base principal.' });
    }

    const contribuyente = contribuyenteResult.recordset[0].contribuyente;
    console.log('Contribuyente obtenido:', contribuyente);

    // Paso 2: Verificar si el NIT ya existe en la tabla de la compañía seleccionada
    const nitQuery = `
      SELECT NIT
      FROM ${compania}.nit
      WHERE NIT = @contribuyente
    `;
    console.log('Verificando si el NIT ya existe en la compañía...');
    const nitResult = await pool.request()
      .input('contribuyente', sql.VarChar, contribuyente)
      .query(nitQuery);

    // Paso 3: Si el NIT no existe, insertarlo desde la tabla base
    if (nitResult.recordset.length === 0) {
      console.log('NIT no encontrado. Procediendo a insertar en la tabla de la compañía...');
      const insertNitQuery = `
        INSERT INTO ${compania}.nit (NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO)
        SELECT NIT, RAZON_SOCIAL, ALIAS, NOTAS, TIPO, USA_REPORTE_D151, ORIGEN, NUMERO_DOC_NIT, SUCURSAL, EXTERIOR, DIRECCION, NATURALEZA, ACTIVO
        FROM BASE.nit
        WHERE NIT = @contribuyente
      `;
      await pool.request()
        .input('contribuyente', sql.VarChar, contribuyente)
        .query(insertNitQuery);
      console.log('NIT insertado correctamente.');
    } else {
      console.log('NIT ya existe en la compañía.');
    }

    // Paso 4: Insertar el cliente en la tabla de la compañía seleccionada usando el script completo
    const insertClienteQuery = `
      INSERT INTO ${compania}.cliente
        (cliente, nombre, alias, contacto, cargo, direccion, dir_emb_default, telefono1, telefono2, fax, contribuyente, fecha_ingreso, MULTIMONEDA, moneda, saldo, saldo_local,
         saldo_dolar, saldo_credito, saldo_nocargos, limite_credito, exceder_limite, tasa_interes, tasa_interes_mora, fecha_ult_mora, fecha_ult_mov, condicion_pago, nivel_precio,
         descuento, moneda_nivel, ACEPTA_BACKORDER, PAIS, ZONA, RUTA, VENDEDOR, COBRADOR, ACEPTA_FRACCIONES, ACTIVO, EXENTO_IMPUESTOS, EXENCION_IMP1, EXENCION_IMP2, COBRO_JUDICIAL,
         CATEGORIA_CLIENTE, CLASE_ABC, DIAS_ABASTECIMIEN, USA_TARJETA, E_MAIL, REQUIERE_OC, ES_CORPORACION, REGISTRARDOCSACORP, USAR_DIREMB_CORP, APLICAC_ABIERTAS, VERIF_LIMCRED_CORP,
         USAR_DESC_CORP, DOC_A_GENERAR, TIENE_CONVENIO, NOTAS, DIAS_PROMED_ATRASO, ASOCOBLIGCONTFACT, USAR_PRECIOS_CORP, USAR_EXENCIMP_CORP, AJUSTE_FECHA_COBRO, CLASE_DOCUMENTO,
         LOCAL, TIPO_CONTRIBUYENTE, ACEPTA_DOC_ELECTRONICO, CONFIRMA_DOC_ELECTRONICO, ACEPTA_DOC_EDI, NOTIFICAR_ERROR_EDI, MOROSO, MODIF_NOMB_EN_FAC, SALDO_TRANS, SALDO_TRANS_LOCAL,
         SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, DETALLAR_KITS)
      SELECT cliente, nombre, alias, contacto, cargo, direccion, dir_emb_default, telefono1, telefono2, fax, contribuyente, fecha_ingreso, MULTIMONEDA, moneda, saldo, saldo_local,
         saldo_dolar, saldo_credito, saldo_nocargos, limite_credito, exceder_limite, tasa_interes, tasa_interes_mora, fecha_ult_mora, fecha_ult_mov, condicion_pago, nivel_precio,
         descuento, moneda_nivel, ACEPTA_BACKORDER, PAIS, ZONA, RUTA, VENDEDOR, COBRADOR, ACEPTA_FRACCIONES, ACTIVO, EXENTO_IMPUESTOS, EXENCION_IMP1, EXENCION_IMP2, COBRO_JUDICIAL,
         CATEGORIA_CLIENTE, CLASE_ABC, DIAS_ABASTECIMIEN, USA_TARJETA, E_MAIL, REQUIERE_OC, ES_CORPORACION, REGISTRARDOCSACORP, USAR_DIREMB_CORP, APLICAC_ABIERTAS, VERIF_LIMCRED_CORP,
         USAR_DESC_CORP, DOC_A_GENERAR, TIENE_CONVENIO, NOTAS, DIAS_PROMED_ATRASO, ASOCOBLIGCONTFACT, USAR_PRECIOS_CORP, USAR_EXENCIMP_CORP, AJUSTE_FECHA_COBRO, CLASE_DOCUMENTO,
         LOCAL, TIPO_CONTRIBUYENTE, ACEPTA_DOC_ELECTRONICO, CONFIRMA_DOC_ELECTRONICO, ACEPTA_DOC_EDI, NOTIFICAR_ERROR_EDI, MOROSO, MODIF_NOMB_EN_FAC, SALDO_TRANS, SALDO_TRANS_LOCAL,
         SALDO_TRANS_DOLAR, PERMITE_DOC_GP, PARTICIPA_FLUJOCAJA, USUARIO_CREACION, DETALLAR_KITS
      FROM BASE.cliente
      WHERE cliente = @cliente
    `;
    console.log('Insertando cliente en la tabla de la compañía...');
    await pool.request()
      .input('cliente', sql.VarChar, cliente)
      .query(insertClienteQuery);

    console.log('Cliente replicado correctamente.');
    res.status(200).send('Cliente replicado correctamente.');
  } catch (err) {
    console.error('Error durante la replicación del cliente:', err);
    res.status(500).send(`Error durante la replicación del cliente: ${err.message}`);
  }
});


// Endpoint para eliminar un registro de erpadmin.control
app.delete('/api/eliminar-registros', async (req, res) => {
  try {
    const pool = await poolPromise;

    const query = `
      DELETE FROM erpadmin.control
    `;

    await pool.request().query(query);

    res.status(200).send('Todos los usuarios pueden coenctarse.');
  } catch (err) {
    console.error('Error al eliminar los usuarios conectados:', err);
    res.status(500).send('Error al eliminar los usuarios conectados.');
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://192.168.25.225:${port}`);
});
