import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/header";
import Footer from "./components/footer";
import ChatbotWidget from "./components/ChatbotWidget";

import Inicio from "./pages/inicio";
import Quienes from "./pages/quienes";
import Contacto from "./pages/contacto";
import Login from "./pages/Login";
import RecoverPassword from "./pages/RecoverPassword";
import ResetPassword from "./pages/ResetPassword";
import Productos from "./pages/productos";
import Servicios from "./pages/Servicios";
import ProtectedRoute from "./ProtectedRoute";
import NotFound from "./pages/NotFound";

// Paneles internos (perfil de cliente + Admin/Empleado): ningún visitante
// anónimo ni cliente navegando el catálogo público los necesita, así que se
// cargan en su propio "chunk" con React.lazy en vez de ir en el paquete
// inicial del sitio — reduce lo que un visitante nuevo tiene que descargar
// para ver Inicio/Productos.
const Perfil = lazy(() => import("./pages/Perfil"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const AdminProductos = lazy(() => import("./pages/Adminproductos"));
const AdminServicios = lazy(() => import("./pages/Adminservicios"));
const AdminPedidos = lazy(() => import("./pages/AdminPedidos"));
const AdminFacturas = lazy(() => import("./pages/AdminFacturas"));
const AdminPQR = lazy(() => import("./pages/AdminPQR"));
const AdminEstadisticas = lazy(() => import("./pages/AdminEstadisticas"));
const EmpleadoPanel = lazy(() => import("./pages/EmpleadoPanel"));

// Se muestra brevemente mientras se descarga el chunk de un panel interno
// (normalmente ya está en caché del navegador después de la primera vez).
function CargandoPanel() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-950">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-400" />
    </div>
  );
}


// Rutas que dibujan su propio panel completo (barra lateral, encabezado y
// pie de página propios). En esas páginas se oculta la barra de navegación
// del sitio público (Inicio, Productos, etc.) para no mezclar dos
// navegaciones distintas en la misma pantalla.
const PREFIJOS_PANEL = ["/perfil", "/admin", "/empleado"];

// Título de pestaña por ruta. Las que no aparecen aquí (paneles internos,
// 404, etc.) usan un título genérico o el que arma cada sección.
const TITULOS_RUTA = {
  "/": "Inicio",
  "/quienes": "Quiénes somos",
  "/contacto": "Contacto",
  "/productos": "Productos",
  "/servicios": "Servicios",
  "/login": "Iniciar sesión",
  "/recuperar": "Recuperar contraseña",
  "/restablecer-password": "Restablecer contraseña",
  "/perfil": "Mi perfil",
  "/admin": "Panel de administración",
  "/admin/usuarios": "Usuarios",
  "/admin/productos": "Productos",
  "/admin/servicios": "Servicios",
  "/admin/pedidos": "Pedidos",
  "/admin/facturas": "Facturas",
  "/admin/pqr": "PQR",
  "/admin/estadisticas": "Diagramas de estadísticas",
  "/empleado": "Panel de empleado",
};

const NOMBRE_SITIO = "JR Tech Store";

function App() {
  const location = useLocation();

  const esPanelInterno = PREFIJOS_PANEL.some(
    (prefijo) =>
      location.pathname === prefijo ||
      location.pathname.startsWith(`${prefijo}/`)
  );

  // Al cambiar de ruta: sube el scroll al inicio (sin esto, una página nueva
  // podía abrir scrolleada donde había quedado la anterior) y actualiza el
  // título de la pestaña para que cada sección se distinga de las demás.
  useEffect(() => {
    window.scrollTo(0, 0);

    const tituloRuta = TITULOS_RUTA[location.pathname];
    document.title = tituloRuta ? `${tituloRuta} · ${NOMBRE_SITIO}` : NOMBRE_SITIO;
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">

      {!esPanelInterno && <Header />}

      <main className="flex-1">
        <Suspense fallback={<CargandoPanel />}>
        <Routes>

          <Route path="/" element={<Inicio />} />

          <Route
            path="/quienes"
            element={<Quienes />}
          />

          <Route
            path="/contacto"
            element={<Contacto />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/productos"
            element={<Productos />}
          />

          <Route
            path="/servicios"
            element={<Servicios />}
          />

          <Route
            path="/recuperar"
            element={<RecoverPassword />}
          />

          <Route
            path="/restablecer-password"
            element={<ResetPassword />}
          />

          <Route
            path="/perfil"
            element={
              <ProtectedRoute rolesPermitidos={["Cliente", "Empleado", "Administrador"]}>
                <Perfil />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador"]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador"]}>
                <AdminUsuarios />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/productos"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador", "Empleado"]}>
                <AdminProductos />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/servicios"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador", "Empleado"]}>
                <AdminServicios />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pedidos"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador", "Empleado"]}>
                <AdminPedidos />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/facturas"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador", "Empleado"]}>
                <AdminFacturas />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pqr"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador", "Empleado"]}>
                <AdminPQR />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/estadisticas"
            element={
              <ProtectedRoute rolesPermitidos={["Administrador", "Empleado"]}>
                <AdminEstadisticas />
              </ProtectedRoute>
            }
          />

          <Route
            path="/empleado"
            element={
              <ProtectedRoute rolesPermitidos={["Empleado", "Administrador"]}>
                <EmpleadoPanel />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />

        </Routes>
        </Suspense>
      </main>

      {!esPanelInterno && <Footer />}

      {/* Visible en todas las páginas públicas del sitio. Dentro de los
          paneles internos (perfil, admin, empleado) no se muestra, ya que
          esas pantallas tienen su propia barra lateral con acceso directo
          para volver al sitio. */}
      {/* Botón flotante único: visible en TODO el sitio, incluidos los
          paneles internos (perfil/admin/empleado). Fuera de los paneles se
          despliega en dos opciones (WhatsApp + asistente con IA); dentro
          de los paneles WhatsApp no aplica, así que abre el chat directo. */}
      <ChatbotWidget
        mostrarWhatsapp={!esPanelInterno}
        numeroWhatsapp="573001234567"
        mensajeWhatsapp="¡Hola! Quiero más información sobre los productos de JR TECH."
      />

    </div>
  );
}

export default App;