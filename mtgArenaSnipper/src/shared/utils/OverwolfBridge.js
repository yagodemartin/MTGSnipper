// src/shared/utils/OverwolfBridge.js
// 🌉 Bridge para comunicación entre windows de Overwolf

class OverwolfBridge {
  constructor() {
    this.overlayWindowId = null;
    this.mainWindow = null;
    this.messageHandlers = new Map();
    this.debugMode = true;
  }

  async initialize() {
    this.log('🌉 OverwolfBridge: Inicializando...');
    await this.findMainWindow();
    await this.findOverlayWindow();
    this.setupMessageListener();
    this.log('✅ OverwolfBridge: Listo');
  }

  async findMainWindow() {
    return new Promise((resolve) => {
      overwolf.windows.getMainWindow((result) => {
        if (result.success) {
          this.mainWindow = result.window;
          this.log(`✅ Main window encontrado: ${this.mainWindow.id}`);
        }
        resolve();
      });
    });
  }

  async findOverlayWindow() {
    return new Promise((resolve) => {
      overwolf.windows.obtainDeclaredWindow('OverlayWindow', (result) => {
        if (result.success) {
          this.overlayWindowId = result.window.id;
          this.log(`✅ Overlay window encontrado: ${this.overlayWindowId}`);
        } else {
          this.log('⚠️ Overlay window no disponible');
        }
        resolve();
      });
    });
  }

  setupMessageListener() {
    overwolf.windows.onMessageReceived.addListener((message) => {
      this.log(`📨 Mensaje recibido: ${message.id}`);

      if (this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id);
        handler(message.data);
      }
    });
  }

  async sendToOverlay(messageId, data) {
    if (!this.overlayWindowId) {
      this.log('⚠️ Overlay window no disponible');
      return false;
    }

    return new Promise((resolve) => {
      overwolf.windows.sendMessage(
        this.overlayWindowId,
        messageId,
        data,
        (response) => {
          if (response?.success) {
            this.log(`✅ Mensaje enviado al overlay: ${messageId}`);
            resolve(true);
          } else {
            this.log(`❌ Error enviando mensaje: ${messageId}`);
            resolve(false);
          }
        }
      );
    });
  }

  async sendToBackground(messageId, data) {
    if (!this.mainWindow) {
      this.log('⚠️ Main window no disponible');
      return false;
    }

    return new Promise((resolve) => {
      overwolf.windows.sendMessage(
        this.mainWindow.id,
        messageId,
        data,
        (response) => {
          if (response?.success) {
            this.log(`✅ Mensaje enviado al background: ${messageId}`);
            resolve(true);
          } else {
            this.log(`❌ Error enviando mensaje: ${messageId}`);
            resolve(false);
          }
        }
      );
    });
  }

  registerMessageHandler(messageId, callback) {
    this.messageHandlers.set(messageId, callback);
    this.log(`📝 Handler registrado: ${messageId}`);
  }

  unregisterMessageHandler(messageId) {
    this.messageHandlers.delete(messageId);
    this.log(`🗑️ Handler removido: ${messageId}`);
  }

  isOverlayReady() {
    return !!this.overlayWindowId;
  }

  isBackgroundReady() {
    return !!this.mainWindow;
  }

  log(message) {
    if (!this.debugMode) return;
    console.log(`🌉 [OverwolfBridge] ${message}`);
  }
}

export default OverwolfBridge;
