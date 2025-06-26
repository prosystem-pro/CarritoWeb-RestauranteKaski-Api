const Analizador = require('body-parser');

const CuerpoUrlCodificado = Analizador.urlencoded({ extended: true });

module.exports = CuerpoUrlCodificado;
