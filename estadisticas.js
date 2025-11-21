import { Inventario, Estadisticas, UsuarioSesion, Producto } from './poo/modelos.js';

class VistaEstadisticas {
  constructor() {
    this.sesion = new UsuarioSesion();
    if (!this.sesion.estaLogueado()) {
      alert('Debes iniciar sesión para ver las estadísticas.');
      location.href = 'login.html';
      return;
    }

    this.inventario = new Inventario(this.sesion.usuarioActivo);
    this.estadisticas = new Estadisticas(this.sesion.usuarioActivo);

    this.resumenTotales = document.getElementById('resumenTotales');
    this.tablaBody = document.querySelector('#tablaProductos tbody');

    this.chartTopProductos = null;
    this.chartCategorias = null;
    this.chartIngresos = null;
    this.chartPromedios = null;

    this.init();
  }

  init() {
    document.getElementById('volverBtn').addEventListener('click', () => location.href = 'index.html');
    document.getElementById('exportarCSVBtn').addEventListener('click', () => this.exportarCSV());
    this.renderizarTodo();
  }

  obtenerDatosCompletos() {

    const productos = this.inventario.obtenerTodos()
      .map(p => Object.assign(new Producto(), p));

    const registros = this.estadisticas.obtenerRegistros().map(r => ({
      clave: r.clave,
      datos: r.datos.map(p => Object.assign(new Producto(), p))
    }));

    return { productos, registros };
  }

  renderizarTodo() {
    const { productos, registros } = this.obtenerDatosCompletos();

    const totales = this.inventario.calcularTotales();
    this.resumenTotales.innerHTML = `
      <p><strong>Costo total:</strong> $${totales.costoTotal}</p>
      <p><strong>Venta esperada:</strong> $${totales.ventaEsperada}</p>
      <p><strong>Ingreso real:</strong> $${totales.ingresoReal}</p>
      <p><strong>Ganancia real:</strong> $${totales.gananciaReal}</p>
    `;

    const acumuladoPorProducto = {};
    productos.forEach(p => {
      acumuladoPorProducto[p.nombre] = (acumuladoPorProducto[p.nombre] || 0) + (p.vendido || 0);
    });

    registros.forEach(r => {
      r.datos.forEach(p => {
        acumuladoPorProducto[p.nombre] = (acumuladoPorProducto[p.nombre] || 0) + (p.vendido || 0);
      });
    });

    const topEntries = Object.entries(acumuladoPorProducto)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 10);

    const topLabels = topEntries.map(e => e[0]);
    const topValues = topEntries.map(e => e[1]);
    this._dibujarGraficoBarras('chartTopProductos', topLabels, topValues, 'Unidades vendidas');

    const categoriasMap = {};
    productos.forEach(p => {
      categoriasMap[p.categoria] = categoriasMap[p.categoria] || 0;
      categoriasMap[p.categoria] += (p.vendido || 0);
    });

    registros.forEach(r => {
      r.datos.forEach(p => {
        categoriasMap[p.categoria] = categoriasMap[p.categoria] || 0;
        categoriasMap[p.categoria] += (p.vendido || 0);
      });
    });

    const catLabels = Object.keys(categoriasMap);
    const catValues = Object.values(categoriasMap);
    this._dibujarGraficoDona('chartCategorias', catLabels, catValues);

    const ingresoReal = totales.ingresoReal;
    const ventaEsperada = totales.ventaEsperada;
    this._dibujarGraficoDona('chartIngresos', ['Ingreso real','Venta esperada'], [ingresoReal, ventaEsperada]);

    const resumenPromedios = this.estadisticas.calcularPromedios();
    const promLabels = Object.keys(resumenPromedios);
    const promValues = promLabels.map(k => (resumenPromedios[k].total / resumenPromedios[k].sesiones).toFixed(2));
    this._dibujarGraficoBarras('chartPromedios', promLabels, promValues, 'Promedio unidades');

    this._llenarTabla(productos, acumuladoPorProducto);
  }


  _dibujarGraficoBarras(canvasId, labels, data, labelDataset='') {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (this[canvasId]) {
      try { this[canvasId].destroy(); } catch (e) {}
    }
    this[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: labelDataset, data }]
      },
      options: { responsive: true }
    });
  }

  _dibujarGraficoDona(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (this[canvasId]) {
      try { this[canvasId].destroy(); } catch (e) {}
    }
    this[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data }] },
      options: { responsive: true }
    });
  }

  _llenarTabla(productos, acumuladoPorProducto) {
    this.tablaBody.innerHTML = '';
    productos.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.nombre}</td>
        <td>${p.categoria}</td>
        <td>${p.stock}</td>
        <td>${acumuladoPorProducto[p.nombre] || 0}</td>
        <td>$${p.precioVenta}</td>
        <td>$${p.calcularGananciaTotal()}</td>
      `;
      this.tablaBody.appendChild(tr);
    });
  }

  exportarCSV() {
    const { productos } = this.obtenerDatosCompletos();
    let csv = 'Nombre,Categoría,Stock,Vendidos,PrecioVenta,GananciaTotal\n';
    productos.forEach(p => {
      const vendidos = p.vendido || 0;
      csv += `${p.nombre},${p.categoria},${p.stock},${vendidos},${p.precioVenta},${p.calcularGananciaTotal()}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'estadisticas_productos.csv';
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VistaEstadisticas();
});
