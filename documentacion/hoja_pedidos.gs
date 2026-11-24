// Google Apps Script de la hoja "Hoja de calculo" (Extensiones > Apps Script).
// Recibe de la web todos los pedidos y anade una fila por figura.
// El coste solo cuenta si el pedido esta Completado o Entregado. Si no, el coste es 0.
// Columnas: A Id figura, B Id pedido, C Cliente, D Fecha, E Figura, F Precio, G Coste, H Beneficio,
//           I Pedido web (codigo visible), J Referencia interna (oculta), K Estado, L Pagado (casilla).
// Beneficio: si esta pagado precio - coste. Si no esta pagado 0 - coste, es decir negativo.
// Si un pedido se borra o deja de estar completado, se quitan sus filas.
// Los pedidos Cancelado no suman en los totales de precio.
// Abajo siempre hay unas filas de totales que se recalculan solas.
// Antes de publicar: Configuracion del proyecto > Propiedades del script > SECRET = una clave larga.

var HOJA = 'Hoja 1';
var MARCAS = ['TOTAL', 'COBRADO', 'POR COBRAR'];

// Coste de hacer cada figura (euros). La clave es el nombre de la figura sin tildes y en minusculas.
var ESTADOS_CON_COSTE = ['Completado', 'Entregado'];
var COSTES = { 'reno': 0.18, 'estrella': 0.16, 'arbol': 0.14, 'galleta': 0.16, 'oso': 0.19 };

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function costeDe(figura) {
  var n = normalizar(figura);
  for (var clave in COSTES) { if (n.indexOf(clave) !== -1) return COSTES[clave]; }
  return '';
}

// Coste de una figura segun el estado del pedido: 0 si todavia no se ha hecho.
function costeSegunEstado(estado, figura) {
  return ESTADOS_CON_COSTE.indexOf(estado) !== -1 ? costeDe(figura) : 0;
}

// Pone estado y coste a las filas de un pedido ya existente en la hoja.
function aplicarEstado(hoja, valores, ref, estado) {
  var n = 0;
  for (var s = 1; s < valores.length; s++) {
    if (String(valores[s][9] || '') === ref) {
      hoja.getRange(s + 1, 11).setValue(estado || '');
      hoja.getRange(s + 1, 7).setValue(costeSegunEstado(estado, valores[s][4]));
      n++;
    }
  }
  return n;
}

function quitarTotales(hoja) {
  var col = hoja.getRange(1, 1, Math.max(hoja.getLastRow(), 1), 1).getValues();
  for (var r = col.length - 1; r >= 1; r--) {
    if (MARCAS.indexOf(String(col[r][0])) !== -1) hoja.deleteRow(r + 1);
  }
}

function ponerTotales(hoja) {
  var u = hoja.getLastRow();
  if (u < 2) return;
  var t = u + 1;
  var rangoL = 'L2:L' + u, rangoF = 'F2:F' + u;
  hoja.getRange(t, 1, 3, 12).clearContent().clearDataValidations();
  hoja.getRange(t, 1).setValue('TOTAL');
  hoja.getRange(t, 5).setFormula('=COUNTA(E2:E' + u + ')&" figuras"');
  hoja.getRange(t, 6).setFormula('=SUMIF(K2:K' + u + ';"<>Cancelado";' + rangoF + ')');
  hoja.getRange(t, 7).setFormula('=SUM(G2:G' + u + ')');
  hoja.getRange(t, 8).setFormula('=SUM(H2:H' + u + ')');
  hoja.getRange(t + 1, 1).setValue('COBRADO');
  hoja.getRange(t + 1, 6).setFormula('=SUMIF(' + rangoL + ';TRUE;' + rangoF + ')');
  hoja.getRange(t + 2, 1).setValue('POR COBRAR');
  hoja.getRange(t + 2, 6).setFormula('=SUMIFS(' + rangoF + ';' + rangoL + ';FALSE;K2:K' + u + ';"<>Cancelado")');
  var caja = hoja.getRange(t, 1, 3, 12);
  caja.setBackground('#e5e7eb').setFontWeight('bold').setFontColor('#1f2937').setFontSize(10);
  hoja.getRange(t, 1, 1, 12).setBorder(true, null, null, null, null, null, '#1f2937', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  hoja.getRange(t, 6, 3, 3).setNumberFormat('#,##0.00 [$€]').setHorizontalAlignment('right');
  hoja.getRange(t, 1, 3, 1).setHorizontalAlignment('left');
}

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
    quitarTotales(hoja);
    var valores = hoja.getDataRange().getValues();
    if (datos.accion === 'borrar') {
      var borradas = 0;
      for (var r = valores.length - 1; r >= 1; r--) {
        if (datos.pedido_ref && String(valores[r][9] || '') === datos.pedido_ref) { hoja.deleteRow(r + 1); borradas++; }
      }
      ponerTotales(hoja);
      return ContentService.createTextOutput('borradas ' + borradas);
    }
    if (datos.accion === 'estado') {
      var cambiadas = aplicarEstado(hoja, valores, datos.pedido_ref, datos.estado);
      ponerTotales(hoja);
      return ContentService.createTextOutput('estado ' + cambiadas);
    }
    if (datos.pedido_ref) {
      for (var k = 1; k < valores.length; k++) {
        if (String(valores[k][9] || '') === datos.pedido_ref) {
          var hechas = aplicarEstado(hoja, valores, datos.pedido_ref, datos.estado);
          ponerTotales(hoja);
          return ContentService.createTextOutput('actualizado ' + hechas);
        }
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
      hoja.getRange(fila, 1, 1, 7).setValues([[idFigura, idPedido, datos.cliente, datos.fecha, fig.figura, fig.precio, costeSegunEstado(datos.estado, fig.figura)]]);
      hoja.getRange(fila, 9, 1, 3).setValues([[datos.etiqueta || '', datos.pedido_ref || '', datos.estado || '']]);
      hoja.getRange(fila, 12).insertCheckboxes();
      // Ojo: la hoja esta en espanol, por eso las formulas usan ; en vez de ,
      hoja.getRange(fila, 8).setFormula('=IF(ISNUMBER(G' + fila + ');IF(L' + fila + ';F' + fila + '-G' + fila + ';-G' + fila + ');"")');
    });
    ponerTotales(hoja);
    return ContentService.createTextOutput('ok ' + idPedido);
  } finally {
    lock.releaseLock();
  }
}

