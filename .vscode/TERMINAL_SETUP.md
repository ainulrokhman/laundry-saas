# Terminal Setup - Git Bash

File ini berisi instruksi untuk mengubah terminal default ke Git Bash di Cursor/VS Code.

## Cara 1: Melalui UI Settings (Recommended)

1. Buka Settings:
   - Tekan `Ctrl+,` (Command Palette)
   - Atau: File → Preferences → Settings

2. Cari setting berikut:
   - Ketik: `terminal.integrated.defaultProfile.windows`

3. Pilih "Edit in settings.json"

4. Tambahkan atau ubah konfigurasi berikut:

```json
{
  "terminal.integrated.defaultProfile.windows": "Git Bash",
  "terminal.integrated.profiles.windows": {
    "Git Bash": {
      "path": "C:\\Program Files\\Git\\bin\\bash.exe",
      "icon": "terminal-bash"
    },
    "PowerShell": {
      "path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      "icon": "terminal-powershell"
    },
    "Command Prompt": {
      "path": "C:\\Windows\\System32\\cmd.exe",
      "icon": "terminal-cmd"
    }
  }
}
```

5. Simpan file (`Ctrl+S`)

6. Reload Window:
   - Tekan `Ctrl+Shift+P`
   - Ketik: "Reload Window"
   - Enter

## Cara 2: Edit File Langsung

1. Buka file settings.json user:
   - Tekan `Ctrl+Shift+P`
   - Ketik: "Preferences: Open User Settings (JSON)"
   - Enter

2. Tambahkan konfigurasi di atas

3. Simpan dan reload window

## Lokasi File Settings

User Settings biasanya ada di:
- **Cursor**: `%APPDATA%\Cursor\User\settings.json`
- **VS Code**: `%APPDATA%\Code\User\settings.json`

## Verifikasi

Setelah setup, buka terminal baru:
- Tekan `` Ctrl+` `` atau `Ctrl+Shift+` ``
- Terminal baru akan menggunakan Git Bash

## Catatan

- Jika Git Bash tidak ditemukan, sesuaikan path di konfigurasi
- Path default: `C:\Program Files\Git\bin\bash.exe`
- Jika Git terinstall di lokasi lain, gunakan path yang sesuai
