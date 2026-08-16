# Lumi: Wild Realms ✨

Survivor roguelite + colección de criaturas + santuario. Prototipo web jugable
(orientación portrait, 720x1280) construido con **TypeScript + Vite + Phaser 3**
y un **shell de UI en React** sobre el canvas.

> Fácil de entender en 10 segundos, satisfactorio durante 5 minutos y con
> profundidad para jugar durante meses.

## 🎮 Cómo jugar / ejecutar

```bash
npm install          # instala dependencias
npm run dev          # servidor de desarrollo -> http://localhost:5173
npm run build        # build de producción autocontenido -> dist/index.html
npm run standalone   # igual que build (dist/lumi-standalone.html)
npm run android      # build web + sync a Capacitor (requiere Android SDK)
```

- **Sin servidor**: abre `dist/lumi-standalone.html` con doble clic (funciona offline).
- **Controles**: WASD / flechas (desktop) o joystick virtual (móvil). El ataque es automático.
- **Debug (solo dev)**: pulsa `F2` para el panel de depuración (monedas, gemas, boss, cofres, criatura, reset).

## 🕹️ Jugabilidad

- Sobrevive **5 minutos** en la arena; derrota al **Ancient Golem** para ganar.
- **10 poderes × 5 niveles** (Fire Orb, Chain Lightning, Wind Blades, Ice Aura,
  Multi Shot + pasivas), elegidos en cartas al subir de nivel.
- **Rarezas**: COMMON / RARE / EPIC / LEGENDARY / MYTHIC (probabilidades centralizadas).
- **Cofres** (madera/plata/oro/mítico), **huevos misteriosos** → **8 criaturas**
  coleccionables con bonos pasivos reales.
- **Santuario** con 4 edificios mejorables, **misiones**, **daily rewards** (7 días
  con protección de racha) y **shop**.
- **Ads mock** (revive, doble recompensa, cofre bonus), sin anuncios reales.

## 🏗️ Arquitectura

```
src/
  game/scenes/    Escenas Phaser (Boot, Splash, Game, LevelUp, Pause, Victory, Defeat, ...)
  game/ui/        UI Phaser reutilizable (Button, Joystick, Hud, Card)
  entities/       Player, Projectile, Pickup, Chest
  abilities/      Habilidades runtime (orbitales, cadena, cuchillas, aura)
  enemies/        Enemigos data-driven (Slime, Bat, Spider, Wolf)
  bosses/         AncientGolem
  systems/        Combate, XP, oleadas, texto flotante, partículas
  managers/       GameManager, SaveManager, EconomyManager, LootManager,
                  AudioManager, MissionManager, CreatureManager,
                  DailyRewardsManager, AnalyticsManager, NavigationManager
  services/       Mocks/interfaces: Ads, Purchase, Analytics, CloudSave, Auth, Leaderboard
  data/           Configuración data-driven (habilidades, enemigos, criaturas,
                  misiones, loot tables, daily rewards, shop)
  react/          Shell de UI en React (menú principal, debug panel)
  capacitor/      Bridges stub para AdMob / Google Play Billing
  types/          Tipos compartidos
```

**Patrones**: managers singleton sobre un EventBus tipado; economía solo vía
EconomyManager; guardado solo vía SaveManager (versionado con migraciones);
contenido 100% data-driven; arte procedural (sin assets binarios).

## ☁️ Infraestructura preparada (sin API keys)

- **Cloud save / Auth / Leaderboard**: interfaces con implementación local
  (localStorage); Supabase es drop-in cuando tengas credenciales.
- **Capacitor + Android**: plataforma `android/` generada; AdMob y Google Play
  Billing detrás de interfaces (bridges stub en `src/capacitor/bridges.ts`).
- **Analíticas de retención**: D1/D7/D30, sesiones, conversión (client-side).

## 🗺️ Roadmap

1. ✅ Vertical slice jugable
2. ✅ Progresión (criaturas, misiones, daily, shop, debug, ads)
3. ✅ Analíticas de retención, settings, bonus chest, contenido
4. ✅ React shell + cloud/auth/leaderboard + Capacitor/Android
5. ⬜ Resto de pantallas a React · backend real Supabase · build APK · AdMob/Billing reales

## 🔍 Tests

Smoke tests headless (Puppeteer + Chrome) en `scripts/`:

```bash
node scripts/smoke.mjs            # gameplay completo
node scripts/verify_phase2.mjs    # progresión
node scripts/verify_phase3.mjs    # analíticas
node scripts/verify_phase4.mjs    # React shell + infra
```

## 📄 Estado

Prototipo en desarrollo. Sin servicios externos ni API keys. Guardado en
`localStorage` (versionado).
