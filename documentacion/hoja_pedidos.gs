// Google Apps Script de la hoja "Hoja de calculo" (Extensiones > Apps Script).
// Recibe de la web los pedidos Completado o Entregado y anade una fila por figura.
// Si un pedido se borra o deja de estar completado, quita sus filas (columna I = referencia).
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
    if (datos.accion === 'borrar') {
      var borradas = 0;
      for (var r = valores.length - 1; r >= 1; r--) {
        if (datos.pedido_ref && String(valores[r][8] || '') === datos.pedido_ref) { hoja.deleteRow(r + 1); borradas++; }
      }
      return ContentService.createTextOutput('borradas ' + borradas);
    }
    if (datos.pedido_ref) {
      for (var k = 1; k < valores.length; k++) {
        if (String(valores[k][8] || '') === datos.pedido_ref) return ContentService.createTextOutput('ya existe');
      }
    }
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
      hoja.getRange(fila, 9).setValue(datos.pedido_ref || '');
      // Ojo: la hoja esta en espanol, por eso la formula usa ; en vez de ,
      hoja.getRange(fila, 8).setFormula('=IF(ISNUMBER(G' + fila + ');F' + fila + '-G' + fila + ';"")');
    });
    return ContentService.createTextOutput('ok ' + idPedido);
  } finally {
    lock.releaseLock();
  }
}

// Da estilo a la hoja. Se ejecuta a mano una vez (Ejecutar > darFormato). Las filas nuevas heredan el estilo.
function darFormato() {
  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA);
  var filas = 1000;
  hoja.getRange('I1').setValue('Referencia web');
  hoja.getRange(1, 1, filas, 9).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle').setFontColor('#1f2937');
  hoja.getRange('A1:I1').setBackground('#7a1c24').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);
  hoja.setRowHeight(1, 34);
  hoja.setFrozenRows(1);
  hoja.getRange('A2:B' + filas).setHorizontalAlignment('center');
  hoja.getRange('E2:E' + filas).setHorizontalAlignment('center');
  hoja.getRange('F2:H' + filas).setNumberFormat('#,##0.00 [$€]').setHorizontalAlignment('right');
  hoja.getRange('I2:I' + filas).setFontColor('#9ca3af').setFontSize(8);
  hoja.getRange('H2:H' + filas).setFontWeight('bold');
  [95, 95, 220, 135, 110, 135, 135, 175, 125].forEach(function (w, i) { hoja.setColumnWidth(i + 1, w); });
  hoja.getBandings().forEach(function (b) { b.remove(); });
  var banda = hoja.getRange(2, 1, filas - 1, 9).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  banda.setFirstRowColor('#ffffff').setSecondRowColor('#fbeeee');
  hoja.getRange(1, 1, filas, 9).setBorder(null, null, null, null, null, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
  hoja.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#15803d').setRanges([hoja.getRange('H2:H' + filas)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor('#b91c1c').setRanges([hoja.getRange('H2:H' + filas)]).build()
  ]);
  if (hoja.getFilter()) hoja.getFilter().remove();
  hoja.getRange(1, 1, 200, 9).createFilter();
  hoja.setHiddenGridlines(true);
}
