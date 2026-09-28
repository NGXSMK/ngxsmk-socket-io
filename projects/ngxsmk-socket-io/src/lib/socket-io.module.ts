import { NgModule, type ModuleWithProviders } from '@angular/core';
import type { SocketIoConfig } from './socket-io.config';
import { createNamedSocketIoProviders, createSocketIoProviders } from './socket-io.providers';

/**
 * Optional NgModule API for applications that still use modules.
 * Prefer {@link provideSocketIo} for standalone apps.
 */
@NgModule({})
export class SocketIoModule {
  /**
   * Registers the default Socket.IO connection at the application root.
   * Reuses the same providers as {@link provideSocketIo}.
   */
  static forRoot(config: SocketIoConfig): ModuleWithProviders<SocketIoModule> {
    return {
      ngModule: SocketIoModule,
      providers: createSocketIoProviders(config),
    };
  }

  /**
   * Registers a named Socket.IO connection for multi-endpoint apps.
   */
  static forFeature(name: string, config: SocketIoConfig): ModuleWithProviders<SocketIoModule> {
    return {
      ngModule: SocketIoModule,
      providers: createNamedSocketIoProviders(name, config),
    };
  }
}
