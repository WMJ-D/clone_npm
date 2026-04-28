interface ElectronAPI {
  openExternal: (url: string) => void
  blogGetStatus: () => Promise<{ running: boolean; port: number | null; url: string | null }>
  blogStart: (port?: number) => Promise<{ success: boolean; message: string; port?: number }>
  blogStop: () => Promise<{ success: boolean; message: string }>
  blogTestDb: () => Promise<{ success: boolean; message: string }>
  blogUpdateDbConfig: (config: any) => Promise<{ success: boolean; message: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}