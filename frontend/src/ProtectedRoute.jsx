import { Navigate } from "react-router-dom";

// Uso:
// <ProtectedRoute rolesPermitidos={["Administrador"]}>
//     <AdminPanel />
// </ProtectedRoute>

function ProtectedRoute({ children, rolesPermitidos }) {
    const usuarioGuardado =
        localStorage.getItem("usuario") ||
        sessionStorage.getItem("usuario");

    if (!usuarioGuardado) {
        return <Navigate to="/login" replace />;
    }

    let usuario = null;

    try {
        usuario = JSON.parse(usuarioGuardado);
    } catch (error) {
        console.error("❌ Usuario guardado inválido:", error);
        return <Navigate to="/login" replace />;
    }

    const tieneAcceso =
        !rolesPermitidos ||
        rolesPermitidos.includes(usuario?.rol);

    if (!tieneAcceso) {
        // Está logueado pero no tiene el rol necesario
        return <Navigate to="/perfil" replace />;
    }

    return children;
}

export default ProtectedRoute;