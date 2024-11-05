
/*-----------------------------------------------------------------------------------------------------------------
  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js

  REST API 
  UADER - IS1
  Caso de estudio MesaAyuda

  Dr. Pedro E. Colla 2023
 *----------------------------------------------------------------------------------------------------------------*/
  console.log("Comenzando servidor");
  const crypto = require('crypto');
  const express = require('express');
  const app = express();
  const PORT = 8080;
  const cors = require('cors');
  app.use(cors());
  
  var AWS = require("aws-sdk");
  /*----
  Acquire critical security resources from an external file out of the path
  */
  const accessKeyId = require('./accessKeyId.js');
  const secretAccessKey = require('./secretAccessKey.js');
  let awsConfig = {
      "region"         : "us-east-1",
      "endpoint"       : "http://dynamodb.us-east-1.amazonaws.com",
      "accessKeyId"    : accessKeyId, 
      "secretAccessKey": secretAccessKey
  };
  
  AWS.config.update(awsConfig);
  
  let docClient = new AWS.DynamoDB.DocumentClient();
  
  app.listen(
      PORT,
      () => console.log(`Servidor listo en http://localhost:${PORT}`)
  );
  
  app.use(express.json());
  
  app.get('/api/cliente', (req,res) => {
      res.status(200).send({response : "OK", message : "API Ready"});
  
  });
  
  /*-----------
  función para hacer el parse de un archivo JSON
  */
  function jsonParser(keyValue,stringValue) {
      var string = JSON.stringify(stringValue);
      var objectValue = JSON.parse(string);
      return objectValue[keyValue];
  }
  /*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
  /*                                                       API REST Cliente                                                            *
  /*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
  
  
  /*-----------
    /api/getCliente
    Esta API permite acceder a un cliente dado su id
  */
  app.post('/api/getCliente/:id', (req,res) => {
      const { id } = req.params;
      console.log("getCliente: id("+id+")");
      var params = {
          TableName: "cliente",
          Key: {
              "id" : id
              //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
               }
          };
      docClient.get(params, function (err, data) {
          if (err)  {
              res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
          } else {
  
              if (Object.keys(data).length != 0) {
                 res.status(200).send(JSON.stringify({"response":"OK","cliente" : data.Item}),null,2);
              } else {
                 res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
              }
          }    
      })
  
  
  } );
  
  /*---
    /api/loginCliente
    Esta API permite acceder a un cliente por ID y comparar la password pasada en un JSON en el cuerpo con la indicada en el DB
  */  
  app.post('/api/loginCliente', (req,res) => {
  
      const { id } = req.body;
      const {password} = req.body;
  
      console.log("loginCliente: id("+id+") password ("+password+")");
  
      if (!password) {
          res.status(400).send({response : "ERROR" , message : "Password no informada"});
          return;
      }    
      if (!id) {
          res.status(400).send({response : "ERROR" , message : "id no informado"});
          return;
      }    
  
      let getClienteByKey = function () {
          var params = {
              TableName: "cliente",
              Key: {
                  "id" : id
              }
          };
          docClient.get(params, function (err, data) {
              if (err) {
                  res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
              }
              else {
                  if (Object.keys(data).length == 0) {
                      res.status(400).send({response : "ERROR" , message : "Cliente invalido"});
                  } else {
                      const paswd=jsonParser('password',data.Item);
                      const activo=jsonParser('activo',data.Item);
                      const id=jsonParser('id',data.Item);
                      const contacto=jsonParser('contacto',data.Item);
                      if (password == paswd) {
                          if (activo == true) {
                              const nombre=jsonParser('nombre',data.Item);
                              const fecha_ultimo_ingreso=jsonParser('fecha_ultimo_ingreso',data.Item);
                              res.status(200).send(JSON.stringify({response : "OK", "id" : id, "nombre" : nombre, "contacto" : contacto, "fecha_ultimo_ingreso": fecha_ultimo_ingreso}));    
                          } else {
                              res.status(400).send(JSON.stringify({response : "ERROR", message : "Cliente no activo"}));    
                          }
                      } else {
                         res.status(400).send(JSON.stringify({response : "ERROR" , message : "usuario incorrecto"}));
                      }    
              }    
              }
          })
      }
      getClienteByKey();
  
  });
  /*---
  /api/loginClienteEmail
  Esta API permite acceder a un cliente por ID y comparar la password pasada en un JSON en el cuerpo con la indicada en el DB
  */  
  app.post('/api/loginClienteEmail', (req, res) => {
    const { contacto, password } = req.body;

    console.log(`Datos recibidos: contacto(${contacto}) password(${password})`);

    // Validación de entrada
    if (!contacto || !password) {
        res.status(400).json({ response: 'ERROR', message: 'Contacto o contraseña no informados' });
        return;
    }

    // Parámetros para realizar un scan en la tabla cliente usando el contacto
    const params = {
        TableName: "cliente",
        FilterExpression: "contacto = :contacto",
        ExpressionAttributeValues: {
            ":contacto": contacto
        }
    };

    // Realiza el scan en DynamoDB
    docClient.scan(params, (err, data) => {
        if (err) {
            console.error("Error de acceso a la base de datos:", err);
            res.status(500).json({ response: 'ERROR', message: 'DB access error' });
            return;
        }

        // Verifica si existe algún cliente con el contacto proporcionado
        if (data.Items.length === 0) {
            res.status(400).json({ response: 'invalid' });
            return;
        }

        const cliente = data.Items[0];

        // Verificación de cliente activo y registrado
        if (!cliente.activo) {
            res.status(400).json({ response: 'invalid' });
            return;
        }

        // Verifica que la contraseña coincida (idealmente usando comparación segura)
        if (cliente.password !== password) {
            res.status(400).json({ response: 'invalid' });
            return;
        }

        // Respuesta de éxito si el cliente es válido
        res.status(200).json({
            response: 'OK',
            id: cliente.id,
            contacto: cliente.contacto,
            nombre: cliente.nombre,
            fecha_ultimo_ingreso: cliente.fecha_ultimo_ingreso
        });
    });
});


