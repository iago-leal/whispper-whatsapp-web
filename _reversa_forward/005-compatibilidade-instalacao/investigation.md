# Investigação Técnica — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`
**Data:** 2026-10-01

---

## 1. Tecnologias e Mecanismos do Navegador

1. **Detecção de Hardware no Chrome (Verificação Inicial):**
   - `navigator.userAgentData?.platform` ou `navigator.platform` para detectar `macOS` vs `Windows`.
   - `navigator.userAgentData?.getHighEntropyValues(['architecture', 'bitness'])` ou análise do `userAgent` para identificar `arm64` / `x86_64`.
   - `navigator.deviceMemory` (em GB, ex.: 8) e `navigator.hardwareConcurrency` (núcleos de CPU).

2. **Detecção Completa pelo Aplicativo Auxiliar:**
   - O aplicativo Python possui acesso direto ao sistema operacional via `platform`, `shutil.disk_usage` e `psutil` ou `sysctl`/WMI para medir com precisão espaço em disco livre e suporte a aceleração Apple Silicon / Metal / DirectML.

3. **Ciclo de Instalação e Native Messaging:**
   - No macOS: registro do manifesto em `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.whispper.whispper_whatsapp_web.json`.
   - No Windows: registro na chave de registro `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.whispper.whispper_whatsapp_web`.
   - Em ambos os casos, a instalação para o usuário atual (`HKCU` ou pasta de usuário) não requer elevação de privilégios (`sudo` ou administrador).

4. **Persistência da Etapa Atual:**
   - A etapa do onboarding (`privacidade` → `verificacao` → `instalador` → `modelo` → `teste` → `pronto`) é armazenada em `chrome.storage.local` para retomar automaticamente em caso de fechamento acidental da aba.
