// Google Apps Script de la hoja "Hoja de calculo" (Extensiones > Apps Script).
// Recibe los pedidos nuevos de la web y anade una fila por cada figura.
// Antes de publicar: Configuracion del proyecto > Propiedades del script > SECRET = una clave larga.

var HOJA = 'Hoja 1';

function doPost(e) {
  var datos = JSON.parse(e.postData.contents);
  var secreto = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secreto || datos.secret !== secreto) {
    return ContentService.createTextOutput('no autorizado');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA);
    var valores = hoja.getDataRange().getValues();
    // Numero de pedido: el mayor P### que haya + 1
    var maxPedido = 0;
    var contadores = {};
    for (var i = 1; i < valores.length; i++) {
      var p = String(valores[i][1] || '');
      var m = p.match(/^P(\d+)$/);
      if (m) maxPedido = Math.max(maxPedido, parseInt(m[1], 10));
      var f = String(valores[i][0] || '');
      var mf = f.match(/^([A-Z])(\d+)$/);
      if (mf) contadores[mf[1]] = Math.max(contadores[mf[1]] || 0, parseInt(mf[2], 10));
    }
    var idPedido = 'P' + ('000' + (maxPedido + 1)).slice(-3);
    datos.figuras.forEach(function (fig) {
      var letra = String(fig.figura).charAt(0).toUpperCase();
      contadores[letra] = (contadores[letra] || 0) + 1;
      var idFigura = letra + ('000' + contadores[letra]).slice(-3);
      var fila = hoja.getLastRow() + 1;
      hoja.getRange(fila, 1, 1, 7).setValues([[idFigura, idPedido, datos.cliente, datos.fecha, fig.figura, fig.precio, '']]);
      hoja.getRange(fila, 8).setFormula('=IF(G' + fila + '="","",F' + fila + '-G' + fila + ')');
    });
    return ContentService.createTextOutput('ok ' + idPedido);
  } finally {
    lock.releaseLock();
  }
}
