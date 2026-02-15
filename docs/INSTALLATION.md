# Guía de Instalación - MTG Arena Sniffer

## Requisitos Previos

Antes de instalar MTG Arena Sniffer, asegúrate de tener:

- **Windows 10/11** (MTG Arena y Overwolf son Windows-only)
- **MTG Arena** instalado y funcional
- **Overwolf** instalado (descarga desde https://www.overwolf.com)
- **Git** instalado (opcional, para clonar el repositorio)
- **VS Code** o editor de texto (para desarrollo)

## Instalación como Usuario

### Opción 1: Instalar desde GitHub Release (Más fácil)

```bash
# 1. Descarga el archivo .zip más reciente desde releases
# 2. Extrae el contenido a una carpeta
# 3. En Overwolf, ve a Settings > Extensions > Develop an extension
# 4. Carga la carpeta del proyecto
# 5. Listo - abre MTG Arena y la app debería aparecer automáticamente
```

### Opción 2: Instalar desde Código Fuente (Para desarrollo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/yagodemartin/MTGSnipper.git
cd MTGSnipper

# 2. Abrir Overwolf
# 3. Ir a Settings > Extensions > Develop an extension
# 4. Click en "Load unpacked extension"
# 5. Seleccionar la carpeta del proyecto
# 6. Permitir acceso a MTG Arena cuando se pida

# 7. Inicia MTG Arena - la app debería aparecer en Overwolf
```

## Estructura de Instalación

```
Tu carpeta del proyecto/
├── src/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   ├── shared/
│   ├── background/
│   ├── overlay/
│   └── manifest.json
├── css/
├── docs/
└── README.md
```

## Configuración Inicial

### Paso 1: Verificar Permisos de Overwolf

La primera vez que ejecutes la aplicación, Overwolf te pedirá permiso para:

1. **Acceder a MTG Arena** - Necesario para monitorear logs
2. **Acceder a archivos locales** - Para leer Player.log
3. **Usar hotkeys** - Para los atajos de teclado

Acepta todos los permisos para funcionamiento completo.

### Paso 2: Localizar Player.log

MTG Arena guarda sus logs en:

```
%LOCALAPPDATA%\MTG Arena\Logs\Player.log
```

La aplicación accede automáticamente a este archivo. Si tienes problemas:

1. Abre el Explorador de archivos
2. Pega `%LOCALAPPDATA%` en la barra de direcciones
3. Navega a `MTG Arena\Logs\`
4. Verifica que existe `Player.log`

### Paso 3: Permitir Networking

La aplicación descarga datos de:

- **mtggoldfish.com** - Datos del meta
- **scryfall.com** - Información de cartas
- **allorigins.win** - CORS proxy

Estos hosts deben estar accesibles en tu firewall.

## Configuración de Desarrollo

Si vas a desarrollar o contribuir:

### 1. Clonar y configurar

```bash
git clone https://github.com/yagodemartin/MTGSnipper.git
cd MTGSnipper/mtgArenaSnipper

# Abrir en VS Code
code .
```

### 2. Instalar extensiones de VS Code

Recomendadas para desarrollo:

```
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Thunder Client (para testing de APIs)
- Comment Translate
```

### 3. Cargar como extensión de desarrollo

En Overwolf:

1. Settings > Extensions > Develop an extension
2. Click "Load unpacked extension"
3. Selecciona la carpeta `mtgArenaSnipper/`
4. Habilita "Enable debug mode"

### 4. Abrir DevTools

Para debugging:

1. Abre la ventana principal de la app
2. Press `F12` o `Ctrl+Shift+I`
3. Verás la consola de JavaScript

## Troubleshooting

### El app no aparece en Overwolf

**Solución:**

1. Verifica que MTG Arena está abierto
2. Recarga la extensión en Settings > Extensions
3. Reinicia Overwolf completamente
4. Verifica que `manifest.json` es válido

### Error "Player.log not found"

**Solución:**

1. Verifica que MTG Arena está instalado
2. Abre MTG Arena al menos una vez
3. Juega una partida (esto genera el log)
4. Reinicia la aplicación

### Las predicciones no aparecen

**Solución:**

1. Verifica que el juego está en progreso
2. Juega al menos 1-2 cartas
3. Abre el Debug Panel (si disponible)
4. Verifica que la conexión a internet es correcta

### Error de CORS

**Solución:**

1. La aplicación usa proxies automáticamente
2. Si persiste, verifica firewall/antivirus
3. Intenta desactivar VPN si la tienes
4. Reinicia la aplicación

## Hotkeys (Atajos)

Una vez instalado, puedes usar:

- **Ctrl+Alt+M** - Mostrar/ocultar ventana principal
- **Ctrl+Alt+R** - Resetear estado del juego

Estos se pueden personalizar en `src/manifest.json` en la sección `hotkeys`.

## Configuración Avanzada

### Personalizar manifest.json

En `src/manifest.json`:

```json
{
  "app_name": "MTG Arena Sniffer",
  "author": "Tu nombre",
  "version": "1.0.0",
  "windows": {
    "MainWindow": {
      "file": "src/index.html",
      "size": {
        "width": 1200,
        "height": 800
      }
    }
  }
}
```

### Configuración de AppConfig.js

En `src/shared/config/AppConfig.js`:

```javascript
const config = {
  // Cache
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 horas

  // Predicción
  confirmationThreshold: 0.85, // 85% para auto-confirmar
  minCardsForPrediction: 2,
  maxPredictions: 6,

  // Scraping
  scrapingRateLimit: 2000, // ms entre requests

  // Debug
  debugMode: false
};
```

## Actualización

### Actualizar desde GitHub

```bash
cd MTGSnipper

# Obtener últimas cambios
git pull origin main

# Recargar en Overwolf
# Settings > Extensions > Reload extension
```

### Verificar versión

En la ventana principal, busca el número de versión en la parte inferior o en:

```javascript
// En cualquier servicio
console.log(AppConfig.version);
```

## Desinstalación

### Remover de Overwolf

1. Abre Overwolf
2. Settings > Extensions
3. Encuentra "MTG Arena Sniffer"
4. Click en el icono de papelera o "Remove"

### Limpiar datos locales

```javascript
// En la consola del navegador
localStorage.removeItem('mtgArenaSniffer_cache');
localStorage.removeItem('mtgArenaSniffer_analytics');
```

## Soporte

Si tienes problemas:

1. Verifica [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Abre un [Issue en GitHub](https://github.com/yagodemartin/MTGSnipper/issues)
3. Incluye:
   - Versión de Windows y Overwolf
   - Versión de MTG Arena
   - Descripción del problema
   - Logs de debug (si puedes)

## Próximos Pasos

Una vez instalado:

1. Abre MTG Arena
2. Juega una partida
3. La aplicación detectará cartas automáticamente
4. Las predicciones aparecerán en tiempo real
5. Para más info, lee [README.md](../README.md)

## Requisitos de Sistema

### Mínimos

- **CPU**: Intel Core i5 / AMD Ryzen 5
- **RAM**: 4GB
- **Almacenamiento**: 200MB libres
- **Conexión**: 1Mbps internet

### Recomendados

- **CPU**: Intel Core i7 / AMD Ryzen 7
- **RAM**: 8GB+
- **Almacenamiento**: 1GB libres
- **Conexión**: 5Mbps+ internet

## Seguridad y Privacidad

### Datos que recopilamos

- Cartas jugadas en tus partidas
- Estadísticas de predicción
- Información del meta actual (pública)

### Datos que NO recopilamos

- Tu nombre o ID de cuenta
- Información personal
- Datos de otras aplicaciones
- Ubicación

### Almacenamiento local

Todo se almacena en tu máquina:

```
C:\Users\TuUsuario\AppData\Local\Overwolf
```

No se envía a servidores externos excepto:

- MTGGoldfish (para datos del meta)
- Scryfall (para información de cartas)
- CORS proxies (para evitar restricciones)

---

¡Listo! Deberías tener MTG Arena Sniffer funcionando. Si tienes problemas, consulta la sección de Soporte.
