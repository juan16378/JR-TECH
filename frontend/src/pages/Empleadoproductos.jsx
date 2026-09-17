import GestionProductos from "../components/GestionProductos";

function EmpleadoProductos() {
    return <GestionProductos puedeEliminar={false} rol="Empleado" />;
}

export default EmpleadoProductos;