// Función para escanear la base de datos buscando por contacto
// async function scanDb(contacto) {
//     const docClient = new AWS.DynamoDB.DocumentClient();
//     const paramsScan = {
//         TableName: "cliente",
//         FilterExpression: 'contacto = :contacto',
//         ExpressionAttributeValues: {
//             ':contacto': contacto
//         }
//     };

//     try {
//         const data = await docClient.scan(paramsScan).promise();
//         return data.Items; // Devuelve los elementos encontrados
//     } catch (err) {
//         throw new Error("Error al escanear la base de datos: " + err);
//     }
// }

async function scanDb(contacto) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey = contacto;
    const paramsScan = { // ScanInput
        TableName: "cliente", // required
        Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
        FilterExpression: 'contacto = :contacto', //Se cambió 'id = :contacto' por 'contacto = :contacto'
        ExpressionAttributeValues: { ':contacto': scanKey }
    };
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
        return data.Items
    });
    return objectPromise;
}



  
  /*---------
  Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
  */
  async function scanDb(contacto) {
      var docClient = new AWS.DynamoDB.DocumentClient();
      const scanKey=contacto;
      const paramsScan = { // ScanInput
        TableName: "cliente", // required
        Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
        FilterExpression : 'id = :contacto',
        ExpressionAttributeValues : {':contacto' : scanKey}
      };      
      var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
            return data.Items 
      });  
      return objectPromise;
  }
  
  /*----
  addCliente
  Revisa si el contacto (e-mail) existe y en caso que no da de alta el cliente generando un id al azar
  */
  app.post('/api/addCliente', (req, res) => {
    const { contacto, password, nombre } = req.body;
    console.log("addCliente: contacto(" + contacto + ") nombre(" + nombre + ") password(" + password + ")");

    if (!password) {
        res.status(400).send({ response: "ERROR", message: "Password no informada" });
        return;
    }
    if (!nombre) {
        res.status(400).send({ response: "ERROR", message: "Nombre no informado" });
        return;
    }
    if (!contacto) {
        res.status(400).send({ response: "ERROR", message: "Contacto no informado" });
        return;
    }

    scanDb(contacto)
        .then(resultDb => {
            if (Object.keys(resultDb).length != 0) {
                res.status(400).send({ response: "ERROR", message: "Cliente ya existe" });
                return;
            } else {
                var hoy = new Date();
                var dd = String(hoy.getDate()).padStart(2, '0');
                var mm = String(hoy.getMonth() + 1).padStart(2, '0'); // January is 0!
                var yyyy = hoy.getFullYear();
                hoy = dd + '/' + mm + '/' + yyyy;

                // Generar un ID aleatorio como cadena
                const id = generateRandomId(); // Función que generará el ID

                const newCliente = {
                    id: id, // Asegúrate de que sea un string
                    contacto: contacto,
                    nombre: nombre,
                    password: password,
                    activo: true,
                    registrado: true,
                    primer_ingreso: false,
                    fecha_alta: hoy,
                    fecha_cambio_password: hoy,
                    fecha_ultimo_ingreso: hoy,
                };

                const paramsPut = {
                    TableName: "cliente",
                    Item: newCliente,
                    ConditionExpression: 'attribute_not_exists(id)',
                };

                docClient.put(paramsPut, function (err, data) {
                    if (err) {
                        res.status(400).send(JSON.stringify({ response: "ERROR", message: "DB error: " + err }));
                    } else {
                        res.status(200).send(JSON.stringify({ response: "OK", "cliente": newCliente }));
                    }
                });
            }
        });
});

