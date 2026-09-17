# Desplegar JR Tech Store en Railway

Guía paso a paso para poner en línea el frontend (React) y el backend (FastAPI) en Railway. Tu MongoDB ya está en Atlas (la nube), así que no hay que migrar la base de datos — solo reutilizar la misma cadena de conexión.

Ya dejé el código listo para esto:

- `frontend/src/config.js` — centraliza la URL de la API. En desarrollo sigue apuntando a `http://localhost:3000/api`; en producción se controla con la variable `VITE_API_URL`.
- `frontend/vite.config.js` — configurado para que el servidor de "preview" acepte el dominio que Railway le asigne (sin esto, Railway muestra un error de "host no permitido").
- `frontend/package.json` — tiene un script `start` (`vite preview --port $PORT`) para que Railway sepa cómo servir el sitio ya compilado.
- `backend/Procfile` — le dice a Railway cómo arrancar el backend (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
- `frontend/.gitignore` y `.gitignore` (raíz) — para no subir `node_modules`, `venv`, `.env`, etc.

## Paso 0 — Preparar el repositorio Git

Tu código todavía no está en Git. Abre una terminal en la carpeta `react_fastapi` (la que contiene `frontend/` y `backend/`) y ejecuta:

```bash
git init
git add .
git commit -m "Primer commit: JR Tech Store"
```

## Paso 1 — Subirlo a GitHub

1. Entra a [github.com](https://github.com) y crea un repositorio **vacío** (sin README, sin .gitignore — ya los tienes) llamado por ejemplo `jr-tech-store`.
2. GitHub te va a mostrar los comandos exactos, pero en general son:

```bash
git remote add origin https://github.com/TU_USUARIO/jr-tech-store.git
git branch -M main
git push -u origin main
```

Si nunca has subido código desde este computador, Git te va a pedir iniciar sesión en GitHub la primera vez (una ventana del navegador o un token de acceso) — hazlo tú mismo en ese momento, es información tuya.

## Paso 2 — Crear cuenta y proyecto en Railway

1. Entra a [railway.app](https://railway.app) y crea una cuenta (puedes usar tu cuenta de GitHub para que quede todo conectado).
2. Click en **New Project** → **Deploy from GitHub repo** → elige el repositorio que acabas de subir.

Railway va a intentar detectar un solo servicio. Vamos a convertirlo en **dos servicios** (uno para el backend y otro para el frontend), apuntando cada uno a su propia carpeta del mismo repo.

## Paso 3 — Desplegar el backend

1. En el proyecto de Railway, click en el servicio que se creó automáticamente (o **New → GitHub Repo** de nuevo si prefieres uno limpio).
2. En **Settings → Root Directory**, escribe `backend`.
3. Railway detectará que es un proyecto Python (por `requirements.txt`) y usará el `Procfile` que ya está listo para arrancarlo.
4. Ve a la pestaña **Variables** de este servicio y agrega las siguientes (los *valores* cópialos de tu archivo `backend/.env` — yo no los incluyo aquí por seguridad, ya que son tus credenciales reales):

   | Variable | De dónde sacar el valor |
   |---|---|
   | `MONGODB_URI` | Tu `backend/.env` (ya apunta a Atlas) |
   | `MONGODB_DB_NAME` | Tu `backend/.env` (`JRTECHAPI`) |
   | `JWT_SECRET` | Tu `backend/.env` |
   | `JWT_ALGORITHM` | Tu `backend/.env` (`HS256`) |
   | `JWT_EXPIRE_MINUTES` | Tu `backend/.env` |
   | `RESET_TOKEN_EXPIRE_MINUTES` | Tu `backend/.env` |
   | `ADMIN_NOMBRE`, `ADMIN_APELLIDO`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Tu `backend/.env` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Tu `backend/.env` |
   | `GEMINI_API_KEY`, `GEMINI_MODEL` | Tu `backend/.env` |
   | `FRONTEND_URL` | La dejas pendiente por ahora — se llena en el Paso 5 |

   No hace falta agregar `PORT`: Railway lo define automáticamente y el `Procfile` ya lo usa.

5. Click en **Deploy**. Cuando termine, Railway te da un dominio público (algo como `backend-production-xxxx.up.railway.app`) en **Settings → Networking → Generate Domain** si no te lo generó solo.
6. **Guarda esa URL** — la necesitas en el siguiente paso.

## Paso 4 — Desplegar el frontend

1. En el mismo proyecto de Railway, click **New → GitHub Repo** otra vez, mismo repositorio.
2. En **Settings → Root Directory**, escribe `frontend`.
3. En **Settings → Deploy**, verifica que el *Build Command* sea `npm run build` y el *Start Command* sea `npm run start` (Railway suele detectarlos solo desde `package.json`, pero confírmalo).
4. En **Variables**, agrega:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://TU-BACKEND.up.railway.app/api` (la URL del Paso 3, con `/api` al final) |

   Importante: como es una variable de **build** (Vite la "hornea" dentro del JavaScript al compilar), tiene que estar configurada *antes* de que Railway corra `npm run build` — agrégala antes de darle deploy, o si ya desplegó, vuelve a desplegar (**Redeploy**) después de agregarla.

5. Click **Deploy**. Cuando termine, genera también su dominio público (**Settings → Networking → Generate Domain**).
6. **Guarda esa URL** también.

## Paso 5 — Conectar los dos servicios (CORS)

Vuelve al servicio del **backend** → **Variables** → edita `FRONTEND_URL` y ponle la URL del frontend del Paso 4 (por ejemplo `https://frontend-production-xxxx.up.railway.app`, sin `/` al final). Railway va a reiniciar el servicio solo. Sin este paso, el navegador va a bloquear las peticiones del frontend al backend por CORS.

## Paso 6 — (Recomendado) Volumen para las imágenes de productos

Las fotos de productos que suban desde el panel de Admin/Empleado se guardan en el disco del backend (`backend/uploads/productos`). Railway borra ese disco cada vez que se vuelve a desplegar el servicio, así que las fotos subidas *después* del primer deploy se perderían en el siguiente redeploy.

Para evitarlo: en el servicio del backend → **Settings → Volumes** → **New Volume** → móntalo en la ruta `/app/uploads` (la carpeta de trabajo dentro del contenedor es `/app`, que es donde vive `uploads/`). Las fotos que ya tienes (las que están hoy en tu `backend/uploads/productos`) van a quedar incluidas en el primer deploy porque las subí junto con el resto del código.

## Paso 7 — Probar que todo funcione

- Abre la URL del frontend y confirma que carga el catálogo (esto confirma que `VITE_API_URL` y CORS quedaron bien).
- Prueba iniciar sesión con el usuario administrador (`ADMIN_EMAIL` / `ADMIN_PASSWORD` de tus variables).
- Prueba el chatbot (confirma que `GEMINI_API_KEY` llegó bien).
- Prueba "olvidé mi contraseña" (confirma que el `SMTP_*` quedó bien configurado).
- Haz una compra de prueba y revisa que llegue el correo con la factura en PDF.

## Después del primer deploy

Cada vez que hagas `git push` a la rama `main`, Railway vuelve a desplegar ambos servicios automáticamente — no tienes que repetir estos pasos, solo el Paso 0/1 (commit + push) para cada cambio nuevo.
