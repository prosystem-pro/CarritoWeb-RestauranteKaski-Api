const Express = require('express');
const Router = Express.Router();
const Modelo = 'reporteredsocial';
const Tabla = 'ReporteRedSocial'
const { Listado, ObtenerPorCodigo, Buscar, Crear, Editar, Eliminar, ObtenerResumen } = require('../Controladores/ReporteRedSocialControlador');
const VerificarToken = require('../FuncionIntermedia/VerificarToken');
const VerificarPermisos = require('../FuncionIntermedia/VerificarPermisos'); 

Router.get(`/${Modelo}/listado`, Listado);
Router.get(`/${Modelo}/obtenerresumen/:anio?/:mes?`, VerificarToken, VerificarPermisos('Ver', Tabla), ObtenerResumen);
Router.get(`/${Modelo}/:Codigo`,VerificarToken,VerificarPermisos('Ver',Tabla), ObtenerPorCodigo);
Router.get(`/${Modelo}/buscar/:TipoBusqueda/:ValorBusqueda`,VerificarToken,VerificarPermisos('Buscar',Tabla), Buscar);
Router.post(`/${Modelo}/crear`,Crear);
Router.put(`/${Modelo}/editar/:Codigo`, VerificarToken,VerificarPermisos('Editar',Tabla), Editar);
Router.delete(`/${Modelo}/eliminar/:Codigo`, VerificarToken,VerificarPermisos('Eliminar',Tabla),  Eliminar);


module.exports = Router;