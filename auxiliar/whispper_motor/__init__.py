"""Aplicativo auxiliar do whispper-whatsapp-web: motor de transcrição local.

Recebe mensagens de voz da extensão pelo Native Messaging do Chrome e as
transcreve com o mlx-whisper, sem acesso à rede e sem guardar áudio nem texto.
"""

VERSAO_APP = "1.0.0"
PROTOCOLO = 1
NOME_DO_HOST = "whispper_whatsapp_web.motor"
