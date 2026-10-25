# Test de fortalezas basado en método LIFO

Autodiagnóstico web de cuatro estilos de comportamiento (Apoyar, Dirigir, Conservar y Adaptar) en condiciones favorables y bajo presión. Las preguntas se adaptan al sector, el área, la edad y el nivel de responsabilidad de cada persona. Al final genera un informe con puntuaciones, coherencia de las respuestas y palancas de desarrollo, descargable en PDF.

Todo el contenido del test se publica **cifrado** y solo se abre con un usuario y una clave válidos.

**GARAND CONSULTING**

## Cómo se protege la información

| Información | Dónde está | Cómo se protege |
| --- | --- | --- |
| Preguntas y textos del informe | `data/contenido.cifrado.json` | Cifrado AES-GCM de 256 bits. Solo se descifra con una clave de usuario válida. |
| Lista de usuarios (nombres, fechas, estado) | `data/acceso.json` | Cifrada. Solo la cuenta de administración puede leerla. |
| Claves de los usuarios | `data/acceso.json` | Nunca se guardan. Cada clave se convierte (PBKDF2-SHA256, 600.000 iteraciones y sal propia) en la llave que abre el contenido. |
| Nombres de usuario | `data/acceso.json` | No aparecen. Cada entrada se identifica con un valor derivado del nombre. |
| Respuestas y resultados | Solo en el navegador de cada persona | Cifrados con la clave de esa persona. No se envían a ningún servidor ni base de datos. |

Todo el cifrado se hace en el navegador. No hay servidor, base de datos ni ninguna otra copia de la información. GARAND CONSULTING no tiene acceso a las respuestas ni a los resultados de nadie.

## Estructura del proyecto

```
test-fortalezas-lifo/
├── index.html                 Test: acceso, explicación, preguntas e informe
├── admin.html                 Panel de administración
├── css/estilos.css            Estilos (tema claro y oscuro)
├── js/
│   ├── cripto.js              Cifrado y comprobación de acceso (Web Crypto)
│   ├── motor.js               Adapta las preguntas al contexto de cada persona
│   ├── app.js                 Lógica del test, cálculo, informe y PDF
│   └── admin.js               Lógica del panel de administración
├── data/
│   ├── LEEME.md
│   ├── acceso.json            (lo genera el panel) Acceso cifrado
│   └── contenido.cifrado.json (lo genera el panel) Contenido cifrado
├── .gitignore                 Impide subir por error el contenido sin cifrar
├── .nojekyll
└── README.md
```

El archivo **`contenido.privado.json`** es el contenido del test sin cifrar. Se entrega por separado y **no debe subirse nunca al repositorio**. Guárdalo en un lugar seguro de tu ordenador: lo necesitarás para la puesta en marcha, para cambiar preguntas y para renovar claves.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `test-fortalezas-lifo`.
2. Sube el contenido de esta carpeta a la raíz del repositorio (**Add file → Upload files**, arrastra archivos y carpetas y pulsa **Commit changes**). No incluyas `contenido.privado.json`.
3. En **Settings → Pages**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Guarda.
4. En uno o dos minutos el test estará en `https://TU-USUARIO.github.io/test-fortalezas-lifo/`.

## Puesta en marcha (una sola vez)

1. Abre `https://TU-USUARIO.github.io/test-fortalezas-lifo/admin.html`.
2. Crea tu usuario y tu clave de administración (mínimo 12 caracteres) y carga el archivo `contenido.privado.json`. El panel lo cifra en tu navegador.
3. Pulsa **Descargar archivos**. Se descargan `acceso.json` y `contenido.cifrado.json`.
4. Súbelos a la carpeta `data` del repositorio (**Add file → Upload files → Commit changes**).

> Guarda bien tu clave de administración. No se puede recuperar: sin ella habría que repetir la puesta en marcha y dar claves nuevas a todos.

## Gestionar usuarios

En `admin.html`, con tu usuario de administración:

- **Crear usuario**: usuario, nombre opcional (solo lo ves tú) y clave inicial (se genera una de 12 caracteres).
- **Nueva clave**: sustituye la clave de una persona. La anterior deja de funcionar.
- **Revocar acceso**: esa clave deja de abrir el test. Para devolver el acceso, usa **Dar acceso** y entrega una clave nueva.
- **Eliminar**: borra al usuario.
- **Renovar todas las claves**: cambia la clave interna de cifrado, vuelve a cifrar el contenido y genera claves nuevas para todos los usuarios con acceso. Úsalo si sospechas que una clave se ha filtrado o cuando quieras cortar del todo el acceso de alguien revocado.

Las claves nuevas aparecen en **Claves pendientes de entregar** mientras la página está abierta. No se guardan en ningún sitio, así que cópialas antes de cerrar.

Después de cada cambio, pulsa **Descargar archivos** y sube los archivos descargados a la carpeta `data` del repositorio.

## Cambiar preguntas o textos

1. Edita tu copia de `contenido.privado.json`. Cada pregunta tiene un escenario con marcadores como `{proyecto}` o `{S.cli}` y cuatro respuestas fijas, una por estilo. Para que los resultados sigan siendo comparables, cambia la redacción de los escenarios, no el significado de las respuestas.
2. En el panel, carga el archivo en **Contenido del test** y pulsa **Cifrar y actualizar contenido**.
3. Descarga `contenido.cifrado.json` y súbelo a `data`.

## Límites que conviene conocer

- **Una persona con acceso puede guardar lo que ve.** Quien entra con una clave válida descifra el contenido en su navegador. Revocar su acceso impide que vuelva a entrar, pero no borra lo que pudiera haber copiado. Ningún sistema puede evitar eso.
- **Revocar no cambia la clave interna de cifrado.** Para cortar del todo a alguien con conocimientos técnicos, usa **Renovar todas las claves**.
- **El diseño de la página es público.** El código HTML, CSS y JavaScript no contiene preguntas ni textos del informe, pero se puede ver cómo funciona la aplicación.
- **Las claves débiles se pueden adivinar.** Usa las claves generadas por el panel y una clave de administración larga.
- **Los resultados viven en cada dispositivo.** Si alguien borra los datos del navegador o recibe una clave nueva, ya no podrá recuperar sus resultados anteriores. El informe en PDF es la forma de conservarlos.

## Probar en tu ordenador

Si abres `index.html` con doble clic, el navegador no deja leer los archivos de `data`. Abre una terminal en esta carpeta y ejecuta:

```
python3 -m http.server 8000
```

Después abre `http://localhost:8000` en el navegador.

## Aviso

Herramienta original de desarrollo inspirada en el enfoque de orientaciones de vida de Stuart Atkins y Allan Katcher. No es el cuestionario oficial LIFO®, marca registrada de LIFO® Products & Consulting, que requiere un facilitador acreditado. Úsalo como punto de partida para la reflexión, no como evaluación psicológica.
