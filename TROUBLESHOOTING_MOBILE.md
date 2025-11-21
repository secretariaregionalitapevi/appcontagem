# Guia de Troubleshooting - Problemas no Mobile

## Erro: "Could not connect to the server"

Este erro ocorre quando o dispositivo móvel não consegue se conectar ao servidor de desenvolvimento do Expo.

### Soluções:

#### 1. **Usar LAN (Rede Local) - RECOMENDADO**

Certifique-se de que o celular e o computador estão na **mesma rede Wi-Fi**.

```bash
# Iniciar o Expo com LAN
npm start
# ou
npx expo start --host lan
```

**Verificações:**
- ✅ Celular e computador na mesma rede Wi-Fi
- ✅ Firewall do Windows não bloqueando a porta 8081
- ✅ Antivírus não bloqueando conexões

#### 2. **Usar Tunnel (Funciona em qualquer rede)**

Se LAN não funcionar, use tunnel (mais lento, mas funciona em qualquer rede):

```bash
npm run start:tunnel
# ou
npx expo start --tunnel
```

**Nota:** O tunnel pode ser mais lento, mas funciona mesmo se o celular estiver em outra rede.

#### 3. **Verificar Firewall do Windows**

1. Abra "Firewall do Windows Defender"
2. Clique em "Configurações avançadas"
3. Clique em "Regras de Entrada"
4. Verifique se há regra para porta 8081
5. Se não houver, crie uma nova regra permitindo TCP na porta 8081

#### 4. **Verificar IP da Rede**

Quando iniciar o Expo, ele mostrará um QR code e URLs. Verifique:

- **URL LAN:** `exp://192.168.x.x:8081` (deve ser o IP do seu computador na rede local)
- **URL Tunnel:** `exp://xxx.xxx.tunnel.exp.direct:80` (se usar tunnel)

#### 5. **Limpar Cache e Reiniciar**

```bash
# Limpar cache do Expo
npx expo start -c --host lan

# Limpar cache do Expo Go no celular
# No Expo Go: Settings > Clear cache
```

#### 6. **Usar Expo Go Atualizado**

Certifique-se de que o Expo Go está atualizado:
- Android: Google Play Store
- iOS: App Store

#### 7. **Verificar Logs**

Quando iniciar o Expo, verifique os logs no terminal:
- Deve mostrar "Metro waiting on..."
- Deve mostrar o IP correto da LAN
- Não deve mostrar erros de conexão

### Comandos Úteis

```bash
# Iniciar com LAN (padrão agora)
npm start

# Iniciar com tunnel (se LAN não funcionar)
npm run start:tunnel

# Iniciar com localhost (apenas para web)
npm run start:localhost

# Limpar cache e iniciar
npx expo start -c --host lan

# Ver IP da rede local (Windows)
ipconfig
# Procure por "IPv4 Address" na sua conexão Wi-Fi
```

### Checklist de Diagnóstico

- [ ] Celular e computador na mesma rede Wi-Fi?
- [ ] Firewall do Windows permitindo porta 8081?
- [ ] Expo Go atualizado no celular?
- [ ] Expo iniciado com `--host lan`?
- [ ] IP mostrado no terminal corresponde ao IP do computador?
- [ ] Tentou usar tunnel como alternativa?

### Se Nada Funcionar

1. Tente usar o **tunnel** (`npm run start:tunnel`)
2. Verifique se há proxy/VPN ativo que possa interferir
3. Tente em outra rede Wi-Fi
4. Verifique se o antivírus não está bloqueando

