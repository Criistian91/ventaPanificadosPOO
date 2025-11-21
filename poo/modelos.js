// =====================
// MODELOS - PROGRAMACIÓN ORIENTADA A OBJETOS
// =====================

// --------------------------------------------------
// 1) Clase Producto
// --------------------------------------------------
export class Producto {
    constructor(id, nombre, categoria, precioCosto, precioVenta, stockInicial, stock, vendido = 0) {
        this.id = id;
        this.nombre = nombre;
        this.categoria = categoria;
        this.precioCosto = precioCosto;
        this.precioVenta = precioVenta;
        this.stockInicial = stockInicial;
        this.stock = stock;
        this.vendido = vendido;
    }

    calcularGananciaUnidad() {
        return this.precioVenta - this.precioCosto;
    }

    calcularGananciaTotal() {
        return this.vendido * this.calcularGananciaUnidad();
    }

    calcularIngresoEsperado() {
        return this.stockInicial * this.precioVenta;
    }

    disminuirStock() {
        if (this.stock <= 0) return false;
        this.stock--;
        this.vendido++;
        return true;
    }

    aumentarStock(cantidad) {
        this.stock += cantidad;
        this.stockInicial += cantidad;
    }

    registrarVenta() {
        return this.disminuirStock();
    }

    devolverVenta() {
        if (this.vendido <= 0) return false;
        this.vendido--;
        this.stock++;
        return true;
    }

    reiniciarVendidos() {
        this.vendido = 0;
    }
}



// --------------------------------------------------
// 2) Clase Inventario (maneja todos los productos)
// --------------------------------------------------
export class Inventario {
    constructor(usuarioActivo) {
        this.clave = `productos_${usuarioActivo}`;
        this.productos = this.cargar();
    }

    cargar() {
        const guardados = JSON.parse(localStorage.getItem(this.clave)) || [];

        // 🔥 CONVERSIÓN OBLIGATORIA → Producto
        return guardados.map(p => Object.assign(new Producto(), p));
    }

    guardar() {
        localStorage.setItem(this.clave, JSON.stringify(this.productos));
    }

    obtenerTodos() {
        return this.productos;
    }

    buscarPorId(id) {
        return this.productos.find(p => p.id === id);
    }

    agregarProducto(producto) {
        this.productos.push(producto);
        this.guardar();
    }

    eliminarProducto(id) {
        this.productos = this.productos.filter(p => p.id !== id);
        this.guardar();
    }

    registrarVenta(id) {
        const prod = this.buscarPorId(id);
        if (prod && prod.registrarVenta()) {
            this.guardar();
            return true;
        }
        return false;
    }

    devolverVenta(id) {
        const prod = this.buscarPorId(id);
        if (prod && prod.devolverVenta()) {
            this.guardar();
            return true;
        }
        return false;
    }

    sumarStock(id, cantidad) {
        const prod = this.buscarPorId(id);
        if (!prod) return false;
        prod.aumentarStock(cantidad);
        this.guardar();
    }

    calcularTotales() {
        let costoTotal = 0;
        let ventaEsperada = 0;
        let ingresoReal = 0;
        let gananciaReal = 0;

        this.productos.forEach(p => {

            // 🔥 IMPORTANTE: p SIEMPRE ES INSTANCIA PROPER YA CONVERTIDA ARRIBA

            costoTotal += p.stockInicial * p.precioCosto;
            ventaEsperada += p.calcularIngresoEsperado();
            ingresoReal += p.vendido * p.precioVenta;
            gananciaReal += p.calcularGananciaTotal();
        });

        return { costoTotal, ventaEsperada, ingresoReal, gananciaReal };
    }
}



// -----------------------------
// 3) UsuarioSesion
// -----------------------------
export class UsuarioSesion {
    constructor() {
        this.usuarioActivo = localStorage.getItem("usuarioActivo") || null;
        this._claveUltimaActividad = "ultimaActividad";
        this._monitorId = null;
        this._listenersAct = [];
    }

    login(usuario, password) {
        const usuariosValidos = {
            "admin": "1234",
            "vendedor": "1234"
        };

        if (usuariosValidos[usuario] === password) {
            localStorage.setItem("usuarioActivo", usuario);
            const ahora = Date.now();
            localStorage.setItem(this._claveUltimaActividad, String(ahora));
            this.usuarioActivo = usuario;
            return true;
        }
        return false;
    }

    cerrarSesion() {
        this.detenerMonitor();
        localStorage.removeItem("usuarioActivo");
        localStorage.removeItem(this._claveUltimaActividad);
        location.href = "login.html";
    }