// Función para generar un ID aleatorio como cadena
function generateRandomId() {
    return String(Date.now()); // O cualquier lógica que necesites para generar IDs
}




    /**Listar Clientes GET */
    app.get('/api/listCliente', (req,res) => {
        scanDBClients()
        .then(resultDb => {
            console.log(resultDb)
          if (Object.keys(resultDb).length == 0) {
            res.status(400).send({response : "ERROR" , message : "No hay clientes"});
            return;
          } else {
            res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
        }
    
        });
    
    });
    
   async function scanDBClients(){
    try {
        const input = { // ScanInput
            TableName: "cliente", // required
            Select: "SPECIFIC_ATTRIBUTES",
            AttributesToGet: 
                ['id','nombre','contacto','activo','baja','registrado','fecha_alta','fecha_ultimo_ingreso'],
            }
    
            const response = docClient.scan(input).promise().then((data) => {
                return data.Items;
            });
    
            
            return response
    }catch(error){
        console.error(error);
        return null;
    }
   
  };


  /*----------
  /api/updateCliente
  Permite actualizar datos del cliente contacto, nombre, estado de activo y registrado
  */
  app.post('/api/updateCliente', (req,res) => {
      
      const {id} = req.body;
      const {nombre}   = req.body; 
      const {password} = req.body;
  
      var activo = ((req.body.activo+'').toLowerCase() === 'true')
      var registrado = ((req.body.registrado+'').toLowerCase() === 'true')
  
      console.log("updateCliente: id("+id+") nombre("+nombre+") password("+password+") activo("+activo+") registrado("+registrado+")");
  
      if (!id) {
          res.status(400).send({response : "ERROR" , message: "Id no informada"});
          return;
      }
  
      if (!nombre) {
          res.status(400).send({response : "ERROR" , message: "Nombre no informado"});
          return;
      }
  
      if (!password) {
          res.status(400).send({response : "ERROR" , message: "Password no informado"});
          return;
      }
  
      var params = {
          TableName: "cliente",
          Key: {
              "id" : id
              //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
               }
          };
          
      docClient.get(params, function (err, data) {
          if (err)  {
              res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
              return;
          } else {
  
              if (Object.keys(data).length == 0) {
                  res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                  return;
              } else {
  
                  const paramsUpdate = { 
     
                      ExpressionAttributeNames: { 
                           "#a": "activo", 
                           "#n": "nombre",
                           "#p": "password",
                           "#r": "registrado"
  
                      }, 
                      ExpressionAttributeValues: { 
                          ":a": activo , 
                          ":p": password,
                          ":n": nombre , 
                          ":r": registrado 
                     }, 
                     Key: { 
                         "id": id 
                     }, 
                     ReturnValues: "ALL_NEW", 
                     TableName: "cliente", 
                     UpdateExpression: "SET #n = :n, #p = :p, #a = :a, #r = :r" 
                  };
                  docClient.update(paramsUpdate, function (err, data) {
                      if (err)  {
                          res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                          return;
                      } else {
                          res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                      }    
                  });    
              }
          }    
      })
  
  
  });
  /*-------
  /api/resetCliente
  Permite cambiar la password de un cliente
  */
  app.post('/api/resetCliente', (req,res) => {
      
      const {id}       = req.body;
      const {password} = req.body;
   
      if (!id) {
          res.status(400).send({response : "ERROR" , message: "Id no informada"});
          return;
      }
  
      if (!password) {
          res.status(400).send({response : "ERROR" , message: "Password no informada"});
          return;
      }
  
      var params = {
          TableName: "cliente",
          Key: {
              "id" : id
              //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
               }
          };
          
      docClient.get(params, function (err, data) {
          if (err)  {
              res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
              return;
          } else {
  
              if (Object.keys(data).length == 0) {
                  res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                  return;
              } else {
  
                  const paramsUpdate = { 
     
                      ExpressionAttributeNames: { 
                           "#p": "password" 
                      }, 
                      ExpressionAttributeValues: { 
                          ":p": password 
                     }, 
                     Key: { 
                         "id": id 
                     }, 
                     ReturnValues: "ALL_NEW", 
                     TableName: "cliente", 
                     UpdateExpression: "SET #p = :p" 
                  };
                  docClient.update(paramsUpdate, function (err, data) {
                      if (err)  {
                          res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                          return;
                      } else {
                          res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                      }    
                  });    
              }
          }    
      })
  });
  /*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
  /*                                                       API REST ticket                                                             *
  /*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/
  
  /*---------
  Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
  */
  async function scanDbTicket(clienteID) {
      var docClient = new AWS.DynamoDB.DocumentClient();
      const scanKey=clienteID;
      const paramsScan = { // ScanInput
        TableName: "ticket", // required
        Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
        FilterExpression : 'clienteID = :clienteID',
        ExpressionAttributeValues : {':clienteID' : scanKey}
      };      
      var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
            return data.Items 
      });  
      return objectPromise;
  }



  /*LIST TICKET */
  app.get('/api/listTicket', (req, res) => {
    scanDBTickets()
        .then(resultDb => {
            console.log(resultDb);
            if (Object.keys(resultDb).length == 0) {
                res.status(400).send({response: "ERROR", message: "No hay tickets"});
                return;
            } else {
                res.status(200).send(JSON.stringify({response: "OK", "data": resultDb}));
            }
        })
        .catch(err => {
            res.status(500).send({response: "ERROR", message: "Error al listar tickets: " + err});
        });
});
async function scanDBTickets() {
    try {
        const input = {
            TableName: "ticket", // Nombre de la tabla en DynamoDB
            Select: "ALL_ATTRIBUTES", // Esto obtiene todos los atributos de la tabla
        };

        const response = await docClient.scan(input).promise();
        return response.Items;
    } catch (error) {
        console.error(error);
        return null;
    }
}




