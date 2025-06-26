const ManejarError = require('../Utilidades/ErrorControladores');
const { SubirImagenAlmacenamiento } = require("../Servicios/SubirImagenServicio");
const { EliminarImagen } = require("../Servicios/EliminarImagenServicio");
const { ConstruirUrlImagen } = require('../Utilidades/ConstruirUrlImagen');
const { Almacenamiento } = require("../Configuracion/FirebaseConfiguracion");

const Servicios = {
  EmpresaPortada: require("../Servicios/EmpresaPortadaServicio"),
  Navbar: require("../Servicios/NavbarServicio"),
  Footer: require("../Servicios/FooterServicio"),
  Carrusel: require("../Servicios/CarruselServicio"),
  CarruselImagen: require("../Servicios/CarruselImagenServicio"),
  ClasificacionProducto: require("../Servicios/ClasificacionProductoServicio"),
  RedSocial: require("../Servicios/RedSocialServicio"),
  Otro: require("../Servicios/OtroServicio"),
  ContactanosPortada: require("../Servicios/ContactanosPortadaServicio"),
  Producto: require("../Servicios/ProductoServicio"),
  ProductoPortada: require("../Servicios/ProductoPortadaServicio"),
  CarritoPortada: require("../Servicios/CarritoPortadaServicio"),
  MenuPortada: require("../Servicios/MenuPortadaServicio"),
  LogoImagen: require("../Servicios/LogoImagenServicio"),
  LoginPortada: require("../Servicios/LoginPortadaServicio"),
  RedSocialImagen: require("../Servicios/RedSocialImagenServicio"),
};

const SubirImagen = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ Error: "No se envió ninguna imagen" });
    }

    const {
      CarpetaPrincipal,
      SubCarpeta,
      CodigoVinculado,
      CodigoPropio,
      CampoVinculado,
      CampoPropio,
      NombreCampoImagen,
    } = req.body;

    if (!CarpetaPrincipal || !SubCarpeta) {
      return res.status(400).json({ Error: "Las carpetas son obligatorias" });
    }

    const Servicio = Servicios[SubCarpeta];
    if (!Servicio) {
      return res.status(400).json({ Error: `No hay servicio para la carpeta ${SubCarpeta}` });
    }

    // === VERIFICACIÓN DE ARCHIVOS EXISTENTES ===
    const [archivos] = await Almacenamiento.getFiles({
      prefix: `${CarpetaPrincipal}/`
    });


    // === VERIFICACIÓN DE ESPACIO (siempre aplica) ===
    let totalBytes = 0;
    for (const archivo of archivos) {
      const [metadata] = await archivo.getMetadata();
      totalBytes += Number(metadata.size || 0);
    }

    // totalBytes >= 500 * 1024                  KB
    // totalBytes >= 500 * 1024 * 1024           MB
    // totalBytes >= 500 * 1024 * 1024 * 1024    GB
    if (totalBytes >= 950 * 1024 * 1024) {
      return res.status(400).json({
        Alerta: "El límite de almacenamiento ha sido alcanzado. No se puede subir más imágenes."
      });
    }

    // === VERIFICACIÓN DE CANTIDAD (solo si agregas nueva imagen) ===
    let CuentaComoNuevaImagen = false;

    if (!CodigoPropio && CodigoVinculado) {
      CuentaComoNuevaImagen = true; // creación vinculada
    } else if (CodigoPropio) {
      const EntidadExistente = await Servicio.ObtenerPorCodigo(CodigoPropio);

      if (!EntidadExistente) {
        return res.status(400).json({ Alerta: "No se encontró el registro a editar, se alcanzó el límite máximo de imágenes permitidas" });
      }

      const ImagenActual = EntidadExistente[NombreCampoImagen];

      if (!ImagenActual || ImagenActual.trim() === '') {
        CuentaComoNuevaImagen = true; // edición de registro sin imagen → cuenta como nueva
      }
      // Si ya tiene imagen → estás reemplazando, no cuenta como nueva
    } else {
      CuentaComoNuevaImagen = true; // creación sin códigos
    }

    if (CuentaComoNuevaImagen && archivos.length >= 250) {
      return res.status(400).json({
        Alerta: "Se alcanzó el límite máximo de imágenes permitidas"
      });
    }

    // === VERIFICACIÓN DE ARCHIVO SUBIDO ===
    if (!req.file) {
      return res.status(400).json({
        Alerta: "Debes subir una imagen para continuar."
      });
    }
    // === SUBIDA DE IMAGEN Y ACTUALIZACIÓN ===

    let Entidad = {};
    let Datos = {};

    const RutaRelativa = await SubirImagenAlmacenamiento(req.file, CarpetaPrincipal, SubCarpeta);
    const UrlPublica = `${process.env.URL_PUBLICA_FIREBASE}${RutaRelativa}`;

    if (CodigoVinculado && !CodigoPropio) {
      Datos[CampoVinculado] = CodigoVinculado;
      Datos[NombreCampoImagen] = RutaRelativa;
      Entidad = await Servicio.Crear(Datos);
    } else if (!CodigoVinculado && CodigoPropio) {
      Datos[CampoPropio] = CodigoPropio;
      const EntidadExistente = await Servicio.ObtenerPorCodigo(CodigoPropio);

      if (EntidadExistente && EntidadExistente[NombreCampoImagen]) {
        await EliminarImagen(`${process.env.URL_PUBLICA_FIREBASE}${EntidadExistente[NombreCampoImagen]}`);
      }

      Datos[NombreCampoImagen] = RutaRelativa;
      Entidad = await Servicio.Editar(CodigoPropio, Datos);
    } else if (CodigoVinculado && CodigoPropio) {
      Datos[CampoVinculado] = CodigoVinculado;
      Datos[CampoPropio] = CodigoPropio;

      const EntidadExistente = await Servicio.ObtenerPorCodigo(CodigoPropio);

      if (EntidadExistente && EntidadExistente[NombreCampoImagen]) {
        await EliminarImagen(`${process.env.URL_PUBLICA_FIREBASE}${EntidadExistente[NombreCampoImagen]}`);
      }

      Datos[NombreCampoImagen] = RutaRelativa;
      Entidad = await Servicio.Editar(CodigoPropio, Datos);
    } else {
      Datos[NombreCampoImagen] = RutaRelativa;
      Entidad = await Servicio.Crear(Datos);
    }

    if (Entidad && Entidad[NombreCampoImagen]) {
      Entidad[NombreCampoImagen] = ConstruirUrlImagen(Entidad[NombreCampoImagen]);
    }

    return res.status(201).json({
      Mensaje: `${SubCarpeta} procesado con éxito`,
      Entidad,
      UrlImagenPublica: UrlPublica
    });
  } catch (error) {
    return ManejarError(error, res, "Error al procesar la imagen");
  }
};

module.exports = { SubirImagen };