    estaLogueado() {
        this.usuarioActivo = localStorage.getItem("usuarioActivo") || null;
        return this.usuarioActivo !== null;
    }

    registrarActividad() {
        localStorage.setItem(this._claveUltimaActividad, String(Date.now()));
    }

    obtenerUltimaActividad() {
        const v = localStorage.getItem(this._claveUltimaActividad);
        return v ? parseInt(v, 10) : null;
    }

    iniciarMonitor(inactividadMinutos = 30, onExpirar = null) {
        if (this._monitorId) return;

        const actualizar = () => this.registrarActividad();
        this._listenersAct = ["click", "keydown", "mousemove", "touchstart"];
        this._listenersAct.forEach(ev => window.addEventListener(ev, actualizar));

        const intervalo = 15000;
        const timeout = inactividadMinutos * 60000;

        this._monitorId = setInterval(() => {
            const ultima = this.obtenerUltimaActividad();
            if (!ultima) {
                this.registrarActividad();
                return;
            }

            if (Date.now() - ultima > timeout) {
                this.detenerMonitor();
                localStorage.removeItem("usuarioActivo");
                localStorage.removeItem(this._claveUltimaActividad);
                if (onExpirar) onExpirar();
                else {
                    alert("Sesión expirada por inactividad.");
                    location.href = "login.html";
                }
            }
        }, intervalo);
    }

    detenerMonitor() {
        if (this._monitorId) clearInterval(this._monitorId);
        this._monitorId = null;
        const actualizar = () => this.registrarActividad();
        this._listenersAct.forEach(ev => window.removeEventListener(ev, actualizar));
        this._listenersAct = [];
    }
}



// --------------------------------------------------
// 4) Clase Turnos
// --------------------------------------------------
export class Turnos {
    constructor(usuario) {
        this.clave = `turnos_${usuario}`;
        this.default = {
            mañana: { inicio: "06:00", fin: "14:00" },
            tarde: { inicio: "15:00", fin: "23:00" }
        };
        this.config = JSON.parse(localStorage.getItem(this.clave)) || this.default;
    }

    guardar() {
        localStorage.setItem(this.clave, JSON.stringify(this.config));
    }

    obtenerTurnoActual() {
        const ahora = new Date();
        const hora = ahora.getHours() + ahora.getMinutes() / 60;

        const m = this.config.mañana;
        const t = this.config.tarde;

        const hM1 = parseFloat(m.inicio);
        const hM2 = parseFloat(m.fin);
        const hT1 = parseFloat(t.inicio);
        const hT2 = parseFloat(t.fin);

        if (hora >= hM1 && hora <= hM2) return "mañana";
        if (hora >= hT1 && hora <= hT2) return "tarde";

        return "fuera de horario";
    }
}



// --------------------------------------------------
// 5) Clase Estadisticas (CORREGIDA)
// --------------------------------------------------
export class Estadisticas {
    constructor(usuario) {
        this.usuario = usuario;
    }

    obtenerRegistros() {

        const registros = Object.keys(localStorage)
            .filter(k => k.startsWith(`registro_${this.usuario}_`))
            .map(k => ({
                clave: k,
                datos: JSON.parse(localStorage.getItem(k)) || []
            }));

        // 🔥 CONVERTIR SIEMPRE A INSTANCIAS PRODUCTO
        registros.forEach(r => {
            r.datos = r.datos.map(obj => Object.assign(new Producto(), obj));
        });

        return registros;
    }

    calcularPromedios() {
        const registros = this.obtenerRegistros();
        const resumen = {};

        registros.forEach(entry => {
            entry.datos.forEach(p => {
                if (!resumen[p.nombre]) {
                    resumen[p.nombre] = { total: 0, sesiones: 0 };
                }
                resumen[p.nombre].total += p.vendido;
                resumen[p.nombre].sesiones++;
            });
        });

        return resumen;
    }
}



// --------------------------------------------------
// 6) Clase Exportador
// --------------------------------------------------
export class Exportador {
    static exportarCSV(productos) {
        let csv = "Nombre,Categoría,Stock,Precio Costo,Precio Venta,Vendidos\n";
        productos.forEach(p => {
            csv += `${p.nombre},${p.categoria},${p.stock},${p.precioCosto},${p.precioVenta},${p.vendido}\n`;
        });
        return csv;
    }

    static descargarArchivo(contenido, nombre, tipo) {
        const blob = new Blob([contenido], { type: tipo });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = nombre;
        link.click();
    }
}