/*LIST TICKET */



  /*----------
    listarTicket
    API REST para obtener todos los tickets de un clienteID
  */  
  app.post('/api/listarTicket', (req,res) => {
  
      const {clienteID}  = req.body;
      console.log("listarTicket: clienteID("+clienteID+")");
   
      if (!clienteID) {
          res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
          return;
      }
  
      scanDbTicket(clienteID)
      .then(resultDb => {
        if (Object.keys(resultDb).length == 0) {
          res.status(400).send({response : "ERROR" , message : "clienteID no tiene tickets"});
          return;
        } else {
          res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
      }
  
      });
  
  });
  
  /*---------
    getTicket
    API REST para obtener los detalles de un ticket
  */
  app.post('/api/getTicket', (req,res) => {
      const {id}  = req.body;
      console.log("getTicket: id("+id+")");
   
      if (!id) {
          res.status(400).send({response : "ERROR" , message: "ticket id no informada"});
          return;
      }
      var params = {
          TableName: "ticket",
          Key: {
              "id" : id
              //"clienteID": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
              //"id"       : "e08905a8-4aab-45bf-9948-4ba2b8602ced"
          }
      };
      docClient.get(params, function (err, data) {
          if (err) {
              res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
          }
          else {
              if (Object.keys(data).length == 0) {
                  res.status(400).send({response : "ERROR" , message : "ticket invalido"});
              } else {
                  res.status(200).send(JSON.stringify({response : "OK", "data" : data}));    
              }    
          }
      })
  });
  
  /*-----------------
  /api/addTicket
  API REST para agregar ticket (genera id)
  */
  app.post('/api/addTicket', (req,res) => {
  
      const {clienteID} = req.body;
      const estado_solucion = 1;
      const {solucion} = req.body;
      const {descripcion} = req.body;
  
      var hoy = new Date();
      var dd = String(hoy.getDate()).padStart(2, '0');
      var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = hoy.getFullYear();
      hoy = dd + '/' + mm + '/' + yyyy;
  
      const newTicket = {
       id                    : crypto.randomUUID(),
       clienteID             : clienteID,
       estado_solucion       : estado_solucion,
       solucion              : solucion,
       descripcion           : descripcion,
       fecha_apertura        : hoy,
       ultimo_contacto       : hoy
      };
  
      const paramsPut = {
        TableName: "ticket",
        Item: newTicket,
        ConditionExpression:'attribute_not_exists(id)',
      };
  
      docClient.put(paramsPut, function (err, data) {
          if (err) {
              res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error" + err}));
          } else {
              res.status(200).send(JSON.stringify({response : "OK", "ticket": newTicket}));
          }
      });
  }
  )
  
  
  /*--------
  /api/updateTicket
  Dado un id actualiza el ticket, debe informarse la totalidad del ticket excepto ultimo_contacto
  */
  app.post('/api/updateTicket', (req,res) => {
  
      const {id} = req.body;
      const {clienteID} = req.body;
      const {estado_solucion} = req.body;
      const {solucion} = req.body;
      const {descripcion} = req.body;
      const {fecha_apertura} = req.body;
  
      if (!id) {
          res.status(400).send({response : "ERROR" , message: "Id no informada"});
          return;
      }
  
      if (!clienteID) {
          res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
          return;
      }
  
      if (!estado_solucion) {
          res.status(400).send({response : "ERROR" , message: "estado_solucion no informada"});
          return;
      }
  
      if (!solucion) {
          res.status(400).send({response : "ERROR" , message: "solucion no informado"});
          return;
      }
  
      if (!fecha_apertura) {
          res.status(400).send({response : "ERROR" , message: "fecha apertura"});
          return;
      }
      
      var hoy = new Date();
      var dd = String(hoy.getDate()).padStart(2, '0');
      var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = hoy.getFullYear();
      hoy = dd + '/' + mm + '/' + yyyy;
  
      const ultimo_contacto = hoy;
  
      var params = {
          TableName: "ticket",
          Key: {
              "id" : id
              //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
               }
          };
          
      docClient.get(params, function (err, data) {
          if (err)  {
              res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
              return;
          } else {
  
              if (Object.keys(data).length == 0) {
                  res.status(400).send(JSON.stringify({"response":"ERROR",message : "ticket no existe"}),null,2);
                  return;
              } else {
  
                  const paramsUpdate = { 
     
                      ExpressionAttributeNames: { 
                           "#c": "clienteID", 
                           "#e": "estado_solucion",
                           "#s": "solucion",
                           "#a": "fecha_apertura",
                           "#u": "ultimo_contacto",
                           "#d": "descripcion"
                      }, 
                      ExpressionAttributeValues: { 
                          ":c":  clienteID, 
                          ":e":  estado_solucion , 
                          ":s":  solucion , 
                          ":a":  fecha_apertura,
                          ":u":  ultimo_contacto,
                          ":d":  descripcion 
                     }, 
                     Key: { 
                         "id": id 
                     }, 
                     ReturnValues: "ALL_NEW", 
                     TableName: "ticket", 
                     UpdateExpression: "SET #c = :c, #e = :e, #a = :a, #s = :s, #d = :d, #u = :u" 
                  };
                  docClient.update(paramsUpdate, function (err, data) {
                      if (err)  {
                          res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                          return;
                      } else {
                          res.status(200).send(JSON.stringify({response : "OK",  "data": data}));
                      }    
                  });    
              }
          }    
      })

 















      
  
  });





  /*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/
  