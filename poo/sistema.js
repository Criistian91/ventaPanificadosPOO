import { Producto, Inventario, UsuarioSesion, Turnos, Estadisticas, Exportador } from "./modelos.js";

export class SistemaPanificados {

    constructor() {
        this.sesion = new UsuarioSesion();

        if (!this.sesion.estaLogueado()) {
            alert("Debe iniciar sesión.");
            location.href = "login.html";
            return;
        }

        this.inventario = new Inventario(this.sesion.usuarioActivo);
        this.turnos = new Turnos(this.sesion.usuarioActivo);
        this.estadisticas = new Estadisticas(this.sesion.usuarioActivo);

        this.mostrarPrecios = false;
        this.categoriaSeleccionada = "";
    }

    iniciarSistema() {
        this.configurarEventosUI();
        // iniciar monitor de sesión: 15 minutos de inactividad
        try {
            // pasa un callback que muestra mensaje y redirige
            this.sesion.iniciarMonitor(5, () => {
                alert("Tu sesión expiró por inactividad (15 min). Vas a ser redirigido al login.");
                location.href = "login.html";
            });
        } catch (e) {
            console.warn("No se pudo iniciar monitor de sesión:", e);
        }
        this.cargarProductosEnPantalla();
        this.cargarHorarios();
        console.log("Sistema iniciado correctamente.");
    }



    // ==========================================================
    // UI
    // ==========================================================

    configurarEventosUI() {

        document.getElementById("togglePreciosBtn").addEventListener("click", () => {
            this.mostrarPrecios = !this.mostrarPrecios;
            this.cargarProductosEnPantalla();
        });

        document.getElementById("cerrarSesionBtn").addEventListener("click", () => {
            this.guardarRegistroHistorico();
            this.sesion.cerrarSesion();
        });


        document.getElementById("addStockBtn").addEventListener("click", () => {
            this.crearProductoNuevo();
        });
    }


    // ==========================================================
    // PRODUCTOS
    // ==========================================================

    cargarProductosEnPantalla() {
        const cont = document.getElementById("productosContainer");
        cont.innerHTML = "";

        const prodList = this.inventario.obtenerTodos().map(p =>
            Object.assign(new Producto(), p)
        );

        this.crearSelectCategorias(prodList);

        const filtrados = this.categoriaSeleccionada
            ? prodList.filter(p => p.categoria === this.categoriaSeleccionada)
            : prodList;

        filtrados.forEach(p => {
            const caja = document.createElement("div");
            caja.className = "producto-item";

            let html = `
                <h3>${p.nombre}</h3>
                <p>Stock: ${p.stock}</p>
                <p>Categoría: ${p.categoria}</p>
            `;

            if (this.mostrarPrecios) {
                html += `
                    <p>Precio costo: $${p.precioCosto}</p>
                    <p>Precio venta: $${p.precioVenta}</p>
                `;
            }

            html += `
                <div class="acciones">
                    <button onclick="sistema.registrarVenta(${p.id})">Vender</button>
                    <button onclick="sistema.devolverProducto(${p.id})">Devolver</button>
                    <button onclick="sistema.sumarStock(${p.id})">Sumar stock</button>
                    <button onclick="sistema.eliminarProducto(${p.id})">Eliminar</button>
                </div>
            `;

            caja.innerHTML = html;
            cont.appendChild(caja);
        });

        this.mostrarTotales();
    }


    crearSelectCategorias(productos) {
        let select = document.getElementById("selectCategorias");

        if (!select) {
            select = document.createElement("select");
            select.id = "selectCategorias";
            document.getElementById("productosContainer").before(select);
        }

        const categorias = [...new Set(productos.map(p => p.categoria))];

        select.innerHTML = `<option value=\"\">Todas las categorías</option>`;
        categorias.forEach(cat => {
            select.innerHTML += `<option value=\"${cat}\">${cat}</option>`;
        });

        select.value = this.categoriaSeleccionada;

        select.addEventListener("change", () => {
            this.categoriaSeleccionada = select.value;
            this.cargarProductosEnPantalla();
        });
    }

    guardarRegistroHistorico() {
        try {
            const productos = this.inventario.obtenerTodos();
            const fecha = new Date();

            const yyyy = fecha.getFullYear();
            const mm = String(fecha.getMonth() + 1).padStart(2, "0");
            const dd = String(fecha.getDate()).padStart(2, "0");
            const hh = String(fecha.getHours()).padStart(2, "0");
            const min = String(fecha.getMinutes()).padStart(2, "0");
            const ss = String(fecha.getSeconds()).padStart(2, "0");

            const clave = `registro_${this.sesion.usuarioActivo}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;

            localStorage.setItem(clave, JSON.stringify(productos));
            console.log("Registro histórico guardado:", clave);

        } catch (e) {
            console.error("Error guardando registro histórico:", e);
        }
    }

    // ==========================================================
    // OPERACIONES
    // ==========================================================

    registrarVenta(id) {
        if (this.inventario.registrarVenta(id)) {
            this.cargarProductosEnPantalla();
        }
    }

    devolverProducto(id) {
        if (this.inventario.devolverVenta(id)) {
            this.cargarProductosEnPantalla();
        }
    }

    sumarStock(id) {
        const cantidad = parseInt(prompt("¿Cuántas unidades agregar?"), 10);
        if (cantidad > 0) {
            this.inventario.sumarStock(id, cantidad);
            this.cargarProductosEnPantalla();
        }
    }

    eliminarProducto(id) {
        if (confirm("¿Seguro que querés eliminar el producto?")) {
            this.inventario.eliminarProducto(id);
            this.cargarProductosEnPantalla();
        }
    }

    crearProductoNuevo() {
        const nombre = prompt("Nombre del producto:");
        if (!nombre) return;

        const categoria = prompt("Categoría:");
        if (!categoria) return;

        const precioCosto = parseFloat(prompt("Precio costo:"));
        const precioVenta = parseFloat(prompt("Precio venta:"));
        const stockInicial = parseInt(prompt("Cantidad ingresada:"), 10);

        const nuevo = new Producto(
            Date.now(),
            nombre,
            categoria,
            precioCosto,
            precioVenta,
            stockInicial,
            stockInicial
        );

        this.inventario.agregarProducto(nuevo);
        this.cargarProductosEnPantalla();
    }


    // ==========================================================
    // TOTALES
    // ==========================================================

    mostrarTotales() {
        const tot = this.inventario.calcularTotales();
        document.getElementById("totalesContainer").innerHTML = `
            <p><strong>Costo total:</strong> $${tot.costoTotal}</p>
            <p><strong>Venta esperada:</strong> $${tot.ventaEsperada}</p>
            <p><strong>Ingreso real:</strong> $${tot.ingresoReal}</p>
            <p><strong>Ganancia real:</strong> $${tot.gananciaReal}</p>
        `;
    }


    // ==========================================================
    // HORARIOS
    // ==========================================================

    cargarHorarios() {
        const cfg = this.turnos.config;
        document.getElementById("inicioManana").value = cfg.mañana.inicio;
        document.getElementById("finManana").value = cfg.mañana.fin;
        document.getElementById("inicioTarde").value = cfg.tarde.inicio;
        document.getElementById("finTarde").value = cfg.tarde.fin;
    }
}
