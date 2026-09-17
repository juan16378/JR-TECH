// URL base de la API del backend (FastAPI).
//
// En desarrollo local (npm run dev) usa por defecto el backend corriendo en
// localhost:3000. Para producción (Vercel, Railway, Netlify, etc.) hay que
// configurar la variable de entorno VITE_API_URL con la URL real del
// backend ya desplegado, por ejemplo:
//
//   VITE_API_URL=https://tu-backend.up.railway.app/api
//
// Vite solo expone al navegador las variables que empiezan con "VITE_", y
// hay que definirla ANTES de compilar (npm run build) — cambiarla después
// del build no tiene efecto, porque queda "horneada" en el JS generado.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