// Da estilo a la hoja. Se ejecuta a mano (Ejecutar > darFormato). Las filas nuevas heredan el estilo.
// Coste en rojo. Beneficio en verde si es mayor que el coste, en naranja si es menor o igual, en rojo si es negativo.
function darFormato() {
  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA);
  var filas = 1000;
  var cols = 12;
  hoja.getRange('I1:L1').setValues([['Pedido web', 'Referencia interna', 'Estado', 'Pagado']]);
  hoja.getRange(1, 1, filas, cols).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle').setFontColor('#1f2937').setBackground(null);
  hoja.getRange('A1:L1').setBackground('#1f2937').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center').setFontSize(11);
  hoja.setRowHeight(1, 34);
  hoja.setFrozenRows(1);
  hoja.getRange('A2:B' + filas).setHorizontalAlignment('center');
  hoja.getRange('E2:E' + filas).setHorizontalAlignment('center');
  hoja.getRange('F2:H' + filas).setNumberFormat('#,##0.00 [$€]').setHorizontalAlignment('right');
  hoja.getRange('I2:I' + filas).setHorizontalAlignment('left').setFontSize(9);
  hoja.getRange('J2:J' + filas).setFontColor('#9ca3af').setFontSize(8);
  hoja.getRange('K2:L' + filas).setHorizontalAlignment('center');
  hoja.getRange('G2:G' + filas).setFontColor('#b91c1c').setFontWeight('bold').setBackground('#fee2e2');
  hoja.getRange('H2:H' + filas).setFontWeight('bold');
  hoja.hideColumns(10);
  [95, 95, 220, 135, 110, 135, 135, 190, 230, 100, 110, 80].forEach(function (w, i) { hoja.setColumnWidth(i + 1, w); });
  hoja.getBandings().forEach(function (b) { b.remove(); });
  var banda = hoja.getRange(2, 1, filas - 1, 5).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  banda.setFirstRowColor('#ffffff').setSecondRowColor('#f3f4f6');
  hoja.getRange(1, 1, filas, cols).setBorder(null, null, null, null, null, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
  var rangoH = [hoja.getRange('H2:H' + filas)];
  var rangoK = [hoja.getRange('K2:K' + filas)];
  hoja.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER($H2);$H2<0)').setBackground('#fecaca').setFontColor('#991b1b').setRanges(rangoH).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER($H2);ISNUMBER($G2);$H2>$G2)').setBackground('#dcfce7').setFontColor('#15803d').setRanges(rangoH).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER($H2);ISNUMBER($G2);$H2<=$G2)').setBackground('#fef3c7').setFontColor('#b45309').setRanges(rangoH).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Completado').setBackground('#dbeafe').setFontColor('#1d4ed8').setRanges(rangoK).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Entregado').setBackground('#dcfce7').setFontColor('#15803d').setRanges(rangoK).build()
  ]);
  if (hoja.getFilter()) hoja.getFilter().remove();
  hoja.getRange(1, 1, 200, cols).createFilter();
  hoja.setHiddenGridlines(true);
}
